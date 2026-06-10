# Integracion Supabase Permanente

## Estado

Supabase queda como fuente central de datos para el flujo activo de la aplicacion.

## Proyecto

- URL: `https://tlgxotsqdlqgmmcovzns.supabase.co`
- Credenciales frontend: `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Llave `service_role`: no debe guardarse ni exponerse en el frontend

## Datos En Linea

- Clientes
- Productos
- Pedidos
- Configuraciones
- Usuarios internos de la app
- Actividad
- Cierres de dia
- Aperturas de dia
- Reportes de cierre
- Caja chica
- Documentos generados por el modulo de Facturacion

## Flujo Actual

1. La app inicia con variables de entorno.
2. `src/utils/supabase/client.ts` crea el cliente Supabase.
3. `src/utils/api.ts` centraliza las operaciones principales.
4. Los pedidos nuevos se guardan en Supabase.
5. Si Trello esta configurado, los pedidos se sincronizan con Trello y se consolidan de vuelta en Supabase.
6. El cierre de dia ya no depende de historiales locales viejos.

## Fuera Del Flujo

- Series fiscales antiguas.
- Exportaciones/restauraciones viejas de localStorage.
- Diagnosticos temporales.
- Copias internas de proyectos Flutter, backups y paquetes duplicados.
