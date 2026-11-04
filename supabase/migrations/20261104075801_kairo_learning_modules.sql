create table private.kairo_universities(id uuid primary key default gen_random_uuid(),name text not null unique,source_url text not null,verified_at timestamptz not null default now());
create table private.kairo_programs(
 id uuid primary key default gen_random_uuid(),university_id uuid not null references private.kairo_universities(id),code text,name text not null,
 admission_group text,language text not null default 'Məlumat təsdiqlənməyib',study_format text not null default 'Məlumat təsdiqlənməyib',
 year int not null check(year between 2020 and 2100),cutoff numeric check(cutoff between 0 and 700),state_cutoff numeric check(state_cutoff between 0 and 700),minimum_requirement text,
 source_url text not null,source_published date,verified_at timestamptz not null default now(),published boolean not null default false,
 unique(university_id,name,language,study_format,year)
);
create index kairo_program_university_idx on private.kairo_programs(university_id);
create table private.kairo_goals(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 program_id uuid not null references private.kairo_programs(id),target_score numeric not null check(target_score between 0 and 700),
 admission_year int not null check(admission_year between 2026 and 2100),funding text not null check(funding in ('state','tuition','either')),
 is_primary boolean not null default false,archived_at timestamptz,created_at timestamptz not null default now(),unique(user_id,program_id,admission_year,funding)
);
create unique index kairo_goal_primary_idx on private.kairo_goals(user_id) where is_primary;
create index kairo_goal_program_idx on private.kairo_goals(program_id);
create table private.kairo_focus_preferences(user_id uuid primary key references auth.users(id) on delete cascade,settings jsonb not null default '{"focus":25,"short_break":5,"long_break":15,"rounds":4,"auto_break":false,"sound":false,"daily_goal":60}');
create table private.kairo_focus_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,
 subject text not null,task text not null check(length(task)<=300),return_path text not null default '/dashboard',settings jsonb not null,
 status text not null default 'active' check(status in ('active','paused','completed','ended','abandoned')),
 phase text not null default 'focus' check(phase in ('focus','break')),round int not null default 1,
 phase_seconds int not null,phase_credited int not null default 0,focused_seconds int not null default 0,break_seconds int not null default 0,
 completed_rounds int not null default 0,last_seen timestamptz not null default clock_timestamp(),deadline timestamptz not null,started_at timestamptz not null default clock_timestamp(),ended_at timestamptz,
 unique(user_id,request_id)
);
create index kairo_focus_user_idx on private.kairo_focus_sessions(user_id,started_at desc);
create unique index kairo_focus_active_idx on private.kairo_focus_sessions(user_id) where status in ('active','paused');
create table private.kairo_focus_days(user_id uuid not null references auth.users(id) on delete cascade,day date not null,seconds int not null default 0,rounds int not null default 0,primary key(user_id,day));
create table private.kairo_tutor_sessions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 question_id uuid references private.kairo_questions(id),subject text not null,grade int not null check(grade between 1 and 11),topic text not null,
 question_context jsonb not null default '{}',mode text not null default 'socratic' check(mode in ('socratic','explain','practice')),
 hint_level int not null default 0 check(hint_level between 0 and 3),hint_count int not null default 0,attempts int not null default 0,solution_revealed boolean not null default false,
 solved_verified boolean not null default false,status text not null default 'active' check(status in ('active','completed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index kairo_tutor_user_idx on private.kairo_tutor_sessions(user_id,updated_at desc);
create index kairo_tutor_question_idx on private.kairo_tutor_sessions(question_id);
create table private.kairo_tutor_messages(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.kairo_tutor_sessions(id) on delete cascade,
 request_id uuid not null,role text not null check(role in ('user','assistant')),
 content text not null check(length(content) between 1 and 12000),action text not null default 'message',
 status text not null default 'complete' check(status in ('pending','complete','error','stopped')),created_at timestamptz not null default clock_timestamp(),unique(session_id,request_id,role)
);
create index kairo_tutor_message_session_idx on private.kairo_tutor_messages(session_id,created_at);
create table private.kairo_tutor_config(id boolean primary key default true check(id),enabled boolean not null default true,max_hints int not null default 3 check(max_hints between 1 and 3),max_turns int not null default 40 check(max_turns between 5 and 60));
insert into private.kairo_tutor_config(id) values(true);

create function private.kairo_goals_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare gid uuid;result jsonb;begin
 if operation='goals.save' then
  perform pg_advisory_xact_lock(hashtextextended('kairo-goals:'||caller,0));
  if (select count(*) from private.kairo_goals where user_id=caller and archived_at is null)>=12 then raise exception 'Ən çox 12 hədəf saxla.';end if;
  if not exists(select 1 from private.kairo_programs where id=(p->>'program')::uuid and published) then raise exception 'Proqram təsdiqlənməyib.';end if;
  insert into private.kairo_goals(user_id,program_id,target_score,admission_year,funding) values(caller,(p->>'program')::uuid,(p->>'target')::numeric,(p->>'year')::int,p->>'funding')
  on conflict(user_id,program_id,admission_year,funding) do update set target_score=excluded.target_score,archived_at=null returning id into gid;
  if not exists(select 1 from private.kairo_goals where user_id=caller and is_primary) then update private.kairo_goals set is_primary=true where id=gid;end if;
 elsif operation='goals.primary' then
  perform pg_advisory_xact_lock(hashtextextended('kairo-goals:'||caller,0));
  if not exists(select 1 from private.kairo_goals where id=(p->>'id')::uuid and user_id=caller and archived_at is null) then raise exception 'Hədəf tapılmadı.' using errcode='42501';end if;
  update private.kairo_goals set is_primary=false where user_id=caller and is_primary;update private.kairo_goals set is_primary=true where id=(p->>'id')::uuid and user_id=caller;
 elsif operation='goals.archive' then
  -- User-visible removal is recoverable and does not delete admission or historical exam data.
  update private.kairo_goals set is_primary=false,archived_at=now() where id=(p->>'id')::uuid and user_id=caller;
  if not exists(select 1 from private.kairo_goals where user_id=caller and is_primary) then update private.kairo_goals set is_primary=true where id=(select id from private.kairo_goals where user_id=caller and archived_at is null order by created_at limit 1);end if;
 elsif operation<>'goals.get' then raise exception 'Naməlum hədəf əməliyyatı.';end if;
 select jsonb_build_object(
 'universities',(select coalesce(jsonb_agg(to_jsonb(u) order by u.name),'[]') from private.kairo_universities u),
 'programs',(select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('university',u.name) order by u.name,c.name),'[]') from private.kairo_programs c join private.kairo_universities u on u.id=c.university_id where c.published),
 'goals',(select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('program',to_jsonb(c),'university',u.name) order by g.is_primary desc,g.created_at desc),'[]') from private.kairo_goals g join private.kairo_programs c on c.id=g.program_id join private.kairo_universities u on u.id=c.university_id where g.user_id=caller and g.archived_at is null),
 'mock_history',(select coalesce(jsonb_agg(x order by x.started_at),'[]') from (select s.id,s.started_at,s.template_snapshot->>'name' name,s.template_snapshot->>'scale' scale,s.template_snapshot->>'official_format' official_format,r.earned,r.maximum from private.kairo_exam_sessions s join private.kairo_exam_results r on r.session_id=s.id where s.user_id=caller and s.mode='exam' and r.status='final' order by s.started_at desc limit 30) x),
 'priorities',(select coalesce(jsonb_agg(x order by x.correct::numeric/nullif(x.total,0)),'[]') from (select subject,grade,t->>'topic' topic,sum((t->>'total')::int) total,sum((t->>'correct')::int) correct from public.practice_attempts a cross join lateral jsonb_array_elements(a.topic_scores) t where a.user_id=caller group by subject,grade,t->>'topic' order by sum((t->>'correct')::int)::numeric/nullif(sum((t->>'total')::int),0) limit 6) x)
 ) into result;return result;end $$;

