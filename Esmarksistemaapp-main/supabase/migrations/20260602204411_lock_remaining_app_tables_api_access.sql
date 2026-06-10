begin;

do $$
declare
  table_name text;
  tables_to_lock text[] := array[
    'document_items',
    'document_templates',
    'documents',
    'inventory_movements',
    'order_payments',
    'product_variants',
    'trello_cards',
    'uploaded_files'
  ];
begin
  foreach table_name in array tables_to_lock loop
    execute format('drop policy if exists anon_full_access on public.%I', table_name);
    execute format('drop policy if exists authenticated_full_access on public.%I', table_name);
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end $$;

commit;
