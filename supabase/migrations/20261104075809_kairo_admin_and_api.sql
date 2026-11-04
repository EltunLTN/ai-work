create table private.kairo_tutor_reports(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,message_id uuid not null references private.kairo_tutor_messages(id) on delete cascade,reason text not null,created_at timestamptz not null default now(),resolved boolean not null default false,unique(user_id,message_id));
create index kairo_tutor_report_message_idx on private.kairo_tutor_reports(message_id);
create function private.kairo_valid_url(url text,official_only boolean default false) returns boolean language sql immutable set search_path='' as $$
 select coalesce(length(url)<=1000 and url ~ '^https://[^/@[:space:]]+/' and (not official_only or url ~ '^https://(www[.])?dim[.]gov[.]az/'),false);
$$;
create function private.kairo_validate_question(q jsonb) returns void language plpgsql immutable set search_path='' as $$
declare kind text:=q->>'type';body jsonb:=q->'body';key jsonb:=q->'answer_key';n int;begin
 if not coalesce(q->>'subject' in ('Riyaziyyat','Fizika','Kimya','Biologiya','Coğrafiya') and (q->>'grade')::int between 1 and 11 and q->>'difficulty' in ('easy','medium','hard') and kind in ('single','multiple','numeric','short','matching','written','passage','image') and length(q->>'topic') between 1 and 200 and length(body->>'statement') between 3 and 4000 and length(q->>'explanation') between 3 and 6000 and jsonb_typeof(key)='object' and (q->>'points')::numeric>0 and (q->>'points')::numeric<=100,false) then raise exception 'Sual sahələri uyğun deyil.';end if;
 if kind in ('single','multiple','passage','image') then
  if jsonb_typeof(body->'options') is distinct from 'array' or jsonb_array_length(body->'options') not between 2 and 6 then raise exception 'Cavab variantları uyğun deyil.';end if;
  if exists(select 1 from jsonb_array_elements(body->'options') o where jsonb_typeof(o)<>'string' or length(o#>>'{}') not between 1 and 1000) or (select count(distinct o) from jsonb_array_elements(body->'options') o)<>jsonb_array_length(body->'options') then raise exception 'Variantlar fərqli və mətn olmalıdır.';end if;
  if not private.kairo_answer_valid(kind,body,key->'answer') or key->'answer' is null or key->'answer' in ('null','[]','""') then raise exception 'Düzgün cavab açarı uyğun deyil.';end if;
 elsif kind='numeric' then
  if private.kairo_number(key->>'answer') is null or coalesce((key->>'tolerance')::numeric,0) not between 0 and 0.1 then raise exception 'Rəqəm cavabı uyğun deyil.';end if;
 elsif kind='short' then
  if jsonb_typeof(key->'answers') is distinct from 'array' or jsonb_array_length(key->'answers') not between 1 and 10 or exists(select 1 from jsonb_array_elements(key->'answers') a where jsonb_typeof(a)<>'string' or length(a#>>'{}') not between 1 and 200) then raise exception 'Qısa cavab açarı uyğun deyil.';end if;
 elsif kind='matching' then
  if jsonb_typeof(body->'left') is distinct from 'array' or jsonb_typeof(body->'right') is distinct from 'array' or jsonb_typeof(key->'answer') is distinct from 'object' then raise exception 'Uyğunlaşdırma sahələri çatışmır.';end if;
  n:=jsonb_array_length(body->'left');
  if exists(select 1 from jsonb_array_elements(body->'left') e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>1000) or exists(select 1 from jsonb_array_elements(body->'right') e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>1000) then raise exception 'Uyğunlaşdırma mətnləri uyğun deyil.';end if;
  if n not between 2 and 8 or jsonb_array_length(body->'right') not between 2 and 8 or (select count(*) from jsonb_object_keys(key->'answer'))<>n then raise exception 'Uyğunlaşdırma sayı uyğun deyil.';end if;
  if exists(select 1 from generate_series(0,n-1) i where key->'answer'->>i::text is null or (key->'answer'->>i::text) !~ '^[0-7]$' or (key->'answer'->>i::text)::int>=jsonb_array_length(body->'right')) then raise exception 'Uyğunlaşdırma cavabı uyğun deyil.';end if;
 elsif kind='written' and not coalesce(length(key->>'rubric') between 10 and 5000,false) then raise exception 'Yazılı cavab üçün qiymətləndirmə meyarı tələb olunur.';
 end if;
 if kind='passage' and not coalesce(length(body->>'passage') between 20 and 6000,false) then raise exception 'Oxu mətni çatışmır.';end if;
 if kind='image' and not coalesce(body->>'image_url' ~ '^/kairo/[a-zA-Z0-9/_-]+[.](svg|png|webp|jpg)$',false) then raise exception 'Diaqram yerli, yoxlanmış fayldan olmalıdır.';end if;
end $$;
create function private.kairo_validate_template(t jsonb,publishing boolean) returns void language plpgsql security definer set search_path='' as $$
declare section jsonb;other_section jsonb;section_index int:=0;total_count int:=0;available int;types jsonb;begin
 if not coalesce(length(t->>'name') between 3 and 180 and (t->>'grade')::int between 1 and 11 and (t->>'year')::int between 2026 and 2100 and (t->>'duration_seconds')::int between 60 and 21600 and (t->>'max_score')::numeric>0 and (t->>'max_score')::numeric<=1000 and t->>'exam_type' in ('custom','graduation9','graduation11','admission') and t->>'scale' in ('kairo100','dim300','dim400','dim700','custom') and jsonb_typeof(t->'sections')='array',false) then raise exception 'İmtahan şablonu uyğun deyil.';end if;
 for section in select value from jsonb_array_elements(t->'sections') loop
  if not coalesce(section->>'subject' in ('Riyaziyyat','Fizika','Kimya','Biologiya','Coğrafiya') and (section->>'count')::int between 1 and 100 and coalesce((section->>'weight')::numeric,1) between 0.1 and 10 and jsonb_typeof(section->'types')='array',false) then raise exception 'İmtahan bölməsi uyğun deyil.';end if;
  for other_section in select value from jsonb_array_elements(t->'sections') with ordinality x(value,n) where n<=section_index loop
   if section->>'subject'=other_section->>'subject' and exists(select 1 from jsonb_array_elements_text(section->'types') v where other_section->'types' ? v)
    and (coalesce(section->>'topic','')='' or coalesce(other_section->>'topic','')='' or section->>'topic'=other_section->>'topic')
    and (coalesce(section->>'difficulty','mixed')='mixed' or coalesce(other_section->>'difficulty','mixed')='mixed' or section->>'difficulty'=other_section->>'difficulty') then raise exception 'Bölmələrin sual hovuzları üst-üstə düşməməlidir.';end if;
  end loop;
  section_index:=section_index+1;
  total_count:=total_count+(section->>'count')::int;
  if publishing then
   select count(*) into available from private.kairo_questions q where q.subject=section->>'subject' and q.grade=(t->>'grade')::int and q.status='reviewed' and section->'types' ? q.type and (coalesce(section->>'topic','')='' or q.topic=section->>'topic') and (coalesce(section->>'difficulty','mixed')='mixed' or q.difficulty=section->>'difficulty');
   if available<(section->>'count')::int then raise exception '% üçün təsdiqlənmiş sual sayı kifayət deyil.',section->>'subject';end if;
  end if;
 end loop;
 if total_count not between 1 and 200 then raise exception 'Sual sayı uyğun deyil.';end if;
 if coalesce((t->>'official_format')::boolean,false) and publishing then
  if not private.kairo_valid_url(t->>'source_url',true) or t->>'source_published' is null or not coalesce((t->'rules'->>'verified')::boolean,false) or not coalesce((t->'rules'->>'authorized_content')::boolean,false) or not coalesce(length(t->'rules'->>'scoring_reference')>=20,false) then raise exception 'Rəsmi mənbə, qiymətləndirmə istinadı və məzmun icazəsi təsdiqlənməlidir.';end if;
 end if;
 if (t->>'scale') like 'dim%' and not coalesce((t->>'official_format')::boolean,false) then raise exception 'DİM bal şkalası yalnız mənbə ilə təsdiqlənən profilə verilə bilər.';end if;
end $$;

create function private.kairo_admin_operation(caller uuid,operation text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare q jsonb;entity_id uuid;existing_template private.kairo_exam_templates;version_number int;program jsonb;university uuid;selected uuid[];template private.kairo_exam_templates;available int;required int;rounds int;participants int;setting jsonb;sid uuid;begin
 perform private.kairo_require_admin();
 if operation='admin.question.save' then
  q:=p->'question';perform private.kairo_validate_question(q);
  if q->>'status' not in ('draft','reviewed','archived') then raise exception 'Sual statusu uyğun deyil.';end if;
  entity_id:=coalesce((q->>'id')::uuid,gen_random_uuid());
  if exists(select 1 from private.kairo_tournaments where status in ('scheduled','active') and entity_id=any(question_ids)) or exists(select 1 from private.kairo_tournament_sets r join private.kairo_tournaments t on t.id=r.tournament_id where t.status in ('scheduled','active') and entity_id=any(r.question_ids)) then raise exception 'Bu sual aktiv turnirdə dondurulub. Yeni sual kimi saxla və ya əvvəl turniri ləğv et.';end if;
  insert into private.kairo_questions(id,subject,grade,topic,difficulty,type,body,answer_key,explanation,points,status,origin,source_url,source_note,reviewed_by,reviewed_at)
  values(entity_id,q->>'subject',(q->>'grade')::int,q->>'topic',q->>'difficulty',q->>'type',q->'body',q->'answer_key',q->>'explanation',(q->>'points')::numeric,q->>'status',coalesce(q->>'origin','authored'),nullif(q->>'source_url',''),coalesce(q->>'source_note',''),case when q->>'status'='reviewed' then caller else null end,case when q->>'status'='reviewed' then now() else null end)
  on conflict(id) do update set revision=kairo_questions.revision+1,subject=excluded.subject,grade=excluded.grade,topic=excluded.topic,difficulty=excluded.difficulty,type=excluded.type,body=excluded.body,answer_key=excluded.answer_key,explanation=excluded.explanation,points=excluded.points,status=excluded.status,origin=excluded.origin,source_url=excluded.source_url,source_note=excluded.source_note,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,updated_at=now();
  perform private.kairo_audit('question.save',entity_id::text,jsonb_build_object('status',q->>'status','subject',q->>'subject'));return jsonb_build_object('id',entity_id);
 elsif operation='admin.template.save' then
  q:=p->'template';perform private.kairo_validate_template(q,q->>'status'='published');
  perform pg_advisory_xact_lock(hashtextextended('kairo-template:'||(q->>'name'),0));
  if q->>'id' is not null then select * into existing_template from private.kairo_exam_templates where private.kairo_exam_templates.id=(q->>'id')::uuid;end if;
  if existing_template.id is not null and existing_template.status='draft' then entity_id:=existing_template.id;version_number:=existing_template.version;
  else entity_id:=gen_random_uuid();select coalesce(max(version),0)+1 into version_number from private.kairo_exam_templates where name=q->>'name';end if;
  insert into private.kairo_exam_templates(id,name,version,year,exam_type,admission_group,grade,duration_seconds,max_score,scale,sections,rules,official_format,verified_at,source_url,source_published,status,created_by)
  values(entity_id,q->>'name',version_number,(q->>'year')::int,q->>'exam_type',nullif(q->>'admission_group',''),(q->>'grade')::int,(q->>'duration_seconds')::int,(q->>'max_score')::numeric,q->>'scale',q->'sections',coalesce(q->'rules','{}'),coalesce((q->>'official_format')::boolean,false),case when q->>'status'='published' then now() else null end,nullif(q->>'source_url',''),nullif(q->>'source_published','')::date,q->>'status',caller)
  on conflict(id) do update set name=excluded.name,year=excluded.year,exam_type=excluded.exam_type,admission_group=excluded.admission_group,grade=excluded.grade,duration_seconds=excluded.duration_seconds,max_score=excluded.max_score,scale=excluded.scale,sections=excluded.sections,rules=excluded.rules,official_format=excluded.official_format,verified_at=excluded.verified_at,source_url=excluded.source_url,source_published=excluded.source_published,status=excluded.status;
  perform private.kairo_audit('template.save',entity_id::text,jsonb_build_object('version',version_number,'status',q->>'status'));return jsonb_build_object('id',entity_id,'version',version_number);
 elsif operation='admin.template.archive' then
  entity_id:=(p->>'id')::uuid;
  if exists(select 1 from private.kairo_tournaments where template_id=entity_id and status in ('scheduled','active')) then raise exception 'Əvvəl bağlı turnirləri ləğv et.';end if;
  update private.kairo_exam_templates set status='archived' where private.kairo_exam_templates.id=entity_id;
  perform private.kairo_audit('template.archive',entity_id::text);return jsonb_build_object('ok',true);
 elsif operation='admin.universities.import' then
  if p->>'authorized'<>'true' or jsonb_typeof(p->'rows') is distinct from 'array' or jsonb_array_length(p->'rows') not between 1 and 500 then raise exception 'İcazəli mənbəni təsdiqlə və 1–500 sətir göndər.';end if;
  for program in select value from jsonb_array_elements(p->'rows') loop
   if not coalesce(length(program->>'university') between 3 and 200 and length(program->>'name') between 2 and 200 and (program->>'year')::int between 2020 and 2100,false) or not private.kairo_valid_url(program->>'source_url') then raise exception 'Universitet və proqram mənbələri uyğun deyil.';end if;
   if coalesce(program->>'cutoff','')<>'' or coalesce(program->>'state_cutoff','')<>'' then
    if program->>'source_published' is null or program->>'source_published'='' or (program->>'year')::int>extract(year from now()) then raise exception 'Keçid balı üçün tarixi mənbə və keçmiş/cari qəbul ili tələb olunur.';end if;
   end if;
   insert into private.kairo_universities(name,source_url) values(program->>'university',program->>'source_url') on conflict(name) do update set source_url=excluded.source_url,verified_at=now() returning private.kairo_universities.id into university;
   insert into private.kairo_programs(university_id,code,name,admission_group,language,study_format,year,cutoff,state_cutoff,minimum_requirement,source_url,source_published,published)
   values(university,nullif(program->>'code',''),program->>'name',nullif(program->>'admission_group',''),coalesce(nullif(program->>'language',''),'Məlumat təsdiqlənməyib'),coalesce(nullif(program->>'study_format',''),'Məlumat təsdiqlənməyib'),(program->>'year')::int,nullif(program->>'cutoff','')::numeric,nullif(program->>'state_cutoff','')::numeric,left(program->>'minimum_requirement',2000),program->>'source_url',nullif(program->>'source_published','')::date,true)
   on conflict(university_id,name,language,study_format,year) do update set code=excluded.code,admission_group=excluded.admission_group,cutoff=excluded.cutoff,state_cutoff=excluded.state_cutoff,minimum_requirement=excluded.minimum_requirement,source_url=excluded.source_url,source_published=excluded.source_published,verified_at=now(),published=true;
  end loop;
  perform private.kairo_audit('universities.import','catalog',jsonb_build_object('rows',jsonb_array_length(p->'rows')));return jsonb_build_object('imported',jsonb_array_length(p->'rows'));
 elsif operation='admin.tournament.create' then
  q:=p->'tournament';select * into template from private.kairo_exam_templates where private.kairo_exam_templates.id=(q->>'template_id')::uuid and status='published';
  if not found or jsonb_array_length(template.sections)<>1 then raise exception 'Turnir üçün bir fənnli yayımlanmış şablon seç.';end if;
  setting:=template.sections->0;required:=(setting->>'count')::int;participants:=(q->>'max_participants')::int;
  if required not in (5,10,15,20) or not coalesce(q->>'mode' in ('async','knockout') and length(q->>'name') between 3 and 180 and (q->>'time_per_question')::int in (15,20,30,45,60,90) and participants between 2 and 64,false) then raise exception 'Turnir qaydaları uyğun deyil.';end if;
  if q->>'mode'='knockout' and (q->>'registration_closes')::timestamptz>(q->>'starts_at')::timestamptz then raise exception 'Canlı turnirin qeydiyyatı startdan əvvəl bağlanmalıdır.';end if;
  select array_agg(x.id order by x.ord) into selected from (select x.id,row_number()over() ord from (select x.id from private.kairo_questions x where x.status='reviewed' and x.grade=template.grade and x.subject=setting->>'subject' and x.type<>'written' and setting->'types' ? x.type and (coalesce(setting->>'difficulty','mixed')='mixed' or x.difficulty=setting->>'difficulty') and (coalesce(setting->>'topic','')='' or x.topic=setting->>'topic') order by random() limit required) x) x;
  if coalesce(array_length(selected,1),0)<>required then raise exception 'Eyni obyektiv sual dəsti üçün kifayət qədər material yoxdur.';end if;
  if q->>'mode'='knockout' then
   select count(*) into available from private.kairo_questions x where x.status='reviewed' and x.grade=template.grade and x.subject=setting->>'subject' and x.type<>'written';
   rounds:=ceil(log(2,participants))::int;if available<required*rounds then raise exception 'Hər raund üçün yeni sual dəsti tələb olunur: ən az % sual.',required*rounds;end if;
  end if;
  insert into private.kairo_tournaments(name,mode,template_id,subject,grade,question_count,time_per_question,registration_opens,registration_closes,starts_at,ends_at,max_participants,question_ids)
  values(q->>'name',q->>'mode',template.id,setting->>'subject',template.grade,required,(q->>'time_per_question')::int,(q->>'registration_opens')::timestamptz,(q->>'registration_closes')::timestamptz,(q->>'starts_at')::timestamptz,(q->>'ends_at')::timestamptz,participants,selected) returning private.kairo_tournaments.id into entity_id;
  perform private.kairo_audit('tournament.create',entity_id::text,jsonb_build_object('mode',q->>'mode'));return jsonb_build_object('id',entity_id);
 elsif operation='admin.tournament.cancel' then
  entity_id:=(p->>'id')::uuid;update private.kairo_tournaments set status='cancelled' where private.kairo_tournaments.id=entity_id;
  update private.kairo_duels set status='cancelled' where tournament_id=entity_id and status not in ('finished','abandoned','expired','cancelled');
  perform private.kairo_audit('tournament.cancel',entity_id::text,jsonb_build_object('reason',left(p->>'reason',1000)));return jsonb_build_object('ok',true);
 elsif operation='admin.arena.disqualify' then
  update private.kairo_arena_entries set disqualified=coalesce((p->>'disqualified')::boolean,true),note=left(coalesce(p->>'reason','Admin yoxlaması'),1000) where tournament_id=(p->>'id')::uuid and session_id=(p->>'session')::uuid;
  perform private.kairo_audit('arena.disqualify',p->>'session',p-'session');return jsonb_build_object('ok',true);
 elsif operation='admin.ai.config' then
  update private.kairo_tutor_config set enabled=(p->>'enabled')::boolean,max_hints=(p->>'max_hints')::int,max_turns=(p->>'max_turns')::int where private.kairo_tutor_config.id=true;
  perform private.kairo_audit('ai.config','teacher',p);return jsonb_build_object('ok',true);
 elsif operation='admin.report.resolve' then
  update private.kairo_tutor_reports set resolved=true where private.kairo_tutor_reports.id=(p->>'id')::uuid;perform private.kairo_audit('report.resolve',p->>'id');return jsonb_build_object('ok',true);
 elsif operation='admin.weekly.save' then
  select * into template from private.kairo_exam_templates where private.kairo_exam_templates.id=(p->>'template_id')::uuid and status='published';
  if not found or jsonb_array_length(template.sections)<>1 or (template.sections->0->>'count')::int not in (5,10,15,20) then raise exception 'Uyğun yayımlanmış şablon seç.';end if;
  insert into private.kairo_weekly_schedules(id,name,mode,template_id,enabled) values(coalesce((p->>'id')::uuid,gen_random_uuid()),left(p->>'name',180),p->>'mode',template.id,(p->>'enabled')::boolean)
  on conflict(id) do update set name=excluded.name,mode=excluded.mode,template_id=excluded.template_id,enabled=excluded.enabled returning private.kairo_weekly_schedules.id into entity_id;
  perform private.kairo_audit('weekly.save',entity_id::text,p);perform private.kairo_schedule_weeks();return jsonb_build_object('ok',true);
 elsif operation='admin.exam.review' then return private.kairo_exam_operation(caller,operation,p);
 elsif operation<>'admin.catalog' then raise exception 'Naməlum idarəetmə əməliyyatı.';end if;
 return jsonb_build_object(
 'questions',(select coalesce(jsonb_agg(x order by x.updated_at desc),'[]') from (select * from private.kairo_questions order by updated_at desc limit 1000) x),
 'templates',(select coalesce(jsonb_agg(to_jsonb(x)-'created_by' order by x.created_at desc),'[]') from private.kairo_exam_templates x),
 'programs',(select coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('university',u.name) order by u.name,x.name),'[]') from private.kairo_programs x join private.kairo_universities u on u.id=x.university_id),
 'tournaments',(select coalesce(jsonb_agg(to_jsonb(x)-'question_ids' order by x.starts_at desc),'[]') from (select * from private.kairo_tournaments order by starts_at desc limit 50) x),
 'weekly',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from private.kairo_weekly_schedules x),
 'duels',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'status',x.status,'settings',x.settings,'created_at',x.created_at,'players',(select jsonb_agg(private.kairo_public_profile(user_id)||jsonb_build_object('last_seen',last_seen,'ready',ready)) from private.kairo_duel_players where match_id=x.id)) order by x.created_at desc),'[]') from (select * from private.kairo_duels order by created_at desc limit 50) x),
 'written',(select coalesce(jsonb_agg(jsonb_build_object('session',r.session_id,'ordinal',r.ordinal,'question',i.snapshot,'answer',a.value,'rubric',i.answer_key->>'rubric','maximum',i.points,'saved_at',a.saved_at)),'[]') from private.kairo_written_reviews r join private.kairo_exam_items i using(session_id,ordinal) join private.kairo_exam_answers a using(session_id,ordinal) where r.score is null),
 'ai_config',(select to_jsonb(c) from private.kairo_tutor_config c where c.id=true),
 'ai_metrics',(select jsonb_build_object('sessions',count(*),'completed',count(*)filter(where status='completed'),'hints',coalesce(sum(hint_count),0),'reveals',count(*)filter(where solution_revealed),'verified',count(*)filter(where solved_verified)) from private.kairo_tutor_sessions),
 'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'reason',r.reason,'content',m.content,'created_at',r.created_at,'resolved',r.resolved) order by r.created_at desc),'[]') from private.kairo_tutor_reports r join private.kairo_tutor_messages m on m.id=r.message_id where not r.resolved),
 'arena_entries',(select coalesce(jsonb_agg(jsonb_build_object('tournament',e.tournament_id,'session',e.session_id,'player',private.kairo_public_profile(e.user_id),'disqualified',e.disqualified,'note',e.note)),'[]') from private.kairo_arena_entries e));
