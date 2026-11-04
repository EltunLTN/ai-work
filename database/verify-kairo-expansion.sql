-- All fixtures, including auth identities and configuration, roll back.
insert into auth.users(id,email,email_confirmed_at) values
('00000000-0000-4000-a000-000000000901','kairo-expansion-a@example.invalid',now()),
('00000000-0000-4000-a000-000000000902','kairo-expansion-b@example.invalid',now()),
('00000000-0000-4000-a000-000000000903','kairo-expansion-c@example.invalid',now()),
('00000000-0000-4000-a000-000000000904','kairo-expansion-admin@example.invalid',now());
insert into private.admin_emails(email) values('kairo-expansion-admin@example.invalid');
insert into public.account_profiles(id) values('00000000-0000-4000-a000-000000000901'),('00000000-0000-4000-a000-000000000902'),('00000000-0000-4000-a000-000000000903'),('00000000-0000-4000-a000-000000000904');
insert into private.activity_server_keys(digest) values(encode(extensions.digest('transaction-only-kairo-expansion-server-key','sha256'),'hex'));
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select public.kairo_api('profile.save','{"nickname":"QA Kairo A","color":"#729482","consent":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select public.kairo_api('profile.save','{"nickname":"QA Kairo B","color":"#729482","consent":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000903',true);
select public.kairo_api('profile.save','{"nickname":"QA Kairo C","color":"#729482","consent":true}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
do $$declare d jsonb;denied boolean:=false;begin
 begin perform * from private.kairo_questions;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Private bank is exposed';end if;
 d:=public.kairo_api('exam.catalog');if jsonb_array_length(d->'templates')<>6 then raise exception 'Published template visibility broken';end if;
 begin perform public.kairo_api('admin.catalog');raise exception 'Student admin access';exception when insufficient_privilege then null;end;
end $$;
select set_config('kairo.test_exam_id',public.kairo_api('exam.start','{"template":"f3c34ebb-f8df-58c6-972d-a74ba27c8a75","request_id":"00000000-0000-4000-b000-000000000901"}')->>'id',true);
do $$declare d jsonb;begin
 d:=public.kairo_api('exam.get',jsonb_build_object('id',current_setting('kairo.test_exam_id')));
 if jsonb_path_exists(d,'$.questions[*].key') or jsonb_array_length(d->'questions')<>10 then raise exception 'Answer key leaked or wrong question count';end if;
 if public.kairo_api('exam.start','{"template":"f3c34ebb-f8df-58c6-972d-a74ba27c8a75","request_id":"00000000-0000-4000-b000-000000000901"}')->>'id'<>d->>'id' then raise exception 'Start idempotency broken';end if;
 if public.kairo_ai_allowed() then raise exception 'Locked exam permits AI';end if;
end $$;
reset role;
select set_config('kairo.test_answers',(select jsonb_agg(jsonb_build_object('ordinal',ordinal,'value',answer_key->'answer','marked',false,'revision',1))::text from private.kairo_exam_items where session_id=current_setting('kairo.test_exam_id')::uuid),true);
set local role authenticated;
select public.kairo_api('exam.save',jsonb_build_object('id',current_setting('kairo.test_exam_id'),'answers',current_setting('kairo.test_answers')::jsonb,'index',4));
select public.kairo_api('exam.submit',jsonb_build_object('id',current_setting('kairo.test_exam_id')));
select public.kairo_api('exam.submit',jsonb_build_object('id',current_setting('kairo.test_exam_id')));
reset role;
do $$begin
 if (select earned from private.kairo_exam_results where session_id=current_setting('kairo.test_exam_id')::uuid)<>100 then raise exception 'Authoritative objective scoring broken';end if;
 if (select count(*) from public.practice_attempts where user_id='00000000-0000-4000-a000-000000000901' and source='exam')<>1 then raise exception 'Duplicate analytics on retry';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
do $$begin begin perform public.kairo_api('exam.get',jsonb_build_object('id',current_setting('kairo.test_exam_id')));raise exception 'Cross-user exam access';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select set_config('kairo.test_written_id',public.kairo_api('exam.start','{"template":"be568736-aeb9-5d70-89d6-78de2e26d9bb","request_id":"00000000-0000-4000-b000-000000000902"}')->>'id',true);
reset role;
select set_config('kairo.test_written_answers',(select jsonb_agg(jsonb_build_object('ordinal',ordinal,'value',case when snapshot->>'type'='written' then to_jsonb('(a-b)^2 >= 0; a^2+b^2 >=2ab; equality a=b'::text) when snapshot->>'type'='short' then answer_key->'answers'->0 else answer_key->'answer' end,'marked',false,'revision',1))::text from private.kairo_exam_items where session_id=current_setting('kairo.test_written_id')::uuid),true);
set local role authenticated;
select public.kairo_api('exam.save',jsonb_build_object('id',current_setting('kairo.test_written_id'),'answers',current_setting('kairo.test_written_answers')::jsonb));
select public.kairo_api('exam.submit',jsonb_build_object('id',current_setting('kairo.test_written_id')));
do $$declare d jsonb;begin d:=public.kairo_api('exam.get',jsonb_build_object('id',current_setting('kairo.test_written_id')));if d->'result'->>'status'<>'provisional' or (d->'result'->>'pending')::int<>1 then raise exception 'Written review state broken';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000904',true);
select public.kairo_api('admin.catalog');
reset role;
select set_config('kairo.test_written_ordinal',(select ordinal::text from private.kairo_exam_items where session_id=current_setting('kairo.test_written_id')::uuid and snapshot->>'type'='written'),true);
set local role authenticated;
select public.kairo_api('admin.exam.review',jsonb_build_object('id',current_setting('kairo.test_written_id'),'ordinal',current_setting('kairo.test_written_ordinal')::int,'score',3,'feedback','Kvadratın qeyri-mənfiliyi və bərabərlik halı tam göstərilib.'));
reset role;
do $$begin if (select status from private.kairo_exam_results where session_id=current_setting('kairo.test_written_id')::uuid)<>'final' or (select earned from private.kairo_exam_results where session_id=current_setting('kairo.test_written_id')::uuid)<>100 then raise exception 'Written finalization broken';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select public.kairo_api('goals.save','{"program":"a3360ea4-9b2e-50a1-adac-3eb08f8b4a89","target":600,"year":2027,"funding":"either"}');
select set_config('kairo.test_goal',public.kairo_api('goals.save','{"program":"cb7a1b9e-cbe4-5502-83a7-3f4cd249d1ba","target":580,"year":2027,"funding":"tuition"}')->'goals'->1->>'id',true);
do $$declare d jsonb;begin d:=public.kairo_api('goals.get');if jsonb_array_length(d->'goals')<>2 then raise exception 'Multiple goals not persisted';end if;if exists(select 1 from jsonb_array_elements(d->'programs') x where x->'cutoff'<>'null'::jsonb) then raise exception 'Invented cutoff seeded';end if;end $$;
select set_config('kairo.test_focus_id',public.kairo_api('focus.start','{"request_id":"00000000-0000-4000-b000-000000000903","subject":"Riyaziyyat","task":"Törəmə","return_path":"/plan","settings":{"focus":1,"short_break":1,"long_break":1,"rounds":1,"daily_goal":5,"auto_break":false,"sound":false}}')->'active'->>'id',true);
select public.kairo_api('focus.pause',jsonb_build_object('id',current_setting('kairo.test_focus_id')));
select public.kairo_api('focus.resume',jsonb_build_object('id',current_setting('kairo.test_focus_id')));
reset role;
update private.kairo_focus_sessions set last_seen=clock_timestamp()-interval '31 seconds',deadline=clock_timestamp()+interval '120 seconds' where id=current_setting('kairo.test_focus_id')::uuid;
set local role authenticated;
select public.kairo_api('focus.heartbeat',jsonb_build_object('id',current_setting('kairo.test_focus_id')));
reset role;
update private.kairo_focus_sessions set last_seen=clock_timestamp()-interval '31 seconds',deadline=clock_timestamp()+interval '120 seconds' where id=current_setting('kairo.test_focus_id')::uuid;
set local role authenticated;
select public.kairo_api('focus.heartbeat',jsonb_build_object('id',current_setting('kairo.test_focus_id')));
reset role;
do $$begin if (select status from private.kairo_focus_sessions where id=current_setting('kairo.test_focus_id')::uuid)<>'completed' or (select focused_seconds from private.kairo_focus_sessions where id=current_setting('kairo.test_focus_id')::uuid)<>60 then raise exception 'Focus time/completion broken';end if;end $$;
set local role authenticated;
select set_config('kairo.test_tutor_id',public.kairo_api('tutor.create','{"subject":"Riyaziyyat","grade":11,"topic":"Törəmə","statement":"2x+5=15","mode":"socratic"}')->'session'->>'id',true);
select public.kairo_api('tutor.begin',jsonb_build_object('id',current_setting('kairo.test_tutor_id'),'request_id','00000000-0000-4000-b000-000000000904','action','hint1','message','Kiçik ipucu ver.'));
select public.kairo_api('tutor.begin',jsonb_build_object('id',current_setting('kairo.test_tutor_id'),'request_id','00000000-0000-4000-b000-000000000904','action','hint1','message','Kiçik ipucu ver.'));
do $$declare denied boolean:=false;begin begin perform public.kairo_api('tutor.finish',jsonb_build_object('id',current_setting('kairo.test_tutor_id'),'request_id','00000000-0000-4000-b000-000000000904','answer','Saxta nəticə','verified',true));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Client can forge tutor completion';end if;end $$;
select set_config('request.headers','{"x-kairo-audit":"transaction-only-kairo-expansion-server-key"}',true);
select public.kairo_api('tutor.finish',jsonb_build_object('id',current_setting('kairo.test_tutor_id'),'request_id','00000000-0000-4000-b000-000000000904','answer','Əvvəlcə hər iki tərəfdən hansı ədədi çıxarmaq lazımdır?','verified',false));
select public.kairo_api('tutor.complete',jsonb_build_object('id',current_setting('kairo.test_tutor_id')));
reset role;
do $$begin if (select hint_count from private.kairo_tutor_sessions where id=current_setting('kairo.test_tutor_id')::uuid)<>1 or exists(select 1 from private.kairo_learning_events where source='tutor' and user_id='00000000-0000-4000-a000-000000000901' and independent) then raise exception 'Assisted outcome misclassified';end if;end $$;
select set_config('request.headers','{}',true);
set local role anon;
do $$begin begin perform public.kairo_api('home.get');raise exception 'Anonymous platform access';exception when insufficient_privilege then null;end;begin perform public.kairo_maintenance();raise exception 'Anonymous maintenance without key';exception when insufficient_privilege then null;end;end $$;
reset role;

-- Competition integration, through the exact authenticated RPC used by both clients.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select set_config('kairo.test_duel_create',public.kairo_api('duel.create','{"settings":{"subject":"Riyaziyyat","grade":11,"count":5,"seconds":15,"difficulty":"mixed","topic":""}}')::text,true);
select set_config('kairo.test_duel_id',current_setting('kairo.test_duel_create')::jsonb->>'id',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select public.kairo_api('duel.join',jsonb_build_object('token',current_setting('kairo.test_duel_create')::jsonb->>'token'));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000903',true);
do $$declare rejected boolean:=false;begin
 begin perform public.kairo_api('duel.join',jsonb_build_object('token',current_setting('kairo.test_duel_create')::jsonb->>'token'));exception when raise_exception then rejected:=true;end;if not rejected then raise exception 'Third player was accepted';end if;
 if exists(select 1 from public.kairo_live_matches where id=current_setting('kairo.test_duel_id')::uuid) then raise exception 'Realtime channel exposed to third user';end if;
 begin perform public.kairo_api('duel.get',jsonb_build_object('id',current_setting('kairo.test_duel_id')));raise exception 'Non participant reads duel';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select public.kairo_api('duel.ready',jsonb_build_object('id',current_setting('kairo.test_duel_id')));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select public.kairo_api('duel.ready',jsonb_build_object('id',current_setting('kairo.test_duel_id')));
do $$declare d jsonb;begin d:=public.kairo_api('duel.get',jsonb_build_object('id',current_setting('kairo.test_duel_id')));if d->>'status'<>'countdown' or d->'round_review'<>'null'::jsonb then raise exception 'Ready/countdown or key isolation broken';end if;end $$;
reset role;
create function pg_temp.kairo_test_play(mid uuid,rounds int) returns void language plpgsql security definer set search_path='' as $$
declare d private.kairo_duels;q jsonb;a jsonb;b jsonb;player_a uuid;player_b uuid;i int;before_points int;after_points int;reply jsonb;begin
 select min(user_id::text)::uuid,max(user_id::text)::uuid into player_a,player_b from private.kairo_duel_players where match_id=mid;
 if player_a not in ('00000000-0000-4000-a000-000000000901','00000000-0000-4000-a000-000000000902','00000000-0000-4000-a000-000000000903') or player_b not in ('00000000-0000-4000-a000-000000000901','00000000-0000-4000-a000-000000000902','00000000-0000-4000-a000-000000000903') then raise exception 'Only fixture duels are allowed';end if;
 update private.kairo_duels set status='active',round_started=clock_timestamp()-interval '2 seconds',round_deadline=clock_timestamp()+interval '13 seconds' where id=mid;
 for i in 0..rounds-1 loop
  select * into d from private.kairo_duels where id=mid;q:=d.question_set->d.round_index;
  a:=case when q->>'type'='short' then q->'answer_key'->'answers'->0 else q->'answer_key'->'answer' end;
  b:=case when q->>'type' in ('single','passage','image') then to_jsonb(((q->'answer_key'->>'answer')::int+1)%jsonb_array_length(q->'body'->'options')) when q->>'type'='multiple' then '[]'::jsonb when q->>'type'='matching' then '{}'::jsonb else to_jsonb('incorrect-test'::text) end;
  perform set_config('request.jwt.claim.sub',player_a::text,true);
  reply:=public.kairo_api('duel.answer',jsonb_build_object('id',mid,'round',i,'answer',a,'points',999999));
  if reply->'round_review'<>'null'::jsonb then raise exception 'Early correct answer disclosure';end if;
  select count(*) into before_points from private.kairo_duel_answers where match_id=mid and round_index=i and user_id=player_a;
  perform public.kairo_api('duel.answer',jsonb_build_object('id',mid,'round',i,'answer',a,'points',999999));
  select count(*) into after_points from private.kairo_duel_answers where match_id=mid and round_index=i and user_id=player_a;
  if before_points<>1 or after_points<>1 then raise exception 'Double submission counted';end if;
  perform set_config('request.jwt.claim.sub',player_b::text,true);
  reply:=public.kairo_api('duel.answer',jsonb_build_object('id',mid,'round',i,'answer',b));
  if reply->>'status'<>'round_result' then raise exception 'Both answer round transition failed';end if;
  update private.kairo_duels set reveal_until=clock_timestamp()-interval '1 second' where id=mid;
  perform public.kairo_api('duel.get',jsonb_build_object('id',mid));
 end loop;
 if exists(select 1 from private.kairo_duel_answers where match_id=mid and (total_points<0 or total_points>150 or speed_bonus>50)) then raise exception 'Client score manipulation succeeded';end if;
end $$;
select pg_temp.kairo_test_play(current_setting('kairo.test_duel_id')::uuid,5);
do $$begin
 if (select status from private.kairo_duels where id=current_setting('kairo.test_duel_id')::uuid)<>'finished' or (select winner_id from private.kairo_duels where id=current_setting('kairo.test_duel_id')::uuid)<>'00000000-0000-4000-a000-000000000901'::uuid then raise exception 'Duel winner not authoritative';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
do $$declare d jsonb;begin d:=public.kairo_api('duel.get',jsonb_build_object('id',current_setting('kairo.test_duel_id')));if d::text like '%00000000-0000-4000-a000-000000000902%' then raise exception 'Opponent private identifier leaked';end if;end $$;
select set_config('kairo.test_matchmaking',public.kairo_api('duel.find','{"settings":{"subject":"Fizika","grade":11,"count":5,"seconds":15,"difficulty":"mixed","topic":""}}')->>'id',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
do $$declare d jsonb;begin d:=public.kairo_api('duel.find','{"settings":{"subject":"Fizika","grade":11,"count":5,"seconds":15,"difficulty":"mixed","topic":""}}');if d->>'id'<>current_setting('kairo.test_matchmaking') or d->>'status'<>'ready' then raise exception 'Real matchmaking failed';end if;end $$;
select public.kairo_api('duel.cancel',jsonb_build_object('id',current_setting('kairo.test_matchmaking')));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select set_config('kairo.test_abandon',public.kairo_api('duel.create','{"settings":{"subject":"Riyaziyyat","grade":11,"count":5,"seconds":15,"difficulty":"mixed","topic":""}}')::text,true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000903',true);
select public.kairo_api('duel.join',jsonb_build_object('token',current_setting('kairo.test_abandon')::jsonb->>'token'));
reset role;
update private.kairo_duels set status='active',round_started=clock_timestamp()-interval '20 seconds',round_deadline=clock_timestamp()-interval '5 seconds' where id=(current_setting('kairo.test_abandon')::jsonb->>'id')::uuid;
set local role authenticated;
do $$declare d jsonb;begin d:=public.kairo_api('duel.get',jsonb_build_object('id',current_setting('kairo.test_abandon')::jsonb->>'id'));if d->>'status'<>'round_result' then raise exception 'Timeout not enforced';end if;end $$;
reset role;
update private.kairo_duel_players set last_seen=clock_timestamp()-interval '120 seconds' where match_id=(current_setting('kairo.test_abandon')::jsonb->>'id')::uuid;
set local role authenticated;
do $$declare d jsonb;begin d:=public.kairo_api('duel.get',jsonb_build_object('id',current_setting('kairo.test_abandon')::jsonb->>'id'));if d->>'status'<>'abandoned' or d->'winner'<>'null'::jsonb then raise exception 'Offline reconnect manufactured winner';end if;end $$;
reset role;
-- Weekly competitions have real empty fields until registered users play; no fake leaders.
select set_config('kairo.test_arena_id',(select id::text from private.kairo_tournaments where mode='async' and starts_at<=now() and ends_at>now() order by starts_at limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select public.kairo_api('arena.catalog');
reset role;
select set_config('kairo.test_arena_id',(select id::text from private.kairo_tournaments where mode='async' and starts_at<=now() and ends_at>now() order by starts_at limit 1),true);
set local role authenticated;
select public.kairo_api('arena.register',jsonb_build_object('id',current_setting('kairo.test_arena_id')));
select set_config('kairo.test_arena_a',public.kairo_api('arena.start',jsonb_build_object('id',current_setting('kairo.test_arena_id'),'request_id','00000000-0000-4000-b000-000000000905'))->>'session_id',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select public.kairo_api('arena.register',jsonb_build_object('id',current_setting('kairo.test_arena_id')));
select set_config('kairo.test_arena_b',public.kairo_api('arena.start',jsonb_build_object('id',current_setting('kairo.test_arena_id'),'request_id','00000000-0000-4000-b000-000000000906'))->>'session_id',true);
reset role;
do $$begin
 if (select array_agg(question_id order by ordinal) from private.kairo_exam_items where session_id=current_setting('kairo.test_arena_a')::uuid)<>(select array_agg(question_id order by ordinal) from private.kairo_exam_items where session_id=current_setting('kairo.test_arena_b')::uuid) then raise exception 'Arena competitors received different question sets';end if;
end $$;
create function pg_temp.kairo_test_finish(sid uuid,person uuid,is_correct boolean) returns void language plpgsql security definer set search_path='' as $$declare answers jsonb;begin
 if person not in ('00000000-0000-4000-a000-000000000901','00000000-0000-4000-a000-000000000902') then raise exception 'Only fixture sessions';end if;
 select jsonb_agg(jsonb_build_object('ordinal',ordinal,'value',case when is_correct then answer_key->'answer' else to_jsonb(((answer_key->>'answer')::int+1)%jsonb_array_length(snapshot->'body'->'options')) end,'revision',1,'marked',false)) into answers from private.kairo_exam_items where session_id=sid;
 perform set_config('request.jwt.claim.sub',person::text,true);perform public.kairo_api('exam.save',jsonb_build_object('id',sid,'answers',answers));perform public.kairo_api('exam.submit',jsonb_build_object('id',sid));end $$;
select pg_temp.kairo_test_finish(current_setting('kairo.test_arena_a')::uuid,'00000000-0000-4000-a000-000000000901',true);
select pg_temp.kairo_test_finish(current_setting('kairo.test_arena_b')::uuid,'00000000-0000-4000-a000-000000000902',false);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
do $$declare d jsonb;begin
 d:=public.kairo_api('arena.get',jsonb_build_object('id',current_setting('kairo.test_arena_id')));
 if d->'leaderboard'->0->>'me'<>'true' or (d->'leaderboard'->0->>'score')::numeric<>100 then raise exception 'Stored leaderboard ranking failed';end if;
 d:=public.kairo_api('exam.get',jsonb_build_object('id',current_setting('kairo.test_arena_a')));if d->>'can_reveal'<>'false' or jsonb_path_exists(d,'$.questions[*].key') then raise exception 'Arena key exposed before end';end if;
 d:=public.kairo_api('arena.start',jsonb_build_object('id',current_setting('kairo.test_arena_id'),'request_id','00000000-0000-4000-b000-000000000907'));if d->>'session_id'<>current_setting('kairo.test_arena_a') then raise exception 'Repeated arena attempt accepted';end if;
end $$;
reset role;
update private.kairo_tournaments set registration_closes=now()-interval '2 seconds',starts_at=now()-interval '1 day',ends_at=now()-interval '1 second' where id=current_setting('kairo.test_arena_id')::uuid;
select private.kairo_arena_tick(current_setting('kairo.test_arena_id')::uuid);
-- A three-person knockout must create a real bye and advance only real winners.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000904',true);
select set_config('kairo.test_knockout',public.kairo_api('admin.tournament.create',jsonb_build_object('tournament',jsonb_build_object('name','Transactional knockout fixture','mode','knockout','template_id','f3c34ebb-f8df-58c6-972d-a74ba27c8a75','max_participants',4,'time_per_question',15,'registration_opens',clock_timestamp()-interval '60 seconds','registration_closes',clock_timestamp()+interval '60 seconds','starts_at',clock_timestamp()+interval '60 seconds','ends_at',clock_timestamp()+interval '1 hour')))->>'id',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000901',true);
select public.kairo_api('arena.register',jsonb_build_object('id',current_setting('kairo.test_knockout')));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000902',true);
select public.kairo_api('arena.register',jsonb_build_object('id',current_setting('kairo.test_knockout')));
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000903',true);
select public.kairo_api('arena.register',jsonb_build_object('id',current_setting('kairo.test_knockout')));
reset role;
update private.kairo_tournaments set registration_closes=clock_timestamp()-interval '1 second',starts_at=clock_timestamp()-interval '1 second' where id=current_setting('kairo.test_knockout')::uuid;
select private.kairo_arena_tick(current_setting('kairo.test_knockout')::uuid);
do $$begin if (select count(*) from private.kairo_bracket_nodes where tournament_id=current_setting('kairo.test_knockout')::uuid and status='bye')<>1 then raise exception 'Missing real bracket bye';end if;end $$;
select pg_temp.kairo_test_play((select match_id from private.kairo_bracket_nodes where tournament_id=current_setting('kairo.test_knockout')::uuid and status='active' limit 1),10);
select private.kairo_arena_tick(current_setting('kairo.test_knockout')::uuid);
do $$begin
 if exists(select 1 from private.kairo_tournament_sets a join private.kairo_tournament_sets b on a.tournament_id=b.tournament_id and a.round=1 and b.round=2 where a.tournament_id=current_setting('kairo.test_knockout')::uuid and a.question_ids&&b.question_ids) then raise exception 'Knockout reused revealed questions';end if;
end $$;
update private.kairo_duel_players set ready=(user_id='00000000-0000-4000-a000-000000000901') where match_id=(select match_id from private.kairo_bracket_nodes where tournament_id=current_setting('kairo.test_knockout')::uuid and round=2);
update private.kairo_duels set updated_at=clock_timestamp()-interval '121 seconds' where id=(select match_id from private.kairo_bracket_nodes where tournament_id=current_setting('kairo.test_knockout')::uuid and round=2);
select private.kairo_arena_tick(current_setting('kairo.test_knockout')::uuid);
select private.kairo_arena_tick(current_setting('kairo.test_knockout')::uuid);
do $$begin if (select champion from private.kairo_tournaments where id=current_setting('kairo.test_knockout')::uuid)<>'00000000-0000-4000-a000-000000000901'::uuid or (select count(*) from private.kairo_bracket_nodes where tournament_id=current_setting('kairo.test_knockout')::uuid)<>3 then raise exception 'Advancement/walkover/idempotency failed';end if;end $$;
select jsonb_build_object('verified','exams, privacy, written review, goals, focus, tutor, real matching, duel scoring, timeouts, arena ranking, bracket byes, new round questions, walkovers');
