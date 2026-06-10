-- Move another batch of app data behind Edge Functions.
-- These tables are now read/written by esmark-sync with service_role.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'app_settings',
    'catalog_products',
    'product_packages',
    'discount_requests'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists anon_full_access on public.%I', table_name);
    execute format('drop policy if exists authenticated_full_access on public.%I', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
    execute format('revoke all on table public.%I from authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end $$;
