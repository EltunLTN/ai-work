-- Standalone verification; every fixture and counter change is rolled back.
begin;
do $$
declare
 u uuid:=extensions.gen_random_uuid(); r uuid:=extensions.gen_random_uuid();
 k text:='qa-budget-'||extensions.gen_random_uuid()::text; i integer; v integer;
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,u::text||'@example.invalid',now());
 insert into public.account_profiles(id) values(u) on conflict do nothing;
 perform set_config('request.jwt.claim.sub',u::text,true);
 perform set_config('request.headers','{}',true);
 if public.consume_ai_quota() then raise exception 'old deployment accepted';end if;
 perform set_config('request.headers','{"x-kairo-ai-budget-version":"1"}',true);
 if public.consume_ai_quota() then raise exception 'unattested version accepted';end if;
 insert into private.activity_server_keys(digest) values(encode(extensions.digest(k,'sha256'),'hex'));
 perform set_config('request.headers',jsonb_build_object('x-kairo-audit',k)::text,true);
 if public.consume_ai_quota() then raise exception 'old attested deployment accepted';end if;
 perform set_config('request.headers',jsonb_build_object('x-kairo-audit',k,'x-kairo-ai-budget-version','1')::text,true);
 if not public.consume_ai_quota() then raise exception 'current deployment rejected';end if;
 update private.ai_complimentary_policy set enabled=false;
 if public.reserve_ai_tokens(r,'gpt-5.4-mini-2026-03-17',1) then raise exception 'disabled accepted';end if;
 update private.ai_complimentary_policy set enabled=true,not_before=now()+interval '1 day';
 if public.reserve_ai_tokens(r,'gpt-5.4-mini-2026-03-17',1) then raise exception 'early activation accepted';end if;
 update private.ai_complimentary_policy set not_before=now()-interval '1 day';
 -- Synthetic counters only exist inside this rollback transaction.
 delete from private.ai_token_reservations;delete from private.ai_token_days;
 if public.reserve_ai_tokens(r,'gpt-6.1-sol',1) then raise exception 'paid model accepted';end if;
 if public.reserve_ai_tokens(r,'gpt-5.4-mini-2026-03-17',null) then raise exception 'null accepted';end if;
 if not public.reserve_ai_tokens(r,'gpt-5.4-mini-2026-03-17',300000) then raise exception 'valid rejected';end if;
 if public.reserve_ai_tokens(r,'gpt-5.4-mini-2026-03-17',300000) then raise exception 'duplicate accepted';end if;
 for i in 1..5 loop
  if not public.reserve_ai_tokens(extensions.gen_random_uuid(),'gpt-5.4-mini-2026-03-17',300000) then raise exception 'within budget rejected';end if;
 end loop;
 if public.reserve_ai_tokens(extensions.gen_random_uuid(),'gpt-5.4-mini-2026-03-17',300000) then raise exception 'over budget accepted';end if;
 if not public.reserve_ai_tokens(extensions.gen_random_uuid(),'gpt-5.4-mini-2026-03-17',200000) then raise exception 'exact budget rejected';end if;
 if public.reserve_ai_tokens(extensions.gen_random_uuid(),'gpt-5.4-mini-2026-03-17',1) then raise exception 'exhausted accepted';end if;
 select reserved_tokens into v from private.ai_token_days where usage_day=(now() at time zone 'UTC')::date;
 if v<>2000000 then raise exception 'incorrect counter';end if;
 if has_table_privilege('anon','private.ai_token_days','SELECT') or has_table_privilege('authenticated','private.ai_complimentary_policy','UPDATE') or has_function_privilege('anon','public.ai_budget_status()','EXECUTE') then raise exception 'client budget access';end if;
end $$;
select 'budget and old-deployment gate tests passed' as result;
rollback;
