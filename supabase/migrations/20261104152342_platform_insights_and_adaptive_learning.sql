-- Additive, authoritative insights and learning plan state. No client table writes.
create table private.kairo_duel_ratings(
 match_id uuid not null references private.kairo_duels(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 outcome text not null check(outcome in('win','loss','draw')),delta int not null,
 created_at timestamptz not null default now(),primary key(match_id,user_id)
);
create index kairo_rating_user_idx on private.kairo_duel_ratings(user_id,created_at desc);
create table private.kairo_adaptive_plans(
 user_id uuid not null references auth.users(id) on delete cascade,subject text not null,grade int not null,
 source_version text not null default '',plan jsonb,completed jsonb not null default '{}',daily_minutes int not null default 45 check(daily_minutes in(30,45,60,90)),
 lease_until timestamptz,lease_id uuid,updated_at timestamptz not null default now(),primary key(user_id,subject,grade)
);
create table private.kairo_duel_ai_requests(
 user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,settings jsonb not null,
 match_id uuid references private.kairo_duels(id) on delete set null,lease_until timestamptz not null default now()+interval '3 minutes',
 primary key(user_id,request_id)
);
alter table private.kairo_duel_ratings enable row level security;
alter table private.kairo_adaptive_plans enable row level security;
alter table private.kairo_duel_ai_requests enable row level security;
revoke all on private.kairo_duel_ratings,private.kairo_adaptive_plans,private.kairo_duel_ai_requests from public,anon,authenticated;

create function private.kairo_rate_duel() returns trigger language plpgsql security definer set search_path='' as $$
declare person uuid;wins int;begin
 if new.status not in('finished','abandoned') or old.status in('finished','abandoned') then return new;end if;
 if (select count(*) from private.kairo_duel_players where match_id=new.id)<>2 or (new.status='abandoned' and new.winner_id is null) then return new;end if;
 insert into private.kairo_duel_ratings(match_id,user_id,outcome,delta)
 select new.id,user_id,case when new.winner_id is null then 'draw' when new.winner_id=user_id then 'win' else 'loss' end,
 case when new.winner_id is null then 3 when new.winner_id=user_id then 25 else -10 end from private.kairo_duel_players where match_id=new.id on conflict do nothing;
 if new.winner_id is not null then
  person:=new.winner_id;
  select count(*) into wins from private.kairo_duel_ratings where user_id=person and outcome='win';
  insert into private.kairo_achievements(user_id,code,source_id) values(person,'first_win',new.id) on conflict do nothing;
  if wins>=5 then insert into private.kairo_achievements(user_id,code,source_id) values(person,'five_wins',new.id) on conflict do nothing;end if;
  if wins>=10 then insert into private.kairo_achievements(user_id,code,source_id) values(person,'ten_wins',new.id) on conflict do nothing;end if;
 end if;
 return new;
end $$;
create trigger kairo_duel_rating_final after update of status on private.kairo_duels for each row execute function private.kairo_rate_duel();
-- Existing completed games receive their actual historical outcome once.
insert into private.kairo_duel_ratings(match_id,user_id,outcome,delta,created_at)
select d.id,p.user_id,case when d.winner_id is null then 'draw' when d.winner_id=p.user_id then 'win' else 'loss' end,
case when d.winner_id is null then 3 when d.winner_id=p.user_id then 25 else -10 end,d.updated_at
from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id
where d.status in('finished','abandoned') and (d.status='finished' or d.winner_id is not null)
and (select count(*) from private.kairo_duel_players x where x.match_id=d.id)=2 on conflict do nothing;

create function private.kairo_duel_stats(person uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('played',count(*),'wins',count(*)filter(where outcome='win'),'losses',count(*)filter(where outcome='loss'),'draws',count(*)filter(where outcome='draw'),'rating',greatest(0,1000+coalesce(sum(delta),0))) from private.kairo_duel_ratings where user_id=person;
$$;
create function private.kairo_plan_context(person uuid,chosen_subject text,chosen_grade int) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',md5(coalesce(jsonb_agg(to_jsonb(a) order by a.submitted_at,a.attempt_id)::text,'[]')),'attempts',coalesce(jsonb_agg(to_jsonb(a) order by a.submitted_at desc,a.attempt_id),'[]'))
 from (select attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at from public.practice_attempts where user_id=person and subject=chosen_subject and grade=chosen_grade::text order by submitted_at desc,attempt_id desc limit 30) a;
$$;
create function private.kairo_insights(person uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'totals',(select jsonb_build_object('attempts',count(*),'total',coalesce(sum(total),0),'correct',coalesce(sum(correct),0),'wrong',coalesce(sum(total-correct),0),'practice_seconds',coalesce(sum(duration_seconds),0)) from public.practice_attempts where user_id=person),
 'subjects',(select coalesce(jsonb_agg(x order by x.subject,x.grade),'[]') from (select subject,grade,count(*) attempts,sum(total) total,sum(correct) correct,max(submitted_at) last_result from public.practice_attempts where user_id=person group by subject,grade) x),
 'topics',(select coalesce(jsonb_agg(x order by x.correct::numeric/nullif(x.total,0),x.subject,x.topic),'[]') from (select a.subject,a.grade,t->>'topic' topic,sum(case when t->>'total' ~ '^[0-9]{1,5}$' then (t->>'total')::int else 0 end) total,sum(case when t->>'correct' ~ '^[0-9]{1,5}$' then (t->>'correct')::int else 0 end) correct from public.practice_attempts a cross join lateral jsonb_array_elements(a.topic_scores) t where a.user_id=person group by a.subject,a.grade,t->>'topic') x),
 'duel_stats',private.kairo_duel_stats(person),
 'achievements',(select coalesce(jsonb_agg(jsonb_build_object('code',code,'earned_at',earned_at) order by earned_at desc),'[]') from private.kairo_achievements where user_id=person),
 'focus_week',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select day,seconds,rounds from private.kairo_focus_days where user_id=person and day>=(now() at time zone 'Asia/Baku')::date-27) x),
 'days',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select (submitted_at at time zone 'Asia/Baku')::date as day,count(*) attempts,sum(total) total,sum(correct) correct from public.practice_attempts where user_id=person and submitted_at>now()-interval '28 days' group by 1) x),
 'exams',(select coalesce(jsonb_agg(x order by x.started_at desc),'[]') from (select s.id,s.status,s.mode,s.started_at,s.submitted_at,s.template_snapshot->>'name' name,s.template_snapshot->>'grade' grade,r.total,r.correct,r.unanswered,r.earned,r.maximum,r.pending,r.subjects,r.topics from private.kairo_exam_sessions s left join private.kairo_exam_results r on r.session_id=s.id where s.user_id=person order by s.started_at desc limit 60) x),
 'duels',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select d.id,d.status,d.settings,d.created_at,r.outcome,r.delta,private.kairo_public_profile(d.winner_id) winner,(select private.kairo_public_profile(user_id) from private.kairo_duel_players where match_id=d.id and user_id<>person) opponent,(select count(*) from private.kairo_duel_answers where match_id=d.id and user_id=person and correct) correct,(select count(*) from private.kairo_duel_answers where match_id=d.id and user_id=person and not correct) wrong,(select coalesce(sum(total_points),0) from private.kairo_duel_answers where match_id=d.id and user_id=person) score from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id left join private.kairo_duel_ratings r on r.match_id=d.id and r.user_id=person where p.user_id=person order by d.created_at desc limit 60) x),
 'tutor',(select jsonb_build_object('sessions',count(*),'completed',count(*)filter(where status='completed'),'hints',coalesce(sum(hint_count),0),'verified',count(*)filter(where solved_verified)) from private.kairo_tutor_sessions where user_id=person),
 'plans',(select coalesce(jsonb_agg(to_jsonb(p)-array['user_id','lease_id','lease_until']),'[]') from private.kairo_adaptive_plans p where user_id=person),
 'practice',(select coalesce(jsonb_agg(x order by x.submitted_at desc),'[]') from (select attempt_id,kind,source,subject,grade,total,correct,topic_scores,duration_seconds,submitted_at from public.practice_attempts where user_id=person order by submitted_at desc limit 60) x)
 );
