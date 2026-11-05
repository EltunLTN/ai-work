begin;
do $$declare person uuid;payload jsonb;bad jsonb;created jsonb;begin
 select id into person from auth.users where email='eltunjalilli@gmail.com';
 if person is null then raise exception 'Admin fixture missing';end if;
 perform set_config('request.jwt.claim.sub',person::text,true);
 payload:=jsonb_build_object('name','Rollback QA Arena','mode','async','template_id','f3c34ebb-f8df-58c6-972d-a74ba27c8a75','max_participants',16,'time_per_question',30,'registration_opens',now(),'registration_closes',now()+interval '1 hour','starts_at',now()+interval '1 hour','ends_at',now()+interval '1 day');
 foreach bad in array array[
  payload||jsonb_build_object('registration_closes',now()-interval '1 hour'),
  payload||jsonb_build_object('ends_at',now()),
  payload||jsonb_build_object('registration_closes',now()+interval '2 days'),
  payload||jsonb_build_object('starts_at',null),
  payload||jsonb_build_object('starts_at','not-a-date'),
  payload||jsonb_build_object('mode','knockout','registration_closes',now()+interval '2 hours')
 ] loop
  begin perform public.kairo_api('admin.tournament.create',jsonb_build_object('tournament',bad));raise exception 'Invalid schedule accepted';exception when invalid_parameter_value then null;end;
 end loop;
 created:=public.kairo_api('admin.tournament.create',jsonb_build_object('tournament',payload));
 if not exists(select 1 from private.kairo_tournaments where id=(created->>'id')::uuid and name='Rollback QA Arena') then raise exception 'Valid arena not created';end if;
 -- Private validation remains inaccessible directly to ordinary API roles.
 if has_function_privilege('authenticated','private.kairo_validate_tournament_schedule(jsonb)','EXECUTE') then raise exception 'Helper exposed';end if;
end $$;
rollback;

