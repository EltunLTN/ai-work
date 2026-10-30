revoke all on public.account_profiles,public.practice_attempts,public.admin_audit from public,anon,authenticated;
grant select on public.account_profiles to authenticated;
grant insert(id,first_name,last_name,avatar_path,grade),update(id,first_name,last_name,avatar_path,grade,updated_at) on public.account_profiles to authenticated;
grant select,insert on public.practice_attempts to authenticated;
grant select on public.admin_audit to authenticated;
alter function public.admin_accounts() set schema private;
alter function public.admin_update_account(uuid,text,text,text,boolean,text) set schema private;
create function public.admin_accounts() returns table(id uuid,email text,first_name text,last_name text,grade text,suspended boolean,admin_note text,created_at timestamptz) language sql security invoker set search_path='' as $$
 select * from private.admin_accounts();
$$;
create function public.admin_update_account(target uuid,given_name text,family_name text,school_grade text,is_suspended boolean,note text) returns void language sql security invoker set search_path='' as $$
 select private.admin_update_account(target,given_name,family_name,school_grade,is_suspended,note);
$$;
revoke all on function public.admin_accounts(), public.admin_update_account(uuid,text,text,text,boolean,text) from public,anon;
grant execute on function public.admin_accounts(), public.admin_update_account(uuid,text,text,text,boolean,text) to authenticated;
