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
   null,
   (select jsonb_agg(jsonb_build_object('topic',t->>'topic','total',(t->>'total')::int,'correct',(t->>'correct')::int,'accuracy',round(100*(t->>'correct')::numeric/(t->>'total')::numeric))) from jsonb_array_elements(topic_data) t where t->>'subject'=row_data.v->>'subject'),coalesce(s.submitted_at,least(clock_timestamp(),s.deadline)),'exam') on conflict do nothing;
  end loop;
 end if;
 if pending_count=0 then
 insert into private.kairo_learning_events(user_id,source,source_id,data,independent) values(s.user_id,case when s.mode='arena' then 'arena' else 'exam' end,session,jsonb_build_object('earned',scaled,'maximum',s.template_snapshot->'max_score','scale',s.template_snapshot->>'scale'),s.mode='exam') on conflict do nothing;
 end if;
end $$;


create or replace function private.kairo_exam_read(caller uuid,session uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s private.kairo_exam_sessions;result jsonb;can_reveal boolean;
begin
 select * into s from private.kairo_exam_sessions where id=session and user_id=caller;
 if not found then raise exception 'İmtahan tapılmadı.' using errcode='42501';end if;
 if s.status='active' and s.deadline<=clock_timestamp() then perform private.kairo_exam_finalize(session);select * into s from private.kairo_exam_sessions where id=session;end if;
 can_reveal:=s.status<>'active' and (s.mode<>'arena' or exists(select 1 from private.kairo_tournaments where id=s.competition_id and (ends_at<=clock_timestamp() or status in ('completed','cancelled'))));
 select jsonb_build_object('id',s.id,'template',s.template_snapshot,'mode',s.mode,'status',s.status,'started_at',s.started_at,'deadline',s.deadline,'submitted_at',s.submitted_at,'server_now',clock_timestamp(),'current_index',s.current_index,'can_reveal',can_reveal,
 'questions',(select jsonb_agg(i.snapshot||jsonb_build_object('ordinal',i.ordinal,'points',i.points)||case when can_reveal then jsonb_build_object('key',i.answer_key,'explanation',i.explanation,'correct',case when i.snapshot->>'type'='written' then case when a.value is null or a.value in ('null'::jsonb,'""'::jsonb) then false when r.score is null then null else r.score=i.points end else private.kairo_mark(i.snapshot->>'type',i.answer_key,a.value) end,'written_review',to_jsonb(r)-'reviewer') else '{}' end order by i.ordinal) from private.kairo_exam_items i left join private.kairo_exam_answers a using(session_id,ordinal) left join private.kairo_written_reviews r using(session_id,ordinal) where i.session_id=session),
 'answers',coalesce((select jsonb_agg(jsonb_build_object('ordinal',a.ordinal,'value',a.value,'marked',a.marked,'revision',a.client_revision)) from private.kairo_exam_answers a where a.session_id=session),'[]'),
 'result',(select to_jsonb(r) from private.kairo_exam_results r where session_id=session)) into result;
 return result;end $$;

