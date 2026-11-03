begin;
insert into auth.users(id,email,email_confirmed_at) values ('00000000-0000-4000-a000-000000000801','workspace-student@example.invalid',now()),('00000000-0000-4000-a000-000000000802','workspace-admin@example.invalid',now()),('00000000-0000-4000-a000-000000000803','workspace-other@example.invalid',now());
insert into private.admin_emails(email) values('workspace-admin@example.invalid');
insert into public.account_profiles(id) values('00000000-0000-4000-a000-000000000801'),('00000000-0000-4000-a000-000000000802'),('00000000-0000-4000-a000-000000000803');
insert into private.activity_server_keys(digest) values(encode(extensions.digest('transaction-only-test-server-secret-801','sha256'),'hex'));
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000801',true);
insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at,duration_seconds) values
(auth.uid(),'math','quiz','Riyaziyyat','7',3,2,'[{"topic":"Tənlik","total":3,"correct":2}]','2026-11-01T20:10:00Z',61),
(auth.uid(),'physics','quiz','Fizika','7',2,1,'[{"topic":"Qüvvə","total":2,"correct":1}]','2026-11-02T12:00:00Z',42),
(auth.uid(),'chemistry','quiz','Kimya','8',1,1,'[{"topic":"Atom","total":1,"correct":1}]','2026-11-03T12:00:00Z',null);
do $$declare d jsonb;revision timestamptz;begin
 d:=public.learning_workspace(auth.uid(),'2026-11-02','2026-11-02',null,'7');
 if (d->'totals'->>'questions')::int<>5 or (d->'totals'->>'correct')::int<>3 or jsonb_array_length(d->'subjects')<>2 then raise exception 'Date/grade aggregation broken: %',d;end if;
 d:=public.learning_workspace(auth.uid(),null,null,'Kimya',null);
 if (d->'totals'->>'questions')::int<>1 or (d->'totals'->>'timed_attempts')::int<>0 then raise exception 'Subject/time filter broken';end if;
 begin perform public.learning_workspace('00000000-0000-4000-a000-000000000803');raise exception 'Cross user data exposed';exception when insufficient_privilege then null;end;
 begin perform public.admin_activity();raise exception 'Student can inspect activity';exception when insufficient_privilege then null;end;
 begin perform * from private.activity_events;raise exception 'Raw activity exposed';exception when insufficient_privilege then null;end;
 begin perform public.record_activity('[{"kind":"page.view","path":"/"}]');raise exception 'Forged IP accepted';exception when insufficient_privilege then null;end;
 revision:=public.save_learning_snapshot('{"test":"first"}');
 perform public.save_learning_snapshot('{"test":"second"}',revision);
 begin perform public.save_learning_snapshot('{"test":"stale"}',revision);raise exception 'Stale update accepted';exception when serialization_failure then null;end;
end $$;
select set_config('request.headers','{"x-kairo-audit":"transaction-only-test-server-secret-801"}',true);
select public.record_activity('[{"kind":"page.view","path":"/dashboard","details":{"password":"must-not-save","control":"refresh"}},{"kind":"ai.request","path":"/api/ai/chat","details":{}}]','192.0.2.8','Transaction test');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000802',true);
do $$declare d jsonb;begin
 d:=public.admin_activity('00000000-0000-4000-a000-000000000801','page.view',null,'192.0.2.8');
 if jsonb_array_length(d->'events')<>1 or d->'events'->0->'details' ? 'password' then raise exception 'Filtered journal or sanitization failed';end if;
 d:=public.learning_workspace('00000000-0000-4000-a000-000000000801');
 if (d->'totals'->>'questions')::int<>6 then raise exception 'Admin statistics broken';end if;
end $$;
reset role;
do $$begin
 if (select count(*) from private.activity_events where user_id='00000000-0000-4000-a000-000000000801' and kind='practice.saved')<>3 then raise exception 'Missing authoritative records';end if;
 if (select count(*) from private.activity_events where user_id='00000000-0000-4000-a000-000000000801' and kind='ai.request' and source='server')<>1 then raise exception 'Missing server AI log';end if;
end $$;
set local role anon;
do $$begin
 begin perform public.learning_workspace();raise exception 'Anonymous analytics allowed';exception when insufficient_privilege then null;end;
 begin perform public.admin_activity();raise exception 'Anonymous journal allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
