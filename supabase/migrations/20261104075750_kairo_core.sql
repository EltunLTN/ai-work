-- Additive Kairo platform foundation. Existing accounts, snapshots and practice are preserved.
create table private.kairo_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 public_id uuid not null unique default gen_random_uuid(),
 nickname text not null unique check(length(nickname) between 3 and 30 and nickname !~ '@'),
 avatar_color text not null default '#729482' check(avatar_color ~ '^#[0-9a-fA-F]{6}$'),
 public_avatar text, consent_public boolean not null default false,
 created_at timestamptz not null default now()
);
create table private.kairo_limits(user_id uuid not null references auth.users(id) on delete cascade,bucket text not null,window_at timestamptz not null,requests int not null,primary key(user_id,bucket));
create table private.kairo_questions (
 id uuid primary key default gen_random_uuid(), revision int not null default 1,
 subject text not null check(subject in ('Riyaziyyat','Fizika','Kimya','Biologiya','Coğrafiya')),
 grade int not null check(grade between 1 and 11),topic text not null check(length(topic) between 1 and 200),
 difficulty text not null check(difficulty in ('easy','medium','hard')),
 type text not null check(type in ('single','multiple','numeric','short','matching','written','passage','image')),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<30000),
 answer_key jsonb not null check(jsonb_typeof(answer_key)='object' and octet_length(answer_key::text)<10000),
 explanation text not null check(length(explanation) between 1 and 6000),
 points numeric(8,3) not null default 1 check(points>0 and points<=100),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 origin text not null default 'authored' check(origin in ('authored','ai','licensed')),
 source_url text,source_note text not null default '',reviewed_by uuid references auth.users(id) on delete set null,reviewed_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index kairo_question_pool_idx on private.kairo_questions(subject,grade,status,difficulty,type);
