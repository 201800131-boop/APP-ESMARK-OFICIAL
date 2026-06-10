-- Endurecimiento seguro sin cambiar aun el modelo anon usado por la app.

do $$
declare
  view_name text;
  view_names text[] := array[
    'order_summary',
    'low_stock_products',
    'v_recent_activity',
    'v_templates_summary'
  ];
begin
  foreach view_name in array view_names loop
    if to_regclass('public.' || quote_ident(view_name)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', view_name);
    end if;
  end loop;
end $$;

do $$
declare
  function_signature text;
  function_signatures text[] := array[
    'public.update_updated_at_column()',
    'public.validate_single_active_template()',
    'public.auto_increment_version_number()',
    'public.set_updated_at()',
    'public.touch_updated_at(text)'
  ];
begin
  foreach function_signature in array function_signatures loop
    if to_regprocedure(function_signature) is not null then
      execute format('alter function %s set search_path = public', function_signature);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from anon;
    revoke execute on function public.rls_auto_enable() from authenticated;
    revoke execute on function public.rls_auto_enable() from public;
  end if;
end $$;
