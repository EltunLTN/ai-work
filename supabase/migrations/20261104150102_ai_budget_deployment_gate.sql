-- Reject AI calls from older deployments before any provider request.
create or replace function private.consume_ai_quota() returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer; daily_limit integer;
begin
 if not private.kairo_server_attested() or coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-ai-budget-version','')<>'1' then return false;end if;
 if (select auth.uid()) is null then return false; end if;
 select coalesce(p.daily_ai_limit,100) into daily_limit from public.account_profiles p where p.id=(select auth.uid());
 daily_limit:=coalesce(daily_limit,100);
 if daily_limit=0 then return false; end if;
 insert into private.ai_daily_usage(user_id,usage_day,requests) values((select auth.uid()),(now() at time zone 'UTC')::date,1)
 on conflict(user_id) do update set usage_day=excluded.usage_day,requests=case when ai_daily_usage.usage_day=excluded.usage_day then ai_daily_usage.requests+1 else 1 end
 where ai_daily_usage.usage_day<>excluded.usage_day or ai_daily_usage.requests<daily_limit;
 get diagnostics affected=row_count; return affected=1;
end $$;

