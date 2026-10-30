create function private.valid_topic_scores(scores jsonb, total_count integer, correct_count integer) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb; t integer; c integer; sum_t integer:=0; sum_c integer:=0;
begin
 if jsonb_typeof(scores) is distinct from 'array' or jsonb_array_length(scores)=0 then return false; end if;
 for item in select value from jsonb_array_elements(scores) loop
  if jsonb_typeof(item->'topic') is distinct from 'string' or length(item->>'topic') not between 1 and 200 or jsonb_typeof(item->'total') is distinct from 'number' or jsonb_typeof(item->'correct') is distinct from 'number' or (item->>'total') !~ '^[0-9]+$' or (item->>'correct') !~ '^[0-9]+$' then return false; end if;
  t:=(item->>'total')::int; c:=(item->>'correct')::int;
  if t<1 or c<0 or c>t then return false; end if;
  sum_t:=sum_t+t; sum_c:=sum_c+c;
 end loop;
 return coalesce(sum_t=total_count and sum_c=correct_count,false);
exception when others then return false;
end $$;
revoke all on function private.valid_topic_scores(jsonb,integer,integer) from public,anon;
grant execute on function private.valid_topic_scores(jsonb,integer,integer) to authenticated;
alter table public.practice_attempts add constraint valid_topic_counts check(private.valid_topic_scores(topic_scores,total,correct));

create function public.learning_dashboard(target uuid default auth.uid()) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if (select auth.uid()) is null or (target<>(select auth.uid()) and not private.is_admin()) then raise exception 'Access denied' using errcode='42501'; end if;
 select jsonb_build_object(
 'totals', public.learning_summary(target),
 'daily',coalesce((select jsonb_agg(x order by x.day) from (select (submitted_at at time zone 'Asia/Baku')::date as day,sum(total) as total,sum(correct) as correct,count(*) as attempts from public.practice_attempts where user_id=target and submitted_at>=now()-interval '14 days' group by 1) x),'[]'::jsonb),
 'subjects',coalesce((select jsonb_agg(x) from (select subject,sum(total) as total,sum(correct) as correct,count(*) as attempts from public.practice_attempts where user_id=target group by subject) x),'[]'::jsonb),
 'topics',coalesce((select jsonb_agg(x order by (x.correct::numeric/nullif(x.total,0))) from (select a.subject,t->>'topic' as topic,sum((t->>'total')::int) as total,sum((t->>'correct')::int) as correct from public.practice_attempts a cross join lateral jsonb_array_elements(a.topic_scores) t where a.user_id=target group by a.subject,t->>'topic') x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.learning_dashboard(uuid) from public,anon;
grant execute on function public.learning_dashboard(uuid) to authenticated;
