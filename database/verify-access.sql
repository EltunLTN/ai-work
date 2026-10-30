begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000001','student-one@example.invalid',now()),
('00000000-0000-4000-a000-000000000002','student-two@example.invalid',now()),
('00000000-0000-4000-a000-000000000003','admin-check@example.invalid',now());
insert into private.admin_emails(email) values ('admin-check@example.invalid');
insert into public.learning_snapshots(user_id,data) values
('00000000-0000-4000-a000-000000000001','{"kairo.profile":{"grade":"7"}}'),
('00000000-0000-4000-a000-000000000002','{"kairo.profile":{"grade":"8"}}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
do $$
declare n integer; allowed integer; denied integer;
begin
  select count(*) into n from public.learning_snapshots;
  if n <> 1 then raise exception 'RLS leaked another student'; end if;
  if public.is_admin() then raise exception 'Student became admin'; end if;
  update public.site_settings set announcement='unauthorized';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Student changed announcement'; end if;
  update public.learning_snapshots set data='{}' where user_id='00000000-0000-4000-a000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Student changed another snapshot'; end if;
  begin
    insert into public.learning_snapshots(user_id,data) values ('00000000-0000-4000-a000-000000000003','{}');
    raise exception 'Student inserted another snapshot';
  exception when insufficient_privilege then null;
  end;
  select count(*) filter(where ok),count(*) filter(where not ok) into allowed,denied
    from (select public.consume_ai_quota() as ok from generate_series(1,101)) q;
  if allowed <> 100 or denied <> 1 then raise exception 'Quota failed: %, %',allowed,denied; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
do $$
declare n integer;
begin
  if not public.is_admin() then raise exception 'Admin denied'; end if;
  select count(*) into n from public.learning_snapshots;
  if n <> 2 then raise exception 'Admin cannot read snapshots'; end if;
  update public.site_settings set announcement='verification only';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Admin cannot change announcement'; end if;
end $$;
reset role;
rollback;
