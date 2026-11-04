-- Qualify JSON aliases in the generator; never confuse them with the loop's q variable.
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.learning_api(text,jsonb)'::regprocedure);
 definition:=replace(definition,'jsonb_array_elements(payload->''questions'') q where q->>''subject''','jsonb_array_elements(payload->''questions'') generated(item) where generated.item->>''subject''');
 definition:=replace(definition,'lower(regexp_replace(q->''body''->>''statement'',''[[:space:]]+'','' '',''g''))) from jsonb_array_elements(payload->''questions'') q','lower(regexp_replace(generated.item->''body''->>''statement'',''[[:space:]]+'','' '',''g''))) from jsonb_array_elements(payload->''questions'') generated(item)');
 definition:=replace(definition,'jsonb_array_elements(result->''questions'') q where (q->>''ordinal'')::int=ord and q->''correct''','jsonb_array_elements(result->''questions'') generated(item) where (generated.item->>''ordinal'')::int=ord and generated.item->''correct''');
 definition:=replace(definition,'(selection->>''grade'')::int not between 5 and 11','(selection->>''grade'')::int not between 1 and 11');
 execute definition;
end $$;
-- Index all new foreign keys used by deletion checks and session lookups.
create index kairo_mistake_session_idx on private.kairo_mistake_notes(session_id);
create index kairo_practice_session_idx on private.kairo_practice_requests(session_id) where session_id is not null;

