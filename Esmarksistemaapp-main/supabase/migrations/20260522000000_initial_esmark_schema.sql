-- Esmark Sistema - esquema inicial para migracion a Supabase
-- Fecha: 2026-05-22
-- Objetivo: crear la base relacional para migrar datos que hoy viven en
-- localStorage y en Edge Functions: usuarios, clientes, inventario, pedidos,
-- cotizaciones, documentos, cierres, caja chica, actividad, Trello y ajustes.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_updated_at(table_name text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists set_updated_at on public.%I', table_name);
  execute format(
    'create trigger set_updated_at before update on public.%I
     for each row execute function public.set_updated_at()',
    table_name
  );
end;
$$;

-- Usuarios internos de la app. No depende aun de auth.users porque la app usa
-- autenticacion propia por username/password_hash.
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  username text not null unique,
  name text not null,
  role text not null default 'operator' check (role in ('admin', 'operator')),
  password_hash text,
  active boolean not null default true,
  can_authorize_discounts boolean not null default false,
  photo_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('app_users');

insert into public.app_users (legacy_id, username, name, role, password_hash, can_authorize_discounts)
values
  ('1', 'admin', 'ADMINISTRADOR ESMARK', 'admin', 'sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', true),
  ('2', 'maria_esmark', 'Maria Sarmiento', 'operator', 'sha256:626e3c805e77eeb472c42c6be607be2af7ac5c08fd7050f278e0330fe81abf57', false),
  ('3', 'july_esmark', 'Julissa Santos', 'admin', 'sha256:def94c99a174eb6af37abb7a4196f6acea9c0ac26021182d3d8a70dc212b4330', true),
  ('4', 'meli_esmark', 'Melissa Garcia', 'admin', 'sha256:59d8bfba8be3c5492980b4a47b4d30004f1e9d85682af81d3f4288ec719bb094', true)
on conflict (username) do update set
  name = excluded.name,
  role = excluded.role,
  password_hash = excluded.password_hash,
  can_authorize_discounts = excluded.can_authorize_discounts,
  updated_at = now();

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.touch_updated_at('app_settings');

insert into public.app_settings (key, value, description)
values
  ('company', '{}'::jsonb, 'Datos de empresa, RTN, direccion, telefono, correo e ISV'),
  ('price_config', '{
    "banner_price_per_cm": 0.02,
    "banner_price_per_in": 2,
    "banner_price_per_m": 200,
    "banner_price_per_ft": 18.58,
    "stickers_price_per_cm": 0.015,
    "stickers_price_per_in": 1.5,
    "stickers_price_per_m": 150,
    "stickers_price_per_ft": 13.94,
    "shirt_base_price": 150,
    "shirt_vinil_price": 50,
    "shirt_sublimation_price": 70,
    "shirt_design_prices": {"normal": 30, "medio": 60, "avanzado": 100},
    "termo_price_per_cm": 0.05,
    "pvc_price_per_cm": 0.03,
    "taza_price_per_cm": 0.04,
    "materials": ["Vinil", "Lona", "Tela", "Microperforado"]
  }'::jsonb, 'Configuracion de calculadora de precios'),
  ('notification_settings', '{}'::jsonb, 'Preferencias de notificaciones'),
  ('trello_settings', '{}'::jsonb, 'Credenciales, board y listas de Trello')
on conflict (key) do nothing;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  phone text,
  email text,
  rtn text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('customers');
create index if not exists customers_name_idx on public.customers using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists customers_rtn_idx on public.customers (rtn) where rtn is not null;
create index if not exists customers_phone_idx on public.customers (phone) where phone is not null;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  sku text unique,
  code text,
  name text not null,
  category text,
  brand text,
  color text,
  size text,
  neckline text,
  description text,
  price numeric(14,2) not null default 0,
  cost numeric(14,2) not null default 0,
  unit text not null default 'unidad',
  stock numeric(14,2) not null default 0,
  min_stock numeric(14,2) not null default 0,
  active boolean not null default true,
  has_variants boolean not null default false,
  image_url text,
  color_images jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('products');
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', coalesce(name, '')));
create index if not exists products_category_idx on public.products (category);
create index if not exists products_active_idx on public.products (active);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  legacy_id text unique,
  sku text unique,
  barcode text,
  color text,
  size text,
  stock numeric(14,2) not null default 0,
  min_stock numeric(14,2) not null default 0,
  price numeric(14,2),
  cost numeric(14,2),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('product_variants');
create unique index if not exists product_variants_product_color_size_idx
  on public.product_variants(product_id, (coalesce(color, '')), (coalesce(size, '')));

create table if not exists public.product_packages (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  product_type text,
  shapes text[] not null default '{}'::text[],
  size_headers text[] not null default '{}'::text[],
  rows jsonb not null default '[]'::jsonb,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('product_packages');

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment', 'sale', 'return')),
  quantity numeric(14,2) not null default 0,
  previous_stock numeric(14,2),
  new_stock numeric(14,2),
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  order_number bigint unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_rtn text,
  customer_address text,
  status text not null default 'PENDIENTE',
  source text not null default 'manual' check (source in ('manual', 'trello', 'quote', 'import')),
  due_date date,
  due_time time,
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_status text not null default 'PENDIENTE',
  payment_type text,
  amount_paid numeric(14,2) not null default 0,
  pending_amount numeric(14,2) generated always as (greatest(total - amount_paid, 0)) stored,
  received_amount numeric(14,2),
  change_amount numeric(14,2),
  fiscal_document_type text,
  linked_document_id uuid,
  work_day_id uuid,
  trello_card_id text unique,
  trello_url text,
  trello_list_id text,
  trello_label_ids text[] not null default '{}'::text[],
  trello_member_ids text[] not null default '{}'::text[],
  attached_files jsonb not null default '[]'::jsonb,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('orders');
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_customer_idx on public.orders(customer_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_due_date_idx on public.orders(due_date);
create index if not exists orders_work_day_idx on public.orders(work_day_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  description text not null,
  quantity numeric(14,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax_rate numeric(8,4) not null default 15,
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  width numeric(14,4),
  height numeric(14,4),
  unit text,
  product_type text,
  material text,
  print_type text,
  size text,
  color text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  document_id uuid,
  payment_method text not null default 'EFECTIVO',
  amount numeric(14,2) not null default 0,
  received_amount numeric(14,2),
  change_amount numeric(14,2),
  paid_at timestamptz not null default now(),
  created_by uuid references public.app_users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists order_payments_order_idx on public.order_payments(order_id);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  quote_number bigint unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_rtn text,
  status text not null default 'PENDIENTE',
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  valid_until date,
  converted_order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('quotes');
create index if not exists quotes_customer_idx on public.quotes(customer_id);
create index if not exists quotes_status_idx on public.quotes(status);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  quantity numeric(14,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax_rate numeric(8,4) not null default 15,
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);

create table if not exists public.fiscal_series (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  type text not null check (type in ('FACTURA', 'RECIBO', 'COTIZACION', 'PROFORMA')),
  series text not null,
  series_name text not null,
  cai text,
  range_start bigint not null default 1,
  range_end bigint not null default 1000,
  next_number bigint not null default 1,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint fiscal_series_range_check check (range_end >= range_start and next_number >= range_start)
);
select public.touch_updated_at('fiscal_series');
create unique index if not exists fiscal_series_type_series_idx on public.fiscal_series(type, series);

insert into public.fiscal_series (type, series, series_name, cai, range_start, range_end, next_number, expires_at)
values
  ('FACTURA', 'FAC-001', 'FACTURA - FAC-001', 'EJEMPLO-CAI-12345678-ABCDEF', 1, 1000, 1, now() + interval '1 year'),
  ('RECIBO', 'RECIBO', 'RECIBOS', null, 1, 1000, 1, null)
on conflict (type, series) do nothing;

create table if not exists public.correlatives (
  id uuid primary key default gen_random_uuid(),
  tipo text not null unique check (tipo in ('factura', 'recibo', 'cotizacion', 'proforma')),
  prefijo text,
  current_number bigint not null default 0,
  next_number bigint not null default 1,
  padding integer not null default 9,
  active boolean not null default true,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('correlatives');

insert into public.correlatives (tipo, prefijo, current_number, next_number, padding)
values
  ('factura', '000-001-01', 0, 1, 9),
  ('recibo', 'R', 0, 1, 7),
  ('cotizacion', 'COT', 0, 1, 7),
  ('proforma', 'PRO', 0, 1, 7)
on conflict (tipo) do nothing;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  tipo text not null check (tipo in ('factura', 'recibo', 'cotizacion', 'proforma')),
  estado text not null default 'activo',
  correlativo text unique,
  fiscal_series_id uuid references public.fiscal_series(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  cliente_nombre text not null,
  cliente_rtn text,
  cliente_direccion text,
  cliente_telefono text,
  subtotal numeric(14,2) not null default 0,
  impuesto numeric(14,2) not null default 0,
  descuento numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  fecha_emision date not null default current_date,
  fecha_vencimiento date,
  generado_por uuid references public.app_users(id) on delete set null,
  anulado_por uuid references public.app_users(id) on delete set null,
  anulado_at timestamptz,
  motivo_anulacion text,
  notas text,
  pdf_url text,
  datos_extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.touch_updated_at('documents');
create index if not exists documents_tipo_estado_idx on public.documents(tipo, estado);
create index if not exists documents_order_idx on public.documents(order_id);
create index if not exists documents_fecha_idx on public.documents(fecha_emision desc);

alter table public.orders
  drop constraint if exists orders_linked_document_id_fkey,
  add constraint orders_linked_document_id_fkey
  foreign key (linked_document_id) references public.documents(id) on delete set null;

create table if not exists public.document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  descripcion text not null,
  cantidad numeric(14,2) not null default 1,
  precio_unitario numeric(14,2) not null default 0,
  descuento numeric(14,2) not null default 0,
  impuesto numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists document_items_document_idx on public.document_items(document_id);

alter table public.order_payments
  drop constraint if exists order_payments_document_id_fkey,
  add constraint order_payments_document_id_fkey
  foreign key (document_id) references public.documents(id) on delete set null;

create table if not exists public.work_days (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  day_number bigint not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid references public.app_users(id) on delete set null,
  opened_by_name text,
  closed_by uuid references public.app_users(id) on delete set null,
  closed_by_name text,
  initial_cash_balance numeric(14,2) not null default 0,
  final_cash_balance numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('work_days');
create unique index if not exists work_days_one_open_idx on public.work_days(status) where status = 'open';
create index if not exists work_days_opened_at_idx on public.work_days(opened_at desc);

alter table public.orders
  drop constraint if exists orders_work_day_id_fkey,
  add constraint orders_work_day_id_fkey
  foreign key (work_day_id) references public.work_days(id) on delete set null;

create table if not exists public.day_starts (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid references public.work_days(id) on delete set null,
  business_date date not null unique,
  opened_by uuid references public.app_users(id) on delete set null,
  opened_by_name text,
  total numeric(14,2) not null default 0,
  bills jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.day_reports (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid references public.work_days(id) on delete set null,
  report_date date not null,
  report jsonb not null default '{}'::jsonb,
  total_sales numeric(14,2) not null default 0,
  total_paid numeric(14,2) not null default 0,
  total_pending numeric(14,2) not null default 0,
  orders_count integer not null default 0,
  quotes_count integer not null default 0,
  generated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists day_reports_work_day_idx on public.day_reports(work_day_id);
create index if not exists day_reports_date_idx on public.day_reports(report_date desc);

create table if not exists public.petty_cash_movements (
  id uuid primary key default gen_random_uuid(),
  work_day_id uuid references public.work_days(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  movement_type text not null check (movement_type in ('initial', 'income', 'expense', 'adjustment')),
  payment_type text,
  amount numeric(14,2) not null default 0,
  customer_name text,
  description text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists petty_cash_work_day_idx on public.petty_cash_movements(work_day_id, created_at desc);

create table if not exists public.trello_preferences (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  board_id text,
  list_id text,
  list_name text,
  label_ids text[] not null default '{}'::text[],
  member_ids text[] not null default '{}'::text[],
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.touch_updated_at('trello_preferences');
create unique index if not exists trello_preferences_name_idx on public.trello_preferences(name);

create table if not exists public.trello_cards (
  id uuid primary key default gen_random_uuid(),
  card_id text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  board_id text,
  list_id text,
  list_name text,
  name text,
  url text,
  status text,
  raw_payload jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.touch_updated_at('trello_cards');
create index if not exists trello_cards_order_idx on public.trello_cards(order_id);
create index if not exists trello_cards_list_idx on public.trello_cards(list_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid references public.app_users(id) on delete set null,
  user_name text not null default 'Sistema',
  user_role text not null default 'operator',
  action_type text not null,
  description text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index if not exists activity_logs_action_type_idx on public.activity_logs(action_type);

create table if not exists public.discount_requests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  requested_by uuid references public.app_users(id) on delete set null,
  requested_by_name text,
  approved_by uuid references public.app_users(id) on delete set null,
  approved_by_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  order_id uuid references public.orders(id) on delete set null,
  product_description text,
  original_price numeric(14,2),
  requested_price numeric(14,2),
  discount_amount numeric(14,2),
  discount_percent numeric(8,4),
  reason text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('discount_requests');
create index if not exists discount_requests_status_idx on public.discount_requests(status, created_at desc);

create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  template_type text not null default 'document',
  content jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
select public.touch_updated_at('document_templates');

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'documents',
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  reference_type text,
  reference_id uuid,
  uploaded_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(bucket, path)
);

-- Vistas utiles para reportes y validacion de migracion.
create or replace view public.order_summary as
select
  o.id,
  o.order_number,
  o.customer_name,
  o.status,
  o.payment_status,
  o.total,
  o.amount_paid,
  o.pending_amount,
  o.created_at,
  count(oi.id) as items_count
from public.orders o
left join public.order_items oi on oi.order_id = o.id
group by o.id;

create or replace view public.low_stock_products as
select
  p.id,
  p.name,
  p.sku,
  p.category,
  p.stock,
  p.min_stock,
  p.has_variants
from public.products p
where p.active = true
  and p.has_variants = false
  and p.stock <= p.min_stock
union all
select
  p.id,
  p.name || coalesce(' - ' || pv.color, '') || coalesce(' / ' || pv.size, '') as name,
  pv.sku,
  p.category,
  pv.stock,
  pv.min_stock,
  true as has_variants
from public.product_variants pv
join public.products p on p.id = pv.product_id
where p.active = true
  and pv.active = true
  and pv.stock <= pv.min_stock;

-- RLS inicial: las Edge Functions con service_role pueden operar sin policies.
-- Para acceso directo futuro desde Supabase Auth, se habilita acceso completo
-- solo a usuarios authenticated. Anon queda sin acceso directo a tablas.
do $$
declare
  table_name text;
  tables text[] := array[
    'app_users', 'app_settings', 'customers', 'products', 'product_variants',
    'product_packages', 'inventory_movements', 'orders', 'order_items',
    'order_payments', 'quotes', 'quote_items', 'fiscal_series',
    'correlatives', 'documents', 'document_items', 'work_days',
    'day_starts', 'day_reports', 'petty_cash_movements',
    'trello_preferences', 'trello_cards', 'activity_logs',
    'discount_requests', 'document_templates', 'uploaded_files'
  ];
begin
  foreach table_name in array tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists authenticated_full_access on public.%I', table_name);
    execute format(
      'create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)',
      table_name
    );
  end loop;
end $$;

-- Storage buckets esperados por upload de documentos/adjuntos.
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('attachments', 'attachments', false)
on conflict (id) do nothing;
