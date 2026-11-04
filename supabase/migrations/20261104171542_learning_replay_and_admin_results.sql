
-- Generated exams use immutable snapshots instead of publishing AI items into the reviewed bank.
alter table private.kairo_exam_sessions alter column template_id drop not null;
alter table private.kairo_exam_items alter column question_id drop not null;
create table private.kairo_practice_requests(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,selection jsonb not null,lease_id uuid,lease_until timestamptz,session_id uuid references private.kairo_exam_sessions(id) on delete set null,created_at timestamptz not null default now(),primary key(user_id,request_id));
alter table private.kairo_practice_requests enable row level security;
revoke all on private.kairo_practice_requests from public,anon,authenticated;
-- All student records stay private; explicit own-user or admin RPC access only.
create table private.kairo_student_ids(
 user_id uuid primary key references auth.users(id) on delete cascade,
 student_id text not null unique default ('KR-'||upper(replace(gen_random_uuid()::text,'-',''))),created_at timestamptz not null default now()
);
insert into private.kairo_student_ids(user_id) select id from auth.users on conflict do nothing;
create table private.kairo_replay_events(
 id uuid primary key default gen_random_uuid(),session_id uuid not null references private.kairo_exam_sessions(id) on delete cascade,
 ordinal int not null,kind text not null check(kind in('view','focus','answer')),value jsonb,focus_ms int not null default 0 check(focus_ms between 0 and 15000),created_at timestamptz not null default clock_timestamp()
);
create index kairo_replay_session_idx on private.kairo_replay_events(session_id,ordinal,created_at);
create table private.kairo_mistake_notes(
 user_id uuid not null references auth.users(id) on delete cascade,session_id uuid not null references private.kairo_exam_sessions(id) on delete cascade,
 ordinal int not null,reason text not null check(reason in('unknown','knowledge','formula','rushing','understanding')),note text not null default '' check(length(note)<=1000),updated_at timestamptz not null default now(),primary key(user_id,session_id,ordinal)
);
alter table private.kairo_student_ids enable row level security;
alter table private.kairo_replay_events enable row level security;
alter table private.kairo_mistake_notes enable row level security;
revoke all on private.kairo_student_ids,private.kairo_replay_events,private.kairo_mistake_notes from public,anon,authenticated;

create function private.kairo_record_answer_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' and new.value is not null and new.value<>'null'::jsonb) or (tg_op='UPDATE' and new.value is distinct from old.value) then
 insert into private.kairo_replay_events(session_id,ordinal,kind,value) values(new.session_id,new.ordinal,'answer',new.value);
 end if;return new;
end $$;
revoke all on function private.kairo_record_answer_change() from public,anon,authenticated;
create trigger kairo_answer_replay after insert or update on private.kairo_exam_answers for each row execute function private.kairo_record_answer_change();

