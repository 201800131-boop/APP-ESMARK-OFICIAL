(() => {
  const exportKey = 'esmark_supabase_export';
  const keys = [
    'esmark_users',
    'esmark_settings',
    'esmark_price_config',
    'esmark_notification_settings',
    'esmark_customers',
    'esmark_products',
    'esmark_catalog_products',
    'esmark_inventory',
    'esmark_orders',
    'esmark_quotes',
    'esmark_petty_cash',
    'esmark_day_closes',
    'closed_days',
    'day_reports',
    'esmark_activity_logs',
    'esmark_discount_requests',
    'trello_preferences',
    'settings'
  ];

  const data = {
    exportedAt: new Date().toISOString(),
    origin: location.origin,
    localStorage: {}
  };

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value === null) continue;

    try {
      data.localStorage[key] = JSON.parse(value);
    } catch {
      data.localStorage[key] = value;
    }
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('day_start_')) continue;

    try {
      data.localStorage[key] = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      data.localStorage[key] = localStorage.getItem(key);
    }
  }

  const text = JSON.stringify(data, null, 2);
  localStorage.setItem(exportKey, text);

  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `esmark-localstorage-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  console.log(`Export listo. Tambien quedo guardado temporalmente en localStorage.${exportKey}.`);
})();
