import { createClient } from 'jsr:@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const KV_TABLE = 'kv_store_09dfc183';
const WORK_DAY_CURRENT_KEY = 'work_day:current';
const WORK_DAY_HISTORY_PREFIX = 'work_day:history:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EXCLUDED_KEYS = new Set([
  'trello_preferences',
  'trello_orders_cache',
  'trello_orders_offline_cache',
  'trello_orders_cache_timestamp'
]);

const isTrelloKey = (key: string) => key.toLowerCase().includes('trello');

const filterAppData = (appData: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(appData || {})) {
    if (!key || EXCLUDED_KEYS.has(key) || isTrelloKey(key)) {
      continue;
    }
    result[key] = value;
  }
  return result;
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

function sanitizeAppSettings(settings: Record<string, any> = {}) {
  const { trello_api_key, trello_token, ...safeSettings } = settings;
  return {
    ...safeSettings,
    has_trello_api_key: !!trello_api_key,
    has_trello_token: !!trello_token,
    trello_enabled: !!trello_api_key && !!trello_token && !!safeSettings.trello_board_id,
  };
}

async function kvGet<T = any>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.value as T) ?? null;
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from(KV_TABLE)
    .upsert({ key, value });

  if (error) {
    throw new Error(error.message);
  }
}

async function kvDel(key: string): Promise<void> {
  const { error } = await supabase
    .from(KV_TABLE)
    .delete()
    .eq('key', key);

  if (error) {
    throw new Error(error.message);
  }
}

async function kvGetByPrefix<T = any>(prefix: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(KV_TABLE)
    .select('value')
    .like('key', `${prefix}%`);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row: any) => row.value as T);
}

async function getUserName(userId: string): Promise<string> {
  const user = await kvGet<{ name?: string }>(`user:${userId}`);
  return user?.name || 'Usuario';
}

async function getCurrentWorkDay(): Promise<any | null> {
  const current = await kvGet<any>(WORK_DAY_CURRENT_KEY);
  return current?.status === 'open' ? current : null;
}

function generateWorkDayId() {
  return `wd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateCustomerId() {
  return `customer:${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
}

async function hashPassword(password: string) {
  return `sha256:${await sha256Hex(password)}`;
}

async function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;
  if (storedHash.startsWith('sha256:')) {
    return storedHash === await hashPassword(password);
  }
  // Compatibilidad temporal con usuarios antiguos del kv_store.
  return storedHash === password;
}

function toPublicAppUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    legacy_id: row.legacy_id,
    username: row.username,
    name: row.name || row.username,
    role: row.role === 'admin' ? 'admin' : 'operator',
    email: row.metadata?.email || '',
    photo: row.photo_url || row.metadata?.photo || undefined,
    photo_url: row.photo_url || null,
    can_authorize_discounts: !!row.can_authorize_discounts,
    active: row.active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getAppUserByUsername(username: string) {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, legacy_id, username, name, role, password_hash, active, can_authorize_discounts, photo_url, created_at, updated_at, metadata')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function escapePostgrestFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildAppUserIdentityFilter(value: string) {
  const safe = escapePostgrestFilterValue(value);
  const clauses = [`legacy_id.eq.${safe}`, `username.eq.${safe}`];
  if (UUID_RE.test(value)) {
    clauses.unshift(`id.eq.${safe}`);
  }
  return clauses.join(',');
}

