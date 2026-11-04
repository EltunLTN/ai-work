create or replace function private.kairo_tutor_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  if action ~ '^hint[123]$' and not exists(select 1 from private.kairo_tutor_messages where session_id=s.id and request_id=turn) then
   if right(action,1)::int>config.max_hints or right(action,1)::int>s.hint_level+1 then raise exception 'İpuclarını ardıcıllıqla seç.';end if;
  end if;
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
 return jsonb_build_object('session',to_jsonb(s)-'user_id','limits',jsonb_build_object('max_hints',config.max_hints,'max_turns',config.max_turns),'messages',(select coalesce(jsonb_agg(to_jsonb(m)-'session_id' order by created_at,id),'[]') from (select * from private.kairo_tutor_messages where session_id=s.id order by created_at desc,id desc limit 80) m));
end $$;

-- Separate officially listed teaching languages; cutoffs remain unknown.
update private.kairo_programs set language='Azərbaycan' where id='a3360ea4-9b2e-50a1-adac-3eb08f8b4a89';
insert into private.kairo_programs(university_id,code,name,language,study_format,year,source_url,published) select university_id,code,name,'Rus',study_format,year,source_url,published from private.kairo_programs where id='a3360ea4-9b2e-50a1-adac-3eb08f8b4a89' on conflict(university_id,name,language,study_format,year) do nothing;
insert into private.kairo_programs(university_id,code,name,language,study_format,year,source_url,published) select university_id,code,name,'İngilis',study_format,year,source_url,published from private.kairo_programs where id='a3360ea4-9b2e-50a1-adac-3eb08f8b4a89' on conflict(university_id,name,language,study_format,year) do nothing;
