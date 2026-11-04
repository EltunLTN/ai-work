create table private.kairo_exam_plans(session_id uuid not null references private.kairo_exam_sessions(id) on delete cascade,subject text not null,plan jsonb not null,created_at timestamptz not null default now(),primary key(session_id,subject));
alter table private.kairo_exam_plans enable row level security;
revoke all on private.kairo_exam_plans from public,anon,authenticated;
create or replace function private.kairo_exam_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare sid uuid; s private.kairo_exam_sessions; entry jsonb; item private.kairo_exam_items;review_score numeric;result jsonb;
begin
 if operation='exam.catalog' then
 return jsonb_build_object('templates',coalesce((select jsonb_agg(to_jsonb(t)-'created_by' order by t.name,t.version desc) from private.kairo_exam_templates t where status='published'),'[]'),
 'history',coalesce((select jsonb_agg(x order by x.started_at desc) from (select hist.id,hist.template_snapshot->>'name' name,hist.status,hist.started_at,hist.deadline,r.earned,r.maximum,r.status result_status,hist.template_snapshot->>'scale' scale from private.kairo_exam_sessions hist left join private.kairo_exam_results r on r.session_id=hist.id where hist.user_id=caller and hist.mode='exam' order by hist.started_at desc limit 50) x),'[]'));
 elsif operation='exam.start' then sid:=private.kairo_exam_start(caller,(p->>'template')::uuid,(p->>'request_id')::uuid);return private.kairo_exam_read(caller,sid);
 end if;
 sid:=(p->>'id')::uuid;
 if operation in ('exam.plan.get','exam.plan.save') then
  select * into s from private.kairo_exam_sessions where id=sid and user_id=caller and status='finalized' and mode='exam';
  if not found then raise exception 'Yekun imtahan tapılmadı.' using errcode='42501';end if;
  if not exists(select 1 from private.kairo_exam_items where session_id=sid and snapshot->>'subject'=p->>'subject') then raise exception 'İmtahanda bu fənn yoxdur.';end if;
  if operation='exam.plan.save' then
   if not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
   if not coalesce(jsonb_typeof(p->'plan')='object' and jsonb_array_length(p->'plan'->'days')=7 and length(p->'plan'->>'title') between 1 and 300,false) then raise exception 'Plan uyğun deyil.';end if;
   insert into private.kairo_exam_plans(session_id,subject,plan) values(sid,p->>'subject',p->'plan') on conflict(session_id,subject) do nothing;
  end if;
  return jsonb_build_object('plan',(select plan from private.kairo_exam_plans where session_id=sid and subject=p->>'subject'));
 end if;
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
