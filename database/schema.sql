create schema if not exists private;
create table private.admin_emails (email text primary key check (email = lower(email)));
-- Add a verified administrator email from the Supabase SQL editor after setup.
-- insert into private.admin_emails(email) values ('owner@example.com');
revoke all on private.admin_emails from public, anon, authenticated;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.users u join private.admin_emails a on lower(u.email) = a.email
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
create function public.is_admin() returns boolean language sql stable security invoker set search_path = '' as $$
  select private.is_admin();
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table public.learning_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 1100000),
  updated_at timestamptz not null default now()
);
alter table public.learning_snapshots enable row level security;
grant select, insert, update, delete on public.learning_snapshots to authenticated;
revoke all on public.learning_snapshots from anon;
create policy snapshot_read on public.learning_snapshots for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy snapshot_insert on public.learning_snapshots for insert to authenticated with check (user_id = (select auth.uid()));
create policy snapshot_update on public.learning_snapshots for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy snapshot_delete on public.learning_snapshots for delete to authenticated using (user_id = (select auth.uid()));
create index snapshots_updated_at_idx on public.learning_snapshots(updated_at desc);

create table public.site_settings (
  id integer primary key check (id = 1),
  announcement text not null default '' check (length(announcement) <= 500),
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1);
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_update on public.site_settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create table private.ai_daily_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null,
  requests integer not null check (requests between 1 and 100)
);
revoke all on private.ai_daily_usage from public, anon, authenticated;
create function private.consume_ai_quota() returns boolean language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
  if (select auth.uid()) is null then return false; end if;
  insert into private.ai_daily_usage(user_id, usage_day, requests) values ((select auth.uid()), (now() at time zone 'UTC')::date, 1)
  on conflict (user_id) do update
    set usage_day = excluded.usage_day,
        requests = case when ai_daily_usage.usage_day = excluded.usage_day then ai_daily_usage.requests + 1 else 1 end
    where ai_daily_usage.usage_day <> excluded.usage_day or ai_daily_usage.requests < 100;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function private.consume_ai_quota() from public, anon;
grant execute on function private.consume_ai_quota() to authenticated;
create function public.consume_ai_quota() returns boolean language sql security invoker set search_path = '' as $$
  select private.consume_ai_quota();
$$;
revoke all on function public.consume_ai_quota() from public, anon;
grant execute on function public.consume_ai_quota() to authenticated;
