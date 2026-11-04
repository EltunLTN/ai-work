do $$declare definition text;section text;start_at int;end_at int;begin
 definition:=pg_get_functiondef('private.learning_api(text,jsonb)'::regprocedure);
 start_at:=position(' elsif operation=''mistakes.get'' then' in definition);
 end_at:=position(' elsif operation=''admin.competitions'' then' in definition);
 if start_at=0 or end_at<=start_at then raise exception 'Learning read sections changed';end if;
 section:=substring(definition from start_at for end_at-start_at);
 definition:=replace(definition,section,replace(replace(section,'private.kairo_exam_sessions s ','private.kairo_exam_sessions history_session '),'s.','history_session.'));
 start_at:=position(' elsif operation=''admin.arena'' then' in definition);
 section:=substring(definition from start_at);
 definition:=replace(definition,section,replace(replace(section,'private.kairo_exam_sessions s ','private.kairo_exam_sessions arena_session '),'s.','arena_session.'));
 execute definition;
end $$;

