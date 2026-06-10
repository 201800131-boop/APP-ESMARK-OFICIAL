import { projectId, publicAnonKey } from './supabase/info';
import { clearAuthSession, readStoredUser } from './auth-session';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;
const TRELLO_API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-trello`;
const SYNC_API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toNumber(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOrderNumber(value: any) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
}

function toTextArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function isUuid(value: any) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function toDate(value: any) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
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

function toQuoteNumber(value: any) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
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

function formatAuditMoney(value: any) {
  const amount = toNumber(value);
  return `L ${amount.toFixed(2)}`;
}

function getOrderAuditNumber(order: any) {
  return order?.number || order?.order_number || order?.numero || order?.legacy_id || order?.id || 'N/A';
}

function getCustomerAuditName(record: any) {
  return record?.customer_name || record?.customerName || record?.client_name || record?.cliente?.nombre || record?.cliente || 'Cliente sin nombre';
}

function getProductAuditName(product: any) {
  return product?.name || product?.nombre || product?.description || product?.descripcion || product?.sku || product?.codigo || 'Producto sin nombre';
}

function getProductAuditCode(product: any) {
  return product?.sku || product?.code || product?.codigo || product?.legacy_id || product?.id || 'N/A';
}

function getQuoteAuditNumber(quote: any) {
  return quote?.number || quote?.quote_number || quote?.numero || quote?.legacy_id || quote?.id || 'N/A';
}

class APIClient {
  private token: string | null = null;

  private getAuditUser() {
    const storedUser = readStoredUser();
    return {
      userName: storedUser?.name || storedUser?.username || 'Sistema',
      userRole: storedUser?.role || 'operator',
    };
  }

  private async logAudit(actionType: string, description: string, details: Record<string, any> = {}) {
    try {
      await this.createActivityLog({
        ...this.getAuditUser(),
        actionType,
        description,
        details: {
          ...details,
          'Fecha y Hora': new Date().toLocaleString('es-HN'),
        },
      });
    } catch (error) {
      console.warn('No se pudo registrar actividad:', error);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    localStorage.removeItem('auth_token');
  }

  getToken() {
    return publicAnonKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = 'Error desconocido';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          // Si no se puede parsear el JSON, usar el status text
          const textError = await response.text().catch(() => '');
          errorMessage = textError || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Silenciar errores esperados que tienen fallback a localStorage o manejo especifico
      const silentEndpoints = [
        '/users', 
        '/activity-logs',
        '/trello/members',
        '/trello/labels', 
        '/trello/lists',
        '/trello/sync-orders', //  Ssincronizacion con Trello (puede fallar si no esta configurado)
        '/inventory/products' // Tiene fallback a localStorage
      ];
      const shouldSilence = silentEndpoints.some(ep => endpoint.startsWith(ep));
      
      if (!shouldSilence) {
        console.error(`API Error [${endpoint}]:`, error);
      }
      throw error;
    }
  }

  private async requestTrello(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      ...options.headers,
    };

    const response = await fetch(`${TRELLO_API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Error desconocido';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        const textError = await response.text().catch(() => '');
        errorMessage = textError || `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  private async requestSync(endpoint: string, options: RequestInit = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
      ...options.headers,
    };

    const response = await fetch(`${SYNC_API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = 'Error desconocido';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        const textError = await response.text().catch(() => '');
        errorMessage = textError || `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async signin(username: string, password: string) {
    const data = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  logout() {
    this.setToken(null);
    clearAuthSession();
  }

  // Customers
  async getCustomers() {
    return this.request('/customers-table');
  }

  async createCustomer(customer: any) {
    return this.request('/customers-table', {
      method: 'POST',
      body: JSON.stringify({ customer }),
    });
  }

  // Products
  async getInventoryProducts() {
    return this.request('/products-table');
  }

  // Alias para compatibilidad
  async getProducts() {
    return this.getInventoryProducts();
  }

  async createProduct(product: any) {
    const result = await this.request('/products-table', {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
    const savedProduct = result?.product || product;
    await this.logAudit(
      'producto_creado',
      `Producto "${getProductAuditName(savedProduct)}" agregado al inventario`,
      {
        Producto: getProductAuditName(savedProduct),
        Codigo: getProductAuditCode(savedProduct),
        Categoria: savedProduct?.category || savedProduct?.categoria || 'N/A',
        Stock: toNumber(savedProduct?.stock),
      }
    );
    return result;
  }

  async updateProduct(id: string, updates: any) {
    const result = await this.request(`/products-table/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    const savedProduct = result?.product || { ...updates, id };
    await this.logAudit(
      'producto_editado',
      `Producto "${getProductAuditName(savedProduct)}" actualizado en inventario`,
      {
        Producto: getProductAuditName(savedProduct),
        Codigo: getProductAuditCode(savedProduct),
        Stock: toNumber(savedProduct?.stock ?? updates?.stock),
        Cambios: Object.keys(updates || {}).join(', ') || 'Actualizacion',
      }
    );
    return result;
  }

  async deleteProduct(id: string) {
    let productToDelete: any = null;
    try {
      const productsResult = await this.getInventoryProducts();
      productToDelete = (productsResult?.products || []).find((product: any) => String(product?.id) === String(id));
    } catch {
      productToDelete = null;
    }

    const result = await this.request(`/products-table/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await this.logAudit(
      'producto_eliminado',
      `Producto "${getProductAuditName(productToDelete)}" eliminado del inventario`,
      {
        Producto: getProductAuditName(productToDelete),
        Codigo: getProductAuditCode(productToDelete),
        ProductoId: id,
      }
    );
    return result;
  }

  // Catalog products for measured/order services
  async getCatalogProducts() {
    return this.request('/catalog-products');
  }

  async createCatalogProduct(product: any) {
    return this.request('/catalog-products', {
      method: 'POST',
      body: JSON.stringify({ product }),
    });
  }

  async updateCatalogProduct(id: string, updates: any) {
    return this.request(`/catalog-products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async deleteCatalogProduct(id: string) {
    return this.request(`/catalog-products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async upsertCatalogProducts(products: any[]) {
    return this.request('/catalog-products', {
      method: 'POST',
      body: JSON.stringify({ products }),
    });
  }

  // Product/service packages
  async getProductPackages() {
    return this.request('/product-packages');
  }

  async saveProductPackages(packages: any[]) {
    if (!Array.isArray(packages) || packages.length === 0) {
      await this.request('/product-packages', {
        method: 'POST',
        body: JSON.stringify({ packages: [] }),
      });
      await this.saveAppSetting('product_packages', [], 'Paquetes y listas de precios de servicios/productos');
      return { packages: [] };
    }

    const result = await this.request('/product-packages', {
      method: 'POST',
      body: JSON.stringify({ packages }),
    });
    const normalized = result?.packages || [];
    await this.saveAppSetting('product_packages', normalized, 'Paquetes y listas de precios de servicios/productos');
    return { packages: normalized };
  }

  // Orders
  async getOrders() {
    return this.request('/orders-table');
  }

  async getOrder(id: string) {
    return this.request(`/orders-table/${encodeURIComponent(id)}`);
  }

  async createOrder(order: any) {
    const result = await this.request('/orders-table', {
      method: 'POST',
      body: JSON.stringify({ order }),
    });
    const savedOrder = result?.order || order;
    const isQuote = savedOrder?.status === 'COTIZACIÓN' || savedOrder?.status === 'COTIZACION';
    await this.logAudit(
      isQuote ? 'cotizacion_creada' : 'pedido_creado',
      `${isQuote ? 'Cotizacion' : 'Pedido'} #${getOrderAuditNumber(savedOrder)} creado para ${getCustomerAuditName(savedOrder)}`,
      {
        Numero: getOrderAuditNumber(savedOrder),
        Cliente: getCustomerAuditName(savedOrder),
        Estado: savedOrder?.status || 'PENDIENTE',
        Total: formatAuditMoney(savedOrder?.total),
        Origen: savedOrder?.source || 'manual',
      }
    );
    return result;
  }

  async upsertOrder(order: any) {
    const result = await this.request('/orders-table', {
      method: 'POST',
      body: JSON.stringify({ order }),
    });
    const savedOrder = result?.order || order;
    await this.logAudit(
      'pedido_editado',
      `Pedido #${getOrderAuditNumber(savedOrder)} guardado/actualizado`,
      {
        Numero: getOrderAuditNumber(savedOrder),
        Cliente: getCustomerAuditName(savedOrder),
        Estado: savedOrder?.status || 'PENDIENTE',
        Total: formatAuditMoney(savedOrder?.total),
      }
    );
    return result;
  }

  async updateOrder(id: string, updates: any) {
    const result = await this.request(`/orders-table/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    const savedOrder = result?.order || { ...updates, id };
    const changedKeys = Object.keys(updates || {});
    await this.logAudit(
      changedKeys.includes('status') ? 'pedido_estado' : 'pedido_editado',
      changedKeys.includes('status')
        ? `Estado de pedido #${getOrderAuditNumber(savedOrder)} actualizado a ${savedOrder?.status || updates?.status}`
        : `Pedido #${getOrderAuditNumber(savedOrder)} actualizado`,
      {
        Numero: getOrderAuditNumber(savedOrder),
        Cliente: getCustomerAuditName(savedOrder),
        Estado: savedOrder?.status || updates?.status || 'N/A',
        Cambios: changedKeys.join(', ') || 'Actualizacion',
      }
    );
    return result;
  }

  async deleteOrder(id: string) {
    let orderToDelete: any = null;
    try {
      const orderResult = await this.getOrder(id);
      orderToDelete = orderResult?.order || null;
    } catch {
      orderToDelete = null;
    }

    const result = await this.request(`/orders-table/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await this.logAudit(
      'pedido_eliminado',
      `Pedido #${getOrderAuditNumber(orderToDelete || { id })} eliminado`,
      {
        Numero: getOrderAuditNumber(orderToDelete || { id }),
        Cliente: getCustomerAuditName(orderToDelete),
        PedidoId: id,
      }
    );
    return result;
  }

  // Quotes
  async getQuotes() {
    return this.request('/quotes-table');
  }

  async createQuote(quote: any) {
    const result = await this.request('/quotes-table', {
      method: 'POST',
      body: JSON.stringify({ quote }),
    });
    const savedQuote = result?.quote || quote;
    await this.logAudit(
      'cotizacion_creada',
      `Cotizacion #${getQuoteAuditNumber(savedQuote)} creada para ${getCustomerAuditName(savedQuote)}`,
      {
        Numero: getQuoteAuditNumber(savedQuote),
        Cliente: getCustomerAuditName(savedQuote),
        Estado: savedQuote?.status || savedQuote?.estado || 'PENDIENTE',
        Total: formatAuditMoney(savedQuote?.total),
      }
    );
    return result;
  }

  // Settings
  async getSettings() {
    const value = await this.getAppSetting('company', {});
    return { settings: value || {} };
  }

  async updateSettings(settings: any) {
    const value = await this.saveAppSetting('company', settings, 'Datos de empresa');
    return { settings: value || settings };
  }

  // Dashboard stats
  async getDashboardStats() {
    return this.request('/stats/dashboard');
  }

  // Price Configuration
  async getPriceConfig() {
    const value = await this.getAppSetting('price_config', {});
    return { config: value || {} };
  }

  async savePriceConfig(config: any) {
    const value = await this.saveAppSetting('price_config', config, 'Configuracion de calculadora de precios');
    return { config: value || config };
  }

  async getAppSetting<T = any>(key: string, fallback: T): Promise<T> {
    const encodedFallback = encodeURIComponent(JSON.stringify(fallback));
    const result = await this.request(`/app-settings/${encodeURIComponent(key)}?fallback=${encodedFallback}`);
    return (result?.value as T) ?? fallback;
  }

  async saveAppSetting<T = any>(key: string, value: T, description = 'Configuracion de la app'): Promise<T> {
    const result = await this.request(`/app-settings/${encodeURIComponent(key)}`, {
      method: 'POST',
      body: JSON.stringify({ value, description }),
    });
    return (result?.value as T) ?? value;
  }

  async getDiscountRequests() {
    return this.request('/discount-requests');
  }

  async createDiscountRequest(request: any) {
    const result = await this.request('/discount-requests', {
      method: 'POST',
      body: JSON.stringify({ request }),
    });
    const savedRequest = result?.request || request;
    await this.logAudit('discount_requested', 'Solicitud de autorizacion de descuento registrada', {
      Estado: savedRequest?.status || request?.status || 'pending',
      SolicitadoPor: savedRequest?.requested_by_name || request?.operator?.name || 'N/A',
      Monto: formatAuditMoney(savedRequest?.discountAmount ?? savedRequest?.discount_amount ?? request?.discountAmount),
      Motivo: savedRequest?.reason || request?.reason || 'N/A',
    });
    return result;
  }

  async updateDiscountRequest(id: string, updates: any) {
    const result = await this.request(`/discount-requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    const savedRequest = result?.request || updates;
    await this.logAudit(
      savedRequest?.status === 'approved' || updates?.status === 'approved' ? 'discount_authorized' : 'configuracion',
      savedRequest?.status === 'approved' || updates?.status === 'approved'
        ? `Descuento autorizado por ${savedRequest?.authorizedBy?.name || savedRequest?.approved_by_name || updates?.authorizedBy?.name || 'Usuario autorizado'}`
        : 'Solicitud de autorizacion actualizada',
      {
        SolicitudId: id,
        Estado: savedRequest?.status || updates?.status || 'N/A',
        AutorizadoPor: savedRequest?.authorizedBy?.name || savedRequest?.approved_by_name || updates?.authorizedBy?.name || 'N/A',
        Monto: formatAuditMoney(savedRequest?.discountAmount ?? savedRequest?.discount_amount ?? updates?.discountAmount),
        Motivo: savedRequest?.reason || updates?.reason || 'N/A',
      }
    );
    return result;
  }

  // File upload
  async uploadFile(file: File, folder: string = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al subir archivo');
    }

    return await response.json();
  }

  // Trello
  async createTrelloCard(cardData: any) {
    return this.requestTrello('/trello/create-card', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  async getTrelloLabels(boardId: string) {
    return this.requestTrello(`/trello/labels/${boardId}`);
  }

  async getTrelloMembers(boardId: string) {
    return this.requestTrello(`/trello/members/${boardId}`);
  }

  async getTrelloLists(boardId: string) {
    return this.requestTrello(`/trello/lists/${boardId}`);
  }

  async getTrelloCards(listId?: string) {
    const endpoint = listId 
      ? `/trello/cards?listId=${listId}` 
      : '/trello/cards';
    return this.requestTrello(endpoint);
  }

  async syncTrelloOrders(existingCardIds: string[] = []) {
    return this.requestTrello('/trello/sync-orders', {
      method: 'POST',
      body: JSON.stringify({ existingCardIds }),
    });
  }

  async getTrelloCardDetails(cardId: string) {
    return this.requestTrello(`/trello/card/${cardId}`);
  }

  async updateOrderFromTrelloCard(orderId: string, cardId: string) {
    return this.requestTrello('/trello/update-order-from-card', {
      method: 'POST',
      body: JSON.stringify({ orderId, cardId }),
    });
  }

  // Day Start
  async getDayStart(date: string) {
    return this.requestSync(`/day-start/${encodeURIComponent(date)}`);
  }

  async createDayStart(dayStart: any) {
    return this.requestSync('/day-start', {
      method: 'POST',
      body: JSON.stringify(dayStart),
    });
  }

  // Users Management
  async getUsers() {
    const normalizeUsers = (list: any[]) =>
      (Array.isArray(list) ? list : [])
        .filter((candidate) => candidate && (candidate.id || candidate.username))
        .map((candidate) => ({
          ...candidate,
          id: String(candidate.id || candidate.legacy_id || candidate.username),
          username: candidate.username || candidate.user_name || String(candidate.id || ''),
          name: candidate.name || candidate.full_name || candidate.username || 'Usuario',
          role: candidate.role === 'admin' ? 'admin' : 'operator',
          can_authorize_discounts: Boolean(candidate.can_authorize_discounts),
          created_at: candidate.created_at || new Date().toISOString(),
        }));

    let requestError: any = null;

    try {
      const result = await this.request('/users');
      return { ...result, users: normalizeUsers(result?.users || []) };
    } catch (error) {
      requestError = error;
    }

    // Fallback 1: intentar endpoint con anon key (evita fallar por token local vencido)
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          apikey: publicAnonKey,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return { ...data, users: normalizeUsers(data?.users || []) };
      }
    } catch (fallbackError) {
      console.warn('Fallback anon para /users falló:', fallbackError);
    }

    throw requestError || new Error('No se pudieron cargar usuarios');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, updates: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteUser(id: string, userHint: any = {}) {
    return this.request(`/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ user_hint: userHint }),
    });
  }

  // Activity Logs
  async getActivityLogs() {
    return this.request('/activity-logs');
  }

  async createActivityLog(log: any) {
    return this.request('/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ log }),
    });
  }
  // Trello Preferences (NNUEVO - Guardar en Supabase)
  async saveTrelloPreferences(preferences: any) {
    return this.request('/trello-preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences }),
    });
  }

  async getTrelloPreferences() {
    return this.request('/trello-preferences');
  }
  // Inventory (NNUEVO - Guardar productos en Supabase)
  async saveInventoryProducts(products: any[]) {
    throw new Error('La sincronizacion masiva de inventario fue deshabilitada. Usa createProduct, updateProduct y deleteProduct.');
  }

  // NOTA: Eliminada definicion duplicada de getInventoryProducts que estaba aque

  // ==================== DOCUMENTOS (NNUEVO SISTEMA) ====================
  
  /**
   * Generar documento (factura, recibo, cotizacion) usando el sistema de correlativos del backend
   */
  async generateDocument(documentData: {
    tipo: 'factura' | 'recibo' | 'cotizacion';
    cliente_nombre: string;
    cliente_rtn?: string;
    cliente_direccion?: string;
    cliente_telefono?: string;
    subtotal: number;
    impuesto?: number;
    descuento?: number;
    total: number;
    items?: Array<{
      descripcion: string;
      cantidad: number;
      precio_unitario: number;
      total: number;
    }>;
    fecha_vencimiento?: string;
    plantilla_id?: string;
    generado_por: string;
    generado_por_nombre?: string;
    pedido_id?: string;
    caja_chica_id?: string;
    notas?: string;
    datos_extra?: Record<string, any>;
  }) {
    console.log(`enerando ${documentData.tipo} en backend...`);
    
    try {
      const result = await this.request('/documents/generate', {
        method: 'POST',
        body: JSON.stringify(documentData),
      });
      
      console.log(` ${documentData.tipo} generado:`, result.correlativo);
      return result;
      
    } catch (error: any) {
      console.error(` Error generando ${documentData.tipo}:`, error);
      throw error;
    }
  }

  /**
   * Listar documentos con filtros
   */
  async listDocuments(filters?: {
    tipo?: 'factura' | 'recibo' | 'cotizacion';
    estado?: 'activo' | 'anulado' | 'pagado' | 'vencido';
    fecha_desde?: string;
    fecha_hasta?: string;
    pedido_id?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    return this.request(`/documents${queryString ? '?' + queryString : ''}`);
  }

  /**
   * Obtener un documento especifico
   */
  async getDocument(documentId: string) {
    return this.request(`/documents/${documentId}`);
  }

  /**
   * Anular un documento
   */
  async anularDocument(documentId: string, motivo: string, anulado_por: string) {
    return this.request(`/documents/${documentId}/anular`, {
      method: 'POST',
      body: JSON.stringify({ motivo, anulado_por }),
    });
  }

  /**
   * Obtener estadisticas de documentos
   */
  async getDocumentStats() {
    return this.request('/documents/stats');
  }

  /**
   * Obtener estado de correlativos
   */
  async getCorrelativeStatus(tipo?: 'factura' | 'recibo' | 'cotizacion') {
    const params = tipo ? `?tipo=${tipo}` : '';
    return this.request(`/correlativos/status${params}`);
  }

  /**
   * Obtener todos los correlativos (para panel de administracion)
   */
  async getAllCorrelatives() {
    return this.request('/correlativos');
  }

  /**
   * Reiniciar correlativo a un numero especifico
   */
  async resetCorrelative(tipo: 'factura' | 'recibo' | 'cotizacion', startFrom: number, userId: string) {
    return this.request(`/correlativos/${tipo}/set-number`, {
      method: 'POST',
      body: JSON.stringify({ start_from: startFrom, user_id: userId }),
    });
  }

  /**
   * Diagnostico: Detectar correlativos duplicados
   */
  async detectDuplicateCorrelatives(tipo?: 'factura' | 'recibo' | 'cotizacion') {
    const params = tipo ? `?tipo=${tipo}` : '';
    return this.request(`/documents/diagnostics/duplicates${params}`);
  }
}

export const api = new APIClient();

// Helper functions para registrar actividad facilmente
export async function logActivity(
  actionType: string,
  description: string,
  details?: any
) {
  try {
    const user = readStoredUser();
    
    await api.createActivityLog({
      userName: user?.name || user?.username || 'Sistema',
      userRole: user?.role || 'operator',
      actionType,
      description,
      details: details || {},
    });
  } catch (error) {
    // Silenciar error si no se puede registrar actividad
    console.log(' No se pudo registrar actividad (offline)');
  }
}

// Funciones especificas de actividad
export const getActivityLogs = () => api.getActivityLogs();
export const createActivityLog = (log: any) => api.createActivityLog(log);


