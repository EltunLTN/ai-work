-- Filtered analytics use the same immutable practice rows as historical results.
create or replace function public.learning_workspace(target uuid default auth.uid(), from_day date default null, to_day date default null, selected_subject text default null, school_grade text default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if (select auth.uid()) is null or target is null or (target<>(select auth.uid()) and not private.is_admin()) then raise exception 'Access denied' using errcode='42501'; end if;
 if from_day>to_day or (selected_subject is not null and selected_subject not in ('Riyaziyyat','Fizika','Biologiya','Coğrafiya','Kimya')) or (school_grade is not null and school_grade not in ('1','2','3','4','5','6','7','8','9','10','11')) then raise exception 'Invalid filter'; end if;
 with filtered as materialized (
 select * from public.practice_attempts where user_id=target
 and (from_day is null or submitted_at >= from_day::timestamp at time zone 'Asia/Baku')
 and (to_day is null or submitted_at < (to_day+1)::timestamp at time zone 'Asia/Baku')
 and (selected_subject is null or subject=selected_subject) and (school_grade is null or grade=school_grade)
 ) select jsonb_build_object(
 'totals',(select jsonb_build_object('attempts',count(*),'questions',coalesce(sum(total),0),'correct',coalesce(sum(correct),0),'wrong',coalesce(sum(total-correct),0),'seconds',coalesce(sum(duration_seconds),0),'timed_attempts',count(duration_seconds),'last_active',max(submitted_at),'active_days',count(distinct (submitted_at at time zone 'Asia/Baku')::date)) from filtered),
 'subjects',coalesce((select jsonb_agg(s) from (select subject,sum(total) total,sum(correct) correct,count(*) attempts,max(submitted_at) last_active from filtered group by subject) s),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(d order by d.day) from (select (submitted_at at time zone 'Asia/Baku')::date as day,sum(total) total,sum(correct) correct,count(*) attempts from filtered where submitted_at >= ((coalesce(to_day,(now() at time zone 'Asia/Baku')::date)-29)::timestamp at time zone 'Asia/Baku') group by 1) d),'[]'::jsonb),
 'topics',coalesce((select jsonb_agg(t order by t.correct::numeric/nullif(t.total,0),t.total desc) from (select a.subject,a.grade,t->>'topic' topic,sum((t->>'total')::integer) total,sum((t->>'correct')::integer) correct from filtered a cross join lateral jsonb_array_elements(a.topic_scores) t group by a.subject,a.grade,t->>'topic') t),'[]'::jsonb)
 ) into result; return result;
end $$;
revoke all on function public.learning_workspace(uuid,date,date,text,text) from public,anon;
grant execute on function public.learning_workspace(uuid,date,date,text,text) to authenticated;

-- Compare-and-swap protects administrative edits and changes from other devices.
create function public.save_learning_snapshot(payload jsonb,expected_revision timestamptz default null) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare caller uuid:=(select auth.uid()); revision timestamptz;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>1000000 then raise exception 'Invalid snapshot'; end if;
 if expected_revision is null then
  insert into public.learning_snapshots(user_id,data,updated_at) values(caller,payload,clock_timestamp()) on conflict(user_id) do nothing returning updated_at into revision;
 else
  update public.learning_snapshots set data=payload,updated_at=clock_timestamp() where user_id=caller and updated_at=expected_revision returning updated_at into revision;
 end if;
 if revision is null then raise exception 'Snapshot changed; reload cloud data before saving' using errcode='40001'; end if;
 return revision;
end $$;
revoke all on function public.save_learning_snapshot(jsonb,timestamptz) from public,anon;
grant execute on function public.save_learning_snapshot(jsonb,timestamptz) to authenticated;
