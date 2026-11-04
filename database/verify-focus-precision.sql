-- Run after verify-kairo-expansion.sql inside the same rollback-only transaction.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select set_config('kairo.test_focus_precision',public.kairo_api('focus.start','{"request_id":"00000000-0000-4000-b000-000000000999","subject":"Riyaziyyat","task":"Fractional heartbeat QA","return_path":"/dashboard","settings":{"focus":1,"short_break":1,"long_break":1,"rounds":1,"daily_goal":5,"auto_break":false,"sound":false}}')->'active'->>'id',true);
reset role;
update private.kairo_focus_sessions set last_seen=clock_timestamp()-interval '10.75 seconds',deadline=clock_timestamp()+interval '50 seconds' where id=current_setting('kairo.test_focus_precision')::uuid;
set local role authenticated;
select public.kairo_api('focus.heartbeat',jsonb_build_object('id',current_setting('kairo.test_focus_precision')));
reset role;
do $$declare s private.kairo_focus_sessions;begin select * into s from private.kairo_focus_sessions where id=current_setting('kairo.test_focus_precision')::uuid;if s.phase_credited<>10 or extract(epoch from clock_timestamp()-s.last_seen) not between 0.7 and 1.5 then raise exception 'Fractional heartbeat remainder lost';end if;end $$;
update private.kairo_focus_sessions set phase_credited=59,focused_seconds=59,last_seen=clock_timestamp()-interval '0.95 seconds',deadline=clock_timestamp()-interval '0.01 seconds' where id=current_setting('kairo.test_focus_precision')::uuid;
set local role authenticated;
select public.kairo_api('focus.heartbeat',jsonb_build_object('id',current_setting('kairo.test_focus_precision')));
reset role;
do $$begin if not exists(select 1 from private.kairo_focus_sessions where id=current_setting('kairo.test_focus_precision')::uuid and status='completed' and focused_seconds=60 and completed_rounds=1) then raise exception 'Final subsecond prevented completion';end if;end $$;
