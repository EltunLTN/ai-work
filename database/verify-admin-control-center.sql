begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000101','control-student@example.invalid',now()),
('00000000-0000-4000-a000-000000000102','control-admin@example.invalid',now());
insert into private.admin_emails(email) values('control-admin@example.invalid');
insert into public.account_profiles(id,first_name) values('00000000-0000-4000-a000-000000000101','Fixture'),('00000000-0000-4000-a000-000000000102','Admin');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000101',true);
do $$begin
 begin perform public.admin_control('overview'); raise exception 'Student can inspect platform'; exception when insufficient_privilege then null; end;
 begin perform public.admin_control('detail','00000000-0000-4000-a000-000000000102'); raise exception 'Student can inspect accounts'; exception when insufficient_privilege then null; end;
 begin perform public.admin_control('ai_limit',(select auth.uid()),'{"limit":1000}'); raise exception 'Student can increase quota'; exception when insufficient_privilege then null; end;
 begin update public.account_profiles set daily_ai_limit=1000 where id=(select auth.uid()); raise exception 'Student can bypass quota'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000102',true);
do $$declare details jsonb; rejected boolean:=false; begin
 perform public.admin_control('ai_limit','00000000-0000-4000-a000-000000000101','{"limit":2}');
 details:=public.admin_control('detail','00000000-0000-4000-a000-000000000101');
 if (details->'profile'->>'daily_ai_limit')::int<>2 then raise exception 'Quota not saved';end if;
 perform public.admin_control('learning_profile','00000000-0000-4000-a000-000000000101','{"grade":"7","subject":"Kimya","textbookId":"fixture-book","selectedTopics":["Atomun quruluşu"]}');
 details:=public.admin_control('detail','00000000-0000-4000-a000-000000000101');
 if details->'learning_profile'->>'subject'<>'Kimya' or details->'profile'->>'grade'<>'7' then raise exception 'Learning profile not saved';end if;
 if jsonb_array_length(details->'audit')<2 then raise exception 'Missing audit';end if;
 if (public.admin_control('overview')->>'accounts')::int<2 then raise exception 'Overview broken';end if;
 begin perform public.admin_control('learning_profile','00000000-0000-4000-a000-000000000101','{"subject":"Kimya","textbookId":"bad","selectedTopics":["Atom"]}'); exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Missing grade accepted';end if;
 insert into storage.objects(bucket_id,name) values('avatars','00000000-0000-4000-a000-000000000101/test.webp');
 perform public.admin_control('set_avatar','00000000-0000-4000-a000-000000000101','{"path":"00000000-0000-4000-a000-000000000101/test.webp"}');
 perform public.admin_control('remove_avatar','00000000-0000-4000-a000-000000000101');
 perform public.admin_control('restore_avatar','00000000-0000-4000-a000-000000000101');
 details:=public.admin_control('detail','00000000-0000-4000-a000-000000000101');
 if details->'profile'->>'avatar_path'<>'00000000-0000-4000-a000-000000000101/test.webp' then raise exception 'Avatar restore failed';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000101',true);
do $$begin
 if not public.consume_ai_quota() or not public.consume_ai_quota() or public.consume_ai_quota() then raise exception 'Per-account quota enforcement failed';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000102',true);
select public.admin_control('reset_usage','00000000-0000-4000-a000-000000000101');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000101',true);
do $$begin if not public.consume_ai_quota() then raise exception 'Quota reset failed';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000102',true);
select public.admin_control('ai_limit','00000000-0000-4000-a000-000000000101','{"limit":0}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000101',true);
do $$begin if public.consume_ai_quota() then raise exception 'Zero quota allowed AI';end if;end $$;
reset role;
rollback;
