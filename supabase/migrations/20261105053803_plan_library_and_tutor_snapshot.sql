-- An AI exam item has no reviewed-bank FK. Resolve only the caller's revealed snapshots.
create function private.kairo_tutor_snapshot(person uuid,item_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select data from (
  select i.snapshot data,1 priority from private.kairo_exam_items i join private.kairo_exam_sessions e on e.id=i.session_id
  where e.user_id=person and i.snapshot->>'id'=item_id::text and e.status in('finalized','review_pending','submitted')
   and (e.mode<>'arena' or exists(select 1 from private.kairo_tournaments t where t.id=e.competition_id and (t.ends_at<=now() or t.status in('completed','cancelled'))))
  union all
  select item,2 from private.kairo_duels d cross join lateral jsonb_array_elements(d.question_set) item
  where item->>'id'=item_id::text and d.status in('finished','abandoned') and exists(select 1 from private.kairo_duel_players pl where pl.match_id=d.id and pl.user_id=person)
 ) source order by priority limit 1
$$;
revoke all on function private.kairo_tutor_snapshot(uuid,uuid) from public,anon,authenticated;
do $$declare definition text;old_lookup text;new_lookup text;begin
 definition:=pg_get_functiondef('private.kairo_tutor_operation(uuid,text,jsonb)'::regprocedure);
 definition:=replace(definition,'q private.kairo_questions;','q private.kairo_questions;source_snapshot jsonb;');
 old_lookup:=$old$if p->>'question_id' is not null then select * into q from private.kairo_questions where id=(p->>'question_id')::uuid and status='reviewed';if not found then raise exception 'Sual tapılmadı.';end if;end if;$old$;
 new_lookup:=$new$if p->>'question_id' is not null then
  select * into q from private.kairo_questions where id=(p->>'question_id')::uuid and status='reviewed';
  if not found then
   source_snapshot:=private.kairo_tutor_snapshot(caller,(p->>'question_id')::uuid);
   if source_snapshot is null then raise exception 'Bu sual açıq deyil və ya hesabına aid deyil. Mövzu üzrə yeni dərs yarada bilərsən.' using errcode='42501';end if;
   p:=p||jsonb_build_object('subject',source_snapshot->>'subject','grade',source_snapshot->'grade','topic',source_snapshot->>'topic','statement',left(coalesce(source_snapshot->'body'->>'statement','')||case when jsonb_typeof(source_snapshot->'body'->'options')='array' then E'\nVariantlar: '||(source_snapshot->'body'->'options')::text else '' end,4000));
  end if;
 end if;$new$;
 if position(old_lookup in definition)=0 then raise exception 'Tutor create implementation changed; inspect migration';end if;
 execute replace(definition,old_lookup,new_lookup);
end $$;
create function private.kairo_plan_library(person uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with evidence as (select subject,grade,count(*) attempts,sum(total) total,sum(correct) correct,max(submitted_at) last_result from public.practice_attempts where user_id=person group by subject,grade),
 selections as (select subject,grade from evidence union select subject,grade::text from private.kairo_adaptive_plans where user_id=person)
 select jsonb_build_object('plans',coalesce(jsonb_agg(jsonb_build_object('subject',s.subject,'grade',s.grade,'attempts',coalesce(e.attempts,0),'total',coalesce(e.total,0),'correct',coalesce(e.correct,0),'last_result',e.last_result,'has_plan',p.plan is not null,'title',p.plan->>'title','updated_at',p.updated_at,'completed',p.completed) order by s.subject,s.grade::int),'[]'))
 from selections s left join evidence e on e.subject=s.subject and e.grade=s.grade left join private.kairo_adaptive_plans p on p.user_id=person and p.subject=s.subject and p.grade::text=s.grade
$$;
revoke all on function private.kairo_plan_library(uuid) from public,anon,authenticated;
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.learning_api(text,jsonb)'::regprocedure);
 if position('elsif operation=''identity.get'' then' in definition)=0 then raise exception 'Learning API changed';end if;
 execute replace(definition,'elsif operation=''identity.get'' then','elsif operation=''plans.list'' then return private.kairo_plan_library(caller); elsif operation=''identity.get'' then');
end $$;

