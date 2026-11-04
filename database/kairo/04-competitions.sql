create table private.kairo_duels(
 id uuid primary key default gen_random_uuid(),host_id uuid not null references auth.users(id) on delete cascade,
 settings jsonb not null,status text not null default 'waiting' check(status in ('waiting','ready','countdown','active','round_result','finished','cancelled','expired','abandoned')),
 invitation_hash text unique,invitation_expires timestamptz,public_match boolean not null default false,
 question_set jsonb not null,round_index int not null default 0,round_started timestamptz,round_deadline timestamptz,reveal_until timestamptz,
 winner_id uuid references auth.users(id) on delete set null,tournament_id uuid,created_at timestamptz not null default now(),updated_at timestamptz not null default clock_timestamp()
);
create index kairo_duel_host_idx on private.kairo_duels(host_id,created_at desc);
create index kairo_duel_winner_idx on private.kairo_duels(winner_id);
create index kairo_duel_tournament_idx on private.kairo_duels(tournament_id);
create table private.kairo_duel_players(
 match_id uuid not null references private.kairo_duels(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,
 seat int not null check(seat in (1,2)),ready boolean not null default false,last_seen timestamptz not null default clock_timestamp(),joined_at timestamptz not null default now(),
 primary key(match_id,user_id),unique(match_id,seat)
);
create index kairo_duel_player_user_idx on private.kairo_duel_players(user_id,match_id);
create table private.kairo_duel_answers(
 match_id uuid not null,round_index int not null,user_id uuid not null,
 answer jsonb,submitted_at timestamptz not null default clock_timestamp(),correct boolean not null,duration_ms int not null,
 base_points int not null,speed_bonus int not null,total_points int not null,
 primary key(match_id,round_index,user_id),foreign key(match_id,user_id) references private.kairo_duel_players(match_id,user_id) on delete cascade
);
create index kairo_duel_answer_user_idx on private.kairo_duel_answers(user_id);
create table private.kairo_matchmaking(user_id uuid primary key references auth.users(id) on delete cascade,match_id uuid not null unique references private.kairo_duels(id) on delete cascade,settings jsonb not null,skill numeric,created_at timestamptz not null default now());
create index kairo_matchmaking_wait_idx on private.kairo_matchmaking(created_at);
create table private.kairo_tournaments(
 id uuid primary key default gen_random_uuid(),name text not null,mode text not null check(mode in ('async','knockout')),template_id uuid not null references private.kairo_exam_templates(id),
 subject text not null,grade int not null,difficulty text not null default 'mixed',question_count int not null,time_per_question int not null default 30,
 registration_opens timestamptz not null,registration_closes timestamptz not null,starts_at timestamptz not null,ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','active','completed','cancelled')),
 max_participants int not null default 16 check(max_participants between 2 and 64),question_ids uuid[] not null,
 rules jsonb not null default '{"tie_breakers":["score","correct","elapsed","submitted"],"walkover_seconds":120,"exact_tie":"higher_seed"}',
 champion uuid references auth.users(id) on delete set null,schedule_id uuid,week_start date,created_at timestamptz not null default now(),unique(schedule_id,week_start),
 check(registration_opens<registration_closes and starts_at<ends_at and registration_closes<=ends_at)
);
create index kairo_tournament_template_idx on private.kairo_tournaments(template_id);
create index kairo_tournament_champion_idx on private.kairo_tournaments(champion);
create table private.kairo_registrations(tournament_id uuid not null references private.kairo_tournaments(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,seed int,withdrawn boolean not null default false,registered_at timestamptz not null default now(),primary key(tournament_id,user_id),unique(tournament_id,seed));
create index kairo_registration_user_idx on private.kairo_registrations(user_id,tournament_id);
create table private.kairo_bracket_nodes(tournament_id uuid not null references private.kairo_tournaments(id) on delete cascade,round int not null,slot int not null,player_a uuid references auth.users(id) on delete set null,player_b uuid references auth.users(id) on delete set null,match_id uuid references private.kairo_duels(id),winner uuid references auth.users(id) on delete set null,status text not null check(status in ('waiting','active','bye','completed','walkover')),primary key(tournament_id,round,slot));
create index kairo_bracket_a_idx on private.kairo_bracket_nodes(player_a);
create index kairo_bracket_b_idx on private.kairo_bracket_nodes(player_b);
create index kairo_bracket_match_idx on private.kairo_bracket_nodes(match_id);
create index kairo_bracket_winner_idx on private.kairo_bracket_nodes(winner);
create table private.kairo_tournament_sets(tournament_id uuid not null references private.kairo_tournaments(id) on delete cascade,round int not null,question_ids uuid[] not null,primary key(tournament_id,round));
create table private.kairo_arena_entries(tournament_id uuid not null references private.kairo_tournaments(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,session_id uuid not null unique references private.kairo_exam_sessions(id),disqualified boolean not null default false,note text not null default '',primary key(tournament_id,user_id));
create index kairo_arena_user_idx on private.kairo_arena_entries(user_id,tournament_id);
create table private.kairo_weekly_schedules(id uuid primary key default gen_random_uuid(),name text not null,mode text not null check(mode in ('async','knockout')),template_id uuid not null references private.kairo_exam_templates(id),enabled boolean not null default true,settings jsonb not null default '{}');
create index kairo_weekly_template_idx on private.kairo_weekly_schedules(template_id);
create table private.kairo_achievements(user_id uuid not null references auth.users(id) on delete cascade,code text not null,source_id uuid,earned_at timestamptz not null default now(),primary key(user_id,code));

create function private.kairo_tools_locked(caller uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.kairo_exam_sessions where user_id=caller and status='active' and deadline>now()) or exists(select 1 from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id where p.user_id=caller and d.status in ('countdown','active','round_result'));
$$;
create function private.kairo_engaged(caller uuid,except_match uuid default null) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.kairo_exam_sessions where user_id=caller and status='active' and deadline>now()) or exists(select 1 from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id where p.user_id=caller and d.id is distinct from except_match and d.status in ('waiting','ready','countdown','active','round_result') and d.created_at>now()-interval '20 minutes');
$$;
create function private.kairo_can_watch(match uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.kairo_duel_players where match_id=match and user_id=(select auth.uid()));$$;
create table public.kairo_live_matches(id uuid primary key references private.kairo_duels(id) on delete cascade,revision bigint not null default 1);
alter table public.kairo_live_matches enable row level security;
revoke all on public.kairo_live_matches from public,anon,authenticated;
grant select on public.kairo_live_matches to authenticated;
create policy kairo_live_participant on public.kairo_live_matches for select to authenticated using((select private.kairo_can_watch(id)));
alter publication supabase_realtime add table public.kairo_live_matches;
create function private.kairo_live_notify() returns trigger language plpgsql security definer set search_path='' as $$
declare mid uuid;begin
 if tg_table_name='kairo_duels' then mid:=new.id;else mid:=new.match_id;end if;
 insert into public.kairo_live_matches(id) values(mid) on conflict(id) do update set revision=kairo_live_matches.revision+1;return new;end $$;
create trigger kairo_duel_state_changed after insert or update of status,round_index,winner_id on private.kairo_duels for each row execute function private.kairo_live_notify();
create trigger kairo_duel_answered after insert on private.kairo_duel_answers for each row execute function private.kairo_live_notify();

create function private.kairo_duel_settings(p jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
begin
 if not coalesce(p->>'subject' in ('Riyaziyyat','Fizika','Kimya','Biologiya','Coğrafiya') and (p->>'grade')::int between 1 and 11 and (p->>'count')::int in (5,10,15,20) and (p->>'seconds')::int in (15,20,30,45,60,90) and p->>'difficulty' in ('easy','medium','hard','mixed') and length(coalesce(p->>'topic',''))<=200,false) then raise exception 'Duel seçimi uyğun deyil.';end if;
 return jsonb_build_object('subject',p->>'subject','grade',(p->>'grade')::int,'count',(p->>'count')::int,'seconds',(p->>'seconds')::int,'difficulty',p->>'difficulty','topic',coalesce(p->>'topic',''));
end $$;
create function private.kairo_duel_create(caller uuid,settings jsonb,is_public boolean,tournament uuid default null,opponent uuid default null,fixed_ids uuid[] default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare qs jsonb;mid uuid;token text;begin
 settings:=private.kairo_duel_settings(settings);
 select jsonb_agg(to_jsonb(q) order by ord) into qs from (select q.*,row_number()over() ord from (select * from private.kairo_questions q where status='reviewed' and type in ('single','numeric','short','multiple','matching','passage','image') and subject=settings->>'subject' and grade=(settings->>'grade')::int
 and (settings->>'difficulty'='mixed' or difficulty=settings->>'difficulty') and (settings->>'topic'='' or topic=settings->>'topic') and (fixed_ids is null or id=any(fixed_ids)) order by case when fixed_ids is null then random() else array_position(fixed_ids,id)::float end limit (settings->>'count')::int) q) q;
 if coalesce(jsonb_array_length(qs),0)<>(settings->>'count')::int then raise exception 'Bu seçimdə kifayət qədər yoxlanmış sual yoxdur.';end if;
 token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into private.kairo_duels(host_id,settings,invitation_hash,invitation_expires,public_match,question_set,tournament_id,status)
 values(caller,settings,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '20 minutes',is_public,qs,tournament,case when opponent is null then 'waiting' else 'ready' end) returning id into mid;
 insert into private.kairo_duel_players(match_id,user_id,seat) values(mid,caller,1);
 if opponent is not null then insert into private.kairo_duel_players(match_id,user_id,seat) values(mid,opponent,2);end if;
 return jsonb_build_object('id',mid,'token',case when tournament is null then token else null end);
end $$;

create function private.kairo_duel_tick(mid uuid) returns void language plpgsql security definer set search_path='' as $$
declare d private.kairo_duels;players int;ready_count int;online int;winner uuid;points_a int;points_b int;begin
 select * into d from private.kairo_duels where id=mid for update;if not found or d.status in ('finished','cancelled','expired','abandoned') then return;end if;
 select count(*),count(*)filter(where ready),count(*)filter(where last_seen>clock_timestamp()-interval '90 seconds') into players,ready_count,online from private.kairo_duel_players where match_id=mid;
 if d.status='waiting' and d.invitation_expires<clock_timestamp() then update private.kairo_duels set status='expired',updated_at=clock_timestamp() where id=mid;delete from private.kairo_matchmaking where match_id=mid;return;end if;
 if d.status='ready' and ready_count=2 then update private.kairo_duels set status='countdown',round_started=clock_timestamp()+interval '5 seconds',round_deadline=clock_timestamp()+interval '5 seconds'+make_interval(secs=>(settings->>'seconds')::int),updated_at=clock_timestamp() where id=mid;return;end if;
 if d.status='ready' and d.tournament_id is not null and d.updated_at<clock_timestamp()-interval '120 seconds' then
  select user_id into winner from private.kairo_duel_players where match_id=mid and ready order by seat limit 1;
  update private.kairo_duels set status='abandoned',winner_id=winner,updated_at=clock_timestamp() where id=mid;return;
 end if;
 if d.status in ('countdown','active','round_result') and online<2 and exists(select 1 from private.kairo_duel_players where match_id=mid and last_seen<clock_timestamp()-interval '90 seconds') then
  if online=1 then select user_id into winner from private.kairo_duel_players where match_id=mid and last_seen>clock_timestamp()-interval '90 seconds';end if;
  update private.kairo_duels set status='abandoned',winner_id=winner,updated_at=clock_timestamp() where id=mid;return;
 end if;
 if d.status='countdown' and clock_timestamp()>=d.round_started then update private.kairo_duels set status='active',updated_at=clock_timestamp() where id=mid;end if;
 if d.status='active' and (clock_timestamp()>=d.round_deadline or (select count(*) from private.kairo_duel_answers where match_id=mid and round_index=d.round_index)=2) then
  update private.kairo_duels set status='round_result',reveal_until=clock_timestamp()+interval '3 seconds',updated_at=clock_timestamp() where id=mid;return;
 end if;
 if d.status='round_result' and clock_timestamp()>=d.reveal_until then
  if d.round_index+1 >= jsonb_array_length(d.question_set) then
   select coalesce(sum(a.total_points)filter(where p.seat=1),0),coalesce(sum(a.total_points)filter(where p.seat=2),0) into points_a,points_b from private.kairo_duel_players p left join private.kairo_duel_answers a on a.match_id=p.match_id and a.user_id=p.user_id where p.match_id=mid;
   if points_a<>points_b then select user_id into winner from private.kairo_duel_players where match_id=mid and seat=case when points_a>points_b then 1 else 2 end;end if;
   update private.kairo_duels set status='finished',winner_id=winner,updated_at=clock_timestamp() where id=mid;
   if winner is not null then insert into private.kairo_achievements(user_id,code,source_id) values(winner,'first_win',mid) on conflict do nothing;
    if (select count(*) from private.kairo_duels where winner_id=winner and status='finished')>=5 then insert into private.kairo_achievements(user_id,code,source_id) values(winner,'five_wins',mid) on conflict do nothing;end if;
   end if;
   insert into private.kairo_learning_events(user_id,source,source_id,subject,data,independent) select user_id,'duel',mid,d.settings->>'subject',jsonb_build_object('winner',winner=user_id),false from private.kairo_duel_players where match_id=mid on conflict do nothing;
  else update private.kairo_duels set status='active',round_index=round_index+1,round_started=clock_timestamp(),round_deadline=clock_timestamp()+make_interval(secs=>(settings->>'seconds')::int),updated_at=clock_timestamp() where id=mid;end if;
 end if;
end $$;

create function private.kairo_duel_read(caller uuid,mid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.kairo_duels;q jsonb;reveal boolean;ended boolean;begin
 if not exists(select 1 from private.kairo_duel_players where match_id=mid and user_id=caller) then raise exception 'Duel tapılmadı.' using errcode='42501';end if;
 perform private.kairo_duel_tick(mid);
 update private.kairo_duel_players set last_seen=clock_timestamp() where match_id=mid and user_id=caller;select * into d from private.kairo_duels where id=mid;
 ended:=d.status in ('finished','abandoned','cancelled','expired');reveal:=d.status='round_result' or ended;
 q:=d.question_set->d.round_index;
 return jsonb_build_object('id',d.id,'status',d.status,'settings',d.settings,'round',d.round_index,'server_now',clock_timestamp(),'round_started',d.round_started,'deadline',d.round_deadline,'reveal_until',d.reveal_until,'tournament_id',d.tournament_id,
 'winner',case when d.winner_id is null then null else private.kairo_public_profile(d.winner_id) end,
 'players',(select jsonb_agg(private.kairo_public_profile(p.user_id)||jsonb_build_object('me',p.user_id=caller,'seat',p.seat,'ready',p.ready,'online',p.last_seen>clock_timestamp()-interval '12 seconds',
 'answered',exists(select 1 from private.kairo_duel_answers where match_id=mid and user_id=p.user_id and round_index=d.round_index),
 'score',(select coalesce(sum(total_points),0) from private.kairo_duel_answers where match_id=mid and user_id=p.user_id and (round_index<d.round_index or reveal)),
 'correct',(select count(*) from private.kairo_duel_answers where match_id=mid and user_id=p.user_id and correct and (round_index<d.round_index or reveal)),
 'average_ms',(select coalesce(round(avg(duration_ms)),0) from private.kairo_duel_answers where match_id=mid and user_id=p.user_id and (round_index<d.round_index or reveal))) order by seat) from private.kairo_duel_players p where match_id=mid),
 'question',case when d.status in ('active','round_result') then jsonb_build_object('id',q->>'id','subject',q->>'subject','grade',q->'grade','topic',q->>'topic','type',q->>'type','body',q->'body','ordinal',d.round_index) else null end,
 'round_review',case when reveal then jsonb_build_object('key',q->'answer_key','explanation',q->>'explanation','my_answer',(select answer from private.kairo_duel_answers where match_id=mid and round_index=d.round_index and user_id=caller)) else null end,
 'my_answer',(select answer from private.kairo_duel_answers where match_id=mid and round_index=d.round_index and user_id=caller),
 'review',case when ended then (select jsonb_agg(jsonb_build_object('question',private.kairo_question_public(x.item),'key',x.item->'answer_key','explanation',x.item->>'explanation','my_answer',a.answer,'correct',coalesce(a.correct,false),'points',coalesce(a.total_points,0),'base',coalesce(a.base_points,0),'bonus',coalesce(a.speed_bonus,0),'duration_ms',a.duration_ms) order by n) from jsonb_array_elements(d.question_set) with ordinality x(item,n) left join private.kairo_duel_answers a on a.match_id=mid and a.round_index=n-1 and a.user_id=caller) else null end);
end $$;

create function private.kairo_duel_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare mid uuid;d private.kairo_duels;chosen_settings jsonb;created jsonb;token text;waiting private.kairo_matchmaking;player_skill numeric;q jsonb;is_correct boolean;bonus int;duration int;begin
 if operation='duel.catalog' then
  update private.kairo_duels set status='expired' where host_id=caller and status='waiting' and invitation_expires<now();
  delete from private.kairo_matchmaking where user_id=caller and created_at<now()-interval '20 minutes';
  return jsonb_build_object('profile',private.kairo_public_profile(caller),'consent',(select consent_public from private.kairo_profiles where user_id=caller),
  'pool',(select coalesce(jsonb_agg(x),'[]') from (select subject,grade,difficulty,topic,count(*) count from private.kairo_questions where status='reviewed' and type<>'written' group by subject,grade,difficulty,topic) x),
  'history',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select hist.id,hist.status,hist.settings,hist.created_at,private.kairo_public_profile(hist.winner_id) winner,(hist.winner_id=caller) won,
   (select coalesce(sum(total_points),0) from private.kairo_duel_answers where match_id=hist.id and user_id=caller) score,
   (select private.kairo_public_profile(user_id) from private.kairo_duel_players where match_id=hist.id and user_id<>caller) opponent
   from private.kairo_duels hist join private.kairo_duel_players pl on pl.match_id=hist.id where pl.user_id=caller order by hist.created_at desc limit 40) x),
  'achievements',(select coalesce(jsonb_agg(jsonb_build_object('code',code,'earned_at',earned_at)),'[]') from private.kairo_achievements where user_id=caller));
 end if;
 if operation in ('duel.create','duel.find') then
  perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
  if not exists(select 1 from private.kairo_profiles where user_id=caller and consent_public) then raise exception 'Yarış üçün ictimai ləqəbini təsdiqlə.';end if;
  if private.kairo_engaged(caller) then raise exception 'Artıq aktiv imtahanın və ya duelin var.';end if;
  chosen_settings:=private.kairo_duel_settings(p->'settings');
  if operation='duel.find' then
   select case when sum(total)>=30 then 100*sum(correct)::numeric/sum(total) else null end into player_skill from public.practice_attempts where user_id=caller and subject=chosen_settings->>'subject';
   select * into waiting from private.kairo_matchmaking m where m.user_id<>caller and m.settings=chosen_settings and m.created_at>now()-interval '20 minutes'
    and (player_skill is null or m.skill is null or abs(m.skill-player_skill)<=20) order by m.created_at limit 1 for update skip locked;
   if found then
    select * into d from private.kairo_duels where id=waiting.match_id and status='waiting' for update;
    if found and not private.kairo_engaged(waiting.user_id,d.id) then
     insert into private.kairo_duel_players(match_id,user_id,seat) values(d.id,caller,2);update private.kairo_duels set status='ready',updated_at=clock_timestamp() where id=d.id;delete from private.kairo_matchmaking where match_id=d.id;
     return private.kairo_duel_read(caller,d.id);
    end if;
   end if;
  end if;
  created:=private.kairo_duel_create(caller,chosen_settings,operation='duel.find');mid:=(created->>'id')::uuid;
  if operation='duel.find' then insert into private.kairo_matchmaking(user_id,match_id,settings,skill) values(caller,mid,chosen_settings,player_skill);end if;
  return private.kairo_duel_read(caller,mid)||created;
 elsif operation='duel.join' then
  if length(coalesce(p->>'token',''))<>48 then raise exception 'Dəvət keçidi düzgün deyil.';end if;
  select * into d from private.kairo_duels where invitation_hash=encode(extensions.digest(p->>'token','sha256'),'hex') for update;
  if not found or d.invitation_expires<now() then raise exception 'Dəvət tapılmadı və ya müddəti bitib.';end if;
  if exists(select 1 from private.kairo_duel_players where match_id=d.id and user_id=caller) then return private.kairo_duel_read(caller,d.id);end if;
  if d.status<>'waiting' or (select count(*) from private.kairo_duel_players where match_id=d.id)>=2 then raise exception 'Bu duel artıq doludur və ya tamamlanıb.';end if;
  perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
  if private.kairo_engaged(caller) or private.kairo_engaged(d.host_id,d.id) or not exists(select 1 from private.kairo_profiles where user_id=caller and consent_public) then raise exception 'Əvvəl aktiv sessiyanı bitir və ictimai ləqəbi təsdiqlə.';end if;
  insert into private.kairo_duel_players(match_id,user_id,seat) values(d.id,caller,2);update private.kairo_duels set status='ready',updated_at=clock_timestamp() where id=d.id;delete from private.kairo_matchmaking where match_id=d.id;return private.kairo_duel_read(caller,d.id);
 end if;
 mid:=(p->>'id')::uuid;
 if operation='duel.get' then return private.kairo_duel_read(caller,mid);end if;
 select * into d from private.kairo_duels where id=mid for update;
 if not found or not exists(select 1 from private.kairo_duel_players where match_id=mid and user_id=caller) then raise exception 'Duel tapılmadı.' using errcode='42501';end if;
 perform private.kairo_duel_tick(mid);update private.kairo_duel_players set last_seen=clock_timestamp() where match_id=mid and user_id=caller;select * into d from private.kairo_duels where id=mid;
 if operation='duel.ready' then
  if d.status not in ('waiting','ready') then return private.kairo_duel_read(caller,mid);end if;
  update private.kairo_duel_players set ready=true where match_id=mid and user_id=caller;
 elsif operation='duel.private' then
  if d.host_id<>caller or d.status<>'waiting' then raise exception 'Yalnız gözləyən dueli özəlləşdirmək olar.';end if;
  token:=encode(extensions.gen_random_bytes(24),'hex');update private.kairo_duels set public_match=false,invitation_hash=encode(extensions.digest(token,'sha256'),'hex'),invitation_expires=now()+interval '20 minutes' where id=mid;delete from private.kairo_matchmaking where match_id=mid;return private.kairo_duel_read(caller,mid)||jsonb_build_object('token',token);
 elsif operation='duel.cancel' then
  if d.status not in ('waiting','ready') then raise exception 'Başlamış dueli gözləmə ləğvi ilə dayandırmaq olmaz.';end if;
  if d.tournament_id is not null then raise exception 'Turnir duelini ləğv etmək olmaz.';end if;
  update private.kairo_duels set status='cancelled',updated_at=clock_timestamp() where id=mid;delete from private.kairo_matchmaking where match_id=mid;
 elsif operation='duel.answer' then
  if exists(select 1 from private.kairo_duel_answers where match_id=mid and round_index=(p->>'round')::int and user_id=caller) then return private.kairo_duel_read(caller,mid);end if;
  if d.status<>'active' or d.round_index<>(p->>'round')::int or clock_timestamp()<d.round_started or clock_timestamp()>=d.round_deadline then raise exception 'Bu raund üçün cavab vaxtı bitib.';end if;
  q:=d.question_set->d.round_index;
  if not private.kairo_answer_valid(q->>'type',q->'body',p->'answer') then raise exception 'Cavab formatı uyğun deyil.';end if;
  is_correct:=coalesce(private.kairo_mark(q->>'type',q->'answer_key',p->'answer'),false);
  duration:=greatest(0,round(extract(epoch from (clock_timestamp()-d.round_started))*1000)::int);
  bonus:=case when is_correct then greatest(0,least(50,floor(50*extract(epoch from (d.round_deadline-clock_timestamp()))/(d.settings->>'seconds')::numeric)::int)) else 0 end;
  insert into private.kairo_duel_answers(match_id,round_index,user_id,answer,correct,duration_ms,base_points,speed_bonus,total_points) values(mid,d.round_index,caller,p->'answer',is_correct,duration,case when is_correct then 100 else 0 end,bonus,case when is_correct then 100+bonus else 0 end);
 elsif operation='duel.rematch' then
  if d.status not in ('finished','abandoned') then raise exception 'Duel hələ bitməyib.';end if;
  if private.kairo_engaged(caller) then raise exception 'Aktiv sessiyanı bitir.';end if;
  created:=private.kairo_duel_create(caller,d.settings,false);return private.kairo_duel_read(caller,(created->>'id')::uuid)||created;
 else raise exception 'Naməlum duel əməliyyatı.';end if;
 return private.kairo_duel_read(caller,mid);end $$;

create function private.kairo_arena_leaderboard(tid uuid,viewer uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('rank',position,'player',private.kairo_public_profile(user_id),'me',user_id=viewer,'score',earned,'maximum',maximum,'correct',correct,'total',total,'elapsed_seconds',elapsed,'finished_at',finished_at) order by position),'[]') from (
 select e.user_id,r.earned,r.maximum,r.correct,r.total,round(extract(epoch from(s.submitted_at-s.started_at)),3) elapsed,s.submitted_at finished_at,
 rank()over(order by r.earned desc,r.correct desc,extract(epoch from(s.submitted_at-s.started_at)),s.submitted_at) position
 from private.kairo_arena_entries e join private.kairo_exam_sessions s on s.id=e.session_id join private.kairo_exam_results r on r.session_id=s.id
 where e.tournament_id=tid and not e.disqualified and r.status='final'
 ) x;
$$;
create function private.kairo_round_questions(tid uuid,round_number int) returns uuid[] language plpgsql security definer set search_path='' as $$
declare t private.kairo_tournaments;ids uuid[];begin
 select question_ids into ids from private.kairo_tournament_sets where tournament_id=tid and round=round_number;if ids is not null then return ids;end if;
 select * into t from private.kairo_tournaments where id=tid;
 if round_number=1 then ids:=t.question_ids;
 else
 select array_agg(id order by ord) into ids from (select id,row_number()over() ord from (select q.id from private.kairo_questions q where q.status='reviewed' and q.subject=t.subject and q.grade=t.grade and q.type<>'written' and (t.difficulty='mixed' or q.difficulty=t.difficulty) and not exists(select 1 from private.kairo_tournament_sets s where s.tournament_id=tid and q.id=any(s.question_ids)) order by random() limit t.question_count) q) q;
 end if;
 if coalesce(array_length(ids,1),0)<>t.question_count then raise exception 'Növbəti raund üçün yeni yoxlanmış suallar kifayət deyil.';end if;
 insert into private.kairo_tournament_sets(tournament_id,round,question_ids) values(tid,round_number,ids);return ids;end $$;

create function private.kairo_arena_tick(tid uuid) returns void language plpgsql security definer set search_path='' as $$
declare t private.kairo_tournaments;users uuid[];n int;bracket_size int:=2;i int;r int;node record;d private.kairo_duels;made jsonb;decided_winner uuid;a uuid;b uuid;last_round int;changed boolean;seed_winner uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('kairo-tournament:'||tid,0));
 select * into t from private.kairo_tournaments where id=tid for update;if not found or t.status in ('completed','cancelled') then return;end if;
 if t.mode='async' then
  if clock_timestamp()>=t.starts_at and t.status='scheduled' then update private.kairo_tournaments set status='active' where id=tid;end if;
  if clock_timestamp()>=t.ends_at then
   perform private.kairo_exam_finalize(s.id) from private.kairo_exam_sessions s where competition_id=tid and status='active';
   update private.kairo_tournaments set status='completed' where id=tid;
   insert into private.kairo_achievements(user_id,code,source_id)
   select user_id,'weekly_top10',tid from (select e.user_id,rank()over(order by r.earned desc,r.correct desc,extract(epoch from(s.submitted_at-s.started_at)),s.submitted_at) pos from private.kairo_arena_entries e join private.kairo_exam_sessions s on s.id=e.session_id join private.kairo_exam_results r on r.session_id=s.id where e.tournament_id=tid and not e.disqualified and r.status='final') x where pos<=10 on conflict do nothing;
  end if;return;
 end if;
 if clock_timestamp()<t.starts_at or clock_timestamp()<t.registration_closes then return;end if;
 if not exists(select 1 from private.kairo_bracket_nodes where tournament_id=tid) then
  select array_agg(user_id order by wins desc,registered_at,user_id) into users from (select r.user_id,r.registered_at,(select count(*) from private.kairo_duels where winner_id=r.user_id and status='finished') wins from private.kairo_registrations r where tournament_id=tid and not withdrawn) ranked;
  n:=coalesce(array_length(users,1),0);
  if n<2 then update private.kairo_tournaments set status='cancelled' where id=tid;return;end if;
  while bracket_size<n loop bracket_size:=bracket_size*2;end loop;
  for i in 1..n loop update private.kairo_registrations set seed=i where tournament_id=tid and user_id=users[i];end loop;
  for i in 1..bracket_size/2 loop
   a:=users[i];b:=users[bracket_size+1-i];
   if a is null or b is null then insert into private.kairo_bracket_nodes(tournament_id,round,slot,player_a,player_b,winner,status) values(tid,1,i,a,b,coalesce(a,b),'bye');
   else
    made:=private.kairo_duel_create(a,jsonb_build_object('subject',t.subject,'grade',t.grade,'count',t.question_count,'seconds',t.time_per_question,'difficulty',t.difficulty,'topic',''),false,tid,b,private.kairo_round_questions(tid,1));
    insert into private.kairo_bracket_nodes(tournament_id,round,slot,player_a,player_b,match_id,status) values(tid,1,i,a,b,(made->>'id')::uuid,'active');
   end if;
  end loop;
  update private.kairo_tournaments set status='active' where id=tid;
 end if;
 for node in select * from private.kairo_bracket_nodes where tournament_id=tid and status='active' order by round,slot loop
  perform private.kairo_duel_tick(node.match_id);select * into d from private.kairo_duels where id=node.match_id;
  if d.status in ('finished','abandoned','expired','cancelled') then
   decided_winner:=d.winner_id;
   if d.status='finished' and decided_winner is null then
    -- Exact score ties: correct count, measured answer time, then the published registration seed.
    select p.user_id into decided_winner from private.kairo_duel_players p join private.kairo_registrations reg on reg.tournament_id=tid and reg.user_id=p.user_id
    left join private.kairo_duel_answers ans on ans.match_id=p.match_id and ans.user_id=p.user_id where p.match_id=d.id
    group by p.user_id,reg.seed order by count(*)filter(where ans.correct) desc,coalesce(sum(ans.duration_ms),2147483647),reg.seed limit 1;
   end if;
   update private.kairo_bracket_nodes set status=case when d.status='finished' then 'completed' else 'walkover' end,winner=decided_winner where tournament_id=tid and round=node.round and slot=node.slot;
  end if;
 end loop;
 loop
  changed:=false;
  select max(round) into last_round from private.kairo_bracket_nodes where tournament_id=tid;
  if exists(select 1 from private.kairo_bracket_nodes where tournament_id=tid and round=last_round and status='active') then exit;end if;
  if (select count(*) from private.kairo_bracket_nodes where tournament_id=tid and round=last_round)=1 then
   select bn.winner into decided_winner from private.kairo_bracket_nodes bn where tournament_id=tid and round=last_round;
   update private.kairo_tournaments set status='completed',champion=decided_winner where id=tid;
   if decided_winner is not null then insert into private.kairo_achievements(user_id,code,source_id) values(decided_winner,'tournament_champion',tid) on conflict do nothing;end if;exit;
  end if;
  for node in select x.slot,x.winner a,y.winner b from private.kairo_bracket_nodes x join private.kairo_bracket_nodes y on y.tournament_id=x.tournament_id and y.round=x.round and y.slot=x.slot+1 where x.tournament_id=tid and x.round=last_round and x.slot%2=1 order by x.slot loop
   if node.a is null or node.b is null then insert into private.kairo_bracket_nodes(tournament_id,round,slot,player_a,player_b,winner,status) values(tid,last_round+1,(node.slot+1)/2,node.a,node.b,coalesce(node.a,node.b),'bye');
   else
    made:=private.kairo_duel_create(node.a,jsonb_build_object('subject',t.subject,'grade',t.grade,'count',t.question_count,'seconds',t.time_per_question,'difficulty',t.difficulty,'topic',''),false,tid,node.b,private.kairo_round_questions(tid,last_round+1));
    insert into private.kairo_bracket_nodes(tournament_id,round,slot,player_a,player_b,match_id,status) values(tid,last_round+1,(node.slot+1)/2,node.a,node.b,(made->>'id')::uuid,'active');
   end if;changed:=true;
  end loop;
  if not changed then exit;end if;
 end loop;
 if clock_timestamp()>=t.ends_at and exists(select 1 from private.kairo_bracket_nodes where tournament_id=tid and status='active') then update private.kairo_tournaments set status='cancelled' where id=tid;end if;
end $$;

create function private.kairo_schedule_weeks() returns void language plpgsql security definer set search_path='' as $$
declare schedule record;template private.kairo_exam_templates;week date;offset_week int;start_local timestamp;ids uuid[];section jsonb;selected uuid[];q uuid;count_questions int;subject_name text;
begin
 perform pg_advisory_xact_lock(hashtextextended('kairo-weekly-generation',0));
 for schedule in select * from private.kairo_weekly_schedules where enabled loop
  select * into template from private.kairo_exam_templates where id=schedule.template_id and status='published';if not found then continue;end if;
  for offset_week in 0..1 loop
   week:=(date_trunc('week',now() at time zone 'Asia/Baku')+make_interval(weeks=>offset_week))::date;
   if exists(select 1 from private.kairo_tournaments where schedule_id=schedule.id and week_start=week) then continue;end if;
   selected:='{}';count_questions:=0;subject_name:=template.sections->0->>'subject';
   if jsonb_array_length(template.sections)<>1 then continue;end if;
   count_questions:=(template.sections->0->>'count')::int;
   if count_questions not in (5,10,15,20) then continue;end if;
   select array_agg(id order by ord) into ids from (select id,row_number()over() ord from (select id from private.kairo_questions where status='reviewed' and subject=template.sections->0->>'subject' and grade=template.grade and type<>'written' and template.sections->0->'types' ? type and (coalesce(template.sections->0->>'topic','')='' or topic=template.sections->0->>'topic') and (coalesce(template.sections->0->>'difficulty','mixed')='mixed' or difficulty=template.sections->0->>'difficulty') order by random() limit count_questions) a) a;
   if coalesce(array_length(ids,1),0)<>count_questions then continue;end if;
   insert into private.kairo_tournaments(name,mode,template_id,subject,grade,difficulty,question_count,time_per_question,registration_opens,registration_closes,starts_at,ends_at,max_participants,question_ids,schedule_id,week_start)
   values(schedule.name||' · '||to_char(week,'DD.MM'),schedule.mode,template.id,subject_name,template.grade,'mixed',count_questions,30,
    week::timestamp at time zone 'Asia/Baku',
    (week::timestamp+interval '6 days'+case when schedule.mode='knockout' then interval '18 hours' else interval '19 hours' end) at time zone 'Asia/Baku',
    (week::timestamp+case when schedule.mode='knockout' then interval '6 days 18 hours' else interval '8 hours' end) at time zone 'Asia/Baku',
    (week::timestamp+interval '6 days 20 hours') at time zone 'Asia/Baku',16,ids,schedule.id,week) on conflict(schedule_id,week_start) do nothing;
  end loop;
 end loop;
end $$;

create function private.kairo_arena_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare tid uuid;t private.kairo_tournaments;sid uuid;active_id uuid;begin
 perform private.kairo_schedule_weeks();
 if operation='arena.catalog' then
  perform private.kairo_arena_tick(id) from private.kairo_tournaments where status in ('scheduled','active') and starts_at<=now();
  return jsonb_build_object('tournaments',(select coalesce(jsonb_agg(x order by x.starts_at desc),'[]') from (select tour.id,tour.name,tour.mode,tour.subject,tour.grade,tour.question_count,tour.time_per_question,tour.registration_opens,tour.registration_closes,tour.starts_at,tour.ends_at,tour.status,tour.max_participants,tour.rules,
  (select count(*) from private.kairo_registrations where tournament_id=tour.id and not withdrawn) participants,
  exists(select 1 from private.kairo_registrations where tournament_id=tour.id and user_id=caller and not withdrawn) registered,
  private.kairo_public_profile(tour.champion) champion from private.kairo_tournaments tour order by tour.starts_at desc limit 30) x),
  'achievements',(select coalesce(jsonb_agg(jsonb_build_object('code',code,'earned_at',earned_at)),'[]') from private.kairo_achievements where user_id=caller));
 end if;
 tid:=(p->>'id')::uuid;perform private.kairo_arena_tick(tid);select * into t from private.kairo_tournaments where id=tid for update;
 if not found then raise exception 'Turnir tapılmadı.';end if;
 if operation='arena.register' then
  if t.status not in ('scheduled','active') or clock_timestamp()<t.registration_opens or clock_timestamp()>=t.registration_closes then raise exception 'Qeydiyyat vaxtı açıq deyil.';end if;
  if not exists(select 1 from private.kairo_profiles where user_id=caller and consent_public) then raise exception 'İctimai yarış ləqəbini təsdiqlə.';end if;
  if not exists(select 1 from private.kairo_registrations where tournament_id=tid and user_id=caller and not withdrawn) and (select count(*) from private.kairo_registrations where tournament_id=tid and not withdrawn)>=t.max_participants then raise exception 'Turnirin iştirakçı limiti dolub.';end if;
  insert into private.kairo_registrations(tournament_id,user_id) values(tid,caller) on conflict(tournament_id,user_id) do update set withdrawn=false;
 elsif operation='arena.withdraw' then
  if clock_timestamp()>=t.starts_at then raise exception 'Başlamış yarışdan çıxış nəticəni ləğv etmir.';end if;
  update private.kairo_registrations set withdrawn=true where tournament_id=tid and user_id=caller;
 elsif operation='arena.start' then
  if t.mode<>'async' or t.status<>'active' or now()<t.starts_at or now()>=t.ends_at or not exists(select 1 from private.kairo_registrations where tournament_id=tid and user_id=caller and not withdrawn) then raise exception 'Bu yarışa indi başlamaq olmaz.';end if;
  select session_id into sid from private.kairo_arena_entries where tournament_id=tid and user_id=caller;
  if sid is null then
   if private.kairo_engaged(caller) then raise exception 'Aktiv sınağı və ya dueli bitir.';end if;
   sid:=private.kairo_exam_start(caller,t.template_id,(p->>'request_id')::uuid,'arena',tid,t.question_ids);
   insert into private.kairo_arena_entries(tournament_id,user_id,session_id) values(tid,caller,sid);
  end if;
  return jsonb_build_object('session_id',sid);
 elsif operation<>'arena.get' then raise exception 'Naməlum arena əməliyyatı.';end if;
 return jsonb_build_object('tournament',to_jsonb(t)-'question_ids'-'champion'||jsonb_build_object('champion',private.kairo_public_profile(t.champion)),
 'registered',exists(select 1 from private.kairo_registrations where tournament_id=tid and user_id=caller and not withdrawn),
 'leaderboard',private.kairo_arena_leaderboard(tid,caller),
 'my_entry',(select jsonb_build_object('session_id',session_id,'disqualified',disqualified,'note',note) from private.kairo_arena_entries where tournament_id=tid and user_id=caller),
 'bracket',(select coalesce(jsonb_agg(jsonb_build_object('round',round,'slot',slot,'a',private.kairo_public_profile(player_a),'b',private.kairo_public_profile(player_b),'winner',private.kairo_public_profile(winner),'status',status,'my_match',case when player_a=caller or player_b=caller then match_id else null end) order by round,slot),'[]') from private.kairo_bracket_nodes where tournament_id=tid));
end $$;
