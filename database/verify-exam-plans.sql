set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select set_config('request.headers','{}',true);
do $$begin
 if public.kairo_api('exam.plan.get',jsonb_build_object('id',current_setting('kairo.test_exam_id'),'subject','Riyaziyyat'))->'plan'<>'null'::jsonb then raise exception 'Unexpected plan';end if;
 begin perform public.kairo_api('exam.plan.save',jsonb_build_object('id',current_setting('kairo.test_exam_id'),'subject','Riyaziyyat','plan',jsonb_build_object('title','Forged plan','days',jsonb_build_array(1,2,3,4,5,6,7))));raise exception 'Client forged exam plan';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.headers','{"x-kairo-audit":"transaction-only-kairo-expansion-server-key"}',true);
select public.kairo_api('exam.plan.save',jsonb_build_object('id',current_setting('kairo.test_exam_id'),'subject','Riyaziyyat','plan',jsonb_build_object('title','Server verified plan','days',jsonb_build_array(1,2,3,4,5,6,7))));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
do $$begin begin perform public.kairo_api('exam.plan.get',jsonb_build_object('id',current_setting('kairo.test_exam_id'),'subject','Riyaziyyat'));raise exception 'Cross-user plan';exception when insufficient_privilege then null;end;end $$;
reset role;
