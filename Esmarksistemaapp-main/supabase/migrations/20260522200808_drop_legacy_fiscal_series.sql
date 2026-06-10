-- Limpieza del modelo anterior de series fiscales.
-- El sistema vigente maneja facturacion desde el modulo nuevo, no desde
-- public.fiscal_series ni public.correlatives.

alter table if exists public.documents
  drop column if exists fiscal_series_id;

drop table if exists public.correlatives cascade;
drop table if exists public.fiscal_series cascade;
