-- Transaction-only identities, no real students or AI provider traffic.
begin;
do $$declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();adm uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();lease uuid;sid uuid;r jsonb;result jsonb;q jsonb:='[]';key text:='learning-qa-'||gen_random_uuid();i int;begin
 insert into auth.users(id,email,email_confirmed_at) values(a,a::text||'@example.invalid',now()),(b,b::text||'@example.invalid',now()),(adm,adm::text||'@example.invalid',now());
 insert into public.account_profiles(id) values(a),(b),(adm);
 insert into private.admin_emails(email) values(adm::text||'@example.invalid');
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.learning_api('identity.get','{}');if r->>'student_id' not like 'KR-%' or public.learning_api('identity.get','{}') is distinct from r then raise exception 'unstable student id';end if;
 begin perform public.learning_api('admin.competitions','{}');raise exception 'student saw admin competitions';exception when insufficient_privilege then null;end;
 begin perform public.learning_api('practice.claim',jsonb_build_object('request_id',rid,'selection','{"mode":"mixed","grade":"11","subjects":["Riyaziyyat"],"count":2}'::jsonb));raise exception 'unattested generation';exception when insufficient_privilege then null;end;
 insert into private.activity_server_keys(digest) values(encode(extensions.digest(key,'sha256'),'hex'));
 perform set_config('request.headers',jsonb_build_object('x-kairo-audit',key)::text,true);
 r:=public.learning_api('practice.claim',jsonb_build_object('request_id',rid,'selection','{"mode":"mixed","grade":"11","subjects":["Riyaziyyat"],"count":2}'::jsonb));lease:=(r->>'lease')::uuid;if lease is null then raise exception 'missing lease';end if;
 for i in 1..2 loop q:=q||jsonb_build_array(jsonb_build_object('subject','Riyaziyyat','grade',5+i,'topic','QA bölmə '||i,'difficulty','easy','type','single','body',jsonb_build_object('statement','QA sualı '||i,'options',jsonb_build_array('A','B','C','D')),'answer_key','{"answer":0}'::jsonb,'explanation','QA düzgün cavab A','points',1));end loop;
 r:=public.learning_api('practice.save',jsonb_build_object('request_id',rid,'lease',lease,'questions',q));sid:=(r->>'id')::uuid;
 r:=public.kairo_api('exam.get',jsonb_build_object('id',sid));if r->'questions'->0 ? 'key' then raise exception 'early answer key';end if;
 perform public.learning_api('replay.record',jsonb_build_object('id',sid,'events',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'ordinal',0,'kind','focus','focus_ms',8000))));
 r:=public.kairo_api('exam.save',jsonb_build_object('id',sid,'answers',jsonb_build_array(jsonb_build_object('ordinal',0,'value',0,'revision',1))));
 r:=public.kairo_api('exam.save',jsonb_build_object('id',sid,'answers',jsonb_build_array(jsonb_build_object('ordinal',0,'value',1,'revision',2))));
 r:=public.kairo_api('exam.save',jsonb_build_object('id',sid,'answers',jsonb_build_array(jsonb_build_object('ordinal',0,'value',1,'revision',3))));
 if (select count(*) from private.kairo_replay_events where session_id=sid and kind='answer')<>2 then raise exception 'answer change trace wrong';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin perform public.learning_api('replay.get',jsonb_build_object('id',sid));raise exception 'cross student replay';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.kairo_api('exam.submit',jsonb_build_object('id',sid));
 if (select count(distinct grade) from public.practice_attempts where user_id=a)<>2 then raise exception 'mixed results lost question grade';end if;
 r:=public.learning_api('replay.get',jsonb_build_object('id',sid));if jsonb_array_length(r->'events')<>3 then raise exception 'missing replay';end if;
 perform public.learning_api('mistakes.get','{}');
 perform public.learning_api('mistake.save',jsonb_build_object('id',sid,'ordinal',0,'reason','rushing','note','QA self report'));
 if jsonb_array_length(public.learning_api('replay.get',jsonb_build_object('id',sid))->'notes')<>1 then raise exception 'missing mistake note';end if;
 perform set_config('request.jwt.claim.sub',adm::text,true);
 perform public.learning_api('admin.competitions','{}');
 insert into private.kairo_tournaments(name,mode,template_id,subject,grade,question_count,registration_opens,registration_closes,starts_at,ends_at,status,question_ids)
 values('Transaction QA arena','async',(select id from private.kairo_exam_templates limit 1),'Riyaziyyat',11,5,now()-interval '2 hours',now()-interval '1 hour',now()-interval '1 hour',now()+interval '1 hour','active','{}');
 insert into private.kairo_registrations(tournament_id,user_id) select id,a from private.kairo_tournaments where name='Transaction QA arena';
 insert into private.kairo_arena_entries(tournament_id,user_id,session_id) select id,a,sid from private.kairo_tournaments where name='Transaction QA arena';
 r:=public.learning_api('admin.arena',jsonb_build_object('id',(select id from private.kairo_tournaments where name='Transaction QA arena')));
 if jsonb_array_length(r->'entries')<>1 or r->'entries'->0->>'user_id'<>a::text then raise exception 'admin arena entries missing';end if;
 perform public.platform_api('admin.session',jsonb_build_object('id',sid,'user_id',a,'kind','exam'));
 perform public.learning_api('admin.replay',jsonb_build_object('id',sid));
end $$;
rollback;

