-- Server-attested operational journal. The signing secret is provisioned separately, never in source.
create table private.activity_server_keys (digest text primary key check(length(digest)=64));
alter table private.activity_server_keys enable row level security;
revoke all on private.activity_server_keys from public,anon,authenticated;
create table private.activity_rate (user_id uuid primary key references auth.users(id) on delete cascade, minute timestamptz not null, events integer not null);
alter table private.activity_rate enable row level security;
revoke all on private.activity_rate from public,anon,authenticated;
create table private.activity_events (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 kind text not null, source text not null check(source in ('browser','database','server')),
 path text not null default '', ip inet, user_agent text not null default '', details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table private.activity_events enable row level security;
revoke all on private.activity_events from public,anon,authenticated;
create index activity_user_date_idx on private.activity_events(user_id,id desc);
create index activity_date_idx on private.activity_events(created_at);
create index activity_kind_idx on private.activity_events(kind,id desc);
create index activity_ip_idx on private.activity_events(ip) where ip is not null;
create function private.record_activity(events jsonb,client_ip inet,agent text) returns integer language plpgsql security definer set search_path='' as $$
declare caller uuid:=(select auth.uid()); entry jsonb; written integer:=0; allowance integer; supplied text; safe_details jsonb;
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 supplied:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-audit','');
 if length(supplied)<32 or not exists(select 1 from private.activity_server_keys where digest=encode(extensions.digest(supplied,'sha256'),'hex')) then raise exception 'Server attestation required' using errcode='42501'; end if;
 if jsonb_typeof(events) is distinct from 'array' or jsonb_array_length(events) not between 1 and 25 or octet_length(events::text)>12000 then raise exception 'Invalid events'; end if;
 insert into private.activity_rate(user_id,minute,events) values(caller,date_trunc('minute',now()),jsonb_array_length(events))
 on conflict(user_id) do update set minute=excluded.minute,events=case when activity_rate.minute=excluded.minute then activity_rate.events+excluded.events else excluded.events end
 where activity_rate.minute<>excluded.minute or activity_rate.events+excluded.events<=300 returning activity_rate.events into allowance;
 if allowance is null then return 0; end if;
 for entry in select value from jsonb_array_elements(events) loop
  if entry->>'kind' not in ('page.view','auth.signed_in','auth.signed_out','ui.click','form.submitted','exam.configured','exam.started','exam.answer_selected','exam.completed','history.exported','ai.request') or coalesce(entry->>'path','') !~ '^/[a-zA-Z0-9/_-]*$' or length(entry->>'path')>120 then raise exception 'Invalid event'; end if;
  select coalesce(jsonb_object_agg(key,value),'{}') into safe_details from jsonb_each(coalesce(entry->'details','{}')) where key in ('subject','subjects','grade','count','question','control','destination') and jsonb_typeof(value) in ('string','number') and length(value::text)<=130;
  insert into private.activity_events(user_id,actor_id,kind,source,path,ip,user_agent,details) values(caller,caller,entry->>'kind',case when entry->>'kind'='ai.request' then 'server' else 'browser' end,entry->>'path',client_ip,left(coalesce(agent,''),300),safe_details);
  written:=written+1;
 end loop;
 return written;
end $$;
revoke all on function private.record_activity(jsonb,inet,text) from public,anon;
grant execute on function private.record_activity(jsonb,inet,text) to authenticated;
create function public.record_activity(events jsonb,client_ip inet default null,agent text default '') returns integer language sql security invoker set search_path='' as $$ select private.record_activity(events,client_ip,agent); $$;
revoke all on function public.record_activity(jsonb,inet,text) from public,anon;
grant execute on function public.record_activity(jsonb,inet,text) to authenticated;

create function private.capture_learning_activity() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid; event_kind text; payload jsonb;
begin
 if tg_table_name='practice_attempts' then owner:=new.user_id;event_kind:='practice.saved';payload:=jsonb_build_object('subject',new.subject,'grade',new.grade,'total',new.total,'correct',new.correct,'attempt_id',new.attempt_id);
 elsif tg_table_name='account_profiles' then
  if tg_op='UPDATE' and to_jsonb(new)-'updated_at'=to_jsonb(old)-'updated_at' then return new; end if;
  owner:=new.id;event_kind:='profile.updated';payload:=jsonb_build_object('actor_is_admin',private.is_admin());
 elsif tg_table_name='learning_snapshots' then
  owner:=new.user_id;event_kind:='learning.saved';payload:=jsonb_build_object('profile_changed',tg_op='INSERT' or new.data->'kairo.profile' is distinct from old.data->'kairo.profile','plan_changed',tg_op='INSERT' or new.data->'kairo.plan' is distinct from old.data->'kairo.plan');
 end if;
 insert into private.activity_events(user_id,actor_id,kind,source,details) values(owner,(select auth.uid()),event_kind,'database',payload);
 return new;
end $$;
revoke all on function private.capture_learning_activity() from public,anon,authenticated;
create trigger practice_activity after insert on public.practice_attempts for each row execute function private.capture_learning_activity();
create trigger profile_activity after insert or update on public.account_profiles for each row execute function private.capture_learning_activity();
create trigger snapshot_activity after insert or update on public.learning_snapshots for each row execute function private.capture_learning_activity();

create function private.admin_activity(target uuid, event_kind text, before_id bigint, ip_filter inet) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if (select auth.uid()) is null or not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select jsonb_build_object('events',coalesce(jsonb_agg(x order by x.id desc),'[]')) into result from (
 select a.id,a.user_id,a.actor_id,a.kind,a.source,a.path,host(a.ip) ip,a.user_agent,a.details,a.created_at,
 coalesce(nullif(trim(p.first_name||' '||p.last_name),''),u.email) display_name
 from private.activity_events a join auth.users u on u.id=a.user_id left join public.account_profiles p on p.id=a.user_id
 where a.created_at>=now()-interval '90 days' and (target is null or a.user_id=target) and (event_kind is null or a.kind=event_kind) and (before_id is null or a.id<before_id) and (ip_filter is null or a.ip=ip_filter)
 order by a.id desc limit 50
 ) x; return result;
end $$;
revoke all on function private.admin_activity(uuid,text,bigint,inet) from public,anon;
grant execute on function private.admin_activity(uuid,text,bigint,inet) to authenticated;
create function public.admin_activity(target uuid default null,event_kind text default null,before_id bigint default null,ip_filter inet default null) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_activity(target,event_kind,before_id,ip_filter); $$;
revoke all on function public.admin_activity(uuid,text,bigint,inet) from public,anon;
grant execute on function public.admin_activity(uuid,text,bigint,inet) to authenticated;
-- Retention is enforced by the authenticated Vercel cron, not by a user's browser request.
create function private.prune_activity() returns integer language plpgsql security definer set search_path='' as $$
declare supplied text; removed integer;
begin
 supplied:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-audit','');
 if length(supplied)<32 or not exists(select 1 from private.activity_server_keys where digest=encode(extensions.digest(supplied,'sha256'),'hex')) then raise exception 'Server attestation required' using errcode='42501'; end if;
 delete from private.activity_events where created_at<now()-interval '90 days';get diagnostics removed=row_count;
 delete from private.activity_rate where minute<now()-interval '1 day';return removed;
end $$;
revoke all on function private.prune_activity() from public,authenticated;
grant execute on function private.prune_activity() to anon;
create function public.prune_activity() returns integer language sql security invoker set search_path='' as $$ select private.prune_activity(); $$;
revoke all on function public.prune_activity() from public,authenticated;
grant execute on function public.prune_activity() to anon;

grant usage on schema private to anon;
