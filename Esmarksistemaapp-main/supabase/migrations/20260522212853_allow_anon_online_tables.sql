-- Expose the app data tables to the browser client.
-- This app uses its own users/roles instead of Supabase Auth, so the public
-- anon client needs explicit grants plus RLS policies for the current model.

grant usage on schema public to anon, authenticated;

do $$
declare
  table_name text;
  table_names text[] := array[
    'app_users',
    'app_settings',
    'customers',
    'products',
    'product_variants',
    'product_packages',
    'inventory_movements',
    'orders',
    'order_items',
    'order_payments',
    'quotes',
    'quote_items',
    'documents',
    'document_items',
    'work_days',
    'day_starts',
    'day_reports',
    'petty_cash_movements',
    'trello_preferences',
    'trello_cards',
    'activity_logs',
    'discount_requests',
    'document_templates',
    'uploaded_files'
  ];
begin
  foreach table_name in array table_names loop
    if to_regclass('public.' || quote_ident(table_name)) is not null then
      execute format('grant select, insert, update, delete on table public.%I to anon, authenticated', table_name);
      execute format('alter table public.%I enable row level security', table_name);

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and policyname = 'anon_full_access'
      ) then
        execute format(
          'create policy anon_full_access on public.%I for all to anon using (true) with check (true)',
          table_name
        );
      end if;

      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = table_name
          and policyname = 'authenticated_full_access'
      ) then
        execute format(
          'create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)',
          table_name
        );
      end if;
    end if;
  end loop;
end $$;

do $$
declare
  view_name text;
  view_names text[] := array['order_summary', 'low_stock_products'];
begin
  foreach view_name in array view_names loop
    if to_regclass('public.' || quote_ident(view_name)) is not null then
      execute format('grant select on table public.%I to anon, authenticated', view_name);
    end if;
  end loop;
end $$;
