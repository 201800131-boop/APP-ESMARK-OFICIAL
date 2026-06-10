import { api } from './api';

type BillingKind = 'emitida' | 'proforma' | 'recibo';

interface BillingProduct {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  descuento: number;
  impuesto: number;
}

interface BillingClient {
  tipo: 'consumidor-final' | 'empresa';
  nombre: string;
  rtn: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface LinkedBillingDocument {
  id: string;
  tipo: BillingKind;
  numeroFactura?: string;
  numeroRecibo?: string;
  clienteNombre: string;
  total: number;
}

export interface BillingCompanyProfile {
  nombreComercial?: string;
  razonSocial?: string;
  rtn?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
  firma?: string;
}

const STORAGE_KEY = 'esmark_facturacion_state_v2';
const SUPABASE_SETTING_KEY = 'facturacion_state';
const SUPABASE_SETTING_DESCRIPTION = 'Estado completo del modulo de facturacion: empresa, logo, firma, datos fiscales, diseno, facturas y recibos';

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getDefaultBillingState() {
  return {
    empresaInfo: {},
    datosFiscales: {
      prefijo: '000-001-01',
      siguienteFactura: '000000001',
    },
    facturas: [],
    recibos: [],
    clientesGuardados: [],
    disenoConfig: {},
    nextInvoiceNumber: 1,
    nextReciboNumber: 1,
    auditoria: [],
  };
}

function calculateTotals(productos: BillingProduct[]) {
  const subtotal = productos.reduce((sum, p) => sum + p.cantidad * p.precio, 0);
  const descuento = productos.reduce((sum, p) => sum + (p.cantidad * p.precio * p.descuento) / 100, 0);
  const impuestos = productos.reduce((sum, p) => {
    const base = p.cantidad * p.precio - (p.cantidad * p.precio * p.descuento) / 100;
    return sum + (base * p.impuesto) / 100;
  }, 0);

  return {
    subtotal,
    descuento,
    impuestos,
    envio: 0,
    total: subtotal - descuento + impuestos,
  };
}

export function buildBillingProductsFromOrderItems(items: any[]): BillingProduct[] {
  return items.map((item, index) => ({
    id: item.id || `order-item-${index + 1}`,
    nombre: item.descripcion || item.product_name || `Producto ${index + 1}`,
    cantidad: Number(item.unidades || 1),
    precio: Number(item.precio_unitario || 0),
    descuento: 0,
    impuesto: 15,
  })).filter((item) => item.nombre.trim() && item.cantidad > 0 && item.precio > 0);
}

async function loadBillingState() {
  try {
    const remote = await api.getAppSetting<any>(SUPABASE_SETTING_KEY, {});
    if (remote && Object.keys(remote).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      return { ...getDefaultBillingState(), ...remote };
    }
  } catch (error) {
    console.warn('No se pudo cargar facturacion desde Supabase:', error);
  }

  return { ...getDefaultBillingState(), ...safeParse<any>(localStorage.getItem(STORAGE_KEY), getDefaultBillingState()) };
}

export async function getBillingCompanyProfile(): Promise<BillingCompanyProfile> {
  const state = await loadBillingState();
  const empresaInfo = state?.empresaInfo;
  return empresaInfo && typeof empresaInfo === 'object' ? empresaInfo : {};
}

async function saveBillingState(state: any) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  try {
    await api.saveAppSetting(SUPABASE_SETTING_KEY, state, SUPABASE_SETTING_DESCRIPTION);
  } catch (error) {
    console.warn('No se pudo guardar facturacion en Supabase. Se conserva copia local.', error);
  }
}

