insert into public.app_settings (key, value, description)
values
  ('facturacion_state', '{}'::jsonb, 'Estado completo del modulo de facturacion: empresa, logo, firma, datos fiscales, diseno, facturas y recibos')
on conflict (key) do nothing;
