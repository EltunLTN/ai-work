create or replace function private.admin_accounts() returns table(id uuid,email text,first_name text,last_name text,grade text,suspended boolean,admin_note text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not private.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return query select u.id,u.email::text,coalesce(p.first_name,''),coalesce(p.last_name,''),p.grade,coalesce(p.suspended,false),coalesce(p.admin_note,''),u.created_at
 from auth.users u left join public.account_profiles p on p.id=u.id order by u.created_at desc limit 1000;
end $$;
revoke all on function private.admin_accounts() from public,anon;
grant execute on function private.admin_accounts() to authenticated;