const toNumber = (value: any, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isUuid = (value: any) => typeof value === 'string' && UUID_RE.test(value);

function toTextArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function toDate(value: any) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function toCatalogProductRow(product: any, index = 0) {
  const name = product?.name || product?.nombre || product?.label || 'Producto';
  return {
    legacy_id: product?.legacy_id || product?.legacyId || product?.id || null,
    name,
    category: product?.category || product?.categoria || 'General',
    active: product?.active ?? product?.activo ?? true,
    manual: product?.manual ?? false,
    sort_order: toNumber(product?.sort_order ?? product?.sortOrder, index + 1),
    metadata: product || {},
  };
}

function fromCatalogProductRow(row: any) {
  return {
    ...(row.metadata || {}),
    id: row.id,
    legacy_id: row.legacy_id,
    name: row.name,
    nombre: row.name,
    category: row.category,
    categoria: row.category,
    active: row.active,
    activo: row.active,
    manual: row.manual,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toProductPackageRow(pkg: any) {
  return {
    legacy_id: pkg?.legacy_id || pkg?.id || null,
    name: pkg?.name || pkg?.nombre || 'Paquete',
    product_type: pkg?.product_type || pkg?.productType || pkg?.type || null,
    shapes: Array.isArray(pkg?.shapes) ? pkg.shapes.map(String) : [],
    size_headers: Array.isArray(pkg?.size_headers) ? pkg.size_headers.map(String) : Array.isArray(pkg?.sizeHeaders) ? pkg.sizeHeaders.map(String) : [],
    rows: Array.isArray(pkg?.rows) ? pkg.rows : [],
    description: pkg?.description || pkg?.descripcion || null,
    active: pkg?.active ?? pkg?.activo ?? true,
    metadata: pkg || {},
  };
}

function fromProductPackageRow(row: any) {
  return {
    ...(row.metadata || {}),
    id: row.id,
    legacy_id: row.legacy_id,
    name: row.name,
    product_type: row.product_type,
    productType: row.product_type,
    shapes: row.shapes || [],
    size_headers: row.size_headers || [],
    sizeHeaders: row.size_headers || [],
    rows: row.rows || [],
    description: row.description,
    active: row.active,
    activo: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toDiscountRequestRow(request: any) {
  const items = Array.isArray(request?.items) ? request.items : [];
  const firstItem = items[0] || {};
  return {
    legacy_id: request?.legacy_id || request?.id || null,
    requested_by_name: request?.operator?.name || request?.operator?.username || request?.requested_by_name || null,
    approved_by_name: request?.authorizedBy?.name || request?.approved_by_name || null,
    status: request?.status || 'pending',
    product_description: firstItem?.description || request?.product_description || null,
    original_price: firstItem?.originalPrice == null ? null : toNumber(firstItem.originalPrice),
    requested_price: firstItem?.discountedPrice == null ? null : toNumber(firstItem.discountedPrice),
    discount_amount: toNumber(request?.discountAmount ?? request?.discount_amount),
    reason: request?.reason || null,
    resolved_at: request?.approvedAt || request?.resolved_at || null,
    metadata: request || {},
  };
}

function fromDiscountRequestRow(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...metadata,
    id: row.legacy_id || row.id,
    remote_id: row.id,
    status: row.status,
    discountAmount: toNumber(metadata.discountAmount ?? row.discount_amount),
    reason: metadata.reason || row.reason || '',
    createdAt: metadata.createdAt || row.created_at,
    approvedAt: metadata.approvedAt || row.resolved_at,
    operator: metadata.operator || { username: '', name: row.requested_by_name || 'Usuario' },
    authorizedBy: metadata.authorizedBy || (row.approved_by_name ? { username: '', name: row.approved_by_name } : undefined),
    customerName: metadata.customerName || '',
    items: Array.isArray(metadata.items) ? metadata.items : [],
  };
}

function applyIdFilter(query: any, id: string) {
  return isUuid(id) ? query.eq('id', id) : query.eq('legacy_id', id);
}

function toCustomerRow(customer: any) {
  return {
    legacy_id: customer?.legacy_id || customer?.id || null,
    name: customer?.name || customer?.customer_name || customer?.nombre || 'Cliente sin nombre',
    phone: customer?.phone || customer?.telefono || null,
    email: customer?.email || null,
    rtn: customer?.rtn || null,
    address: customer?.address || customer?.direccion || null,
    notes: customer?.notes || customer?.notas || null,
    active: customer?.active ?? true,
    metadata: customer || {},
  };
}

function fromCustomerRow(row: any) {
  return { ...(row.metadata || {}), ...row, id: row.id };
}

function toProductRow(product: any) {
  return {
    legacy_id: product?.legacy_id || product?.id || null,
    sku: product?.sku || product?.codigo || null,
    code: product?.code || product?.codigo || null,
    name: product?.name || product?.nombre || product?.description || 'Producto sin nombre',
    category: product?.category || product?.categoria || null,
    brand: product?.brand || product?.marca || null,
    color: product?.color || null,
    size: product?.size || null,
    neckline: product?.neckline || null,
    description: product?.description || product?.descripcion || null,
    price: toNumber(product?.price ?? product?.precio),
    cost: toNumber(product?.cost ?? product?.costo),
    unit: product?.unit || product?.unidad || 'unidad',
    stock: toNumber(product?.stock),
    min_stock: toNumber(product?.min_stock ?? product?.minStock),
    active: product?.active ?? true,
    has_variants: product?.has_variants ?? false,
    image_url: product?.image_url || product?.imageUrl || null,
    color_images: product?.color_images || {},
    metadata: product || {},
  };
}

function fromProductRow(row: any) {
  return { ...(row.metadata || {}), ...row, id: row.id };
}

function toQuoteNumber(value: any) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
}

async function getNextQuoteNumber() {
  const { data, error } = await supabase
    .from('quotes')
    .select('quote_number')
    .order('quote_number', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const current = Number(data?.[0]?.quote_number || 0);
  return current > 0 ? current + 1 : 1;
}

function toQuoteRow(quote: any, quoteNumber: number) {
  return {
    legacy_id: quote?.legacy_id || quote?.id || `quote-${Date.now()}`,
    quote_number: toQuoteNumber(quote?.quote_number ?? quote?.number ?? quote?.numero ?? quoteNumber),
    customer_name: quote?.customer_name || quote?.cliente || 'Cliente sin nombre',
    customer_phone: quote?.customer_phone || quote?.telefono || null,
    customer_email: quote?.customer_email || quote?.email || null,
    customer_rtn: quote?.customer_rtn || quote?.rtn || null,
    status: quote?.status || quote?.estado || 'PENDIENTE',
    subtotal: toNumber(quote?.subtotal ?? quote?.subtotal_sin_isv),
    discount: toNumber(quote?.discount ?? quote?.descuento),
    tax: toNumber(quote?.tax ?? quote?.impuesto ?? quote?.isv_monto),
    total: toNumber(quote?.total),
    valid_until: toDate(quote?.valid_until || quote?.valida_hasta),
    metadata: quote || {},
  };
}

function toQuoteItemRows(quoteId: string, quote: any) {
  const items = Array.isArray(quote?.items) ? quote.items : [];
  return items.map((item: any) => ({
    quote_id: quoteId,
    product_id: isUuid(item?.product_id) ? item.product_id : null,
    description: item?.description || item?.descripcion || item?.product_name || 'Producto',
    quantity: toNumber(item?.quantity ?? item?.qty ?? item?.cantidad ?? item?.unidades, 1),
    unit_price: toNumber(item?.unit_price ?? item?.price ?? item?.precio_unitario ?? item?.precio),
    discount: toNumber(item?.discount ?? item?.discount_amount),
    tax_rate: toNumber(item?.tax_rate ?? item?.isv_rate, 15),
    subtotal: toNumber(item?.subtotal),
    total: toNumber(item?.total ?? item?.subtotal),
    metadata: item || {},
  }));
}

function fromQuoteRow(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...metadata,
    ...row,
    id: row.id,
    number: String(row.quote_number || metadata.number || metadata.numero || ''),
    quote_number: row.quote_number || metadata.quote_number,
    numero: row.quote_number || metadata.numero,
    estado: row.status || metadata.estado,
    fecha: row.created_at || metadata.fecha,
    impuesto: row.tax ?? metadata.impuesto,
    subtotal: row.subtotal ?? metadata.subtotal,
    items: row.quote_items?.map((item: any) => ({ ...(item.metadata || {}), ...item })) || metadata.items || [],
  };
}

function toOrderNumber(value: any) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
}

function toOrderRow(order: any) {
  const legacyId = String(order?.legacy_id || order?.id || `order-${Date.now()}`);
  const total = toNumber(order?.total ?? order?.total_amount ?? order?.amount);
  const amountPaid = toNumber(order?.amount_paid ?? order?.paid_amount);
  return {
    legacy_id: legacyId,
    order_number: toOrderNumber(order?.order_number ?? order?.number ?? order?.numero ?? legacyId),
    customer_name: order?.customer_name || order?.customerName || order?.client_name || order?.cliente || 'Cliente sin nombre',
    customer_phone: order?.customer_phone || order?.customerPhone || order?.phone || null,
    customer_email: order?.customer_email || order?.email || null,
    customer_rtn: order?.customer_rtn || order?.rtn || null,
    customer_address: order?.customer_address || order?.address || null,
    status: order?.status || 'PENDIENTE',
    source: order?.trello_card_id ? 'trello' : order?.source || 'manual',
    due_date: toDate(order?.due_date || order?.delivery_date || order?.fecha_entrega),
    due_time: order?.due_time || order?.delivery_time || null,
    subtotal: toNumber(order?.subtotal),
    discount: toNumber(order?.discount ?? order?.discount_amount),
    tax: toNumber(order?.tax ?? order?.isv ?? order?.isv_amount),
    total,
    payment_status: order?.payment_status || 'PENDIENTE',
    payment_type: order?.payment_type || order?.payment_method || null,
    amount_paid: amountPaid,
    received_amount: order?.received_amount == null ? null : toNumber(order.received_amount),
    change_amount: order?.change_amount == null ? null : toNumber(order.change_amount),
    fiscal_document_type: order?.fiscal_document_type || order?.doc_type || order?.linked_billing_document_type || null,
    linked_document_id: isUuid(order?.linked_document_id || order?.linked_billing_document_id)
      ? (order.linked_document_id || order.linked_billing_document_id)
      : null,
    trello_card_id: order?.trello_card_id || null,
    trello_url: order?.trello_url || null,
    trello_list_id: order?.trello_list_id || null,
    trello_label_ids: toTextArray(order?.trello_label_ids || order?.trello_labels),
    trello_member_ids: toTextArray(order?.trello_member_ids || order?.trello_members),
    attached_files: order?.attached_files || [],
    metadata: order || {},
  };
}

function toOrderUpdateRow(order: any) {
  const row: Record<string, any> = {};
  const setters: Array<[string, any]> = [
    ['customer_name', order?.customer_name || order?.customerName || order?.client_name || order?.cliente],
    ['customer_phone', order?.customer_phone || order?.customerPhone || order?.phone],
    ['customer_email', order?.customer_email || order?.email],
    ['customer_rtn', order?.customer_rtn || order?.rtn],
    ['customer_address', order?.customer_address || order?.address],
    ['status', order?.status],
    ['source', order?.trello_card_id ? 'trello' : order?.source],
    ['due_date', toDate(order?.due_date || order?.delivery_date || order?.fecha_entrega)],
    ['due_time', order?.due_time || order?.delivery_time],
    ['subtotal', order?.subtotal == null ? undefined : toNumber(order.subtotal)],
    ['discount', (order?.discount ?? order?.discount_amount) == null ? undefined : toNumber(order.discount ?? order.discount_amount)],
    ['tax', (order?.tax ?? order?.isv ?? order?.isv_amount) == null ? undefined : toNumber(order.tax ?? order.isv ?? order.isv_amount)],
    ['total', (order?.total ?? order?.total_amount ?? order?.amount) == null ? undefined : toNumber(order.total ?? order.total_amount ?? order.amount)],
    ['payment_status', order?.payment_status],
    ['payment_type', order?.payment_type || order?.payment_method],
    ['amount_paid', (order?.amount_paid ?? order?.paid_amount) == null ? undefined : toNumber(order.amount_paid ?? order.paid_amount)],
    ['received_amount', order?.received_amount == null ? undefined : toNumber(order.received_amount)],
    ['change_amount', order?.change_amount == null ? undefined : toNumber(order.change_amount)],
    ['fiscal_document_type', order?.fiscal_document_type || order?.doc_type || order?.linked_billing_document_type],
    ['linked_document_id', isUuid(order?.linked_document_id || order?.linked_billing_document_id) ? (order.linked_document_id || order.linked_billing_document_id) : undefined],
    ['trello_card_id', order?.trello_card_id],
    ['trello_url', order?.trello_url],
    ['trello_list_id', order?.trello_list_id],
    ['trello_label_ids', order?.trello_label_ids == null && order?.trello_labels == null ? undefined : toTextArray(order.trello_label_ids || order.trello_labels)],
    ['trello_member_ids', order?.trello_member_ids == null && order?.trello_members == null ? undefined : toTextArray(order.trello_member_ids || order.trello_members)],
    ['attached_files', order?.attached_files],
    ['metadata', order],
  ];

  setters.forEach(([key, value]) => {
    if (value !== undefined) row[key] = value;
  });
  return row;
}

function toOrderItemRows(orderId: string, order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item: any) => ({
    order_id: orderId,
    product_id: isUuid(item?.product_id) ? item.product_id : null,
    product_variant_id: isUuid(item?.product_variant_id) ? item.product_variant_id : null,
    description: item?.description || item?.name || item?.product_name || 'Producto',
    quantity: toNumber(item?.quantity ?? item?.qty, 1),
    unit_price: toNumber(item?.unit_price ?? item?.price ?? item?.precio),
    discount: toNumber(item?.discount ?? item?.discount_amount),
    tax_rate: toNumber(item?.tax_rate ?? item?.isv_rate, 15),
    subtotal: toNumber(item?.subtotal),
    total: toNumber(item?.total),
    width: item?.width == null ? null : toNumber(item.width),
    height: item?.height == null ? null : toNumber(item.height),
    unit: item?.unit || null,
    product_type: item?.product_type || item?.type || null,
    material: item?.material || null,
    print_type: item?.print_type || null,
    size: item?.size || null,
    color: item?.color || null,
    metadata: item || {},
  }));
}

