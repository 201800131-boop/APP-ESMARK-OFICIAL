import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment variables');
}

async function getStoredAccessToken() {
  try {
    localStorage.removeItem('supabase_access_token');
    return null;
  } catch {
    return null;
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  accessToken: getStoredAccessToken,
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: {
      getItem: (key: string) => {
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
});

// Tipos de datos
export interface UserSession {
  id: string;
  username: string;
  role: string;
  name: string;
  login_time: string;
  last_activity: string;
  expires_at: string;
}

export interface TrelloPreferences {
  user_id: string;
  list_id: string;
  label_ids: string[];
  member_ids: string[];
  updated_at: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  category: string;
  brand: string;
  neckline: string;
  price: number;
  cost: number;
  unit: string;
  active: boolean;
  has_variants: boolean;
  sku?: string;
  stock?: number;
  min_stock?: number;
  variants?: any[];
  color_images?: { [key: string]: string };
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  rtn: string;
  phone: string;
  address: string;
  email: string;
  cai: string;
  cai_range_start: string;
  cai_range_end: string;
  cai_expiry_date: string;
  cai_current_number: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  client_name: string;
  client_phone: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Funciones de API para Sesiones
export const sessionAPI = {
  async createSession(username: string, password: string): Promise<UserSession | null> {
    try {
      // Primero verificar credenciales.
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (data.success && data.session) {
        localStorage.setItem('esmark_session', JSON.stringify(data.session));
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  },

  async getCurrentSession(): Promise<UserSession | null> {
    const sessionStr = localStorage.getItem('esmark_session');
    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr);
      
      // Verificar si la sesion ha expirado.
      const expiresAt = new Date(session.expires_at);
      const now = new Date();
      
      if (now > expiresAt) {
        this.clearSession();
        return null;
      }

      // Actualizar ultima actividad.
      session.last_activity = now.toISOString();
      localStorage.setItem('esmark_session', JSON.stringify(session));
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem('esmark_session');
  },

  async logout() {
    this.clearSession();
  },
};

// Funciones de API para Preferencias de Trello
export const trelloPreferencesAPI = {
  async save(userId: string, listId: string, labelIds: string[], memberIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-trello/trello/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        },
        body: JSON.stringify({
          user_id: userId,
          list_id: listId,
          label_ids: labelIds,
          member_ids: memberIds,
        }),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving trello preferences:', error);
      return false;
    }
  },

  async get(userId: string): Promise<TrelloPreferences | null> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-trello/trello/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        },
      });

      const data = await response.json();
      const preferences = data.preferences || null;
      if (!preferences) {
        return null;
      }

      if (preferences.user_id && preferences.user_id !== userId) {
        return null;
      }

      return preferences;
    } catch (error) {
      console.error('Error getting trello preferences:', error);
      return null;
    }
  },
};

// Funciones de API para Inventario
export const inventoryAPI = {
  async saveProduct(product: InventoryProduct): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(product),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving product:', error);
      return false;
    }
  },

  async getAllProducts(): Promise<InventoryProduct[]> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.error('Error getting products:', error);
      return [];
    }
  },

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/inventory/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  },
};

// Funciones de API para configuracion de empresa.
export const companySettingsAPI = {
  async save(settings: Partial<CompanySettings>): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/company-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving company settings:', error);
      return false;
    }
  },

  async get(): Promise<CompanySettings | null> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/company-settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return data.settings || null;
    } catch (error) {
      console.error('Error getting company settings:', error);
      return null;
    }
  },
};

// Funciones de API para Cotizaciones
export const quotationsAPI = {
  async save(quotation: Quotation): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(quotation),
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error saving quotation:', error);
      return false;
    }
  },

  async getAll(): Promise<Quotation[]> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/quotations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return data.quotations || [];
    } catch (error) {
      console.error('Error getting quotations:', error);
      return [];
    }
  },

  async delete(quotationId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/esmark-sync/quotations/${quotationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error deleting quotation:', error);
      return false;
    }
  },
};

