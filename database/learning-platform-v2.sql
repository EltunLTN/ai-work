create table public.account_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null default '' check (length(first_name)<=60),
 last_name text not null default '' check (length(last_name)<=60),
 avatar_path text check (avatar_path is null or (length(avatar_path)<200 and avatar_path like id::text || '/%')),
 grade text check (grade is null or grade in ('1','2','3','4','5','6','7','8','9','10','11')),
 suspended boolean not null default false,
 admin_note text not null default '' check (length(admin_note)<=1000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.account_profiles enable row level security;
grant select on public.account_profiles to authenticated;
grant insert(id,first_name,last_name,avatar_path,grade), update(id,first_name,last_name,avatar_path,grade,updated_at) on public.account_profiles to authenticated;
create policy profiles_read on public.account_profiles for select to authenticated using (id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_insert on public.account_profiles for insert to authenticated with check (id=(select auth.uid()));
create policy profiles_update on public.account_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
insert into public.account_profiles(id) select id from auth.users on conflict do nothing;

create table public.practice_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id text not null check (length(attempt_id)<160),
 kind text not null check(kind in ('quiz','mini')),
 subject text not null check(subject in ('Riyaziyyat','Fizika','Biologiya','Coğrafiya','Kimya')),
 grade text not null check(grade in ('1','2','3','4','5','6','7','8','9','10','11')),
 total integer not null check(total between 1 and 100),
 correct integer not null check(correct between 0 and total),
 duration_seconds integer check(duration_seconds between 0 and 14400),
 topic_scores jsonb not null check(jsonb_typeof(topic_scores)='array' and octet_length(topic_scores::text)<50000),
 submitted_at timestamptz not null, created_at timestamptz not null default now(),
 primary key(user_id,attempt_id)
);
alter table public.practice_attempts enable row level security;
grant select,insert on public.practice_attempts to authenticated;
create policy attempts_read on public.practice_attempts for select to authenticated using (user_id=(select auth.uid()) or (select private.is_admin()));
create policy attempts_insert on public.practice_attempts for insert to authenticated with check (user_id=(select auth.uid()) and not exists(select 1 from public.account_profiles where id=(select auth.uid()) and suspended));
create index attempts_user_date_idx on public.practice_attempts(user_id,submitted_at desc);
create index attempts_date_idx on public.practice_attempts(submitted_at desc);

create table public.admin_audit (
 id bigint generated always as identity primary key,
 admin_id uuid not null references auth.users(id), target_id uuid not null references auth.users(id),
 change jsonb not null, created_at timestamptz not null default now()
);
alter table public.admin_audit enable row level security;
grant select on public.admin_audit to authenticated;
create policy audit_read on public.admin_audit for select to authenticated using ((select private.is_admin()));
create index audit_admin_idx on public.admin_audit(admin_id);
create index audit_target_idx on public.admin_audit(target_id,created_at desc);

create function public.admin_accounts() returns table(id uuid,email text,first_name text,last_name text,grade text,suspended boolean,admin_note text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 return query select u.id,u.email,coalesce(p.first_name,''),coalesce(p.last_name,''),p.grade,coalesce(p.suspended,false),coalesce(p.admin_note,''),u.created_at
 from auth.users u left join public.account_profiles p on p.id=u.id order by u.created_at desc limit 1000;
end $$;
revoke all on function public.admin_accounts() from public,anon;
grant execute on function public.admin_accounts() to authenticated;

create function public.admin_update_account(target uuid, given_name text, family_name text, school_grade text, is_suspended boolean, note text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 if target=(select auth.uid()) and is_suspended then raise exception 'Cannot suspend own account'; end if;
 insert into public.account_profiles(id,first_name,last_name,grade,suspended,admin_note)
 values(target,trim(given_name),trim(family_name),nullif(school_grade,''),is_suspended,trim(note))
 on conflict(id) do update set first_name=excluded.first_name,last_name=excluded.last_name,grade=excluded.grade,suspended=excluded.suspended,admin_note=excluded.admin_note,updated_at=now();
 insert into public.admin_audit(admin_id,target_id,change) values((select auth.uid()),target,jsonb_build_object('first_name',given_name,'last_name',family_name,'grade',school_grade,'suspended',is_suspended,'note',note));
end $$;
revoke all on function public.admin_update_account(uuid,text,text,text,boolean,text) from public,anon;
grant execute on function public.admin_update_account(uuid,text,text,text,boolean,text) to authenticated;

create function public.learning_summary(target uuid default auth.uid()) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if target<>(select auth.uid()) and not private.is_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 select jsonb_build_object('attempts',count(*),'questions',coalesce(sum(total),0),'correct',coalesce(sum(correct),0),'wrong',coalesce(sum(total-correct),0),'seconds',coalesce(sum(duration_seconds),0),'timed_attempts',count(duration_seconds)) into result from public.practice_attempts where user_id=target;
 return result;
end $$;
revoke all on function public.learning_summary(uuid) from public,anon;
grant execute on function public.learning_summary(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())));
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Suspend AI access immediately, while keeping login and personal-data access available.
create or replace function public.consume_ai_quota() returns boolean language sql security invoker set search_path='' as $$
 select case when exists(select 1 from public.account_profiles where id=(select auth.uid()) and suspended) then false else private.consume_ai_quota() end;
$$;

-- Import existing saved practice without modifying the working-copy snapshots.
insert into public.practice_attempts(user_id,attempt_id,kind,subject,grade,total,correct,topic_scores,submitted_at)
select s.user_id,'quiz-'||(a->>'submittedAt'),'quiz',a->>'subject',a->>'grade',(a->>'totalQuestions')::int,(a->>'totalCorrect')::int,a->'topicScores',(a->>'submittedAt')::timestamptz
from public.learning_snapshots s cross join lateral jsonb_array_elements(coalesce(s.data->'kairo.attempts','[]')) a
where a->>'subject' in ('Riyaziyyat','Fizika','Biologiya','Coğrafiya','Kimya') and a->>'grade' in ('1','2','3','4','5','6','7','8','9','10','11') and jsonb_typeof(a->'topicScores')='array'
on conflict do nothing;
