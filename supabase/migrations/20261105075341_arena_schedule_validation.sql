-- Keep tournament constraints; reject invalid schedules with useful messages first.
create function private.kairo_validate_tournament_schedule(q jsonb) returns void
language plpgsql set search_path='' as $$
declare opens timestamptz;closes timestamptz;starts timestamptz;ends timestamptz;
begin
 begin
  opens:=nullif(q->>'registration_opens','')::timestamptz;
  closes:=nullif(q->>'registration_closes','')::timestamptz;
  starts:=nullif(q->>'starts_at','')::timestamptz;
  ends:=nullif(q->>'ends_at','')::timestamptz;
 exception when invalid_datetime_format or datetime_field_overflow then
  raise exception 'Tarix və saat formatı uyğun deyil. Bakı vaxtı ilə təqvimdən seç.' using errcode='22023';
 end;
 if opens is null or closes is null or starts is null or ends is null or not(isfinite(opens) and isfinite(closes) and isfinite(starts) and isfinite(ends)) then
  raise exception 'Dörd tarix və saatın hamısını düzgün seç.' using errcode='22023';
 end if;
 if opens>=closes then raise exception 'Qeydiyyatın bağlanması açılmasından sonra olmalıdır.' using errcode='22023';end if;
 if starts>=ends then raise exception 'Yarışın bitməsi başlamasından sonra olmalıdır.' using errcode='22023';end if;
 if closes>ends then raise exception 'Qeydiyyat yarış bitənə qədər bağlanmalıdır.' using errcode='22023';end if;
 if q->>'mode'='knockout' and closes>starts then raise exception 'Pley-off qeydiyyatı yarış başlamazdan gec olmayaraq bağlanmalıdır.' using errcode='22023';end if;
end $$;
revoke all on function private.kairo_validate_tournament_schedule(jsonb) from public,anon,authenticated;
do $$declare definition text;anchor text:='q:=p->''tournament'';select * into template';begin
 definition:=pg_get_functiondef('private.kairo_admin_operation(uuid,text,jsonb)'::regprocedure);
 if position(anchor in definition)=0 then raise exception 'Inspect admin tournament implementation before patching';end if;
 execute replace(definition,anchor,'q:=p->''tournament'';perform private.kairo_validate_tournament_schedule(q);select * into template');
end $$;