create index kairo_question_reviewer_idx on private.kairo_questions(reviewed_by);
create table private.kairo_exam_templates (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 3 and 180),
 version int not null default 1,year int not null check(year between 2020 and 2100),
 exam_type text not null check(exam_type in ('custom','graduation9','graduation11','admission')),
 admission_group text,grade int not null check(grade between 1 and 11),
 duration_seconds int not null check(duration_seconds between 60 and 21600),
 max_score numeric(8,3) not null check(max_score>0 and max_score<=1000),
 scale text not null default 'kairo100' check(scale in ('kairo100','dim300','dim400','dim700','custom')),
 sections jsonb not null check(jsonb_typeof(sections)='array' and jsonb_array_length(sections) between 1 and 10),
 rules jsonb not null default '{}' check(jsonb_typeof(rules)='object'),
 official_format boolean not null default false,verified_at timestamptz,source_url text,
 source_published date,status text not null default 'draft' check(status in ('draft','published','archived')),
 created_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now(),
 unique(name,version)
);
create index kairo_template_creator_idx on private.kairo_exam_templates(created_by);
create table private.kairo_exam_sessions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 template_id uuid not null references private.kairo_exam_templates(id),template_snapshot jsonb not null,
 mode text not null check(mode in ('exam','arena')),competition_id uuid,
 status text not null default 'active' check(status in ('active','submitted','review_pending','finalized','abandoned')),
 started_at timestamptz not null default clock_timestamp(),deadline timestamptz not null,
 submitted_at timestamptz,finalized_at timestamptz,current_index int not null default 0,
 request_id uuid not null,unique(user_id,request_id),unique(user_id,competition_id)
);
create index kairo_exam_user_date_idx on private.kairo_exam_sessions(user_id,started_at desc);
create index kairo_exam_deadline_idx on private.kairo_exam_sessions(deadline) where status='active';
create index kairo_exam_template_idx on private.kairo_exam_sessions(template_id);
create table private.kairo_exam_items (
 session_id uuid not null references private.kairo_exam_sessions(id) on delete cascade,
 ordinal int not null check(ordinal between 0 and 199),question_id uuid not null references private.kairo_questions(id),
 snapshot jsonb not null,answer_key jsonb not null,explanation text not null,points numeric(8,3) not null,
 primary key(session_id,ordinal),unique(session_id,question_id)
);
create index kairo_exam_question_idx on private.kairo_exam_items(question_id);
create table private.kairo_exam_answers (
 session_id uuid not null,ordinal int not null,value jsonb,marked boolean not null default false,
 saved_at timestamptz not null default clock_timestamp(),client_revision bigint not null default 0,
 primary key(session_id,ordinal),foreign key(session_id,ordinal) references private.kairo_exam_items(session_id,ordinal) on delete cascade,
 check(value is null or octet_length(value::text)<=12000)
);
create table private.kairo_exam_results (
 session_id uuid primary key references private.kairo_exam_sessions(id) on delete cascade,
 total int not null,correct int not null,unanswered int not null,earned numeric(10,3) not null,
 maximum numeric(10,3) not null,pending int not null,status text not null check(status in ('provisional','final')),
 subjects jsonb not null,topics jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table private.kairo_written_reviews (
 session_id uuid not null,ordinal int not null,score numeric(8,3),feedback text not null default '',
 reviewer uuid references auth.users(id) on delete set null,reviewed_at timestamptz,
 primary key(session_id,ordinal),foreign key(session_id,ordinal) references private.kairo_exam_items(session_id,ordinal) on delete cascade
);
create index kairo_written_reviewer_idx on private.kairo_written_reviews(reviewer);
create table private.kairo_learning_events (
 id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,
 source text not null check(source in ('exam','duel','arena','tutor','focus')),source_id uuid not null,
 subject text,topic text,data jsonb not null default '{}',independent boolean not null default false,
 created_at timestamptz not null default now(),unique(user_id,source,source_id,subject,topic)
);
create index kairo_learning_user_date_idx on private.kairo_learning_events(user_id,created_at desc);
-- Existing practice totals gain provenance; browsers can still insert only ordinary practice.
alter table public.practice_attempts add column source text not null default 'practice' check(source in ('practice','exam'));
drop policy attempts_insert on public.practice_attempts;
create policy attempts_insert on public.practice_attempts for insert to authenticated with check(user_id=(select auth.uid()) and source='practice' and not exists(select 1 from public.account_profiles where id=(select auth.uid()) and suspended));

create function private.kairo_caller() returns uuid language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=(select auth.uid()); sid text:=auth.jwt()->>'session_id';begin
 if caller is null or not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then raise exception 'Təsdiqlənmiş hesabla daxil olun.' using errcode='42501';end if;
 if exists(select 1 from public.account_profiles where id=caller and suspended) then raise exception 'Hesab dayandırılıb.' using errcode='42501';end if;
 if sid is not null and not exists(select 1 from auth.sessions where id::text=sid and user_id=caller) then raise exception 'Sessiya bitib. Yenidən daxil olun.' using errcode='42501';end if;
 return caller;end $$;
create function private.kairo_limit(caller uuid,bucket_name text,cap int) returns void language plpgsql security definer set search_path='' as $$
declare used int;begin
 insert into private.kairo_limits(user_id,bucket,window_at,requests) values(caller,bucket_name,date_trunc('minute',clock_timestamp()),1)
 on conflict(user_id,bucket) do update set window_at=excluded.window_at,requests=case when kairo_limits.window_at=excluded.window_at then kairo_limits.requests+1 else 1 end
 where kairo_limits.window_at<>excluded.window_at or kairo_limits.requests<cap returning requests into used;
 if used is null then raise exception 'Çox tez-tez sorğu göndərilir. Bir az gözləyin.' using errcode='P0001';end if;end $$;
create function private.kairo_audit(operation text,entity text,details jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.admin_audit(admin_id,target_id,change) values((select auth.uid()),(select auth.uid()),jsonb_build_object('operation','kairo.'||operation,'entity',entity,'details',details));end $$;
create function private.kairo_public_profile(person uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',public_id,'nickname',case when consent_public then nickname else 'Gizli iştirakçı' end,'color',avatar_color,'avatar',case when consent_public then public_avatar else null end) from private.kairo_profiles where user_id=person;
$$;
create function private.kairo_require_admin() returns void language plpgsql stable security definer set search_path='' as $$
begin perform private.kairo_caller();if not private.is_admin() then raise exception 'Administrator girişi tələb olunur.' using errcode='42501';end if;end $$;
create function private.kairo_number(value text) returns numeric language plpgsql immutable set search_path='' as $$
declare clean text:=replace(trim(value),',','.');numerator numeric;denominator numeric;begin
 if length(clean)>80 or clean !~ '^[+-]?[0-9]+([.][0-9]+)?(/[+-]?[0-9]+([.][0-9]+)?)?$' then return null;end if;
 numerator:=split_part(clean,'/',1)::numeric;
 if position('/' in clean)>0 then denominator:=split_part(clean,'/',2)::numeric;if denominator=0 then return null;end if;return numerator/denominator;end if;
 return numerator;exception when others then return null;end $$;
create function private.kairo_mark(question_type text,key jsonb,answer jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare submitted numeric;expected numeric;begin
 if answer is null or answer='null'::jsonb or answer='""'::jsonb then return false;end if;
 if question_type='written' then return null;
 elsif question_type in ('single','passage','image') then return coalesce(answer=key->'answer',false);
 elsif question_type='multiple' then
  if jsonb_typeof(answer)<>'array' then return false;end if;
  return (select coalesce(jsonb_agg(v order by v),'[]') from (select distinct value v from jsonb_array_elements(answer)) a)=(select coalesce(jsonb_agg(v order by v),'[]') from (select distinct value v from jsonb_array_elements(key->'answer')) a);
 elsif question_type='matching' then return coalesce(answer=key->'answer',false);
 elsif question_type='numeric' then submitted:=private.kairo_number(answer#>>'{}');expected:=private.kairo_number(key->>'answer');return coalesce(abs(submitted-expected)<=coalesce((key->>'tolerance')::numeric,0),false);
 elsif question_type='short' then return exists(select 1 from jsonb_array_elements_text(key->'answers') v where lower(replace(trim(v),'İ','i'))=lower(replace(trim(answer#>>'{}'),'İ','i')));end if;
 return false;end $$;
-- Private default-deny RLS and explicit function grants are finalized by migration 04.

create function private.kairo_question_public(q jsonb) returns jsonb language sql immutable set search_path='' as $$select jsonb_build_object('id',q->'id','subject',q->'subject','grade',q->'grade','topic',q->'topic','difficulty',q->'difficulty','type',q->'type','body',q->'body');$$;
