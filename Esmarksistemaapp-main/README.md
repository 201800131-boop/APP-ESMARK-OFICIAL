# EsMark Sistema App

Aplicacion de escritorio para EsMark Media construida con Electron, React, Vite, Supabase y Trello.

## Flujo Actual

- Pedidos, clientes, productos, configuraciones y cierres operativos viven en Supabase.
- Los pedidos se sincronizan con Trello cuando el tablero esta configurado.
- Facturas, proformas y recibos pertenecen al modulo nuevo de Facturacion.
- Las series fiscales antiguas y datos historicos locales ya no forman parte del flujo activo.

## Requisitos

- Node.js 20+
- npm
- Proyecto Supabase configurado con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Para generar instalador de Windows:

```bash
npm run build:win
```

## Variables De Entorno

Copia `.env.example` a `.env.local` y completa:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

No guardes `service_role` en archivos del frontend. Esa llave solo debe usarse en Supabase Edge Functions o scripts backend controlados.

## Estructura Principal

- `docs/`: documentacion organizada del proyecto.
- `src/components`: pantallas y componentes activos de la app.
- `src/utils/api.ts`: acceso principal a Supabase y endpoints actuales.
- `src/utils/work-days-api.ts`: cierre de dia, apertura y caja chica en Supabase.
- `src/utils/trello-orders.ts`: integracion vigente de pedidos con Trello.
- `supabase/migrations`: esquema y reglas SQL actuales.
- `scripts`: herramientas activas de desarrollo y migracion controlada.

## Documentacion

- [Indice de documentacion](docs/README.md)
- [Integracion Supabase](docs/backend/INTEGRACION-SUPABASE-PERMANENTE.md)
