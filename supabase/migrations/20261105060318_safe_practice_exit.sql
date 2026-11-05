-- Leave a personal practice without manufacturing a graded result.
do $$declare definition text;anchor text:='elsif operation=''plans.list'' then';begin
 definition:=pg_get_functiondef('private.learning_api(text,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Inspect learning API before adding practice exit';end if;
 execute replace(definition,anchor,$branch$elsif operation='exam.abandon' then
  perform pg_advisory_xact_lock(hashtextextended('kairo-session:'||caller,0));
  sid:=(payload->>'id')::uuid;
  select * into s from private.kairo_exam_sessions where id=sid and user_id=caller and mode='exam' for update;
  if not found then raise exception 'Şəxsi sınaq tapılmadı.' using errcode='42501';end if;
  if s.status='abandoned' then return jsonb_build_object('abandoned',true);end if;
  if s.status<>'active' or s.deadline<=clock_timestamp() then raise exception 'Yalnız vaxtı bitməmiş aktiv şəxsi sınaqdan çıxmaq olar.';end if;
  update private.kairo_exam_sessions set status='abandoned' where id=sid;
  return jsonb_build_object('abandoned',true);
 elsif operation='plans.list' then$branch$);
end $$;