end $$;

create function private.kairo_server_attested() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.activity_server_keys where digest=encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-kairo-audit',''),'sha256'),'hex'));
$$;
create function private.kairo_api(operation text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare caller uuid;question private.kairo_questions;session_row private.kairo_tutor_sessions;result jsonb;begin
 caller:=private.kairo_caller();
 if jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>200000 or length(operation)>70 then raise exception 'Sorğu uyğun deyil.';end if;
 perform private.kairo_limit(caller,case when operation ~ '[.](get|catalog|list)$' then 'read' else 'write' end,case when operation ~ '[.](get|catalog|list)$' then 300 else 120 end);
 insert into private.kairo_profiles(user_id,nickname) values(caller,'Şagird-'||encode(extensions.gen_random_bytes(5),'hex')) on conflict(user_id) do nothing;
 if operation='profile.get' then return (select to_jsonb(p)-'user_id' from private.kairo_profiles p where user_id=caller);
 elsif operation='profile.save' then
  if not coalesce(length(trim(payload->>'nickname')) between 3 and 30 and payload->>'nickname' !~ '@' and payload->>'color' ~ '^#[0-9a-fA-F]{6}$' and jsonb_typeof(payload->'consent')='boolean',false) then raise exception 'Ləqəb, rəng və ictimai iştirak seçimi uyğun deyil.';end if;
  update private.kairo_profiles set nickname=trim(payload->>'nickname'),avatar_color=payload->>'color',consent_public=(payload->>'consent')::boolean where user_id=caller;return (select to_jsonb(p)-'user_id' from private.kairo_profiles p where user_id=caller);
 elsif operation='tutor.server_context' then
  if not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
  select * into session_row from private.kairo_tutor_sessions where id=(payload->>'id')::uuid and user_id=caller;
  if not found then raise exception 'Sessiya tapılmadı.' using errcode='42501';end if;
  select * into question from private.kairo_questions where id=session_row.question_id;
  return jsonb_build_object('session',to_jsonb(session_row)-'user_id','verification_key',question.answer_key);
 elsif operation='tutor.report' then
  if payload->>'consent'<>'true' or length(coalesce(payload->>'reason','')) not between 3 and 500 then raise exception 'Paylaşma seçimini və səbəbi yaz.';end if;
  if not exists(select 1 from private.kairo_tutor_messages m join private.kairo_tutor_sessions t on t.id=m.session_id where m.id=(payload->>'message_id')::uuid and t.user_id=caller and m.role='assistant') then raise exception 'Cavab tapılmadı.' using errcode='42501';end if;
  insert into private.kairo_tutor_reports(user_id,message_id,reason) values(caller,(payload->>'message_id')::uuid,payload->>'reason') on conflict do nothing;return jsonb_build_object('ok',true);
 elsif operation like 'admin.%' then return private.kairo_admin_operation(caller,operation,payload);
 elsif operation like 'exam.%' then
  if operation='exam.start' and exists(select 1 from private.kairo_duels d join private.kairo_duel_players pl on pl.match_id=d.id where pl.user_id=caller and d.status in ('waiting','ready','countdown','active','round_result') and d.created_at>now()-interval '20 minutes') then raise exception 'Əvvəl aktiv dueli bitir və ya gözləməni ləğv et.';end if;
  return private.kairo_exam_operation(caller,operation,payload);
 elsif operation like 'goals.%' then return private.kairo_goals_operation(caller,operation,payload);
 elsif operation like 'focus.%' then return private.kairo_focus_operation(caller,operation,payload);
 elsif operation like 'tutor.%' then return private.kairo_tutor_operation(caller,operation,payload);
 elsif operation like 'duel.%' then return private.kairo_duel_operation(caller,operation,payload);
 elsif operation like 'arena.%' then return private.kairo_arena_operation(caller,operation,payload);
 elsif operation='home.get' then
  return jsonb_build_object('profile',(select to_jsonb(p)-'user_id' from private.kairo_profiles p where user_id=caller),
   'goal',(select jsonb_build_object('university',u.name,'program',c.name,'target',g.target_score,'year',g.admission_year,'cutoff',case when g.funding='state' then c.state_cutoff else c.cutoff end) from private.kairo_goals g join private.kairo_programs c on c.id=g.program_id join private.kairo_universities u on u.id=c.university_id where g.user_id=caller and g.is_primary and g.archived_at is null),
   'next_tournament',(select jsonb_build_object('id',t.id,'name',t.name,'starts_at',t.starts_at,'mode',t.mode) from private.kairo_tournaments t where t.status in ('scheduled','active') and t.ends_at>now() order by t.starts_at limit 1),
   'focus_today',(select coalesce(sum(seconds),0) from private.kairo_focus_days where user_id=caller and day=(now() at time zone 'Asia/Baku')::date),
   'last_exam',(select jsonb_build_object('id',s.id,'name',s.template_snapshot->>'name','status',s.status,'earned',r.earned,'maximum',r.maximum,'scale',s.template_snapshot->>'scale') from private.kairo_exam_sessions s left join private.kairo_exam_results r on r.session_id=s.id where s.user_id=caller and s.mode='exam' order by s.started_at desc limit 1),
   'tutor',(select jsonb_build_object('id',id,'topic',topic,'mode',mode,'updated_at',updated_at) from private.kairo_tutor_sessions where user_id=caller order by updated_at desc limit 1),
   'duel',(select jsonb_build_object('id',d.id,'status',d.status) from private.kairo_duels d join private.kairo_duel_players pl on pl.match_id=d.id where pl.user_id=caller and d.status in ('waiting','ready','countdown','active','round_result') and d.created_at>now()-interval '20 minutes' order by d.created_at desc limit 1));
 else raise exception 'Naməlum Kairo əməliyyatı.';end if;
end $$;
create function public.kairo_api(operation text,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.kairo_api(operation,payload);$$;
create function private.kairo_ai_allowed() returns boolean language plpgsql stable security definer set search_path='' as $$declare caller uuid;begin caller:=private.kairo_caller();return not private.kairo_tools_locked(caller);end $$;
create function public.kairo_ai_allowed() returns boolean language sql security invoker set search_path='' as $$select private.kairo_ai_allowed();$$;
create function private.kairo_maintenance() returns jsonb language plpgsql security definer set search_path='' as $$declare sid uuid;tid uuid;mid uuid;begin
 if not private.kairo_server_attested() then raise exception 'Server təsdiqi tələb olunur.' using errcode='42501';end if;
 for sid in select id from private.kairo_exam_sessions where status='active' and deadline<=clock_timestamp() order by deadline limit 200 loop perform private.kairo_exam_finalize(sid);end loop;
 for mid in select id from private.kairo_duels where status in ('waiting','ready','countdown','active','round_result') order by created_at limit 200 loop perform private.kairo_duel_tick(mid);end loop;
 perform private.kairo_schedule_weeks();
 for tid in select id from private.kairo_tournaments where status in ('scheduled','active') and starts_at<=now() loop perform private.kairo_arena_tick(tid);end loop;
 update private.kairo_focus_sessions set status='paused' where status='active' and last_seen<now()-interval '40 seconds';
 return jsonb_build_object('ok',true);end $$;
create function public.kairo_maintenance() returns jsonb language sql security invoker set search_path='' as $$select private.kairo_maintenance();$$;

-- No raw private table or helper is exposed. Participant live notifications carry only match ID/revision.
do $$declare obj record;begin
 for obj in select tablename from pg_tables where schemaname='private' and tablename like 'kairo_%' loop
  execute format('alter table private.%I enable row level security',obj.tablename);
  execute format('revoke all on private.%I from public,anon,authenticated',obj.tablename);
 end loop;
 for obj in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname like 'kairo_%' loop execute format('revoke all on function %s from public,anon,authenticated',obj.signature);end loop;
end $$;
revoke all on function public.kairo_api(text,jsonb),public.kairo_ai_allowed(),public.kairo_maintenance() from public,anon,authenticated;
grant execute on function private.kairo_api(text,jsonb),public.kairo_api(text,jsonb),private.kairo_ai_allowed(),public.kairo_ai_allowed(),private.kairo_can_watch(uuid) to authenticated;
grant execute on function private.kairo_maintenance(),public.kairo_maintenance() to anon;