$$;

create function private.kairo_ranking(include_private boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by x.rating desc,x.wins desc,x.public_id),'[]') from (
 select p.public_id,case when include_private or p.consent_public then p.nickname else 'Gizli iştirakçı' end nickname,
 greatest(0,1000+coalesce(sum(r.delta),0)) rating,count(r.match_id) played,count(*)filter(where r.outcome='win') wins,count(*)filter(where r.outcome='loss') losses,count(*)filter(where r.outcome='draw') draws
 from private.kairo_profiles p left join private.kairo_duel_ratings r on r.user_id=p.user_id where include_private or p.consent_public group by p.user_id order by rating desc,wins desc,p.public_id limit 100) x;
$$;

create function private.platform_api(operation text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid;person uuid;mid uuid;rid uuid;settings jsonb;result jsonb;ctx jsonb;row_plan private.kairo_adaptive_plans;lease uuid;q jsonb;question_set jsonb:='[]';token text;match private.kairo_duels;entry private.kairo_duel_ai_requests;chosen_subject text;chosen_grade int;offset_value int;begin
 caller:=private.kairo_caller();
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>200000 then raise exception 'Sorğu uyğun deyil.';end if;
 perform private.kairo_limit(caller,'platform',120);
 if operation like 'admin.%' then perform private.kairo_require_admin();end if;
 if operation='admin.overview' then
  offset_value:=greatest(0,least(coalesce((payload->>'offset')::int,0),100000));
  return jsonb_build_object('totals',jsonb_build_object('accounts',(select count(*) from auth.users),'attempts',(select count(*) from public.practice_attempts),'total',(select coalesce(sum(total),0) from public.practice_attempts),'correct',(select coalesce(sum(correct),0) from public.practice_attempts),'duels',(select count(*) from private.kairo_duels where status in('finished','abandoned')),'active_duels',(select count(*) from private.kairo_duels where status in('countdown','active','round_result')),'focus_seconds',(select coalesce(sum(seconds),0) from private.kairo_focus_days),'arenas',(select count(*) from private.kairo_tournaments),'active_today',(select count(distinct user_id) from private.activity_events where created_at>=date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku')),
  'users',(select coalesce(jsonb_agg(x order by x.created_at desc,x.id),'[]') from (select u.id,u.email,u.created_at,u.last_sign_in_at,p.first_name,p.last_name,p.grade,p.suspended,
  (select count(*) from public.practice_attempts a where a.user_id=u.id) attempts,(select coalesce(sum(total),0) from public.practice_attempts a where a.user_id=u.id) total,(select coalesce(sum(correct),0) from public.practice_attempts a where a.user_id=u.id) correct,private.kairo_duel_stats(u.id) duel_stats
  from auth.users u left join public.account_profiles p on p.id=u.id where length(coalesce(payload->>'search',''))<=80 and (coalesce(payload->>'search','')='' or concat_ws(' ',u.email,p.first_name,p.last_name) ilike '%'||(payload->>'search')||'%') order by u.created_at desc,u.id limit 25 offset offset_value) x),'ranking',private.kairo_ranking(true));
 elsif operation='admin.user' then
  person:=(payload->>'user_id')::uuid;
  if not exists(select 1 from auth.users where id=person) then raise exception 'Hesab tapılmadı.';end if;
  perform private.kairo_audit('user.inspect',person::text);
  return jsonb_build_object('account',private.admin_control('detail',person),'insights',private.kairo_insights(person));
 elsif operation='admin.session' then
  person:=(payload->>'user_id')::uuid;mid:=(payload->>'id')::uuid;
  if payload->>'kind'='exam' then
   if not exists(select 1 from private.kairo_exam_sessions where id=mid and user_id=person) then raise exception 'Sessiya tapılmadı.';end if;
   result:=(select jsonb_build_object('kind','exam','items',coalesce(jsonb_agg(jsonb_build_object('ordinal',i.ordinal,'question',i.snapshot,'key',i.answer_key,'explanation',i.explanation,'answer',a.value,'saved_at',a.saved_at,'correct',private.kairo_mark(i.snapshot->>'type',i.answer_key,a.value)) order by i.ordinal),'[]')) from private.kairo_exam_items i left join private.kairo_exam_answers a using(session_id,ordinal) where i.session_id=mid);
  elsif payload->>'kind'='duel' then
   select * into match from private.kairo_duels where id=mid and exists(select 1 from private.kairo_duel_players where match_id=mid and user_id=person);
   if not found then raise exception 'Duel tapılmadı.';end if;
   result:=(select jsonb_build_object('kind','duel','items',coalesce(jsonb_agg(jsonb_build_object('ordinal',n-1,'question',private.kairo_question_public(x),'key',x->'answer_key','explanation',x->>'explanation','answer',a.answer,'correct',coalesce(a.correct,false),'points',a.total_points,'duration_ms',a.duration_ms) order by n),'[]')) from jsonb_array_elements(match.question_set) with ordinality e(x,n) left join private.kairo_duel_answers a on a.match_id=mid and a.user_id=person and a.round_index=n-1);
  else raise exception 'Sessiya növü uyğun deyil.';end if;
  perform private.kairo_audit('session.inspect',mid::text,jsonb_build_object('user',person));return result;
 elsif operation='insights.get' then return private.kairo_insights(caller);
 elsif operation='ranking.get' then return private.kairo_ranking(false);
 elsif operation like 'plan.%' then
  chosen_subject:=payload->>'subject';chosen_grade:=(payload->>'grade')::int;
  if chosen_subject not in('Riyaziyyat','Fizika','Kimya','Biologiya','Coğrafiya') or chosen_grade not between 1 and 11 or chosen_subject is null or chosen_grade is null then raise exception 'Fənn və sinif seç.';end if;
  ctx:=private.kairo_plan_context(caller,chosen_subject,chosen_grade);
  if operation='plan.get' then return jsonb_build_object('context',ctx,'saved',(select to_jsonb(p)-array['user_id','lease_id','lease_until'] from private.kairo_adaptive_plans p where user_id=caller and subject=chosen_subject and grade=chosen_grade));end if;
  if operation in('plan.claim','plan.save','plan.fail') and not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
  insert into private.kairo_adaptive_plans(user_id,subject,grade) values(caller,chosen_subject,chosen_grade) on conflict do nothing;
  select * into row_plan from private.kairo_adaptive_plans where user_id=caller and subject=chosen_subject and grade=chosen_grade for update;
  if operation='plan.claim' then
   if jsonb_array_length(ctx->'attempts')=0 or payload->>'version' is distinct from ctx->>'version' then raise exception 'Aktual sınaq nəticəsi tələb olunur.';end if;
   if row_plan.lease_until>now() then return jsonb_build_object('claimed',false);end if;
   lease:=gen_random_uuid();update private.kairo_adaptive_plans set lease_until=now()+interval '3 minutes',lease_id=lease where user_id=caller and subject=chosen_subject and grade=chosen_grade;
   return jsonb_build_object('claimed',true,'lease',lease);
  elsif operation='plan.save' then
   if row_plan.lease_id is distinct from (payload->>'lease')::uuid or row_plan.lease_until<now() or payload->>'version' is distinct from ctx->>'version' then raise exception 'Nəticələr dəyişib. Planı yenilə.';end if;
   q:=payload->'plan';if jsonb_typeof(q->'days') is distinct from 'array' or jsonb_array_length(q->'days')<>7 then raise exception 'Yeddi günlük plan tələb olunur.';end if;
   update private.kairo_adaptive_plans set plan=q,source_version=ctx->>'version',daily_minutes=(payload->>'dailyMinutes')::int,lease_until=null,lease_id=null,updated_at=now() where user_id=caller and subject=chosen_subject and grade=chosen_grade;
  elsif operation='plan.fail' then
   update private.kairo_adaptive_plans set lease_until=null,lease_id=null where user_id=caller and subject=chosen_subject and grade=chosen_grade and lease_id=(payload->>'lease')::uuid;
  elsif operation='plan.task' then
   if length(payload->>'key') not between 3 and 600 or jsonb_typeof(payload->'done') is distinct from 'boolean' or not exists(select 1 from jsonb_array_elements(row_plan.plan->'days') d cross join lateral jsonb_array_elements_text(d->'tasks') t where (d->>'topic')||':'||t=payload->>'key') then raise exception 'Plan tapşırığı tapılmadı.';end if;
   update private.kairo_adaptive_plans set completed=jsonb_set(completed,array[payload->>'key'],payload->'done') where user_id=caller and subject=chosen_subject and grade=chosen_grade;
  else raise exception 'Plan əməliyyatı uyğun deyil.';end if;
  return jsonb_build_object('context',ctx,'saved',(select to_jsonb(p)-array['user_id','lease_id','lease_until'] from private.kairo_adaptive_plans p where user_id=caller and subject=chosen_subject and grade=chosen_grade));
 elsif operation like 'duel.ai.%' then
  if not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
  settings:=private.kairo_duel_settings(payload->'settings');rid:=(payload->>'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
  select * into entry from private.kairo_duel_ai_requests where user_id=caller and request_id=rid;
  if found and entry.settings<>settings then raise exception 'Sorğu eyni seçimlə təkrarlanmalıdır.';end if;
  if entry.match_id is not null then return private.kairo_duel_read(caller,entry.match_id);end if;
  if not exists(select 1 from private.kairo_profiles where user_id=caller and consent_public) then raise exception 'Əvvəl yarış ləqəbini təsdiqlə.';end if;
  if private.kairo_engaged(caller) then raise exception 'Əvvəl aktiv sınaq və ya dueli bitir.';end if;
  if operation='duel.ai.claim' then
   if entry.lease_until>now() then raise exception 'Sual dəsti artıq hazırlanır.';end if;
   if coalesce((payload->>'find')::boolean,false) then
    select d.* into match from private.kairo_matchmaking m join private.kairo_duels d on d.id=m.match_id where m.user_id<>caller and m.settings=settings and d.settings->>'question_source'='ai' and d.status='waiting' and d.invitation_expires>now() order by m.created_at limit 1 for update of d skip locked;
    if found and not private.kairo_engaged(match.host_id,match.id) then
     insert into private.kairo_duel_players(match_id,user_id,seat) values(match.id,caller,2);update private.kairo_duels set status='ready',updated_at=clock_timestamp() where id=match.id;delete from private.kairo_matchmaking where match_id=match.id;
     insert into private.kairo_duel_ai_requests(user_id,request_id,settings,match_id) values(caller,rid,settings,match.id) on conflict(user_id,request_id) do update set match_id=excluded.match_id;
     return private.kairo_duel_read(caller,match.id);
    end if;
   end if;
   insert into private.kairo_duel_ai_requests(user_id,request_id,settings) values(caller,rid,settings) on conflict(user_id,request_id) do update set lease_until=now()+interval '3 minutes';
   return jsonb_build_object('generate',true,'excluded',(select coalesce(jsonb_agg(x->'body'->>'statement'),'[]') from (select d.question_set from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id where p.user_id=caller order by d.created_at desc limit 10) h cross join lateral jsonb_array_elements(h.question_set) x));
  elsif operation='duel.ai.save' then
   if entry.request_id is null or entry.lease_until<now() then raise exception 'Sorğunun müddəti bitib.';end if;
   if jsonb_typeof(payload->'questions') is distinct from 'array' or jsonb_array_length(payload->'questions')<>(settings->>'count')::int then raise exception 'Sual sayı uyğun deyil.';end if;
   for q in select value from jsonb_array_elements(payload->'questions') loop
    perform private.kairo_validate_question(q);
    if q->>'subject'<>settings->>'subject' or q->>'grade'<>settings->>'grade' or q->>'type'<>'single' or (settings->>'topic'<>'' and q->>'topic'<>settings->>'topic') or (settings->>'difficulty'<>'mixed' and q->>'difficulty'<>settings->>'difficulty') then raise exception 'Sual seçilmiş səviyyəyə uyğun deyil.';end if;
    if exists(select 1 from jsonb_array_elements(question_set) x where lower(regexp_replace(x->'body'->>'statement','[[:space:]]+',' ','g'))=lower(regexp_replace(q->'body'->>'statement','[[:space:]]+',' ','g'))) or exists(select 1 from (select d.question_set from private.kairo_duels d join private.kairo_duel_players p on p.match_id=d.id where p.user_id=caller order by d.created_at desc limit 10) h cross join lateral jsonb_array_elements(h.question_set) x where lower(regexp_replace(x->'body'->>'statement','[[:space:]]+',' ','g'))=lower(regexp_replace(q->'body'->>'statement','[[:space:]]+',' ','g'))) then raise exception 'Təkrarlanan duel sualı qəbul edilmir.';end if;
    question_set:=question_set||jsonb_build_array(q||jsonb_build_object('id',gen_random_uuid()));
   end loop;
   token:=encode(extensions.gen_random_bytes(24),'hex');
   insert into private.kairo_duels(host_id,settings,invitation_hash,invitation_expires,public_match,question_set) values(caller,settings||'{"question_source":"ai"}'::jsonb,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '20 minutes',coalesce((payload->>'find')::boolean,false),question_set) returning id into mid;
   insert into private.kairo_duel_players(match_id,user_id,seat) values(mid,caller,1);
   if coalesce((payload->>'find')::boolean,false) then insert into private.kairo_matchmaking(user_id,match_id,settings) values(caller,mid,settings);end if;
   update private.kairo_duel_ai_requests set match_id=mid where user_id=caller and request_id=rid;
   return private.kairo_duel_read(caller,mid)||jsonb_build_object('token',token);
  else raise exception 'Duel əməliyyatı uyğun deyil.';end if;
 else raise exception 'Əməliyyat tapılmadı.';end if;
end $$;
create function public.platform_api(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.platform_api(operation,payload);$$;
-- Helper functions remain private and uncallable directly by clients.
revoke all on function private.kairo_rate_duel(),private.kairo_duel_stats(uuid),private.kairo_plan_context(uuid,text,int),private.kairo_insights(uuid),private.kairo_ranking(boolean),private.platform_api(text,jsonb),public.platform_api(text,jsonb) from public,anon,authenticated;
grant execute on function private.platform_api(text,jsonb),public.platform_api(text,jsonb) to authenticated;
