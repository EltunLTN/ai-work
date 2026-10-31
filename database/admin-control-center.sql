-- Guarded administrative capabilities; no service key is shipped to the browser.
alter table public.account_profiles add column daily_ai_limit integer not null default 100 check(daily_ai_limit between 0 and 100);
create policy avatars_admin_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (select private.is_admin()));

create or replace function private.consume_ai_quota() returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer; daily_limit integer;
begin
 if (select auth.uid()) is null then return false; end if;
 select coalesce(p.daily_ai_limit,100) into daily_limit from public.account_profiles p where p.id=(select auth.uid());
 daily_limit:=coalesce(daily_limit,100);
 if daily_limit=0 then return false; end if;
 insert into private.ai_daily_usage(user_id,usage_day,requests) values((select auth.uid()),(now() at time zone 'UTC')::date,1)
 on conflict(user_id) do update set usage_day=excluded.usage_day,requests=case when ai_daily_usage.usage_day=excluded.usage_day then ai_daily_usage.requests+1 else 1 end
 where ai_daily_usage.usage_day<>excluded.usage_day or ai_daily_usage.requests<daily_limit;
 get diagnostics affected=row_count; return affected=1;
end $$;

create or replace function private.admin_control(operation text,target uuid default null,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; previous jsonb; next_profile jsonb; current_data jsonb; limit_value integer; avatar_value text;
begin
 if (select auth.uid()) is null or not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if operation='overview' then
  select jsonb_build_object(
   'accounts',(select count(*) from auth.users),
   'verified',(select count(*) from auth.users where email_confirmed_at is not null),
   'suspended',(select count(*) from public.account_profiles where suspended),
   'attempts',(select count(*) from public.practice_attempts),
   'questions',(select coalesce(sum(total),0) from public.practice_attempts),
   'correct',(select coalesce(sum(correct),0) from public.practice_attempts),
   'active_today',(select count(distinct user_id) from public.practice_attempts where submitted_at >= date_trunc('day',now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'),
   'ai_today',(select coalesce(sum(requests),0) from private.ai_daily_usage where usage_day=(now() at time zone 'UTC')::date),
   'subjects',(select coalesce(jsonb_agg(s),'[]') from (select subject,count(*) attempts,sum(total) questions,sum(correct) correct from public.practice_attempts group by subject order by sum(total) desc) s)
  ) into result; return result;
 end if;
 if target is null or not exists(select 1 from auth.users where id=target) then raise exception 'Account not found'; end if;
 if operation='detail' then
  select jsonb_build_object(
   'profile',(select to_jsonb(p) from public.account_profiles p where p.id=target),
   'auth',(select jsonb_build_object('email',u.email,'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'confirmed',u.email_confirmed_at is not null) from auth.users u where u.id=target),
   'usage',coalesce((select jsonb_build_object('day',usage_day,'requests',case when usage_day=(now() at time zone 'UTC')::date then requests else 0 end) from private.ai_daily_usage where user_id=target),jsonb_build_object('requests',0)),
   'learning_profile',(select data->'kairo.profile' from public.learning_snapshots where user_id=target),
   'plan',(select data->'kairo.plan' from public.learning_snapshots where user_id=target),
   'snapshot_updated',(select updated_at from public.learning_snapshots where user_id=target),
   'attempts',(select coalesce(jsonb_agg(a),'[]') from (select attempt_id,kind,subject,grade,total,correct,duration_seconds,topic_scores,submitted_at from public.practice_attempts where user_id=target order by submitted_at desc limit 100) a),
   'audit',(select coalesce(jsonb_agg(a),'[]') from (select id,admin_id,change,created_at from public.admin_audit where target_id=target order by created_at desc limit 30) a)
  ) into result; return result;
 end if;
 if operation='ai_limit' then
  if jsonb_typeof(payload->'limit') is distinct from 'number' then raise exception 'Invalid limit'; end if;
  limit_value:=(payload->>'limit')::integer;
  if limit_value not between 0 and 100 or (payload->>'limit')::numeric<>limit_value then raise exception 'Invalid limit'; end if;
  select jsonb_build_object('limit',daily_ai_limit) into previous from public.account_profiles where id=target;
  insert into public.account_profiles(id,daily_ai_limit) values(target,limit_value) on conflict(id) do update set daily_ai_limit=excluded.daily_ai_limit,updated_at=now();
 elsif operation='reset_usage' then
  select to_jsonb(u) into previous from private.ai_daily_usage u where user_id=target;
  update private.ai_daily_usage set usage_day=(now() at time zone 'UTC')::date - 1,requests=1 where user_id=target;
 elsif operation='remove_avatar' then
  select jsonb_build_object('avatar_path',avatar_path) into previous from public.account_profiles where id=target;
  update public.account_profiles set avatar_path=null,updated_at=now() where id=target;
 elsif operation='set_avatar' then
  avatar_value:=payload->>'path';
  if avatar_value is null or length(avatar_value)>199 or split_part(avatar_value,'/',1)<>target::text or not exists(select 1 from storage.objects where bucket_id='avatars' and name=avatar_value) then raise exception 'Invalid avatar'; end if;
  select jsonb_build_object('avatar_path',avatar_path) into previous from public.account_profiles where id=target;
  update public.account_profiles set avatar_path=avatar_value,updated_at=now() where id=target;
 elsif operation='restore_avatar' then
  select change->'before'->>'avatar_path' into avatar_value from public.admin_audit where target_id=target and change->>'operation' in ('remove_avatar','set_avatar') order by created_at desc,id desc limit 1;
  if avatar_value is null or not exists(select 1 from storage.objects where bucket_id='avatars' and name=avatar_value and (storage.foldername(name))[1]=target::text) then raise exception 'No stored avatar'; end if;
  update public.account_profiles set avatar_path=avatar_value,updated_at=now() where id=target;
 elsif operation='learning_profile' then
  if not coalesce(payload->>'grade' in ('1','2','3','4','5','6','7','8','9','10','11') and payload->>'subject' in ('Riyaziyyat','Fizika','Biologiya','Coğrafiya','Kimya') and length(payload->>'textbookId') between 1 and 200,false) then raise exception 'Invalid learning selection'; end if;
  if jsonb_typeof(payload->'selectedTopics') is distinct from 'array' or jsonb_array_length(payload->'selectedTopics') not between 1 and 20 then raise exception 'Invalid topics'; end if;
  if exists(select 1 from jsonb_array_elements(payload->'selectedTopics') t where jsonb_typeof(t)<>'string' or length(t#>>'{}') not between 1 and 250) then raise exception 'Invalid topic'; end if;
  next_profile:=jsonb_build_object('grade',payload->>'grade','subject',payload->>'subject','textbookId',payload->>'textbookId','selectedTopics',payload->'selectedTopics');
  select data into current_data from public.learning_snapshots where user_id=target for update;
  previous:=jsonb_build_object('profile',current_data->'kairo.profile');
  -- Preserve historical attempts. Invalidate only dependent working-copy content.
  current_data:=coalesce(current_data,'{}') - array['kairo.questions','kairo.answers','kairo.result','kairo.result.review','kairo.feedback','kairo.feedback.result','kairo.plan','kairo.analysis','kairo.quiz.pending'];
  current_data:=jsonb_set(current_data,'{kairo.profile}',next_profile);
  insert into public.learning_snapshots(user_id,data,updated_at) values(target,current_data,now()) on conflict(user_id) do update set data=excluded.data,updated_at=excluded.updated_at;
  update public.account_profiles set grade=payload->>'grade',updated_at=now() where id=target;
 else raise exception 'Unknown operation'; end if;
 insert into public.admin_audit(admin_id,target_id,change) values((select auth.uid()),target,jsonb_build_object('operation',operation,'before',previous,'after',payload));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.admin_control(text,uuid,jsonb) from public,anon;
grant execute on function private.admin_control(text,uuid,jsonb) to authenticated;
create function public.admin_control(operation text,target uuid default null,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.admin_control(operation,target,payload); $$;
revoke all on function public.admin_control(text,uuid,jsonb) from public,anon;
grant execute on function public.admin_control(text,uuid,jsonb) to authenticated;