create function private.learning_api(operation text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare req private.kairo_practice_requests;rid uuid;token uuid;selection jsonb;snapshot jsonb;q jsonb;caller uuid;person uuid;sid uuid;tid uuid;s private.kairo_exam_sessions;ev jsonb;result jsonb;ord int;begin
 caller:=private.kairo_caller();
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>200000 then raise exception 'Sorğu uyğun deyil.';end if;
 perform private.kairo_limit(caller,'learning',180);
 if operation like 'admin.%' then perform private.kairo_require_admin();end if;
 if operation like 'practice.%' then
  if not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
  rid:=(payload->>'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
  if operation='practice.claim' then
   selection:=payload->'selection';
   if selection->>'mode' not in('class','mixed') or selection->>'mode' is null or (selection->>'count')::int not between 1 and 30 or (selection->>'grade')::int not between 5 and 11 or jsonb_typeof(selection->'subjects') is distinct from 'array' or jsonb_array_length(selection->'subjects') not between 1 and 5 then raise exception 'Sınaq seçimi uyğun deyil.';end if;
   insert into private.kairo_practice_requests(user_id,request_id,selection) values(caller,rid,selection) on conflict do nothing;
   select * into req from private.kairo_practice_requests where user_id=caller and request_id=rid for update;
   if req.selection is distinct from selection then raise exception 'Sorğunun seçimləri dəyişib.';end if;
   if req.session_id is not null then return jsonb_build_object('session_id',req.session_id);end if;
   if req.lease_until>now() then return jsonb_build_object('claimed',false);end if;
   if private.kairo_engaged(caller) then raise exception 'Əvvəl aktiv imtahanı və ya dueli tamamla. İmtahan tarixçəsindən davam edə bilərsən.';end if;
   token:=gen_random_uuid();update private.kairo_practice_requests set lease_id=token,lease_until=now()+interval '6 minutes' where user_id=caller and request_id=rid;
   return jsonb_build_object('lease',token,'recent',(select coalesce(jsonb_agg(stem),'[]') from (select i.snapshot->'body'->>'statement' stem from private.kairo_exam_items i join private.kairo_exam_sessions e on e.id=i.session_id where e.user_id=caller order by e.started_at desc,i.ordinal limit 40) x));
  end if;
  select * into req from private.kairo_practice_requests where user_id=caller and request_id=rid for update;
  if not found or req.lease_id is distinct from (payload->>'lease')::uuid or req.lease_until<now() then raise exception 'Sınaq hazırlama sessiyası bitib.';end if;
  if operation='practice.fail' then update private.kairo_practice_requests set lease_id=null,lease_until=null where user_id=caller and request_id=rid;return jsonb_build_object('released',true);end if;
  if operation<>'practice.save' then raise exception 'Əməliyyat uyğun deyil.';end if;
  if req.session_id is not null then return jsonb_build_object('id',req.session_id);end if;
  if private.kairo_engaged(caller) then raise exception 'Aktiv imtahan və ya duel var.';end if;
  selection:=req.selection;
  if jsonb_typeof(payload->'questions') is distinct from 'array' or jsonb_array_length(payload->'questions')<>(selection->>'count')::int*jsonb_array_length(selection->'subjects') then raise exception 'Sual sayı uyğun deyil.';end if;
  for q in select value from jsonb_array_elements(payload->'questions') loop
   perform private.kairo_validate_question(q);
   if not selection->'subjects' ? (q->>'subject') or q->>'type'<>'single' or (selection->>'mode'='class' and q->>'grade' is distinct from selection->>'grade') or (selection->>'mode'='mixed' and (q->>'grade')::int>(selection->>'grade')::int) then raise exception 'Sual sinif və fənnə uyğun deyil.';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(selection->'subjects') subj where (select count(*) from jsonb_array_elements(payload->'questions') q where q->>'subject'=subj#>>'{}')<>(selection->>'count')::int) then raise exception 'Fənn başına sual sayı uyğun deyil.';end if;
  if (select count(distinct lower(regexp_replace(q->'body'->>'statement','[[:space:]]+',' ','g'))) from jsonb_array_elements(payload->'questions') q)<>jsonb_array_length(payload->'questions') then raise exception 'Təkrarlanan sual alındı. Yenidən hazırla.';end if;
  snapshot:=jsonb_build_object('name',case when selection->>'mode'='mixed' then 'DİM hazırlığı · qarışıq mövzular' else (selection->>'grade')||'-ci sinif · fərdi sınaq' end,'version',1,'grade',(selection->>'grade')::int,'year',extract(year from now()),'scale','kairo100','max_score',100,'duration_seconds',jsonb_array_length(payload->'questions')*120,'official_format',false,'practice_mode',selection->>'mode','sections',(select jsonb_agg(jsonb_build_object('subject',subj#>>'{}','count',(selection->>'count')::int,'types',jsonb_build_array('single'))) from jsonb_array_elements(selection->'subjects') subj),'rules',jsonb_build_object('instructions','AI ilə yaradılmış məşq sualları. Rəsmi DİM imtahanı və qəbul balı deyil.','calculator',false));
  insert into private.kairo_exam_sessions(user_id,template_id,template_snapshot,mode,deadline,request_id) values(caller,null,snapshot,'exam',clock_timestamp()+make_interval(secs=>jsonb_array_length(payload->'questions')*120),rid) returning id into sid;
  ord:=0;for q in select value from jsonb_array_elements(payload->'questions') loop
   insert into private.kairo_exam_items(session_id,ordinal,question_id,snapshot,answer_key,explanation,points) values(sid,ord,null,jsonb_build_object('id',gen_random_uuid(),'subject',q->>'subject','grade',q->'grade','topic',q->>'topic','difficulty',q->>'difficulty','type',q->>'type','body',q->'body','origin','ai'),q->'answer_key',q->>'explanation',1);ord:=ord+1;
  end loop;
  update private.kairo_practice_requests set session_id=sid,lease_id=null,lease_until=null where user_id=caller and request_id=rid;
  return jsonb_build_object('id',sid);
 elsif operation='identity.get' then
  insert into private.kairo_student_ids(user_id) values(caller) on conflict do nothing;
  return (select jsonb_build_object('student_id',student_id) from private.kairo_student_ids where user_id=caller);
 elsif operation='replay.record' then
  sid:=(payload->>'id')::uuid;select * into s from private.kairo_exam_sessions where id=sid and user_id=caller for update;
  if not found then raise exception 'İmtahan tapılmadı.' using errcode='42501';end if;
  if s.status<>'active' or s.deadline<=clock_timestamp() then return jsonb_build_object('closed',true);end if;
  if jsonb_typeof(payload->'events') is distinct from 'array' or jsonb_array_length(payload->'events')>30 then raise exception 'Hadisə sayı uyğun deyil.';end if;
  for ev in select value from jsonb_array_elements(payload->'events') loop
   ord:=(ev->>'ordinal')::int;
   if ev->>'kind' not in('view','focus') or ev->>'kind' is null or not exists(select 1 from private.kairo_exam_items where session_id=sid and ordinal=ord) or coalesce((ev->>'focus_ms')::int,0) not between 0 and 15000 then raise exception 'Hadisə uyğun deyil.';end if;
   if (select count(*) from private.kairo_replay_events where session_id=sid)>15000 then raise exception 'Hadisə limiti.';end if;
   insert into private.kairo_replay_events(id,session_id,ordinal,kind,focus_ms) values((ev->>'id')::uuid,sid,ord,ev->>'kind',coalesce((ev->>'focus_ms')::int,0)) on conflict(id) do nothing;
  end loop;return jsonb_build_object('saved',true);
 elsif operation in('replay.get','admin.replay') then
  sid:=(payload->>'id')::uuid;
  select * into s from private.kairo_exam_sessions where id=sid and (user_id=caller or operation='admin.replay');
  if not found then raise exception 'İmtahan tapılmadı.' using errcode='42501';end if;
  if s.status='active' then raise exception 'Təhlil imtahan tamamlandıqdan sonra açılır.';end if;
  result:=private.kairo_exam_read(s.user_id,sid);
  if not coalesce((result->>'can_reveal')::boolean,false) and operation<>'admin.replay' then raise exception 'Yarış bitdikdən sonra təhlil açılır.';end if;
  if operation='admin.replay' then perform private.kairo_audit('replay.inspect',sid::text);end if;
  return jsonb_build_object('session',result,'events',(select coalesce(jsonb_agg(to_jsonb(e)-'session_id' order by created_at,id),'[]') from private.kairo_replay_events e where session_id=sid),'notes',(select coalesce(jsonb_agg(to_jsonb(n)-'user_id'),'[]') from private.kairo_mistake_notes n where session_id=sid and user_id=s.user_id));
 elsif operation='mistake.save' then
  sid:=(payload->>'id')::uuid;ord:=(payload->>'ordinal')::int;
  result:=private.kairo_exam_read(caller,sid);
  if not coalesce((result->>'can_reveal')::boolean,false) then raise exception 'Tamamlanmış nəticə tələb olunur.';end if;
  if not exists(select 1 from jsonb_array_elements(result->'questions') q where (q->>'ordinal')::int=ord and q->'correct'='false'::jsonb) then raise exception 'Yalnız qiymətləndirilmiş səhv cavab üçün qeyd yazılır.';end if;
  insert into private.kairo_mistake_notes(user_id,session_id,ordinal,reason,note) values(caller,sid,ord,payload->>'reason',coalesce(payload->>'note',''))
  on conflict(user_id,session_id,ordinal) do update set reason=excluded.reason,note=excluded.note,updated_at=now();return jsonb_build_object('saved',true);
 elsif operation='mistakes.get' then
  return jsonb_build_object('exams',(select coalesce(jsonb_agg(x order by x.started_at desc),'[]') from (select s.id,s.template_snapshot->>'name' name,s.started_at,r.total,r.correct,r.unanswered,r.pending from private.kairo_exam_sessions s join private.kairo_exam_results r on r.session_id=s.id where s.user_id=caller and s.status<>'active' and (s.mode<>'arena' or exists(select 1 from private.kairo_tournaments t where t.id=s.competition_id and (t.ends_at<=now() or t.status in('completed','cancelled')))) order by s.started_at desc limit 100) x),'reasons',(select coalesce(jsonb_agg(x),'[]') from (select reason,count(*) count from private.kairo_mistake_notes where user_id=caller group by reason) x));
 elsif operation='admin.competitions' then
  person:=nullif(payload->>'user_id','')::uuid;
  return jsonb_build_object('student_id',(select student_id from private.kairo_student_ids where user_id=person),
   'arenas',(select coalesce(jsonb_agg(x order by x.starts_at desc),'[]') from (select t.id,t.name,t.mode,t.status,t.starts_at,t.ends_at,(select count(*) from private.kairo_registrations r where r.tournament_id=t.id and not r.withdrawn) participants from private.kairo_tournaments t where person is null or exists(select 1 from private.kairo_registrations r where r.tournament_id=t.id and r.user_id=person) order by t.starts_at desc limit 100) x),
   'duels',(select coalesce(jsonb_agg(x order by x.created_at desc),'[]') from (select d.id,d.status,d.settings,d.created_at,d.winner_id,d.tournament_id,(select jsonb_agg(jsonb_build_object('user_id',p.user_id,'email',u.email,'name',concat_ws(' ',a.first_name,a.last_name),'correct',(select count(*) from private.kairo_duel_answers z where z.match_id=d.id and z.user_id=p.user_id and z.correct),'wrong',(select count(*) from private.kairo_duel_answers z where z.match_id=d.id and z.user_id=p.user_id and not z.correct),'score',(select coalesce(sum(total_points),0) from private.kairo_duel_answers z where z.match_id=d.id and z.user_id=p.user_id))) from private.kairo_duel_players p join auth.users u on u.id=p.user_id left join public.account_profiles a on a.id=p.user_id where p.match_id=d.id) players from private.kairo_duels d where person is null or exists(select 1 from private.kairo_duel_players p where p.match_id=d.id and p.user_id=person) order by d.created_at desc limit 100) x));
 elsif operation='admin.arena' then
  tid:=(payload->>'id')::uuid;
  if not exists(select 1 from private.kairo_tournaments where id=tid) then raise exception 'Arena tapılmadı.';end if;
  perform private.kairo_audit('arena.inspect',tid::text);
  return jsonb_build_object('tournament',(select to_jsonb(t)-'question_ids' from private.kairo_tournaments t where id=tid),
   'entries',(select coalesce(jsonb_agg(x order by x.earned desc nulls last,x.registered_at),'[]') from (select r.user_id,u.email,concat_ws(' ',p.first_name,p.last_name) name,r.registered_at,r.withdrawn,r.seed,e.session_id,e.disqualified,e.note,s.status,r2.total,r2.correct,r2.unanswered,r2.pending,r2.earned,r2.maximum from private.kairo_registrations r join auth.users u on u.id=r.user_id left join public.account_profiles p on p.id=r.user_id left join private.kairo_arena_entries e on e.tournament_id=r.tournament_id and e.user_id=r.user_id left join private.kairo_exam_sessions s on s.id=e.session_id left join private.kairo_exam_results r2 on r2.session_id=s.id where r.tournament_id=tid) x),
   'bracket',(select coalesce(jsonb_agg(to_jsonb(b) order by b.round,b.slot),'[]') from private.kairo_bracket_nodes b where tournament_id=tid));
 else raise exception 'Əməliyyat tapılmadı.';end if;
end $$;
revoke all on function private.learning_api(text,jsonb) from public,anon;
grant execute on function private.learning_api(text,jsonb) to authenticated;
create function public.learning_api(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.learning_api(operation,payload)$$;
revoke all on function public.learning_api(text,jsonb) from public,anon;
grant execute on function public.learning_api(text,jsonb) to authenticated;

-- Written review status and honest per-subject time provenance.
create or replace function private.kairo_exam_finalize(session uuid) returns void language plpgsql security definer set search_path='' as $$
declare s private.kairo_exam_sessions; pending_count int; total_count int; correct_count int; missing_count int; earned_points numeric; raw_max numeric; scaled numeric; subject_data jsonb; topic_data jsonb; row_data record;
begin
 select * into s from private.kairo_exam_sessions where id=session for update;
 if not found or s.status='abandoned' then return;end if;
 if s.status='finalized' then return;end if;
 update private.kairo_exam_sessions set submitted_at=coalesce(submitted_at,least(clock_timestamp(),deadline)),status='submitted' where id=session;
 insert into private.kairo_written_reviews(session_id,ordinal)
 select i.session_id,i.ordinal from private.kairo_exam_items i join private.kairo_exam_answers a using(session_id,ordinal)
 where i.session_id=session and i.snapshot->>'type'='written' and a.value is not null and a.value<>'null'::jsonb and a.value<>'""'::jsonb on conflict do nothing;
 with marked as materialized (
 select i.ordinal,i.points,a.value,i.snapshot->>'subject' subject,i.snapshot->>'topic' topic,i.snapshot->>'grade' grade,
 case when i.snapshot->>'type'='written' and a.value is not null and a.value<>'null'::jsonb and a.value<>'""'::jsonb then r.score
 when private.kairo_mark(i.snapshot->>'type',i.answer_key,a.value) then i.points else 0 end as earned,
 i.snapshot->>'type'='written' and a.value is not null and a.value<>'null'::jsonb and a.value<>'""'::jsonb and r.score is null as pending
 from private.kairo_exam_items i left join private.kairo_exam_answers a using(session_id,ordinal) left join private.kairo_written_reviews r using(session_id,ordinal) where i.session_id=session
 ) select count(*),count(*) filter(where earned=points),count(*) filter(where value is null or value in ('null'::jsonb,'""'::jsonb,'[]'::jsonb,'{}'::jsonb)),count(*) filter(where pending),coalesce(sum(earned),0),sum(points),
 (select coalesce(jsonb_agg(x),'[]') from (select subject,grade,count(*) total,count(*) filter(where earned=points) correct,sum(coalesce(earned,0)) earned,sum(points) maximum from marked group by subject,grade) x),
 (select coalesce(jsonb_agg(x),'[]') from (select subject,grade,topic,count(*) total,count(*) filter(where earned=points) correct,sum(coalesce(earned,0)) earned,sum(points) maximum from marked group by subject,grade,topic) x)
 into total_count,correct_count,missing_count,pending_count,earned_points,raw_max,subject_data,topic_data from marked;
 scaled:=round(earned_points/raw_max*(s.template_snapshot->>'max_score')::numeric,3);
 insert into private.kairo_exam_results(session_id,total,correct,unanswered,earned,maximum,pending,status,subjects,topics)
 values(session,total_count,correct_count,missing_count,scaled,(s.template_snapshot->>'max_score')::numeric,pending_count,case when pending_count>0 then 'provisional' else 'final' end,subject_data,topic_data)
 on conflict(session_id) do update set correct=excluded.correct,earned=excluded.earned,pending=excluded.pending,status=excluded.status,subjects=excluded.subjects,topics=excluded.topics,updated_at=now();
 update private.kairo_exam_sessions set status=case when pending_count>0 then 'review_pending' else 'finalized' end,finalized_at=case when pending_count=0 then clock_timestamp() else null end where id=session;
 if pending_count=0 and s.mode='exam' then
  for row_data in select value v from jsonb_array_elements(subject_data) loop
   insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,duration_seconds,topic_scores,submitted_at,source)
   values(s.user_id,'server-exam-'||session||'-'||(row_data.v->>'subject')||'-'||(row_data.v->>'grade'),'quiz',row_data.v->>'subject',row_data.v->>'grade',(row_data.v->>'total')::int,(row_data.v->>'correct')::int,
   null,
   (select jsonb_agg(jsonb_build_object('topic',t->>'topic','total',(t->>'total')::int,'correct',(t->>'correct')::int,'accuracy',round(100*(t->>'correct')::numeric/(t->>'total')::numeric))) from jsonb_array_elements(topic_data) t where t->>'subject'=row_data.v->>'subject' and t->>'grade'=row_data.v->>'grade'),coalesce(s.submitted_at,least(clock_timestamp(),s.deadline)),'exam') on conflict do nothing;
  end loop;
 end if;
 if pending_count=0 then
 insert into private.kairo_learning_events(user_id,source,source_id,data,independent) values(s.user_id,case when s.mode='arena' then 'arena' else 'exam' end,session,jsonb_build_object('earned',scaled,'maximum',s.template_snapshot->'max_score','scale',s.template_snapshot->>'scale'),s.mode='exam') on conflict do nothing;
 end if;
end $$;