function fromOrderRow(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  return {
    ...metadata,
    ...row,
    id: row.id,
    legacy_id: row.legacy_id,
    number: String(row.order_number || metadata.number || ''),
    order_number: row.order_number || metadata.order_number,
    items: row.order_items?.map((item: any) => ({ ...(item.metadata || {}), ...item })) || metadata.items || [],
  };
}

async function getNextOrderNumber() {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .order('order_number', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const current = Number(data?.[0]?.order_number || 0);
  return current > 0 ? current + 1 : 1;
}

const BUSINESS_TIME_ZONE = 'America/Tegucigalpa';
const CLOSE_DEADLINE_MINUTES = 16 * 60 + 30;
const CLOSE_FINAL_DEADLINE_MINUTES = CLOSE_DEADLINE_MINUTES + 2 * 60;

function businessDateTimeParts(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '00';
  const day = parts.find((part) => part.type === 'day')?.value || '00';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

function dateKeyInBusinessTimezone(value: Date | string = new Date()) {
  return businessDateTimeParts(value).dateKey;
}

function todayKey() {
  return dateKeyInBusinessTimezone();
}

function getWorkDayBusinessDate(day: any) {
  const metadataDate = day?.metadata?.business_date;
  if (typeof metadataDate === 'string' && metadataDate.trim()) return metadataDate.trim();
  return day?.opened_at ? dateKeyInBusinessTimezone(day.opened_at) : null;
}

function closeWindowIsExpired() {
  return businessDateTimeParts().minutes > CLOSE_FINAL_DEADLINE_MINUTES;
}

function normalizeWorkDayRow(row: any) {
  if (!row) return null;
  return {
    ...row,
    day_number: Number(row.day_number || 0),
    opened_by: row.opened_by || row.metadata?.opened_by || null,
    opened_by_name: row.opened_by_name || row.metadata?.opened_by_name || 'Usuario',
    closed_by: row.closed_by || row.metadata?.closed_by || null,
    closed_by_name: row.closed_by_name || row.metadata?.closed_by_name || null,
    initial_cash_balance: toNumber(row.initial_cash_balance),
    final_cash_balance: row.final_cash_balance == null ? null : toNumber(row.final_cash_balance),
  };
}

async function getCurrentTableWorkDay() {
  const { data, error } = await supabase
    .from('work_days')
    .select('*')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeWorkDayRow(data) : null;
}

async function getNextDayNumberFromTable() {
  const { data, error } = await supabase
    .from('work_days')
    .select('day_number')
    .order('day_number', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return Number(data?.[0]?.day_number || 0) + 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'POST' && path.endsWith('/upload')) {
      const body = await req.json();
      const userId = body?.userId;
      if (!userId) {
        return json(400, { error: 'userId es requerido' });
      }

      const syncKey = `user_sync:${userId}`;
      const payload = {
        userId,
        timestamp: body?.timestamp || new Date().toISOString(),
        appData: filterAppData(body?.appData || {}),
        quotes: body?.quotes || [],
        products: body?.products || [],
        customers: body?.customers || [],
        fiscalSeries: body?.fiscalSeries || [],
        pettyCash: body?.pettyCash || [],
        dayStarts: body?.dayStarts || [],
        priceConfig: body?.priceConfig || {}
      };

      const { error } = await supabase
        .from(KV_TABLE)
        .upsert({ key: syncKey, value: payload });

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { success: true, timestamp: payload.timestamp });
    }

    if (req.method === 'GET' && path.endsWith('/download')) {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return json(400, { error: 'userId es requerido' });
      }

      const syncKey = `user_sync:${userId}`;
      const { data, error } = await supabase
        .from(KV_TABLE)
        .select('value')
        .eq('key', syncKey)
        .maybeSingle();

      if (error) {
        return json(500, { error: error.message });
      }

      if (!data?.value) {
        return json(404, { error: 'No hay datos para este usuario' });
      }

      return json(200, data.value);
    }

    if (req.method === 'GET' && path.endsWith('/status')) {
      const userId = url.searchParams.get('userId');
      if (!userId) {
        return json(400, { error: 'userId es requerido' });
      }

      const syncKey = `user_sync:${userId}`;
      const { data, error } = await supabase
        .from(KV_TABLE)
        .select('value')
        .eq('key', syncKey)
        .maybeSingle();

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, {
        hasData: !!data?.value,
        lastSync: data?.value?.timestamp || null,
        userId
      });
    }

    if (req.method === 'GET' && path.endsWith('/customers')) {
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      let customers = await kvGetByPrefix<any>('customer:');

      customers = customers.filter((item) => item && typeof item === 'object' && item.name);

      if (search) {
        customers = customers.filter((customer) => {
          return [customer.name, customer.phone, customer.email, customer.rtn]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(search));
        });
      }

      customers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

      return json(200, { success: true, customers, count: customers.length });
    }

    if (req.method === 'POST' && path.endsWith('/customers')) {
      const body = await req.json();
      const name = String(body?.name || '').trim();

      if (!name) {
        return json(400, { error: 'El nombre del cliente es requerido' });
      }

      const now = new Date().toISOString();
      const customer = {
        id: generateCustomerId(),
        name,
        phone: String(body?.phone || '').trim(),
        email: String(body?.email || '').trim(),
        rtn: String(body?.rtn || '').trim(),
        address: String(body?.address || '').trim(),
        notes: String(body?.notes || '').trim(),
        created_at: now,
        updated_at: now
      };

      await kvSet(customer.id, customer);
      return json(201, { success: true, customer });
    }

    if (req.method === 'GET' && /\/customers\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      if (!id || id === 'customers') {
        return json(404, { error: 'Ruta no encontrada' });
      }

      const customer = await kvGet<any>(id);
      if (!customer) {
        return json(404, { error: 'Cliente no encontrado' });
      }

      return json(200, { success: true, customer });
    }

    if (req.method === 'PUT' && /\/customers\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const updates = await req.json();

      const existing = await kvGet<any>(id);
      if (!existing) {
        return json(404, { error: 'Cliente no encontrado' });
      }

      const updated = {
        ...existing,
        ...updates,
        id,
        updated_at: new Date().toISOString()
      };

      await kvSet(id, updated);
      return json(200, { success: true, customer: updated });
    }

    if (req.method === 'DELETE' && /\/customers\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');

      const existing = await kvGet<any>(id);
      if (!existing) {
        return json(404, { error: 'Cliente no encontrado' });
      }

      await kvDel(id);
      return json(200, { success: true, message: 'Cliente eliminado' });
    }

    if (req.method === 'GET' && /\/day-start\/[^/]+$/.test(path)) {
      const date = decodeURIComponent(path.split('/').pop() || '');
      if (!date) {
        return json(400, { error: 'date es requerido' });
      }

      const key = `day_start:${date}`;
      const { data, error } = await supabase
        .from(KV_TABLE)
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, {
        dayStart: data?.value || null
      });
    }

    if (req.method === 'POST' && path.endsWith('/day-start')) {
      const { date, initial_cash, notes } = await req.json();

      if (!date) {
        return json(400, { error: 'date es requerido' });
      }

      const key = `day_start:${date}`;
      const { data: existing, error: readError } = await supabase
        .from(KV_TABLE)
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (readError) {
        return json(500, { error: readError.message });
      }

      if (existing?.value) {
        return json(400, { error: 'Ya existe un inicio de dia para esta fecha' });
      }

      const dayStart = {
        id: crypto.randomUUID(),
        date,
        initial_cash: Number.parseFloat(String(initial_cash ?? 0)),
        notes: notes ?? '',
        created_at: new Date().toISOString()
      };

      const { error: writeError } = await supabase
        .from(KV_TABLE)
        .upsert({ key, value: dayStart });

      if (writeError) {
        return json(500, { error: writeError.message });
      }

      return json(200, { dayStart });
    }

    if (req.method === 'GET' && path.endsWith('/work-days/current')) {
      const current = await getCurrentWorkDay();
      return json(200, { day: current });
    }

    if (req.method === 'POST' && path.endsWith('/work-days/open')) {
      const body = await req.json();
      const userId = body?.userId;
      const userName = body?.userName;
      const initialCashBalance = Number.parseFloat(String(body?.initialCashBalance ?? 0));

      if (!userId) {
        return json(400, { error: 'userId es requerido' });
      }

      if (userName) {
        await kvSet(`user:${userId}`, { name: userName });
      }

      const current = await getCurrentWorkDay();
      if (current) {
        return json(200, { success: true, day: current, message: 'Ya existe un dia abierto' });
      }

      const allDays = await kvGetByPrefix<any>(WORK_DAY_HISTORY_PREFIX);
      const maxDayNumber = allDays.reduce((max, day) => {
        const value = Number(day?.day_number || 0);
        return value > max ? value : max;
      }, 0);

      const day = {
        id: generateWorkDayId(),
        day_number: maxDayNumber + 1,
        status: 'open',
        opened_at: new Date().toISOString(),
        closed_at: null,
        opened_by: userId,
        opened_by_name: await getUserName(userId),
        closed_by: null,
        closed_by_name: null,
        initial_cash_balance: Number.isFinite(initialCashBalance) ? initialCashBalance : 0,
        final_cash_balance: null,
        notes: null
      };

      await kvSet(WORK_DAY_CURRENT_KEY, day);
      await kvSet(`${WORK_DAY_HISTORY_PREFIX}${day.id}`, day);

      return json(200, { success: true, day, message: 'Dia de trabajo abierto exitosamente' });
    }

    if (req.method === 'POST' && path.endsWith('/work-days/close')) {
      const body = await req.json();
      const dayId = body?.dayId;
      const userId = body?.userId;
      const userName = body?.userName;
      const notes = body?.notes;

      if (!dayId || !userId) {
        return json(400, { error: 'dayId y userId son requeridos' });
      }

      if (userName) {
        await kvSet(`user:${userId}`, { name: userName });
      }

      const current = await getCurrentWorkDay();
      if (!current) {
        return json(400, { error: 'No hay ningun dia de trabajo abierto para cerrar' });
      }

      if (current.id !== dayId) {
        return json(400, { error: 'El ID del dia no coincide con el dia actual abierto' });
      }

      const workDayBusinessDate = getWorkDayBusinessDate(current);
      if (workDayBusinessDate && workDayBusinessDate > todayKey()) {
        return json(400, { error: 'La fecha del dia operativo abierto no es valida para realizar el cierre' });
      }

      if (workDayBusinessDate === todayKey() && closeWindowIsExpired()) {
        return json(400, { error: 'El cierre vencio. La hora limite es 4:30 p. m. con aplazamiento maximo hasta las 6:30 p. m.' });
      }

      const closed = {
        ...current,
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userId,
        closed_by_name: await getUserName(userId),
        notes: notes || null
      };

      await kvSet(`${WORK_DAY_HISTORY_PREFIX}${closed.id}`, closed);
      await kvDel(WORK_DAY_CURRENT_KEY);

      return json(200, { success: true, day: closed, message: 'Dia de trabajo cerrado exitosamente' });
    }

    if (req.method === 'GET' && path.endsWith('/work-days/history')) {
      const limit = Number.parseInt(url.searchParams.get('limit') || '30', 10);
      const allDays = await kvGetByPrefix<any>(WORK_DAY_HISTORY_PREFIX);
      const history = allDays
        .filter((day) => day?.status === 'closed')
        .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime())
        .slice(0, Number.isFinite(limit) ? limit : 30);

      return json(200, { history, days: history });
    }

    if (req.method === 'GET' && /\/work-days\/[^/]+$/.test(path)) {
      const dayId = decodeURIComponent(path.split('/').pop() || '');
      if (!dayId || dayId === 'current' || dayId === 'history') {
        return json(404, { error: 'Ruta no encontrada' });
      }

      const day = await kvGet<any>(`${WORK_DAY_HISTORY_PREFIX}${dayId}`);
      if (!day) {
        return json(404, { error: 'Dia de trabajo no encontrado' });
      }

      return json(200, { day });
    }

    // Health
    if (req.method === 'GET' && path.endsWith('/health')) {
      return json(200, { status: 'ok', service: 'esmark-sync', timestamp: new Date().toISOString() });
    }

    // Auth - signup/signin
    if (req.method === 'POST' && (path.endsWith('/auth/signup') || path.endsWith('/auth/signin') || path.endsWith('/auth/login'))) {
      const body = await req.json();
      const { username, password, email, name, role } = body;
      const cleanUsername = String(username || '').trim();

      if (path.endsWith('/auth/signup')) {
        if (!cleanUsername || !password) return json(400, { error: 'username y password son requeridos' });
        const existing = await getAppUserByUsername(cleanUsername);
        if (existing) return json(200, { success: true, userExists: true, message: 'User already exists' });

        const { data: inserted, error } = await supabase
          .from('app_users')
          .insert({
            username: cleanUsername,
            name: name || cleanUsername,
            role: role === 'admin' ? 'admin' : 'operator',
            password_hash: await hashPassword(password),
            active: true,
            can_authorize_discounts: role === 'admin',
            metadata: { email: email || '' },
          })
          .select('id, legacy_id, username, name, role, active, can_authorize_discounts, photo_url, created_at, updated_at, metadata')
          .single();

        if (error) return json(500, { error: error.message });
        return json(201, { success: true, user: toPublicAppUser(inserted) });
      }

      // signin / login
      if (!cleanUsername || !password) return json(400, { error: 'username y password son requeridos' });
      const stored = await getAppUserByUsername(cleanUsername);
      let user = toPublicAppUser(stored);
      let passwordOk = await verifyPassword(password, stored?.password_hash);

      // Compatibilidad temporal con credenciales antiguas guardadas en kv_store.
      if (!user || !passwordOk) {
        const legacy = await kvGet<any>(`user_auth:${cleanUsername}`);
        if (legacy && legacy.password === password) {
          const { password: _legacyPassword, ...legacyUser } = legacy;
          user = {
            ...legacyUser,
            role: legacyUser.role === 'admin' ? 'admin' : 'operator',
            active: true,
          };
          passwordOk = true;
        }
      }

      if (!user || !passwordOk || user.active === false) {
        return json(401, { error: 'Credenciales invalidas' });
      }

      if (stored?.id) {
        await supabase
          .from('app_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', stored.id);
      }

      return json(200, {
        success: true,
        token: supabaseAnonKey,
        user,
        session: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          login_time: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          token_mode: 'anon_compat',
        },
      });
    }

    if (req.method === 'GET' && path.endsWith('/auth/me')) {
      return json(200, { user: null, success: true });
    }

    // Users
    if (req.method === 'GET' && path.endsWith('/users')) {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, legacy_id, username, name, role, active, can_authorize_discounts, photo_url, created_at, updated_at, metadata')
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      const users = (data || []).map(toPublicAppUser);
      return json(200, { users, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/users')) {
      const body = await req.json();
      const { username, password, name, role, email } = body;
      const cleanUsername = String(username || '').trim();
      if (!cleanUsername) return json(400, { error: 'username es requerido' });

      const { data, error } = await supabase
        .from('app_users')
        .insert({
          username: cleanUsername,
          name: name || cleanUsername,
          role: role === 'admin' ? 'admin' : 'operator',
          password_hash: password ? await hashPassword(password) : null,
          active: true,
          can_authorize_discounts: role === 'admin',
          metadata: { email: email || '' },
        })
        .select('id, legacy_id, username, name, role, active, can_authorize_discounts, photo_url, created_at, updated_at, metadata')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, user: toPublicAppUser(data) });
    }

    if (req.method === 'PUT' && /\/users\/[^/]+$/.test(path)) {
      const userId = decodeURIComponent(path.split('/').pop() || '');
      const updates = await req.json();
      const updateRow: Record<string, unknown> = {};

      if (updates.username) updateRow.username = String(updates.username).trim();
      if (updates.name) updateRow.name = updates.name;
      if (updates.role) updateRow.role = updates.role === 'admin' ? 'admin' : 'operator';
      if (typeof updates.active === 'boolean') updateRow.active = updates.active;
      if (typeof updates.can_authorize_discounts === 'boolean') updateRow.can_authorize_discounts = updates.can_authorize_discounts;
      if (updates.password) updateRow.password_hash = await hashPassword(updates.password);
      if (updates.email !== undefined || updates.photo !== undefined) {
        updateRow.metadata = { email: updates.email || '', photo: updates.photo || '' };
      }

      const { data, error } = await supabase
        .from('app_users')
        .update(updateRow)
        .or(buildAppUserIdentityFilter(userId))
        .select('id, legacy_id, username, name, role, active, can_authorize_discounts, photo_url, created_at, updated_at, metadata')
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      if (!data) return json(404, { error: 'Usuario no encontrado' });
      return json(200, { success: true, user: toPublicAppUser(data) });
    }

    if (req.method === 'DELETE' && /\/users\/[^/]+$/.test(path)) {
      const userId = decodeURIComponent(path.split('/').pop() || '');
      const { error } = await supabase
        .from('app_users')
        .delete()
        .or(buildAppUserIdentityFilter(userId));

      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    // App settings table
    if (req.method === 'GET' && /\/app-settings\/[^/]+$/.test(path)) {
      const key = decodeURIComponent(path.split('/').pop() || '');
      const fallbackParam = url.searchParams.get('fallback');
      const fallback = fallbackParam ? JSON.parse(fallbackParam) : null;
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, value: data?.value ?? fallback });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && /\/app-settings\/[^/]+$/.test(path)) {
      const key = decodeURIComponent(path.split('/').pop() || '');
      const body = await req.json();
      const { value, description = 'Configuracion de la app' } = body || {};
      const { data, error } = await supabase
        .from('app_settings')
        .upsert({ key, value, description }, { onConflict: 'key' })
        .select('value')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, value: data?.value ?? value });
    }

    // Catalog products
    if (req.method === 'GET' && path.endsWith('/catalog-products')) {
      const { data, error } = await supabase
        .from('catalog_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, products: (data || []).map(fromCatalogProductRow) });
    }

    if (req.method === 'POST' && path.endsWith('/catalog-products')) {
      const body = await req.json();
      const rows = Array.isArray(body?.products)
        ? body.products.map((product: any, index: number) => toCatalogProductRow(product, index))
        : [toCatalogProductRow(body?.product || body)];
      const query = Array.isArray(body?.products)
        ? supabase.from('catalog_products').upsert(rows, { onConflict: 'legacy_id' })
        : supabase.from('catalog_products').insert(rows[0]);
      const { data, error } = await query.select('*');

      if (error) return json(500, { error: error.message });
      const products = (data || []).map(fromCatalogProductRow);
      return json(201, { success: true, product: products[0], products });
    }

    if (req.method === 'PUT' && /\/catalog-products\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const body = await req.json();
      const row = toCatalogProductRow(body?.updates || body);
      delete (row as any).legacy_id;
      const { data, error } = await applyIdFilter(supabase.from('catalog_products').update(row), id)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, product: fromCatalogProductRow(data) });
    }

    if (req.method === 'DELETE' && /\/catalog-products\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const { error } = await applyIdFilter(supabase.from('catalog_products').update({ active: false }), id);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    // Product/service packages
    if (req.method === 'GET' && path.endsWith('/product-packages')) {
      const { data, error } = await supabase
        .from('product_packages')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, packages: (data || []).map(fromProductPackageRow) });
    }

    if (req.method === 'POST' && path.endsWith('/product-packages')) {
      const body = await req.json();
      const packages = Array.isArray(body?.packages) ? body.packages : [];
      await supabase.from('product_packages').update({ active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

      if (packages.length === 0) {
        return json(200, { success: true, packages: [] });
      }

      const { data, error } = await supabase
        .from('product_packages')
        .upsert(packages.map(toProductPackageRow), { onConflict: 'legacy_id' })
        .select('*');

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, packages: (data || []).map(fromProductPackageRow) });
    }

    // Discount requests
    if (req.method === 'GET' && path.endsWith('/discount-requests')) {
      const { data, error } = await supabase
        .from('discount_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, requests: (data || []).map(fromDiscountRequestRow) });
    }

    if (req.method === 'POST' && path.endsWith('/discount-requests')) {
      const body = await req.json();
      const { data, error } = await supabase
        .from('discount_requests')
        .insert(toDiscountRequestRow(body?.request || body))
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, request: fromDiscountRequestRow(data) });
    }

    if (req.method === 'PUT' && /\/discount-requests\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const body = await req.json();
      const { data, error } = await applyIdFilter(supabase.from('discount_requests').update(toDiscountRequestRow(body?.updates || body)), id)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, request: fromDiscountRequestRow(data) });
    }

    // Customers table
    if (req.method === 'GET' && path.endsWith('/customers-table')) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, customers: (data || []).map(fromCustomerRow) });
    }

    if (req.method === 'POST' && path.endsWith('/customers-table')) {
      const body = await req.json();
      const { data, error } = await supabase
        .from('customers')
        .insert(toCustomerRow(body?.customer || body))
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, customer: fromCustomerRow(data) });
    }

    // Products table
    if (req.method === 'GET' && path.endsWith('/products-table')) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, products: (data || []).map(fromProductRow) });
    }

    if (req.method === 'POST' && path.endsWith('/products-table')) {
      const body = await req.json();
      const { data, error } = await supabase
        .from('products')
        .insert(toProductRow(body?.product || body))
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, product: fromProductRow(data) });
    }

    if (req.method === 'PUT' && /\/products-table\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const body = await req.json();
      const row = toProductRow(body?.updates || body);
      delete (row as any).legacy_id;
      const { data, error } = await applyIdFilter(supabase.from('products').update(row), id)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, product: fromProductRow(data) });
    }

    if (req.method === 'DELETE' && /\/products-table\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const { error } = await applyIdFilter(supabase.from('products').update({ active: false }), id);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    // Orders table
    if (req.method === 'GET' && path.endsWith('/orders-table/next-number')) {
      return json(200, { success: true, next_number: await getNextOrderNumber() });
    }

    if (req.method === 'GET' && path.endsWith('/orders-table')) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, orders: (data || []).map(fromOrderRow) });
    }

    if (req.method === 'GET' && /\/orders-table\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const { data, error } = await applyIdFilter(supabase.from('orders').select('*, order_items(*)'), id).single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, order: fromOrderRow(data) });
    }

    if (req.method === 'POST' && path.endsWith('/orders-table')) {
      const body = await req.json();
      const order = body?.order || body;
      const row = toOrderRow(order);

      const existingFilters: Array<[string, any]> = [
        ['trello_card_id', row.trello_card_id],
        ['legacy_id', row.legacy_id],
        ['order_number', row.order_number],
      ];

      for (const [field, value] of existingFilters) {
        if (!value) continue;
        const { data: existing, error: existingError } = await supabase
          .from('orders')
          .select('id')
          .eq(field, value)
          .maybeSingle();
        if (existingError) return json(500, { error: existingError.message });
        if (existing?.id) {
          const updateRow = toOrderUpdateRow(order);
          const { data, error } = await supabase
            .from('orders')
            .update(updateRow)
            .eq('id', existing.id)
            .select('*')
            .single();
          if (error) return json(500, { error: error.message });

          if (Array.isArray(order?.items)) {
            const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', data.id);
            if (deleteError) return json(500, { error: deleteError.message });
            const itemRows = toOrderItemRows(data.id, order);
            if (itemRows.length > 0) {
              const { error: itemError } = await supabase.from('order_items').insert(itemRows);
              if (itemError) return json(500, { error: itemError.message });
            }
          }

          const { data: saved, error: reloadError } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', data.id)
            .single();
          if (reloadError) return json(500, { error: reloadError.message });
          return json(200, { success: true, order: fromOrderRow(saved) });
        }
      }

      const { data, error } = await supabase
        .from('orders')
        .insert(row)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });

      const itemRows = toOrderItemRows(data.id, order);
      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('order_items').insert(itemRows);
        if (itemError) return json(500, { error: itemError.message });
      }

      const { data: saved, error: reloadError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', data.id)
        .single();
      if (reloadError) return json(500, { error: reloadError.message });
      return json(201, { success: true, order: fromOrderRow(saved) });
    }

    if (req.method === 'PUT' && /\/orders-table\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const body = await req.json();
      const updates = body?.updates || body;
      const { data, error } = await applyIdFilter(supabase.from('orders').update(toOrderUpdateRow(updates)), id)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });

      if (Array.isArray(updates?.items)) {
        const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', data.id);
        if (deleteError) return json(500, { error: deleteError.message });
        const itemRows = toOrderItemRows(data.id, updates);
        if (itemRows.length > 0) {
          const { error: itemError } = await supabase.from('order_items').insert(itemRows);
          if (itemError) return json(500, { error: itemError.message });
        }
      }

      const { data: saved, error: reloadError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', data.id)
        .single();
      if (reloadError) return json(500, { error: reloadError.message });
      return json(200, { success: true, order: fromOrderRow(saved) });
    }

    if (req.method === 'DELETE' && /\/orders-table\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const { error } = await applyIdFilter(supabase.from('orders').delete(), id);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    // Work days table
    if (req.method === 'GET' && path.endsWith('/work-days-table/current')) {
      return json(200, { success: true, day: await getCurrentTableWorkDay() });
    }

    if (req.method === 'POST' && path.endsWith('/work-days-table/open')) {
      const body = await req.json();
      const current = await getCurrentTableWorkDay();
      if (current) return json(200, { success: true, day: current });

      const userId = String(body?.userId || '');
      const userName = body?.userName || userId || 'Usuario';
      const openedBy = isUuid(userId) ? userId : null;
      const initialCashBalance = toNumber(body?.initialCashBalance);
      const bills = body?.bills || {};
      const metadata = {
        opened_by: userId,
        opened_by_name: userName,
        business_date: todayKey(),
        bills,
      };

      const { data, error } = await supabase
        .from('work_days')
        .insert({
          day_number: await getNextDayNumberFromTable(),
          status: 'open',
          opened_by: openedBy,
          opened_by_name: userName,
          initial_cash_balance: initialCashBalance,
          metadata,
        })
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });

      await supabase.from('day_starts').upsert({
        work_day_id: data.id,
        business_date: todayKey(),
        opened_by: openedBy,
        opened_by_name: userName,
        total: initialCashBalance,
        bills,
        metadata,
      }, { onConflict: 'business_date' });

      await supabase.from('petty_cash_movements').insert({
        work_day_id: data.id,
        movement_type: 'initial',
        payment_type: 'EFECTIVO',
        amount: initialCashBalance,
        description: 'Saldo inicial de caja chica',
        created_by: openedBy,
        metadata,
      });

      return json(201, { success: true, day: normalizeWorkDayRow(data) });
    }

    if (req.method === 'POST' && /\/work-days-table\/[^/]+\/close$/.test(path)) {
      const parts = path.split('/');
      const dayId = decodeURIComponent(parts[parts.length - 2] || '');
      const body = await req.json();
      const userId = String(body?.userId || '');
      const userName = body?.userName || userId || 'Usuario';
      const closedBy = isUuid(userId) ? userId : null;
      const current = await getCurrentTableWorkDay();

      if (!current) {
        return json(400, { error: 'No hay ningun dia operativo abierto para cerrar' });
      }

      if (current.id !== dayId) {
        return json(400, { error: 'El ID del dia no coincide con el dia operativo abierto' });
      }

      const workDayBusinessDate = getWorkDayBusinessDate(current);
      if (workDayBusinessDate && workDayBusinessDate > todayKey()) {
        return json(400, { error: 'La fecha del dia operativo abierto no es valida para realizar el cierre' });
      }

      // Una jornada anterior pendiente debe poder cerrarse en cualquier momento.
      // La hora limite solo aplica a la jornada abierta durante el dia actual.
      if (workDayBusinessDate === todayKey() && closeWindowIsExpired()) {
        return json(400, { error: 'El cierre vencio. La hora limite es 4:30 p. m. con aplazamiento maximo hasta las 6:30 p. m.' });
      }

      const { data, error } = await supabase
        .from('work_days')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: closedBy,
          closed_by_name: userName,
          final_cash_balance: body?.finalCashBalance ?? null,
          notes: body?.notes || null,
          metadata: {
            ...(current.metadata || {}),
            closed_by: userId,
            closed_by_name: userName,
          },
        })
        .eq('id', dayId)
        .eq('status', 'open')
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, day: normalizeWorkDayRow(data) });
    }

    if (req.method === 'GET' && path.endsWith('/work-days-table/history')) {
      const limit = Number.parseInt(url.searchParams.get('limit') || '30', 10);
      const { data, error } = await supabase
        .from('work_days')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(Number.isFinite(limit) ? limit : 30);

      if (error) return json(500, { error: error.message });
      const days = (data || []).map(normalizeWorkDayRow);
      return json(200, { success: true, history: days, days });
    }

    if (req.method === 'GET' && /\/work-days-table\/[^/]+$/.test(path)) {
      const dayId = decodeURIComponent(path.split('/').pop() || '');
      const { data, error } = await supabase
        .from('work_days')
        .select('*')
        .eq('id', dayId)
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, day: data ? normalizeWorkDayRow(data) : null });
    }

    if (req.method === 'POST' && path.endsWith('/day-reports-table')) {
      const body = await req.json();
      const report = body?.report || {};
      const reportDate = report?.date || todayKey();
      const { data, error } = await supabase
        .from('day_reports')
        .insert({
          work_day_id: isUuid(body?.workDayId) ? body.workDayId : null,
          report_date: reportDate,
          report,
          total_sales: toNumber(report?.financial?.totalSales),
          total_paid: toNumber(report?.financial?.totalPaid),
          total_pending: toNumber(report?.financial?.totalPending),
          orders_count: toNumber(report?.orders?.total),
          quotes_count: toNumber(report?.quotes?.total),
          generated_by: isUuid(body?.generatedBy) ? body.generatedBy : null,
        })
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, report: data });
    }

    if (req.method === 'GET' && /\/day-reports-table\/latest\/[^/]+$/.test(path)) {
      const workDayId = decodeURIComponent(path.split('/').pop() || '');
      const { data, error } = await supabase
        .from('day_reports')
        .select('*')
        .eq('work_day_id', workDayId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, report: data || null });
    }

    if (req.method === 'GET' && path.endsWith('/petty-cash-movements-table')) {
      const workDayId = url.searchParams.get('workDayId');
      let query = supabase
        .from('petty_cash_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (workDayId) query = query.eq('work_day_id', workDayId);
      const { data, error } = await query;
      if (error) return json(500, { error: error.message });
      return json(200, { success: true, movements: data || [] });
    }

    // Activity logs
    if (req.method === 'GET' && path.endsWith('/activity-logs')) {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, logs: data || [] });
    }

    if (req.method === 'POST' && path.endsWith('/activity-logs')) {
      const body = await req.json();
      const log = body?.log || body;
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          legacy_id: log?.legacy_id || log?.id || null,
          user_name: log?.userName || log?.user_name || 'Sistema',
          user_role: log?.userRole || log?.user_role || 'operator',
          action_type: log?.actionType || log?.action_type || 'activity',
          description: log?.description || '',
          details: log?.details || {},
        })
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(201, { success: true, log: data });
    }

    // Trello preferences
    if (req.method === 'GET' && path.endsWith('/trello-preferences')) {
      const { data, error } = await supabase
        .from('trello_preferences')
        .select('*')
        .eq('name', 'default')
        .maybeSingle();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, preferences: data?.preferences || null });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && path.endsWith('/trello-preferences')) {
      const body = await req.json();
      const preferences = body?.preferences || body;
      const { data, error } = await supabase
        .from('trello_preferences')
        .upsert({
          name: 'default',
          board_id: preferences?.boardId || preferences?.board_id || null,
          list_id: preferences?.listId || preferences?.list_id || null,
          list_name: preferences?.listName || preferences?.list_name || null,
          label_ids: toTextArray(preferences?.labelIds || preferences?.label_ids),
          member_ids: toTextArray(preferences?.memberIds || preferences?.member_ids),
          preferences,
        }, { onConflict: 'name' })
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, preferences: data?.preferences || preferences });
    }

    // Quotes table
    if (req.method === 'GET' && path.endsWith('/quotes-table')) {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .order('created_at', { ascending: false });

      if (error) return json(500, { error: error.message });
      return json(200, { success: true, quotes: (data || []).map(fromQuoteRow) });
    }

    if (req.method === 'POST' && path.endsWith('/quotes-table')) {
      const body = await req.json();
      const quote = body?.quote || body;
      const nextQuoteNumber = await getNextQuoteNumber();
      const quoteRow = toQuoteRow(quote, nextQuoteNumber);
      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteRow)
        .select('*')
        .single();

      if (error) return json(500, { error: error.message });

      const itemRows = toQuoteItemRows(data.id, quote);
      if (itemRows.length > 0) {
        const { error: itemError } = await supabase.from('quote_items').insert(itemRows);
        if (itemError) return json(500, { error: itemError.message });
      }

      const { data: saved, error: reloadError } = await supabase
        .from('quotes')
        .select('*, quote_items(*)')
        .eq('id', data.id)
        .single();

      if (reloadError) return json(500, { error: reloadError.message });
      return json(201, { success: true, quote: fromQuoteRow(saved) });
    }

    // Settings (app settings - trello keys, etc)
    if (req.method === 'GET' && path.endsWith('/settings')) {
      const settings = await kvGet('app_settings') || {};
      return json(200, { settings: sanitizeAppSettings(settings), success: true });
    }

    if ((req.method === 'PUT' || req.method === 'POST') && path.endsWith('/settings')) {
      const body = await req.json();
      const current = await kvGet<any>('app_settings') || {};
      const updated = { ...current, ...body, updated_at: new Date().toISOString() };
      await kvSet('app_settings', updated);
      return json(200, { success: true, settings: sanitizeAppSettings(updated) });
    }

    // Company settings
    if (req.method === 'GET' && path.endsWith('/company-settings')) {
      const settings = await kvGet('company_settings');
      return json(200, { settings, success: true });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && path.endsWith('/company-settings')) {
      const body = await req.json();
      const current = await kvGet<any>('company_settings') || {};
      const updated = { ...current, ...body, updated_at: new Date().toISOString() };
      await kvSet('company_settings', updated);
      return json(200, { success: true, settings: updated });
    }

    // Inventory
    if (req.method === 'GET' && (path.endsWith('/inventory') || path.endsWith('/inventory/products'))) {
      const products = await kvGetByPrefix<any>('inventory_product:');
      return json(200, { products, success: true });
    }

    if (req.method === 'POST' && (path.endsWith('/inventory') || path.endsWith('/inventory/products') || path.endsWith('/products'))) {
      const body = await req.json();
      const id = `inventory_product:${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const product = { ...body, id, created_at: body.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
      await kvSet(id, product);
      return json(201, { success: true, product });
    }

    if (req.method === 'PUT' && /\/(inventory\/products|products)\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const updates = await req.json();
      const existing = await kvGet<any>(`inventory_product:${id}`) || await kvGet<any>(id);
      if (!existing) return json(404, { error: 'Producto no encontrado' });
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      const key = String(existing.id || '').startsWith('inventory_product:') ? existing.id : `inventory_product:${id}`;
      await kvSet(key, updated);
      return json(200, { success: true, product: updated });
    }

    if (req.method === 'DELETE' && /\/(inventory|inventory\/products)\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const existing = await kvGet<any>(`inventory_product:${id}`) || await kvGet<any>(id);
      if (!existing) return json(404, { error: 'Producto no encontrado' });
      const key = String(existing.id || '').startsWith('inventory_product:') ? existing.id : `inventory_product:${id}`;
      await kvDel(key);
      return json(200, { success: true });
    }

    // Quotations
    if (req.method === 'GET' && path.endsWith('/quotations')) {
      const quotations = await kvGetByPrefix<any>('quotation:');
      return json(200, { quotations, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/quotations')) {
      const body = await req.json();
      const now = new Date().toISOString();
      const rawId = body.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const key = rawId.startsWith('quotation:') ? rawId : `quotation:${rawId}`;
      const quotation = { ...body, id: rawId, created_at: body.created_at || now, updated_at: now };
      await kvSet(key, quotation);
      return json(201, { success: true, quotation });
    }

    if (req.method === 'DELETE' && /\/quotations\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const key = id.startsWith('quotation:') ? id : `quotation:${id}`;
      await kvDel(key);
      return json(200, { success: true });
    }

    // Correlatives
    if (req.method === 'GET' && /\/correlatives\/[^/]+$/.test(path) && !path.includes('set-number')) {
      const tipo = decodeURIComponent(path.split('/').pop() || '');
      const correlative = await kvGet<any>(`correlative:${tipo}`) || {
        tipo,
        ultimo_numero: 0,
        prefijo: tipo === 'recibo' ? 'R-001' : tipo === 'factura' ? 'F-001' : 'C-001',
        formato: '{prefijo}-{numero}',
        actualizado_el: new Date().toISOString()
      };
      return json(200, { correlativo: correlative, success: true });
    }

    if (req.method === 'POST' && /\/correlatives\/[^/]+\/set-number$/.test(path)) {
      const parts = path.split('/');
      const tipo = parts[parts.length - 2] || '';
      const body = await req.json();
      const current = await kvGet<any>(`correlative:${tipo}`) || { tipo, prefijo: 'R-001', formato: '{prefijo}-{numero}' };
      const updated = { ...current, ultimo_numero: Number(body.start_from) || 0, actualizado_el: new Date().toISOString() };
      await kvSet(`correlative:${tipo}`, updated);
      return json(200, { success: true, correlativo: updated });
    }

    // Documents
    if (req.method === 'GET' && (path.endsWith('/documents') || path.endsWith('/documents/history'))) {
      const tipo = url.searchParams.get('tipo');
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const pedido_id = url.searchParams.get('pedido_id');
      let docs = await kvGetByPrefix<any>('document:');
      if (tipo) docs = docs.filter((d: any) => d.tipo === tipo);
      if (pedido_id) docs = docs.filter((d: any) => d.pedido_id === pedido_id);
      docs = docs
        .sort((a: any, b: any) => new Date(b.fecha_emision || b.created_at || 0).getTime() - new Date(a.fecha_emision || a.created_at || 0).getTime())
        .slice(0, Number.isFinite(limit) ? limit : 50);
      return json(200, { documents: docs, count: docs.length, success: true });
    }

    if (req.method === 'POST' && /\/documents\/[^/]+\/anular$/.test(path)) {
      const parts = path.split('/');
      const docId = parts[parts.length - 2] || '';
      const body = await req.json();
      const doc = await kvGet<any>(`document:${docId}`) || await kvGet<any>(docId);
      if (!doc) return json(404, { error: 'Documento no encontrado' });
      const updated = { ...doc, estado: 'anulado', anulado_el: new Date().toISOString(), motivo_anulacion: body.motivo || '' };
      const key = String(doc.id || '').startsWith('document:') ? doc.id : `document:${docId}`;
      await kvSet(key, updated);
      return json(200, { success: true, document: updated });
    }

    // Templates - generate and validate (before generic templates handler)
    if (req.method === 'POST' && path.endsWith('/templates/generate')) {
      return json(200, { success: true, document: null, message: 'Generacion de documentos en modo basico' });
    }

    if (req.method === 'POST' && path.endsWith('/templates/validate-data')) {
      return json(200, { valid: true, errors: [], success: true });
    }

    if (req.method === 'POST' && /\/templates\/[^/]+\/assign$/.test(path)) {
      return json(200, { success: true });
    }

    if (req.method === 'POST' && /\/templates\/[^/]+\/fields$/.test(path)) {
      const parts = path.split('/');
      const templateId = parts[parts.length - 2] || '';
      const body = await req.json();
      const key = templateId.startsWith('template:') ? templateId : `template:${templateId}`;
      const existing = await kvGet<any>(key) || {};
      const updated = { ...existing, layout: body, updated_at: new Date().toISOString() };
      await kvSet(key, updated);
      return json(200, { success: true, template: updated });
    }

    if (req.method === 'GET' && path.endsWith('/templates')) {
      const type = url.searchParams.get('type');
      const activeParam = url.searchParams.get('active');
      let templates = await kvGetByPrefix<any>('template:');
      if (type) templates = templates.filter((t: any) => t.type === type);
      if (activeParam === 'true') templates = templates.filter((t: any) => t.active !== false);
      return json(200, { templates, success: true });
    }

    if (req.method === 'DELETE' && /\/templates\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const key = id.startsWith('template:') ? id : `template:${id}`;
      await kvDel(key);
      return json(200, { success: true });
    }

    // Orders
    if (req.method === 'GET' && path.endsWith('/orders')) {
      const orders = await kvGetByPrefix<any>('order:');
      return json(200, { orders, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/orders')) {
      const body = await req.json();
      const now = new Date().toISOString();
      const order = { ...body, id: body.id || `${Date.now()}`, created_at: now, updated_at: now };
      await kvSet(`order:${order.id}`, order);
      return json(201, { success: true, order });
    }

    if (req.method === 'GET' && /\/orders\/[^/]+$/.test(path) && !path.includes('/pay') && !path.includes('/payment-status')) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const order = await kvGet<any>(`order:${id}`) || await kvGet<any>(id);
      return json(200, { order, success: true });
    }

    if (req.method === 'PUT' && /\/orders\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const updates = await req.json();
      const existing = await kvGet<any>(`order:${id}`) || {};
      const updated = { ...existing, ...updates, id, updated_at: new Date().toISOString() };
      await kvSet(`order:${id}`, updated);
      return json(200, { success: true, order: updated });
    }

    if (req.method === 'POST' && /\/orders\/[^/]+\/pay$/.test(path)) {
      const parts = path.split('/');
      const orderId = parts[parts.length - 2] || '';
      const body = await req.json();
      const order = await kvGet<any>(`order:${orderId}`) || {};
      const payment = { order_id: orderId, ...body, paid_at: new Date().toISOString(), status: 'paid' };
      await kvSet(`order:${orderId}`, { ...order, status: 'paid', payment });
      await kvSet(`payment:${orderId}`, payment);
      return json(200, { success: true, payment, receipt: null });
    }

    if (req.method === 'GET' && /\/orders\/[^/]+\/payment-status$/.test(path)) {
      const parts = path.split('/');
      const orderId = parts[parts.length - 2] || '';
      const payment = await kvGet<any>(`payment:${orderId}`);
      return json(200, { payment, success: true });
    }

    // Quotes
    if (req.method === 'GET' && path.endsWith('/quotes')) {
      const quotes = await kvGetByPrefix<any>('quote:');
      return json(200, { quotes, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/quotes')) {
      const body = await req.json();
      const now = new Date().toISOString();
      const quote = { ...body, id: body.id || `${Date.now()}`, created_at: now, updated_at: now };
      await kvSet(`quote:${quote.id}`, quote);
      return json(201, { success: true, quote });
    }

    // Fiscal Series
    if (req.method === 'GET' && path.endsWith('/fiscal-series')) {
      const series = await kvGetByPrefix<any>('fiscal_series:');
      return json(200, { fiscalSeries: series, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/fiscal-series')) {
      const body = await req.json();
      const id = `fiscal_series:${Date.now()}`;
      const series = { ...body, id, created_at: new Date().toISOString() };
      await kvSet(id, series);
      return json(201, { success: true, series });
    }

    if (req.method === 'PUT' && /\/fiscal-series\/[^/]+$/.test(path)) {
      const id = decodeURIComponent(path.split('/').pop() || '');
      const updates = await req.json();
      const key = id.startsWith('fiscal_series:') ? id : `fiscal_series:${id}`;
      const existing = await kvGet<any>(key) || {};
      const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
      await kvSet(key, updated);
      return json(200, { success: true, series: updated });
    }

    // Stats / Dashboard
    if (req.method === 'GET' && path.endsWith('/stats/dashboard')) {
      const customers = (await kvGetByPrefix<any>('customer:')).length;
      const orders = (await kvGetByPrefix<any>('order:')).length;
      const products = (await kvGetByPrefix<any>('inventory_product:')).length;
      return json(200, { stats: { orders, customers, products, revenue: 0 }, success: true });
    }

    // Price Config
    if (req.method === 'GET' && path.endsWith('/price-config')) {
      const config = await kvGet('price_config') || {};
      return json(200, { config, success: true });
    }

    if (req.method === 'POST' && path.endsWith('/price-config')) {
      const body = await req.json();
      const config = body.config || body;
      await kvSet('price_config', config);
      return json(200, { success: true, config });
    }

    // Activity logs (stub)
    if (path.includes('/activity-logs')) {
      return json(200, { logs: [], success: true });
    }

    return json(404, { error: 'Ruta no encontrada' });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Error interno' });
  }
});
