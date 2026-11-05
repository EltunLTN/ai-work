begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();qid uuid:=gen_random_uuid();result jsonb;begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a||'@example.invalid',now()),(b,b||'@example.invalid',now());
 insert into public.account_profiles(id) values(a),(b);
 insert into private.kairo_exam_sessions(id,user_id,template_id,template_snapshot,mode,status,deadline,request_id) values(sid,a,null,'{"grade":11,"name":"QA snapshot","max_score":100,"sections":[]}', 'exam','finalized',now(),gen_random_uuid());
 insert into private.kairo_exam_items(session_id,ordinal,question_id,snapshot,answer_key,explanation,points) values(sid,0,null,jsonb_build_object('id',qid,'subject','Riyaziyyat','grade',11,'topic','Çoxhədlilər','type','single','body',jsonb_build_object('statement','x+x nədir?','options',jsonb_build_array('2x','x','0','1'))),'{"answer":0}','Cəmləmə qaydası',1);
 perform set_config('request.jwt.claim.sub',a::text,true);
 result:=public.kairo_api('tutor.create',jsonb_build_object('question_id',qid,'subject','Riyaziyyat','grade',11,'topic','Çoxhədlilər','statement','','mode','explain'));
 if result->'session'->'question_context'->>'statement' not like 'x+x nədir?%' or result->'session'->>'question_id' is not null then raise exception 'AI snapshot handoff failed';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin perform public.kairo_api('tutor.create',jsonb_build_object('question_id',qid,'subject','Riyaziyyat','grade',11,'topic','Çoxhədlilər','mode','explain'));raise exception 'Cross-user snapshot leak';exception when insufficient_privilege then null;end;
 insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at) values(a,'qa-1','quiz','Fizika','7',5,3,'[{"topic":"Qüvvə","total":5,"correct":3}]',now()),(a,'qa-2','quiz','Kimya','8',5,2,'[{"topic":"Atom","total":5,"correct":2}]',now());
 perform set_config('request.jwt.claim.sub',a::text,true);
 result:=public.learning_api('plans.list','{}');if jsonb_array_length(result->'plans')<>2 then raise exception 'Plan library omitted selections';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if jsonb_array_length(public.learning_api('plans.list','{}')->'plans')<>0 then raise exception 'Plan library ownership leak';end if;
end $$;
rollback;