export async function createBillingDocumentFromOrder(params: {
  kind: BillingKind;
  customerName: string;
  customerPhone?: string;
  customerRtn?: string;
  items: any[];
  note?: string;
}): Promise<LinkedBillingDocument> {
  const state = await loadBillingState();
  const productos = buildBillingProductsFromOrderItems(params.items);
  const cliente: BillingClient = {
    tipo: 'consumidor-final',
    nombre: params.customerName || 'Consumidor final',
    rtn: params.customerRtn || '',
    email: '',
    telefono: params.customerPhone || '',
    direccion: '',
  };
  const totals = calculateTotals(productos);
  const id = `${params.kind === 'recibo' ? 'recibo' : 'factura'}:${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const prefijo = state.datosFiscales?.prefijo || '000-001-01';
  const siguiente = String(state.datosFiscales?.siguienteFactura || state.nextInvoiceNumber || 1).padStart(9, '0');
  const numeroFactura = params.kind === 'emitida' ? `${prefijo}-${siguiente}` : undefined;
  const numeroRecibo = params.kind === 'recibo' ? `R-${String(state.nextReciboNumber || 1).padStart(7, '0')}` : undefined;

  if (params.kind === 'recibo') {
    const recibo = {
      id,
      numeroRecibo,
      cliente,
      productos,
      nota: params.note || '',
      fechaCreacion: new Date().toISOString(),
      fechaEmision: new Date().toISOString().split('T')[0],
      metodoPago: 'Pendiente',
      subtotal: totals.subtotal,
      descuento: totals.descuento,
      total: totals.total,
    };

    const nextState = {
      ...state,
      recibos: [...(Array.isArray(state.recibos) ? state.recibos : []), recibo],
      nextReciboNumber: Number(state.nextReciboNumber || 1) + 1,
      auditoria: [
        ...(Array.isArray(state.auditoria) ? state.auditoria : []),
        {
          id: `audit:${Date.now()}`,
          fechaHora: new Date().toISOString(),
          usuario: 'Sistema',
          accion: 'Creacion',
          historialDe: 'Facturas',
          resumenCambios: `Recibo creado desde pedido para ${cliente.nombre}`,
          numeroFactura: numeroRecibo,
          ip: 'local',
        },
      ],
    };

    await saveBillingState(nextState);

    return {
      id,
      tipo: 'recibo',
      numeroRecibo,
      clienteNombre: cliente.nombre,
      total: totals.total,
    };
  }

  const factura = {
    id,
    tipo: params.kind,
    numeroFactura,
    estado: params.kind === 'emitida' ? 'Emitida' : 'Pendiente',
    cliente,
    productos,
    nota: params.note || '',
    fechaCreacion: new Date().toISOString(),
    fechaEmision: new Date().toISOString().split('T')[0],
    ...totals,
  };

  const nextInvoiceNumber = Number(state.nextInvoiceNumber || 1) + (params.kind === 'emitida' ? 1 : 0);
  const nextFiscalNumber = params.kind === 'emitida'
    ? String(Number(state.datosFiscales?.siguienteFactura || 1) + 1).padStart(9, '0')
    : state.datosFiscales?.siguienteFactura;

  const nextState = {
    ...state,
    facturas: [...(Array.isArray(state.facturas) ? state.facturas : []), factura],
    nextInvoiceNumber,
    datosFiscales: {
      ...state.datosFiscales,
      siguienteFactura: nextFiscalNumber,
    },
    clientesGuardados: Array.isArray(state.clientesGuardados)
      ? state.clientesGuardados
      : [],
    auditoria: [
      ...(Array.isArray(state.auditoria) ? state.auditoria : []),
      {
        id: `audit:${Date.now()}`,
        fechaHora: new Date().toISOString(),
        usuario: 'Sistema',
        accion: 'Creacion',
        historialDe: params.kind === 'proforma' ? 'Proformas' : 'Facturas',
        resumenCambios: `${params.kind === 'proforma' ? 'Proforma' : 'Factura'} creada desde pedido para ${cliente.nombre}`,
        numeroFactura,
        ip: 'local',
      },
    ],
  };

  await saveBillingState(nextState);

  return {
    id,
    tipo: params.kind,
    numeroFactura,
    clienteNombre: cliente.nombre,
    total: totals.total,
  };
}
