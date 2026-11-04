create or replace function private.kairo_focus_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
   -- Retain subsecond remainder across heartbeats. Only round the final subsecond at the actual deadline.
   if gap<=40 and clock_timestamp()>=s.deadline and s.phase_seconds-s.phase_credited<=30 and s.phase_seconds-s.phase_credited-credit between 0 and 1 then credit:=s.phase_seconds-s.phase_credited;end if;
   if s.phase='focus' and credit>0 then
    insert into private.kairo_focus_days(user_id,day,seconds)
    select caller,((s.last_seen+make_interval(secs=>n)) at time zone 'Asia/Baku')::date,count(*) from generate_series(1,credit) n group by 2
    on conflict(user_id,day) do update set seconds=kairo_focus_days.seconds+excluded.seconds;
   end if;
   remaining:=s.phase_seconds-s.phase_credited-credit;
   update private.kairo_focus_sessions set phase_credited=phase_credited+credit,focused_seconds=focused_seconds+case when phase='focus' then credit else 0 end,break_seconds=break_seconds+case when phase='break' then credit else 0 end,last_seen=case when gap>40 then clock_timestamp() else last_seen+make_interval(secs=>credit) end where id=s.id returning * into s;
   if gap>40 or (s.deadline<=clock_timestamp() and remaining>0) then
    update private.kairo_focus_sessions set status='paused' where id=s.id returning * into s;
   elsif remaining<=0 and clock_timestamp()>=s.deadline then
    if s.phase='focus' then
     insert into private.kairo_focus_days(user_id,day,rounds) values(caller,(clock_timestamp() at time zone 'Asia/Baku')::date,1) on conflict(user_id,day) do update set rounds=kairo_focus_days.rounds+1;
     if s.round >= (s.settings->>'rounds')::int then update private.kairo_focus_sessions set status='completed',completed_rounds=completed_rounds+1,ended_at=clock_timestamp() where id=s.id returning * into s;
     else next_seconds:=case when s.round%4=0 then (s.settings->>'long_break')::int else (s.settings->>'short_break')::int end*60;
      update private.kairo_focus_sessions set completed_rounds=completed_rounds+1,phase='break',phase_credited=0,last_seen=clock_timestamp(),phase_seconds=next_seconds,deadline=clock_timestamp()+make_interval(secs=>next_seconds),status=case when (s.settings->>'auto_break')::boolean then 'active' else 'paused' end where id=s.id returning * into s;
     end if;
    else next_seconds:=(s.settings->>'focus')::int*60;update private.kairo_focus_sessions set phase='focus',round=round+1,phase_credited=0,last_seen=clock_timestamp(),phase_seconds=next_seconds,deadline=clock_timestamp()+make_interval(secs=>next_seconds),status='paused' where id=s.id returning * into s;
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

