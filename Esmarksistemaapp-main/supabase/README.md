# Migracion inicial a Supabase

Esta carpeta contiene la base para empezar a migrar Esmark Sistema desde `localStorage` y Edge Functions hacia tablas reales en Supabase.

## Archivo creado

- `migrations/20260522000000_initial_esmark_schema.sql`
- `migrations/20260522200808_drop_legacy_fiscal_series.sql`

## Que incluye

- Usuarios internos y usuarios base (`admin`, `maria_esmark`, `july_esmark`, `meli_esmark`).
- Ajustes generales, precio, notificaciones y Trello.
- Clientes.
- Productos, variantes, paquetes e historial de inventario.
- Pedidos, items y pagos.
- Cotizaciones e items.
- Documentos del modulo vigente e items.
- Dias operativos, inicio de dia, reportes de cierre y caja chica.
- Preferencias y tarjetas de Trello.
- Historial de actividad.
- Solicitudes de descuento.
- Plantillas y archivos subidos.
- Vistas `order_summary` y `low_stock_products`.
- RLS inicial para acceso directo solo con rol `authenticated`; las Edge Functions con `service_role` pueden operar sin depender de estas policies.
- Buckets privados `documents` y `attachments`.

La migracion `20260522200808_drop_legacy_fiscal_series.sql` limpia el modelo viejo: elimina `fiscal_series`, `correlatives` y la columna antigua `documents.fiscal_series_id`.

## Como aplicarlo

1. Vincula el proyecto si aun no esta vinculado:

```powershell
npx.cmd supabase link --project-ref TU_PROJECT_REF
```

2. Aplica la migracion:

```powershell
npx.cmd supabase db push
```

3. Verifica que existan las tablas:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## Siguiente paso recomendado

Crear un importador por lotes que lea estos keys actuales y los inserte en las nuevas tablas:

- `esmark_users` -> `app_users`
- `esmark_customers` -> `customers`
- `esmark_products` / `esmark_catalog_products` -> `products` y `product_variants`
- `esmark_orders` -> `orders`, `order_items`, `order_payments`
- `esmark_quotes` -> `quotes`, `quote_items`
- `closed_days`, `day_start_*`, `day_reports` -> `work_days`, `day_starts`, `day_reports`
- `esmark_activity_logs` -> `activity_logs`
- `esmark_discount_requests` -> `discount_requests`
- `trello_preferences` -> `trello_preferences`
- `esmark_settings`, `esmark_price_config` -> `app_settings`

La migracion usa `legacy_id` y `metadata` precisamente para conservar IDs y campos que aun no esten normalizados durante la primera importacion.

## Importador listo

Tambien se agregaron dos scripts para mover la informacion actual de `localStorage` hacia Supabase:

- `scripts/export-localstorage-for-supabase.js`: se pega en la consola del navegador o Electron para descargar un JSON con los datos locales.
- `scripts/migrate-localstorage-to-supabase.mjs`: lee ese JSON y lo inserta en Supabase usando `service_role` solo desde Node.

El importador NO migra `fiscal_series` ni documentos del modulo viejo de facturacion. Esos datos quedan fuera porque el sistema ahora usa el modulo nuevo.

Flujo recomendado:

```powershell
$env:SUPABASE_URL="https://tlgxotsqdlqgmmcovzns.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY"
npm.cmd run supabase:migrate-local -- --file .\supabase\localstorage-export.json --dry-run
npm.cmd run supabase:migrate-local -- --file .\supabase\localstorage-export.json
```

No guardes `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` ni en variables `VITE_`; esa llave tiene permisos administrativos.
