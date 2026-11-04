do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('private.platform_api(text,jsonb)'::regprocedure);
 definition:=replace(definition,'declare caller uuid;','<<platform>>'||chr(10)||'declare caller uuid;');
 definition:=replace(definition,'platform_api.settings','platform.settings');
 definition:=replace(definition,$old$if entry.match_id is not null then return private.kairo_duel_read(caller,entry.match_id);end if;$old$,$new$if entry.match_id is not null then return private.kairo_duel_read(caller,entry.match_id);end if; if operation='duel.ai.fail' then update private.kairo_duel_ai_requests set lease_until=now() where user_id=caller and request_id=rid; return jsonb_build_object('ok',true);end if;$new$);
 execute definition;
end $migration$;
