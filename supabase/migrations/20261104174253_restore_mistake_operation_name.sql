do $$declare definition text;begin
 definition:=pg_get_functiondef('private.learning_api(text,jsonb)'::regprocedure);
 if position('mistakehistory_session.get' in definition)=0 then raise exception 'Unexpected mistake operation';end if;
 execute replace(definition,'mistakehistory_session.get','mistakes.get');
end $$;

