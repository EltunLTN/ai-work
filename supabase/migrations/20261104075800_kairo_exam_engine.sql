create function private.kairo_exam_finalize(session uuid) returns void language plpgsql security definer set search_path='' as $$
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
 select i.ordinal,i.points,a.value,i.snapshot->>'subject' subject,i.snapshot->>'topic' topic,
 case when i.snapshot->>'type'='written' and a.value is not null and a.value<>'null'::jsonb and a.value<>'""'::jsonb then r.score
 when private.kairo_mark(i.snapshot->>'type',i.answer_key,a.value) then i.points else 0 end as earned,
 i.snapshot->>'type'='written' and a.value is not null and a.value<>'null'::jsonb and a.value<>'""'::jsonb and r.score is null as pending
 from private.kairo_exam_items i left join private.kairo_exam_answers a using(session_id,ordinal) left join private.kairo_written_reviews r using(session_id,ordinal) where i.session_id=session
 ) select count(*),count(*) filter(where earned=points),count(*) filter(where value is null or value in ('null'::jsonb,'""'::jsonb,'[]'::jsonb,'{}'::jsonb)),count(*) filter(where pending),coalesce(sum(earned),0),sum(points),
 (select coalesce(jsonb_agg(x),'[]') from (select subject,count(*) total,count(*) filter(where earned=points) correct,sum(coalesce(earned,0)) earned,sum(points) maximum from marked group by subject) x),
 (select coalesce(jsonb_agg(x),'[]') from (select subject,topic,count(*) total,count(*) filter(where earned=points) correct,sum(coalesce(earned,0)) earned,sum(points) maximum from marked group by subject,topic) x)
 into total_count,correct_count,missing_count,pending_count,earned_points,raw_max,subject_data,topic_data from marked;
 scaled:=round(earned_points/raw_max*(s.template_snapshot->>'max_score')::numeric,3);
 insert into private.kairo_exam_results(session_id,total,correct,unanswered,earned,maximum,pending,status,subjects,topics)
 values(session,total_count,correct_count,missing_count,scaled,(s.template_snapshot->>'max_score')::numeric,pending_count,case when pending_count>0 then 'provisional' else 'final' end,subject_data,topic_data)
 on conflict(session_id) do update set correct=excluded.correct,earned=excluded.earned,pending=excluded.pending,status=excluded.status,subjects=excluded.subjects,topics=excluded.topics,updated_at=now();
 update private.kairo_exam_sessions set status=case when pending_count>0 then 'review_pending' else 'finalized' end,finalized_at=case when pending_count=0 then clock_timestamp() else null end where id=session;
 if pending_count=0 and s.mode='exam' then
  for row_data in select value v from jsonb_array_elements(subject_data) loop
   insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,duration_seconds,topic_scores,submitted_at,source)
   values(s.user_id,'server-exam-'||session||'-'||(row_data.v->>'subject'),'quiz',row_data.v->>'subject',s.template_snapshot->>'grade',(row_data.v->>'total')::int,(row_data.v->>'correct')::int,
   round(extract(epoch from (coalesce(s.submitted_at,least(clock_timestamp(),s.deadline))-s.started_at))*((row_data.v->>'total')::numeric/total_count))::int,
   (select jsonb_agg(jsonb_build_object('topic',t->>'topic','total',(t->>'total')::int,'correct',(t->>'correct')::int,'accuracy',round(100*(t->>'correct')::numeric/(t->>'total')::numeric))) from jsonb_array_elements(topic_data) t where t->>'subject'=row_data.v->>'subject'),coalesce(s.submitted_at,least(clock_timestamp(),s.deadline)),'exam') on conflict do nothing;
  end loop;
 end if;
 if pending_count=0 then
 insert into private.kairo_learning_events(user_id,source,source_id,data,independent) values(s.user_id,case when s.mode='arena' then 'arena' else 'exam' end,session,jsonb_build_object('earned',scaled,'maximum',s.template_snapshot->'max_score','scale',s.template_snapshot->>'scale'),s.mode='exam') on conflict do nothing;
 end if;
end $$;

