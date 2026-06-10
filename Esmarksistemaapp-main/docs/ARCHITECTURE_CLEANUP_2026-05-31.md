# Limpieza de Estructura - 2026-05-31

## Objetivo
Separar código activo del código legacy para evitar mezcla de versiones viejas y nuevas.

## Resultado
- Se archivaron componentes no usados en `legacy/unused-2026-05-31/`.
- Se limpiaron archivos ocultos de macOS (`._*`) dentro del proyecto.
- El build de producción sigue funcionando (`npm run build` OK).

## Criterio usado para archivar
- Archivos no alcanzables desde el flujo real de la app (`src/main.tsx`).
- Versiones antiguas o reemplazadas por componentes actuales.
- Módulos duplicados de plantillas migrados.

## Estructura recomendada
- `src/components/*`: solo componentes activos.
- `src/utils/*`: lógica y servicios activos.
- `legacy/unused-2026-05-31/*`: histórico no activo.

## Componentes archivados (resumen)
- Inventario legacy:
  - `ProductFormOriginal.tsx`
  - `ProductFormWithMatrix.tsx`
  - `ProductFormWithVariants.tsx`
  - `ProductFormWithVariantsCompact.tsx`
  - `ProductVariantForm.tsx`
  - `SimpleProductForm.tsx`
- Cotización legacy:
  - `QuoteFormImproved.tsx`
- Órdenes legacy:
  - `OrderViewSafeWrapper.tsx`
  - `PaymentDialog.tsx`
  - `SpecialOrderAuthDialog.tsx`
  - `TrelloListSelectorDialog.tsx`
  - `PaymentCalculator.tsx` (submódulo de pago antiguo)
- Ajustes no usados:
  - `DraggableField.tsx`
  - `GoogleDriveTab.tsx`
  - `GoogleTasksTab.tsx`
- Plantillas legacy duplicadas:
  - `src/components/Templates/*`
  - `src/components/Facturacion/{TemplateEditor,TemplateManager,UploadArea,template-api}`
- Otros legacy:
  - `BackgroundSpheres.tsx`
  - `ElectronInfo.tsx`
  - `CloseDay/InitialCashCountDialog.tsx`
  - `DayManagement/{OpenDayDialog,CloseDayDialog,CloseDayButton}`
  - `Documents/DocumentHistory.tsx`

## Utilidades archivadas (no referenciadas)
- `src/utils/api/payments.ts`
- `src/utils/electron-helper.ts`
- `src/utils/google-drive-sync.ts`
- `src/utils/measurement-converter.ts`
- `src/utils/password-hash.ts`
- `src/utils/supabase/info.tsx` (duplicado legacy de `info.ts`)
- `src/utils/trello-realtime.ts`

## Regla para cambios futuros
- Si un componente no se usa en rutas/pantallas activas, moverlo a `legacy/` en vez de dejarlo dentro de `src`.
- Evitar crear archivos `*.backup*` dentro de `src`.
- Mantener `src` solo con código en producción.
