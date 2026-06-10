import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);

function getArg(name, fallback = undefined) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Uso:
  npm run supabase:migrate-local -- --file ./supabase/localstorage-export.json

Variables requeridas:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Opciones:
  --dry-run   Lee y cuenta datos sin escribir en Supabase.
`);
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const filePath = getArg('--file', './supabase/localstorage-export.json');
const dryRun = args.includes('--dry-run');

if (!supabaseUrl) fail('Falta SUPABASE_URL.');
if (!serviceRoleKey) fail('Falta SUPABASE_SERVICE_ROLE_KEY.');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const input = JSON.parse((await readFile(filePath, 'utf8')).replace(/^\uFEFF/, ''));
const store = input.localStorage || input;
const stats = new Map();
const legacyMap = new Map();

function fail(message) {
  console.error(message);
  process.exit(1);
}

function bump(table, amount = 1) {
  stats.set(table, (stats.get(table) || 0) + amount);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function text(value) {
  if (value === null || value === undefined) return null;
  const clean = String(value).trim();
  return clean || null;
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value, fallback = false) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'si', 'yes', 'activo', 'active'].includes(String(value).toLowerCase());
}

function iso(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function dateOnly(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function legacyId(value, prefix) {
  return text(value?.legacy_id || value?.id || value?._id || value?.orderId || value?.number) ||
    `${prefix}_${Math.random().toString(36).slice(2)}`;
}

function numericCode(value, fallback = 0) {
  const clean = text(value);
  if (!clean) return fallback;
  const digits = clean.match(/\d+/g)?.join('');
  return digits ? Number(digits) : fallback;
}

function remember(table, rows) {
  for (const row of rows || []) {
    if (row.legacy_id && row.id) legacyMap.set(`${table}:${row.legacy_id}`, row.id);
  }
}

function resolve(table, legacy) {
  return legacy ? legacyMap.get(`${table}:${legacy}`) || null : null;
}

async function upsert(table, rows, options = {}) {
  const cleanRows = asArray(rows).filter(Boolean);
  if (!cleanRows.length) return [];

  if (dryRun) {
    bump(table, cleanRows.length);
    return cleanRows;
  }

  const { data, error } = await supabase.from(table).upsert(cleanRows, options).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  bump(table, data?.length || cleanRows.length);
  return data || [];
}

async function deleteRows(table, column, ids) {
  const cleanIds = ids.filter(Boolean);
  if (!cleanIds.length || dryRun) return;
  const { error } = await supabase.from(table).delete().in(column, cleanIds);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function migrateSettings() {
  const settings = asObject(store.esmark_settings || store.settings);
  const priceConfig = asObject(store.esmark_price_config || settings.priceConfig || settings.price_config);
  const notifications = asObject(store.esmark_notification_settings || settings.notifications);
  const trello = asObject(settings.trello || settings.trelloConfig || store.trello_preferences);
  const rows = [];

  if (Object.keys(settings).length) rows.push({ key: 'company', value: settings });
  if (Object.keys(priceConfig).length) rows.push({ key: 'price_config', value: priceConfig });
  if (Object.keys(notifications).length) rows.push({ key: 'notification_settings', value: notifications });
  if (Object.keys(trello).length) rows.push({ key: 'trello_settings', value: trello });

  await upsert('app_settings', rows, { onConflict: 'key' });
}

async function migrateUsers() {
  const rows = asArray(store.esmark_users).map((user) => ({
    legacy_id: legacyId(user, 'user'),
    username: text(user.username || user.user || user.email || user.name),
    name: text(user.name || user.fullName || user.full_name || user.username),
    role: text(user.role) || 'operador',
    password_hash: text(user.password_hash || user.password || user.pin),
    active: !('active' in user) || bool(user.active, true),
    can_authorize_discounts: bool(user.canAuthorizeDiscounts ?? user.can_authorize_discounts, false),
    metadata: user
  })).filter((row) => row.username);

  remember('app_users', await upsert('app_users', rows, { onConflict: 'username' }));
}

async function migrateCustomers() {
  const rows = asArray(store.esmark_customers).map((customer) => ({
    legacy_id: legacyId(customer, 'customer'),
    name: text(customer.name || customer.nombre || customer.customerName || customer.cliente),
    phone: text(customer.phone || customer.telefono || customer.customerPhone),
    email: text(customer.email || customer.correo),
    rtn: text(customer.rtn || customer.RTN),
    address: text(customer.address || customer.direccion || customer.customerAddress),
    notes: text(customer.notes || customer.notas),
    metadata: customer
  })).filter((row) => row.name);

  remember('customers', await upsert('customers', rows, { onConflict: 'legacy_id' }));
}

async function migrateProducts() {
  const products = [
    ...asArray(store.esmark_products),
    ...asArray(store.esmark_catalog_products),
    ...asArray(store.esmark_inventory)
  ];
  const unique = new Map();
  for (const product of products) unique.set(legacyId(product, 'product'), product);

  const rows = [...unique.entries()].map(([id, product]) => ({
    legacy_id: id,
    sku: text(product.sku || product.code || product.codigo || product.productCode),
    name: text(product.name || product.nombre || product.description || product.descripcion),
    category: text(product.category || product.categoria),
    brand: text(product.brand || product.marca),
    color: text(product.color),
    size: text(product.size || product.talla),
    neckline: text(product.neckline || product.cuello),
    unit: text(product.unit || product.unidad) || 'unidad',
    stock: num(product.stock || product.quantity || product.cantidad),
    min_stock: num(product.minStock || product.min_stock || product.stockMinimo),
    price: num(product.price || product.precio || product.salePrice || product.precioVenta),
    cost: num(product.cost || product.costo),
    description: text(product.description || product.descripcion),
    active: !('active' in product) || bool(product.active, true),
    has_variants: asArray(product.variants || product.variantes).length > 0,
    image_url: text(product.image || product.imageUrl || product.image_url),
    color_images: product.colorImages || product.color_images || {},
    metadata: product
  })).filter((row) => row.name);

  remember('products', await upsert('products', rows, { onConflict: 'legacy_id' }));
}

async function migrateOrders() {
  const orders = asArray(store.esmark_orders);
  const rows = orders.map((order) => {
    const customerLegacy = text(order.customerId || order.customer_id || order.clienteId);
    const legacy = legacyId(order, 'order');
    return {
      legacy_id: legacy,
      order_number: numericCode(order.order_number || order.number || order.numero || legacy),
      customer_id: resolve('customers', customerLegacy),
      customer_name: text(order.customerName || order.customer_name || order.cliente || order.clientName),
      customer_phone: text(order.customerPhone || order.customer_phone || order.telefono),
      customer_email: text(order.customerEmail || order.email),
      customer_rtn: text(order.customerRtn || order.customer_rtn || order.rtn),
      customer_address: text(order.customerAddress || order.address || order.direccion),
      status: text(order.status || order.estado) || 'pendiente',
      source: order.trello_card_id || order.trelloCardId ? 'trello' : 'manual',
      due_date: dateOnly(order.dueDate || order.due_date || order.deliveryDate || order.fechaEntrega),
      due_time: text(order.dueTime || order.due_time || order.horaEntrega),
      subtotal: num(order.subtotal),
      discount: num(order.discount || order.descuento),
      tax: num(order.tax || order.isv || order.impuesto),
      total: num(order.total),
      payment_status: text(order.paymentStatus || order.payment_status || order.estadoPago) || 'pendiente',
      payment_type: text(order.paymentType || order.payment_type || order.tipoPago),
      amount_paid: num(order.amountPaid || order.amount_paid || order.paidAmount || order.abono),
      received_amount: num(order.receivedAmount || order.received_amount || order.recibido),
      fiscal_document_type: text(order.fiscalDocumentType || order.fiscal_document_type),
      trello_card_id: text(order.trello_card_id || order.trelloCardId),
      trello_url: text(order.trello_card_url || order.trelloCardUrl || order.trello_url),
      attached_files: order.attachedFiles || order.attached_files || [],
      created_at: iso(order.createdAt || order.created_at) || new Date().toISOString(),
      updated_at: iso(order.updatedAt || order.updated_at) || new Date().toISOString(),
      metadata: order
    };
  }).filter((row) => row.order_number);

  const inserted = await upsert('orders', rows, { onConflict: 'legacy_id' });
  remember('orders', inserted);
  await deleteRows('order_items', 'order_id', inserted.map((row) => row.id));

  const itemRows = [];
  for (const order of orders) {
    const orderId = resolve('orders', legacyId(order, 'order'));
    if (!orderId) continue;

    for (const item of asArray(order.items || order.products || order.productos)) {
      const quantity = num(item.quantity || item.cantidad, 1);
      const unitPrice = num(item.unitPrice || item.price || item.precio || item.precioUnitario);
      itemRows.push({
        order_id: orderId,
        product_id: resolve('products', text(item.productId || item.product_id || item.id)),
        description: text(item.productName || item.name || item.nombre || item.description || item.descripcion) || 'Producto',
        quantity,
        unit_price: unitPrice,
        discount: num(item.discount || item.descuento),
        subtotal: num(item.subtotal, quantity * unitPrice),
        total: num(item.total, quantity * unitPrice),
        metadata: item
      });
    }
  }

  if (!dryRun && itemRows.length) {
    const { error } = await supabase.from('order_items').insert(itemRows);
    if (error) throw new Error(`order_items: ${error.message}`);
  }
  bump('order_items', itemRows.length);
}

async function migrateQuotes() {
  const quotes = asArray(store.esmark_quotes);
  const rows = quotes.map((quote) => ({
    legacy_id: legacyId(quote, 'quote'),
    quote_number: text(quote.quote_number || quote.number || quote.numero || quote.id),
    customer_id: resolve('customers', text(quote.customerId || quote.customer_id)),
    customer_name: text(quote.customerName || quote.customer_name || quote.cliente),
    customer_phone: text(quote.customerPhone || quote.telefono),
    customer_email: text(quote.customerEmail || quote.email),
    customer_rtn: text(quote.customerRtn || quote.rtn),
    status: text(quote.status || quote.estado) || 'borrador',
    subtotal: num(quote.subtotal),
    discount: num(quote.discount || quote.descuento),
    tax: num(quote.tax || quote.isv),
    total: num(quote.total),
    valid_until: dateOnly(quote.validUntil || quote.valid_until || quote.validaHasta),
    notes: text(quote.notes || quote.notas),
    created_at: iso(quote.createdAt || quote.created_at) || new Date().toISOString(),
    metadata: quote
  })).filter((row) => row.quote_number);

  remember('quotes', await upsert('quotes', rows, { onConflict: 'legacy_id' }));
}

async function migrateWorkDays() {
  const days = asArray(store.closed_days || store.esmark_day_closes);
  const rows = days.map((day) => ({
    legacy_id: legacyId(day, 'workday'),
    day_number: num(day.dayNumber || day.day_number || day.number || day.id),
    business_date: dateOnly(day.businessDate || day.date || day.fecha || day.openedAt || day.createdAt),
    opened_at: iso(day.openedAt || day.opened_at || day.apertura),
    closed_at: iso(day.closedAt || day.closed_at || day.cierre),
    opened_by: text(day.openedBy || day.opened_by || day.usuarioApertura),
    closed_by: text(day.closedBy || day.closed_by || day.usuarioCierre),
    initial_balance: num(day.initialBalance || day.initial_balance || day.saldoInicial),
    final_balance: num(day.finalBalance || day.final_balance || day.saldoFinal),
    difference: num(day.difference || day.diferencia),
    status: 'cerrado',
    notes: text(day.notes || day.notas),
    metadata: day
  })).filter((row) => row.business_date);

  remember('work_days', await upsert('work_days', rows, { onConflict: 'legacy_id' }));

  const reports = asObject(store.day_reports);
  const reportRows = Object.entries(reports).map(([date, report]) => ({
    report_date: dateOnly(report.date || date),
    total_sales: num(report.totalSales || report.total_sales),
    total_cash: num(report.totalCash || report.total_cash),
    total_card: num(report.totalCard || report.total_card),
    total_transfer: num(report.totalTransfer || report.total_transfer),
    total_orders: num(report.totalOrders || report.total_orders),
    total_documents: num(report.totalDocuments || report.total_documents),
      report,
      total_paid: num(report.totalPaid || report.total_paid),
      total_pending: num(report.totalPending || report.total_pending),
      orders_count: num(report.totalOrders || report.total_orders || report.orders_count),
      quotes_count: num(report.totalQuotes || report.total_quotes || report.quotes_count)
  })).filter((row) => row.report_date);

  await upsert('day_reports', reportRows);
}

async function migrateTrelloAndLogs() {
  const trello = asObject(store.trello_preferences);
  if (Object.keys(trello).length) {
    await upsert('trello_preferences', [{
      name: 'default',
      board_id: text(trello.boardId || trello.board_id),
      list_id: text(trello.listId || trello.list_id),
      list_name: text(trello.listName || trello.list_name),
      labels: trello.labels || [],
      members: trello.members || [],
      settings: trello
    }], { onConflict: 'name' });
  }

  const logs = asArray(store.esmark_activity_logs).map((log) => ({
    legacy_id: legacyId(log, 'log'),
    user_name: text(log.userName || log.user || log.usuario),
    action_type: text(log.actionType || log.action || log.tipo) || 'evento',
    description: text(log.description || log.descripcion || log.message),
    details: log.details || log,
    created_at: iso(log.createdAt || log.created_at || log.date) || new Date().toISOString()
  }));
  await upsert('activity_logs', logs, { onConflict: 'legacy_id' });

  const discounts = asArray(store.esmark_discount_requests).map((request) => ({
    legacy_id: legacyId(request, 'discount'),
    order_id: resolve('orders', text(request.orderId || request.order_id)),
    requested_by: text(request.requestedBy || request.requested_by),
    approved_by_name: text(request.authorizedBy?.name || request.authorizedBy || request.authorized_by),
    status: text(request.status || request.estado) || 'pendiente',
    reason: text(request.reason || request.motivo),
    discount_amount: num(request.discountAmount || request.discount_amount),
    discount_percent: num(request.discountPercent || request.discount_percent),
    product_description: text(request.productDescription || request.product_description),
    original_price: num(request.originalPrice || request.original_price),
    requested_price: num(request.requestedPrice || request.requested_price),
    metadata: request,
    created_at: iso(request.createdAt || request.created_at) || new Date().toISOString()
  }));
  await upsert('discount_requests', discounts, { onConflict: 'legacy_id' });
}

const steps = [
  ['configuracion', migrateSettings],
  ['usuarios', migrateUsers],
  ['clientes', migrateCustomers],
  ['productos', migrateProducts],
  ['pedidos', migrateOrders],
  ['cotizaciones', migrateQuotes],
  ['cierres', migrateWorkDays],
  ['trello y actividad', migrateTrelloAndLogs]
];

console.log(dryRun ? 'Modo prueba: no se escribira en Supabase.' : 'Migrando datos a Supabase...');

for (const [label, step] of steps) {
  process.stdout.write(`- ${label}... `);
  await step();
  console.log('ok');
}

console.log('\nResumen:');
for (const [table, total] of [...stats.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${table}: ${total}`);
}

console.log(dryRun ? '\nPrueba terminada.' : '\nMigracion terminada.');