create function private.kairo_exam_start(caller uuid,template uuid,request uuid,mode_name text default 'exam',competition uuid default null,fixed_questions uuid[] default null) returns uuid language plpgsql security definer set search_path='' as $$
declare t private.kairo_exam_templates; result uuid; section jsonb; question record; ord int:=0; selected uuid[]:='{}'; required int; found_count int; active_id uuid;duration int;override_rules jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
 select id into result from private.kairo_exam_sessions where user_id=caller and request_id=request;if result is not null then return result;end if;
 if competition is not null then select id into result from private.kairo_exam_sessions where user_id=caller and competition_id=competition;if result is not null then return result;end if;end if;
 for active_id in select id from private.kairo_exam_sessions where user_id=caller and status='active' and deadline<=clock_timestamp() loop perform private.kairo_exam_finalize(active_id);end loop;
 if exists(select 1 from private.kairo_exam_sessions where user_id=caller and status='active') then raise exception 'Aktiv imtahanın var. Əvvəl onu tamamla.';end if;
 select * into t from private.kairo_exam_templates where id=template and status='published';if not found then raise exception 'İmtahan şablonu yayımlanmayıb.';end if;
 if t.official_format and (t.verified_at is null or t.source_url is null or not coalesce((t.rules->>'verified')::boolean,false)) then raise exception 'Rəsmi qaydalar tam təsdiqlənməyib.';end if;
 duration:=t.duration_seconds;
 -- Arena's published fixed set is immutable and its deadline cannot exceed the tournament window.
 if mode_name='arena' then
  select jsonb_build_object('ends_at',ends_at) into override_rules from private.kairo_tournaments where id=competition;
 end if;
 insert into private.kairo_exam_sessions(user_id,template_id,template_snapshot,mode,competition_id,deadline,request_id)
 values(caller,t.id,to_jsonb(t)-'created_by',mode_name,competition,least(clock_timestamp()+make_interval(secs=>duration),coalesce((override_rules->>'ends_at')::timestamptz,'infinity')),request) returning id into result;
 for section in select value from jsonb_array_elements(t.sections) loop
  required:=(section->>'count')::int;found_count:=0;
  for question in select q.* from private.kairo_questions q where q.status='reviewed' and q.subject=section->>'subject' and q.grade=t.grade and not(q.id=any(selected))
   and (not(section ? 'topic') or section->>'topic'='' or q.topic=section->>'topic')
   and (not(section ? 'difficulty') or section->>'difficulty'='mixed' or q.difficulty=section->>'difficulty')
   and (not(section ? 'types') or section->'types' ? q.type)
   and (fixed_questions is null or q.id=any(fixed_questions))
   order by case when fixed_questions is not null then array_position(fixed_questions,q.id)::float else random() end limit required
  loop
   insert into private.kairo_exam_items(session_id,ordinal,question_id,snapshot,answer_key,explanation,points)
   values(result,ord,question.id,jsonb_build_object('id',question.id,'subject',question.subject,'grade',question.grade,'topic',question.topic,'difficulty',question.difficulty,'type',question.type,'body',question.body),question.answer_key,question.explanation,question.points*coalesce((section->>'weight')::numeric,1));
   selected:=array_append(selected,question.id);ord:=ord+1;found_count:=found_count+1;
  end loop;
  if found_count<>required then raise exception '% üçün təsdiqlənmiş sual sayı kifayət deyil (%/%).',section->>'subject',found_count,required;end if;
 end loop;
 return result;end $$;

