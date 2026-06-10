-- Fase online: catalogo por medidas, claves remotas y estados vigentes.
-- Mantiene Supabase como fuente principal y deja localStorage solo como respaldo.

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  category text not null default 'General',
  active boolean not null default true,
  manual boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

select public.touch_updated_at('catalog_products');

create index if not exists catalog_products_active_order_idx
  on public.catalog_products(active, sort_order, name);

insert into public.catalog_products (legacy_id, name, category, active, manual, sort_order)
values
  ('banner', 'Banner', 'Impresion', true, false, 10),
  ('sticker', 'Sticker', 'Impresion', true, false, 20),
  ('pvc', 'PVC', 'Impresion', true, false, 30),
  ('carnet', 'Carnet', 'Identificacion', true, false, 40),
  ('reconocimiento', 'Reconocimiento', 'Premios', true, false, 50),
  ('rotulacion', 'Rotulacion', 'Servicios', true, true, 60)
on conflict (legacy_id) do update set
  name = excluded.name,
  category = excluded.category,
  active = excluded.active,
  manual = excluded.manual,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.app_settings (key, value, description)
values
  ('product_packages', '[]'::jsonb, 'Paquetes y listas de precios de servicios/productos'),
  ('quote_template', '{}'::jsonb, 'Plantilla vigente para cotizaciones'),
  ('receipt_template', '{}'::jsonb, 'Plantilla vigente para recibos'),
  ('order_drafts', '{}'::jsonb, 'Borradores temporales de pedidos por equipo o usuario')
on conflict (key) do nothing;

do $$
begin
  if to_regclass('public.discount_requests') is not null then
    alter table public.discount_requests
      drop constraint if exists discount_requests_status_check;

    alter table public.discount_requests
      add constraint discount_requests_status_check
      check (status in ('pending', 'approved', 'rejected', 'cancelled', 'consumed'));
  end if;
end $$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.catalog_products to anon, authenticated;
alter table public.catalog_products enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_products'
      and policyname = 'anon_full_access'
  ) then
    create policy anon_full_access on public.catalog_products
      for all to anon using (true) with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'catalog_products'
      and policyname = 'authenticated_full_access'
  ) then
    create policy authenticated_full_access on public.catalog_products
      for all to authenticated using (true) with check (true);
  end if;
end $$;
