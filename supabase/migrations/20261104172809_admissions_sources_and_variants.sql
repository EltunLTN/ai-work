-- Preserve separate admission codes even when the source omits their distinguishing language.
alter table private.kairo_programs drop constraint kairo_programs_university_id_name_language_study_format_yea_key;
alter table private.kairo_programs add constraint kairo_program_variant_key unique nulls not distinct(university_id,name,language,study_format,year,code);
alter table private.kairo_programs add column source_status text not null default 'preliminary' check(source_status in('official','secondary','preliminary'));
alter table private.kairo_programs add column cutoff_status text not null default 'unknown' check(cutoff_status in('verified','reported','unknown'));
alter table private.kairo_programs add column reported_cutoff text;
alter table private.kairo_programs add column reported_state_cutoff text;
update private.kairo_programs set source_status='official',cutoff_status=case when cutoff is not null or state_cutoff is not null then 'verified' else 'unknown' end where source_url ~ '^https://(www[.])?dim[.]gov[.]az/';
do $$declare definition text;begin
 definition:=pg_get_functiondef('private.kairo_admin_operation(uuid,text,jsonb)'::regprocedure);
 if position('on conflict(university_id,name,language,study_format,year)' in definition)=0 then raise exception 'Programme upsert changed; inspect before migrating';end if;
 definition:=replace(definition,'on conflict(university_id,name,language,study_format,year)','on conflict(university_id,name,language,study_format,year,code)');
 execute definition;
end $$;
create index kairo_program_code_idx on private.kairo_programs(code) where code is not null;