create function private.kairo_focus_settings(settings jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
begin
 if not coalesce(jsonb_typeof(settings)='object' and (settings->>'focus')::int between 1 and 120 and (settings->>'short_break')::int between 1 and 30 and (settings->>'long_break')::int between 1 and 60 and (settings->>'rounds')::int between 1 and 8 and (settings->>'daily_goal')::int between 5 and 720,false) then raise exception 'Fokus müddətləri uyğun deyil.';end if;
 return jsonb_build_object('focus',(settings->>'focus')::int,'short_break',(settings->>'short_break')::int,'long_break',(settings->>'long_break')::int,'rounds',(settings->>'rounds')::int,'daily_goal',(settings->>'daily_goal')::int,'auto_break',coalesce((settings->>'auto_break')::boolean,false),'sound',coalesce((settings->>'sound')::boolean,false));end $$;
create function private.kairo_focus_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.kairo_focus_sessions;settings jsonb;credit int;remaining int;sid uuid;gap int;next_seconds int;begin
 perform pg_advisory_xact_lock(hashtextextended('kairo-focus:'||caller,0));
 if operation='focus.preferences' then settings:=private.kairo_focus_settings(p->'settings');insert into private.kairo_focus_preferences(user_id,settings) values(caller,settings) on conflict(user_id) do update set settings=excluded.settings;
 elsif operation='focus.start' then
  select * into s from private.kairo_focus_sessions where user_id=caller and request_id=(p->>'request_id')::uuid;
  if not found then
   if exists(select 1 from private.kairo_focus_sessions where user_id=caller and status in ('active','paused')) then raise exception 'Aktiv fokus sessiyanı davam etdir və ya bitir.';end if;
   settings:=private.kairo_focus_settings(p->'settings');
   if coalesce(p->>'return_path','/dashboard') !~ '^/(dashboard|plan|quiz|mini-quiz|results|kairo/[a-z/-]+)$' or length(coalesce(p->>'task',''))>300 or length(coalesce(p->>'subject','')) not between 1 and 80 then raise exception 'Fokus tapşırığı uyğun deyil.';end if;
   insert into private.kairo_focus_sessions(user_id,request_id,subject,task,return_path,settings,phase_seconds,deadline)
   values(caller,(p->>'request_id')::uuid,p->>'subject',coalesce(p->>'task',''),coalesce(p->>'return_path','/dashboard'),settings,(settings->>'focus')::int*60,clock_timestamp()+make_interval(mins=>(settings->>'focus')::int)) returning * into s;
  end if;
 elsif operation not in ('focus.get','focus.preferences') then
  select * into s from private.kairo_focus_sessions where id=(p->>'id')::uuid and user_id=caller for update;
  if not found then raise exception 'Fokus sessiyası tapılmadı.' using errcode='42501';end if;
  if s.status='active' then
   gap:=greatest(0,floor(extract(epoch from (clock_timestamp()-s.last_seen)))::int);
   credit:=case when gap>40 then 0 else least(30,greatest(0,floor(extract(epoch from (least(clock_timestamp(),s.deadline)-s.last_seen)))::int),s.phase_seconds-s.phase_credited) end;
   if s.phase='focus' and credit>0 then
    insert into private.kairo_focus_days(user_id,day,seconds)
    select caller,((s.last_seen+make_interval(secs=>n)) at time zone 'Asia/Baku')::date,count(*) from generate_series(1,credit) n group by 2
    on conflict(user_id,day) do update set seconds=kairo_focus_days.seconds+excluded.seconds;
   end if;
   remaining:=s.phase_seconds-s.phase_credited-credit;
   update private.kairo_focus_sessions set phase_credited=phase_credited+credit,focused_seconds=focused_seconds+case when phase='focus' then credit else 0 end,break_seconds=break_seconds+case when phase='break' then credit else 0 end,last_seen=clock_timestamp() where id=s.id returning * into s;
   if gap>40 or (s.deadline<=clock_timestamp() and remaining>1) then
    update private.kairo_focus_sessions set status='paused' where id=s.id returning * into s;
   elsif remaining<=1 then
    if s.phase='focus' then
     insert into private.kairo_focus_days(user_id,day,rounds) values(caller,(clock_timestamp() at time zone 'Asia/Baku')::date,1) on conflict(user_id,day) do update set rounds=kairo_focus_days.rounds+1;
     if s.round >= (s.settings->>'rounds')::int then update private.kairo_focus_sessions set status='completed',completed_rounds=completed_rounds+1,ended_at=clock_timestamp() where id=s.id returning * into s;
     else next_seconds:=case when s.round%4=0 then (s.settings->>'long_break')::int else (s.settings->>'short_break')::int end*60;
      update private.kairo_focus_sessions set completed_rounds=completed_rounds+1,phase='break',phase_credited=0,phase_seconds=next_seconds,deadline=clock_timestamp()+make_interval(secs=>next_seconds),status=case when (s.settings->>'auto_break')::boolean then 'active' else 'paused' end where id=s.id returning * into s;
     end if;
    else next_seconds:=(s.settings->>'focus')::int*60;update private.kairo_focus_sessions set phase='focus',round=round+1,phase_credited=0,phase_seconds=next_seconds,deadline=clock_timestamp()+make_interval(secs=>next_seconds),status='paused' where id=s.id returning * into s;
    end if;
   end if;
  end if;
  if operation='focus.pause' and s.status='active' then update private.kairo_focus_sessions set status='paused' where id=s.id returning * into s;
  elsif operation='focus.resume' and s.status='paused' then update private.kairo_focus_sessions set status='active',last_seen=clock_timestamp(),deadline=clock_timestamp()+make_interval(secs=>phase_seconds-phase_credited) where id=s.id returning * into s;
  elsif operation='focus.end' and s.status in ('active','paused') then update private.kairo_focus_sessions set status='ended',ended_at=clock_timestamp() where id=s.id returning * into s;
  elsif operation not in ('focus.pause','focus.resume','focus.end','focus.heartbeat') then raise exception 'Naməlum fokus əməliyyatı.';end if;
 end if;
 -- A stale open tab never earns time merely by reappearing.
 update private.kairo_focus_sessions set status='paused' where user_id=caller and status='active' and last_seen<clock_timestamp()-interval '40 seconds';
 return jsonb_build_object('server_now',clock_timestamp(),
 'active',(select to_jsonb(a)-'user_id' from private.kairo_focus_sessions a where user_id=caller and status in ('active','paused') order by started_at desc limit 1),
 'preferences',coalesce((select fp.settings from private.kairo_focus_preferences fp where user_id=caller),'{"focus":25,"short_break":5,"long_break":15,"rounds":4,"auto_break":false,"sound":false,"daily_goal":60}'),
 'history',(select coalesce(jsonb_agg(x order by x.started_at desc),'[]') from (select id,subject,task,status,focused_seconds,break_seconds,completed_rounds,started_at,ended_at from private.kairo_focus_sessions where user_id=caller order by started_at desc limit 60) x),
 'today',(select coalesce(sum(seconds),0) from private.kairo_focus_days where user_id=caller and day=(now() at time zone 'Asia/Baku')::date),
 'week',(select coalesce(jsonb_agg(x order by x.day),'[]') from (select day,seconds,rounds from private.kairo_focus_days where user_id=caller and day>=(now() at time zone 'Asia/Baku')::date-6) x));
end $$;

create function private.kairo_tutor_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.kairo_tutor_sessions; q private.kairo_questions;sid uuid;turn uuid;action text;config private.kairo_tutor_config;begin
 select * into config from private.kairo_tutor_config where id=true;
 if operation='tutor.list' then return jsonb_build_object('sessions',(select coalesce(jsonb_agg(x order by x.updated_at desc),'[]') from (select id,subject,grade,topic,mode,hint_level,attempts,solution_revealed,solved_verified,status,updated_at from private.kairo_tutor_sessions where user_id=caller order by updated_at desc limit 30) x));end if;
 if operation='tutor.create' then
  if not config.enabled then raise exception 'AI müəllim hazırda bağlıdır.';end if;
  if (p->>'grade')::int not between 1 and 11 or length(coalesce(p->>'subject','')) not between 1 and 80 or length(coalesce(p->>'topic','')) not between 1 and 200 then raise exception 'Təhsil seçimi uyğun deyil.';end if;
  if p->>'question_id' is not null then select * into q from private.kairo_questions where id=(p->>'question_id')::uuid and status='reviewed';if not found then raise exception 'Sual tapılmadı.';end if;end if;
  if length(coalesce(p->>'statement',''))>4000 then raise exception 'Sual həddən artıq uzundur.';end if;
  insert into private.kairo_tutor_sessions(user_id,question_id,subject,grade,topic,question_context,mode)
  values(caller,q.id,coalesce(q.subject,p->>'subject'),coalesce(q.grade,(p->>'grade')::int),coalesce(q.topic,p->>'topic'),
   case when q.id is not null then jsonb_build_object('statement',q.body->>'statement','type',q.type) else jsonb_build_object('statement',coalesce(p->>'statement','')) end,coalesce(p->>'mode','socratic')) returning * into s;
 else
  select * into s from private.kairo_tutor_sessions where id=(p->>'id')::uuid and user_id=caller for update;
  if not found then raise exception 'Dərs sessiyası tapılmadı.' using errcode='42501';end if;
 end if;
 if operation='tutor.mode' then update private.kairo_tutor_sessions set mode=p->>'mode',updated_at=now() where id=s.id returning * into s;
 elsif operation='tutor.complete' then
  update private.kairo_tutor_sessions set status='completed',updated_at=now() where id=s.id returning * into s;
  insert into private.kairo_learning_events(user_id,source,source_id,subject,topic,data,independent) values(caller,'tutor',s.id,s.subject,s.topic,jsonb_build_object('hints',s.hint_count,'attempts',s.attempts,'solution_revealed',s.solution_revealed,'verified',s.solved_verified),false) on conflict do nothing;
 elsif operation='tutor.begin' then
  -- Server route alone performs model calls, but session state and hint progression are always validated here.
  if not config.enabled or private.kairo_tools_locked(caller) then raise exception 'Aktiv imtahan və ya duel zamanı AI yardımı bağlıdır.';end if;
  turn:=(p->>'request_id')::uuid;action:=coalesce(p->>'action','message');
  if action not in ('message','hint1','hint2','hint3','check','solution','practice') or length(coalesce(p->>'message','')) not between 1 and 6000 then raise exception 'Mesaj uyğun deyil.';end if;
  if exists(select 1 from private.kairo_tutor_messages where session_id=s.id and request_id=turn and role='assistant' and status='complete') then null;
  elsif exists(select 1 from private.kairo_tutor_messages where session_id=s.id and role='user' and status='pending' and created_at>now()-interval '2 minutes' and request_id<>turn) then raise exception 'Əvvəlki cavab hazırlanır.';
  else
   if (select count(*) from private.kairo_tutor_messages where session_id=s.id and role='user')>=config.max_turns then raise exception 'Bu dərsin mesaj limiti tamamlanıb. Yeni sessiya aç.';end if;
   if not exists(select 1 from private.kairo_tutor_messages where session_id=s.id and request_id=turn and role='user') then
    update private.kairo_tutor_sessions set hint_level=case when action='hint1' then greatest(hint_level,1) when action='hint2' then greatest(hint_level,least(2,config.max_hints)) when action='hint3' then config.max_hints else hint_level end,
     hint_count=hint_count+case when action in ('hint1','hint2','hint3') then 1 else 0 end,attempts=attempts+case when action='check' then 1 else 0 end,solution_revealed=solution_revealed or action='solution',updated_at=now() where id=s.id returning * into s;
   end if;
   insert into private.kairo_tutor_messages(session_id,request_id,role,content,action,status) values(s.id,turn,'user',p->>'message',action,'pending')
   on conflict(session_id,request_id,role) do update set status='pending';
  end if;
 elsif operation in ('tutor.finish','tutor.fail') then
  if coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-audit','')='' or not exists(select 1 from private.activity_server_keys where digest=encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-audit',''),'sha256'),'hex')) then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
  turn:=(p->>'request_id')::uuid;
  if not exists(select 1 from private.kairo_tutor_messages where session_id=s.id and request_id=turn and role='user') then raise exception 'Mesaj tapılmadı.';end if;
  if operation='tutor.finish' then
   if length(coalesce(p->>'answer','')) not between 1 and 12000 then raise exception 'AI cavabı uyğun deyil.';end if;
   insert into private.kairo_tutor_messages(session_id,request_id,role,content) values(s.id,turn,'assistant',p->>'answer') on conflict do nothing;
   update private.kairo_tutor_sessions set solved_verified=solved_verified or coalesce((p->>'verified')::boolean,false),updated_at=now() where id=s.id returning * into s;
  end if;
  update private.kairo_tutor_messages set status=case when operation='tutor.finish' then 'complete' when p->>'stopped'='true' then 'stopped' else 'error' end where session_id=s.id and request_id=turn and role='user';
 elsif operation not in ('tutor.create','tutor.get','tutor.mode','tutor.complete') then raise exception 'Naməlum müəllim əməliyyatı.';end if;
 return jsonb_build_object('session',to_jsonb(s)-'user_id','messages',(select coalesce(jsonb_agg(to_jsonb(m)-'session_id' order by created_at,id),'[]') from (select * from private.kairo_tutor_messages where session_id=s.id order by created_at desc,id desc limit 80) m));
end $$;
