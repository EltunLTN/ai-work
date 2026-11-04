-- This is a local application ceiling, NOT an OpenAI organization billing limit.
create table private.ai_complimentary_policy (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 not_before timestamptz not null default ((date_trunc('day',now() at time zone 'UTC') + interval '1 day') at time zone 'UTC'),
 daily_limit integer not null default 2000000 check(daily_limit between 1 and 2000000)
);
insert into private.ai_complimentary_policy(id) values(true);
create table private.ai_token_days (
 usage_day date primary key,
 reserved_tokens integer not null default 0 check(reserved_tokens between 0 and 2000000),
 requests integer not null default 0 check(requests>=0)
);
create table private.ai_token_reservations (
 request_id uuid primary key,
 usage_day date not null references private.ai_token_days(usage_day),
 tokens integer not null check(tokens between 1 and 300000),
 created_at timestamptz not null default now()
);
alter table private.ai_complimentary_policy enable row level security;
alter table private.ai_token_days enable row level security;
alter table private.ai_token_reservations enable row level security;
revoke all on private.ai_complimentary_policy,private.ai_token_days,private.ai_token_reservations from public,anon,authenticated;

create function private.reserve_ai_tokens(request_id uuid,requested_model text,token_reservation integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare p private.ai_complimentary_policy; d date; t time; affected integer;
begin
 if not private.kairo_server_attested() then return false;end if;
 if request_id is null or requested_model is distinct from 'gpt-5.4-mini-2026-03-17' or token_reservation is null or token_reservation not between 1 and 300000 then return false;end if;
 -- Serialize reservations across every Vercel instance and environment.
 select * into p from private.ai_complimentary_policy where id=true for update;
 if not found or not p.enabled or clock_timestamp()<p.not_before then return false;end if;
 d:=(clock_timestamp() at time zone 'UTC')::date;
 t:=(clock_timestamp() at time zone 'UTC')::time;
 -- Leave five minutes around reset so in-flight requests cannot straddle days.
 if t<time '00:05' or t>=time '23:55' then return false;end if;
 if exists(select 1 from private.ai_token_reservations r where r.request_id=reserve_ai_tokens.request_id) then return false;end if;
 insert into private.ai_token_days(usage_day) values(d) on conflict do nothing;
 update private.ai_token_days set reserved_tokens=reserved_tokens+token_reservation,requests=requests+1
 where usage_day=d and reserved_tokens+token_reservation<=p.daily_limit;
 get diagnostics affected=row_count;
 if affected<>1 then return false;end if;
 insert into private.ai_token_reservations(request_id,usage_day,tokens) values(request_id,d,token_reservation);
 return true;
end $$;
create function public.reserve_ai_tokens(request_id uuid,requested_model text,token_reservation integer) returns boolean
language sql security invoker set search_path='' as $$ select private.reserve_ai_tokens(request_id,requested_model,token_reservation); $$;
revoke all on function private.reserve_ai_tokens(uuid,text,integer),public.reserve_ai_tokens(uuid,text,integer) from public;
grant execute on function private.reserve_ai_tokens(uuid,text,integer),public.reserve_ai_tokens(uuid,text,integer) to anon,authenticated;

create function private.ai_budget_status() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501';end if;
 return (select jsonb_build_object('enabled',p.enabled,'not_before',p.not_before,'model','gpt-5.4-mini-2026-03-17','daily_limit',p.daily_limit,
 'reserved_tokens',coalesce(d.reserved_tokens,0),'requests',coalesce(d.requests,0),'usage_day',(now() at time zone 'UTC')::date)
 from private.ai_complimentary_policy p left join private.ai_token_days d on d.usage_day=(now() at time zone 'UTC')::date where p.id=true);
end $$;
create function public.ai_budget_status() returns jsonb language sql security invoker set search_path='' as $$ select private.ai_budget_status(); $$;
revoke all on function private.ai_budget_status(),public.ai_budget_status() from public,anon;
grant execute on function private.ai_budget_status(),public.ai_budget_status() to authenticated;
