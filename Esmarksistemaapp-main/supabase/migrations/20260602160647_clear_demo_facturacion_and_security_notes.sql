-- Limpieza de datos demo y registro de la siguiente fase de seguridad.
-- No endurece RLS aun porque la app usa cliente anon directo y autenticacion propia.

update public.app_settings
set value = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(value, '{}'::jsonb),
          '{facturas}',
          '[]'::jsonb,
          true
        ),
        '{auditoria}',
        '[]'::jsonb,
        true
      ),
      '{nextInvoiceNumber}',
      '1'::jsonb,
      true
    ),
    '{datosFiscales,siguienteFactura}',
    '"00000001"'::jsonb,
    true
  ),
  '{empresaInfo}',
  '{
    "nombreComercial": "ESMARK",
    "razonSocial": "ESMARK",
    "rtn": "",
    "direccion": "",
    "telefono": "",
    "email": ""
  }'::jsonb,
  true
),
updated_at = now()
where key = 'facturacion_state'
  and (
    value::text ilike '%Producto Demo%'
    or value::text ilike '%Cliente (Honduras1)%'
    or value::text ilike '%Empresa Sociedad%'
    or value::text ilike '%Olga Sarmiento%'
  );

insert into public.app_settings (key, value, description)
values (
  'security_model_notes',
  '{
    "current_model": "La app usa autenticacion propia y cliente anon de Supabase para operaciones directas.",
    "rls_status": "RLS esta activo, pero las politicas anon_full_access se mantienen para no romper la app actual.",
    "next_secure_phase": [
      "Migrar login a Supabase Auth o mover escrituras sensibles a Edge Functions con service role privado.",
      "Reemplazar anon_full_access por politicas por usuario y rol.",
      "No exponer service_role en cliente publico.",
      "Separar lectura publica, operaciones administrativas y registros financieros."
    ]
  }'::jsonb,
  'Notas de seguridad para la fase de RLS estricto'
)
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
