-- Keep extensions outside the exposed public schema.

create schema if not exists extensions;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;

grant usage on schema extensions to anon, authenticated, service_role;