create function private.kairo_exam_read(caller uuid,session uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.kairo_exam_sessions;result jsonb;can_reveal boolean;
begin
 select * into s from private.kairo_exam_sessions where id=session and user_id=caller;
 if not found then raise exception 'İmtahan tapılmadı.' using errcode='42501';end if;
 if s.status='active' and s.deadline<=clock_timestamp() then perform private.kairo_exam_finalize(session);select * into s from private.kairo_exam_sessions where id=session;end if;
 can_reveal:=s.status<>'active' and (s.mode<>'arena' or exists(select 1 from private.kairo_tournaments where id=s.competition_id and (ends_at<=clock_timestamp() or status in ('completed','cancelled'))));
 select jsonb_build_object('id',s.id,'template',s.template_snapshot,'mode',s.mode,'status',s.status,'started_at',s.started_at,'deadline',s.deadline,'submitted_at',s.submitted_at,'server_now',clock_timestamp(),'current_index',s.current_index,'can_reveal',can_reveal,
 'questions',(select jsonb_agg(i.snapshot||jsonb_build_object('ordinal',i.ordinal,'points',i.points)||case when can_reveal then jsonb_build_object('key',i.answer_key,'explanation',i.explanation,'correct',private.kairo_mark(i.snapshot->>'type',i.answer_key,a.value),'written_review',to_jsonb(r)-'reviewer') else '{}' end order by i.ordinal) from private.kairo_exam_items i left join private.kairo_exam_answers a using(session_id,ordinal) left join private.kairo_written_reviews r using(session_id,ordinal) where i.session_id=session),
 'answers',coalesce((select jsonb_agg(jsonb_build_object('ordinal',a.ordinal,'value',a.value,'marked',a.marked,'revision',a.client_revision)) from private.kairo_exam_answers a where a.session_id=session),'[]'),
 'result',(select to_jsonb(r) from private.kairo_exam_results r where session_id=session)) into result;
 return result;end $$;

create function private.kairo_answer_valid(kind text,body jsonb,value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare n int:=jsonb_array_length(coalesce(body->'options','[]'));begin
 if value is null or value='null'::jsonb or value='""'::jsonb then return true;end if;
 if octet_length(value::text)>12000 then return false;end if;
 if kind in ('single','passage','image') then return jsonb_typeof(value)='number' and value::text ~ '^[0-9]+$' and value::text::int>=0 and value::text::int<n;
 elsif kind='multiple' then return jsonb_typeof(value)='array' and jsonb_array_length(value)<=n and not exists(select 1 from jsonb_array_elements(value) v where v::text !~ '^[0-9]+$' or length(v::text)>3 or v::text::int>=n);
 elsif kind='matching' then return jsonb_typeof(value)='object' and octet_length(value::text)<=1000 and not exists(select 1 from jsonb_each(value) e where e.key !~ '^[0-9]$' or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>100);
 elsif kind in ('numeric','short','written') then return jsonb_typeof(value)='string' and length(value#>>'{}')<=case when kind='numeric' then 80 when kind='short' then 300 else 6000 end;
 end if;return false;exception when others then return false;end $$;

create function private.kairo_exam_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid; s private.kairo_exam_sessions; entry jsonb; item private.kairo_exam_items;review_score numeric;result jsonb;
begin
 if operation='exam.catalog' then
 return jsonb_build_object('templates',coalesce((select jsonb_agg(to_jsonb(t)-'created_by' order by t.name,t.version desc) from private.kairo_exam_templates t where status='published'),'[]'),
 'history',coalesce((select jsonb_agg(x order by x.started_at desc) from (select hist.id,hist.template_snapshot->>'name' name,hist.status,hist.started_at,hist.deadline,r.earned,r.maximum,r.status result_status,hist.template_snapshot->>'scale' scale from private.kairo_exam_sessions hist left join private.kairo_exam_results r on r.session_id=hist.id where hist.user_id=caller and hist.mode='exam' order by hist.started_at desc limit 50) x),'[]'));
 elsif operation='exam.start' then sid:=private.kairo_exam_start(caller,(p->>'template')::uuid,(p->>'request_id')::uuid);return private.kairo_exam_read(caller,sid);
 end if;
 sid:=(p->>'id')::uuid;
 if operation='exam.get' then return private.kairo_exam_read(caller,sid);end if;
 if operation='admin.exam.review' then
  perform private.kairo_require_admin();
  select * into s from private.kairo_exam_sessions where id=sid for update;
  select * into item from private.kairo_exam_items where session_id=sid and ordinal=(p->>'ordinal')::int and snapshot->>'type'='written';
  if not found or s.status<>'review_pending' then raise exception 'Yoxlanılacaq yazılı cavab tapılmadı.';end if;
  review_score:=(p->>'score')::numeric;
  if review_score is null or review_score<0 or review_score>item.points or length(coalesce(p->>'feedback','')) not between 3 and 3000 then raise exception 'Bal və rəy uyğun deyil.';end if;
  update private.kairo_written_reviews set score=review_score,feedback=p->>'feedback',reviewer=caller,reviewed_at=clock_timestamp() where session_id=sid and ordinal=item.ordinal and kairo_written_reviews.score is null;
  if not found then raise exception 'Bu cavab artıq yoxlanılıb.';end if;
  perform private.kairo_audit('exam.review',sid::text,jsonb_build_object('ordinal',item.ordinal,'score',review_score));
  perform private.kairo_exam_finalize(sid);return jsonb_build_object('ok',true);
 end if;
 select * into s from private.kairo_exam_sessions where id=sid and user_id=caller for update;
 if not found then raise exception 'İmtahan tapılmadı.' using errcode='42501';end if;
 if s.status<>'active' then return private.kairo_exam_read(caller,sid);end if;
 if s.deadline<=clock_timestamp() then perform private.kairo_exam_finalize(sid);return private.kairo_exam_read(caller,sid);end if;
 if operation='exam.save' then
  if jsonb_typeof(p->'answers') is distinct from 'array' or jsonb_array_length(p->'answers')>200 then raise exception 'Cavablar uyğun deyil.';end if;
  for entry in select value from jsonb_array_elements(p->'answers') loop
   select * into item from private.kairo_exam_items where session_id=sid and ordinal=(entry->>'ordinal')::int;
   if not found or not private.kairo_answer_valid(item.snapshot->>'type',item.snapshot->'body',entry->'value') or (entry->>'revision')::bigint not between 0 and 9007199254740991 then raise exception 'Cavab formatı uyğun deyil.';end if;
   insert into private.kairo_exam_answers(session_id,ordinal,value,marked,client_revision) values(sid,item.ordinal,entry->'value',coalesce((entry->>'marked')::boolean,false),(entry->>'revision')::bigint)
   on conflict(session_id,ordinal) do update set value=excluded.value,marked=excluded.marked,client_revision=excluded.client_revision,saved_at=clock_timestamp() where kairo_exam_answers.client_revision<excluded.client_revision;
  end loop;
  update private.kairo_exam_sessions set current_index=greatest(0,least((select count(*)-1 from private.kairo_exam_items where session_id=sid),coalesce((p->>'index')::int,0))) where id=sid;
 elsif operation='exam.submit' then perform private.kairo_exam_finalize(sid);
 else raise exception 'Naməlum imtahan əməliyyatı.';end if;
 return private.kairo_exam_read(caller,sid);end $$;
