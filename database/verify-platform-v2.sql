begin;
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000001','platform-student@example.invalid',now()),
('00000000-0000-4000-a000-000000000002','platform-other@example.invalid',now()),
('00000000-0000-4000-a000-000000000003','platform-admin@example.invalid',now());
insert into private.admin_emails(email) values('platform-admin@example.invalid');
insert into public.account_profiles(id) values('00000000-0000-4000-a000-000000000001'),('00000000-0000-4000-a000-000000000002'),('00000000-0000-4000-a000-000000000003');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
do $$
declare dashboard jsonb; n integer;
begin
 insert into public.account_profiles(id,first_name,last_name,grade,avatar_path) values((select auth.uid()),'Test','Student','7',null)
 on conflict(id) do update set id=excluded.id,first_name=excluded.first_name,last_name=excluded.last_name,grade=excluded.grade,avatar_path=excluded.avatar_path;
 begin update public.account_profiles set suspended=false where id=(select auth.uid()); raise exception 'Student can change suspension'; exception when insufficient_privilege then null;end;
 begin perform public.admin_update_account((select auth.uid()),'Hacked','Name','11',false,''); raise exception 'Student can run admin RPC'; exception when insufficient_privilege then null;end;
 begin perform public.admin_accounts();raise exception 'Student can list all emails';exception when insufficient_privilege then null;end;
 insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at,duration_seconds)
 values((select auth.uid()),'test-1','quiz','Fizika','7',4,3,'[{"topic":"Sürət","total":4,"correct":3}]',now(),120);
 insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at)
 values((select auth.uid()),'test-1','quiz','Fizika','7',4,3,'[{"topic":"Sürət","total":4,"correct":3}]',now()) on conflict(user_id,attempt_id) do nothing;
 dashboard:=public.learning_dashboard();
 if (dashboard->'totals'->>'questions')::int<>4 or (dashboard->'totals'->>'correct')::int<>3 or (dashboard->'totals'->>'wrong')::int<>1 then raise exception 'Wrong analytics totals';end if;
 if (dashboard->'totals'->>'seconds')::int<>120 or jsonb_array_length(dashboard->'topics')<>1 then raise exception 'Wrong timing/topic analytics';end if;
 begin insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at) values((select auth.uid()),'bad','quiz','Fizika','7',4,3,'[{"topic":"Missing numbers"}]',now()); raise exception 'Missing topic counts accepted';exception when check_violation then null;end;
 begin insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at) values('00000000-0000-4000-a000-000000000002','other','quiz','Fizika','7',4,3,'[{"topic":"Sürət","total":4,"correct":3}]',now());raise exception 'Cross-account insert accepted';exception when insufficient_privilege then null;end;
 begin perform public.learning_dashboard('00000000-0000-4000-a000-000000000002');raise exception 'Cross-account analytics leaked';exception when insufficient_privilege then null;end;
 update public.account_profiles set first_name='Wrong' where id='00000000-0000-4000-a000-000000000002';get diagnostics n=row_count;if n<>0 then raise exception 'Cross-account profile write';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
do $$
declare dashboard jsonb;n integer;
begin
 perform public.admin_update_account('00000000-0000-4000-a000-000000000001','Updated','Student','8',true,'Test only');
 select count(*) into n from public.admin_audit where target_id='00000000-0000-4000-a000-000000000001';if n<>1 then raise exception 'Audit missing';end if;
 dashboard:=public.learning_dashboard('00000000-0000-4000-a000-000000000001');if (dashboard->'totals'->>'questions')::int<>4 then raise exception 'Admin analytics denied';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
do $$begin if public.consume_ai_quota() then raise exception 'Suspended user can use AI';end if;end $$;
reset role;
rollback;
