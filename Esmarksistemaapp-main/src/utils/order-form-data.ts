/**
 * Carga resiliente de datos vigentes para ingreso de pedidos.
 * No carga series fiscales antiguas; la facturacion se maneja en el modulo nuevo.
 */

import { api } from './api';
import { safeParse } from './safe-parse';
import { isSupabaseConfigured } from './supabase/info';
import { extractPriceConfig, getUsablePriceConfig, isPriceConfigConfigured, writeStoredPriceConfig } from './price-config';

export interface OrderFormBootstrap {
  customers: any[];
  products: any[];
  settings: Record<string, unknown>;
  priceConfig: Record<string, unknown>;
  users: any[];
  catalogProducts: any[];
  warnings: string[];
}

function normalizeProduct(product: any) {
  if (!product?.name) return null;
  return {
    ...product,
    code: product.code || 'S/C',
    category: product.category || 'General',
    stock: typeof product.stock === 'number' ? product.stock : Number(product.stock) || 0,
    min_stock: typeof product.min_stock === 'number' ? product.min_stock : Number(product.min_stock) || 0,
    price: typeof product.price === 'number' ? product.price : Number(product.price) || 0,
  };
}

function loadLocalCatalogProducts(): any[] {
  const storedCatalog = localStorage.getItem('esmark_catalog_products');
  const catalogData: any[] = storedCatalog
    ? safeParse(storedCatalog, [])
    : [
        { id: '1', nombre: 'Banner', categoria: 'Impresion', activo: true, created_at: new Date().toISOString() },
        { id: '2', nombre: 'Sticker', categoria: 'Impresion', activo: true, created_at: new Date().toISOString() },
        { id: '3', nombre: 'PVC', categoria: 'Impresion', activo: true, created_at: new Date().toISOString() },
        { id: '4', nombre: 'Carnet', categoria: 'Identificacion', activo: true, created_at: new Date().toISOString() },
        { id: '5', nombre: 'Reconocimiento', categoria: 'Premios', activo: true, created_at: new Date().toISOString() },
        { id: '6', nombre: 'Rotulacion', categoria: 'Servicios', activo: true, manual: true, created_at: new Date().toISOString() },
      ];

  if (!storedCatalog) {
    localStorage.setItem('esmark_catalog_products', JSON.stringify(catalogData));
  }

  return catalogData.filter((product: any) => product.activo !== false);
}

async function loadCatalogProducts(warnings: string[]): Promise<any[]> {
  try {
    const data = await api.getCatalogProducts();
    const list = (data.products || []).filter((product: any) => product.activo !== false && product.active !== false);
    if (list.length) {
      localStorage.setItem('esmark_catalog_products', JSON.stringify(list));
      return list;
    }
  } catch (error: any) {
    const reason = error?.message ? ` (${error.message})` : '';
    warnings.push(`Catalogo por medidas cargado desde respaldo local${reason}.`);
  }

  return loadLocalCatalogProducts();
}

async function loadCustomers(warnings: string[]): Promise<any[]> {
  try {
    const data = await api.getCustomers();
    const list = data.customers || [];
    if (list.length) localStorage.setItem('esmark_customers', JSON.stringify(list));
    return list;
  } catch {
    const local = safeParse(localStorage.getItem('esmark_customers'), []);
    if (local.length) {
      warnings.push('Clientes cargados desde datos guardados.');
      return local;
    }
    warnings.push('No se pudieron cargar clientes. Puedes escribir el nombre manualmente.');
    return [];
  }
}

async function loadProducts(warnings: string[]): Promise<any[]> {
  try {
    const data = await api.getProducts();
    const list = (data.products || []).map(normalizeProduct).filter(Boolean) as any[];
    if (list.length) localStorage.setItem('esmark_products', JSON.stringify(list));
    return list;
  } catch {
    const local = safeParse(localStorage.getItem('esmark_products'), []);
    const list = local.map(normalizeProduct).filter(Boolean) as any[];
    if (list.length) {
      warnings.push('Inventario cargado desde datos guardados.');
      return list;
    }
    warnings.push('Inventario vacio. Agrega productos en Configuracion o sincroniza cuando haya red.');
    return [];
  }
}

async function loadSettings(warnings: string[]): Promise<Record<string, unknown>> {
  try {
    const data = await api.getSettings();
    const settings = data.settings || {};
    if (Object.keys(settings).length) {
      localStorage.setItem('esmark_settings', JSON.stringify(settings));
    }
    return settings;
  } catch {
    const local = safeParse(localStorage.getItem('esmark_settings'), {});
    if (Object.keys(local).length) return local;
    warnings.push('Ajustes generales no disponibles desde el servidor.');
    return {};
  }
}

async function loadPriceConfig(warnings: string[]): Promise<Record<string, unknown>> {
  try {
    const data = await api.getPriceConfig();
    const config = getUsablePriceConfig(extractPriceConfig(data));
    writeStoredPriceConfig(config);
    return config;
  } catch {
    const config = getUsablePriceConfig();
    writeStoredPriceConfig(config);
    if (isPriceConfigConfigured(config)) return config;
    warnings.push('Precios por defecto del catalogo; configuracion de precios no disponible.');
    return {};
  }
}

async function loadUsers(warnings: string[]): Promise<any[]> {
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

  try {
    const data = await api.getUsers();
    const remoteUsers = normalizeUsers(data?.users || []);
    if (remoteUsers.length > 0) return remoteUsers;
  } catch (error: any) {
    const reason = error?.message ? ` (${error.message})` : '';
    warnings.push(`No se pudieron cargar usuarios desde Supabase${reason}.`);
  }

  const localUsers = normalizeUsers(safeParse(localStorage.getItem('esmark_users'), []));
  if (localUsers.length > 0) {
    warnings.push('Usuarios cargados desde respaldo local para autorizaciones.');
    return localUsers;
  }

  warnings.push('Lista de usuarios para autorizaciones vacía. Crea usuarios en Ajustes > Usuarios o revisa la conexión con Supabase.');
  return [];
}

export async function loadOrderFormBootstrap(): Promise<OrderFormBootstrap> {
  const warnings: string[] = [];

  if (!isSupabaseConfigured()) {
    warnings.push('Supabase no esta configurado en .env.local. Se usaran datos guardados en este equipo.');
  }

  const [customers, products, settings, priceConfig, users, catalogProducts] = await Promise.all([
    loadCustomers(warnings),
    loadProducts(warnings),
    loadSettings(warnings),
    loadPriceConfig(warnings),
    loadUsers(warnings),
    loadCatalogProducts(warnings),
  ]);

  return {
    customers,
    products,
    settings,
    priceConfig,
    users,
    catalogProducts,
    warnings,
  };
}
