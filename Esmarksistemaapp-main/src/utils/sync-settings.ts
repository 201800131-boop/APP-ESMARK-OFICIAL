/**
 * 🔄 SINCRONIZACIÓN AUTOMÁTICA DE SETTINGS
 * 
 * Esta utilidad asegura que los settings estén sincronizados
 * entre localStorage (frontend) y Supabase KV (backend)
 */

import { projectId, publicAnonKey } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-sync`;

/**
 * Sincronizar settings de localStorage al servidor
 */
export async function syncSettingsToServer(): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener settings de localStorage
    const settingsStr = localStorage.getItem('esmark_settings');
    if (!settingsStr) {
      // No es un error - simplemente no hay settings todavía
      console.log('ℹ️ No hay settings configurados aún');
      return { success: true }; // ✅ Retornar success: true porque no es un error
    }
    
    console.log('🔄 Sincronizando settings al servidor...');
    
    const settings = JSON.parse(settingsStr);
    console.log('📊 Settings a sincronizar:', {
      hasTrelloKey: !!settings.trello_api_key,
      hasTrelloToken: !!settings.trello_token,
      hasBoardId: !!settings.trello_board_id
    });
    
    // Enviar al servidor
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    console.log('✅ Settings sincronizados correctamente al servidor');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sincronizando settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Guardar settings tanto en localStorage como en el servidor
 */
export async function saveSettings(settings: any): Promise<{ success: boolean; error?: string }> {
  try {
    // Guardar en localStorage
    const currentSettings = JSON.parse(localStorage.getItem('esmark_settings') || '{}');
    const updatedSettings = { ...currentSettings, ...settings };
    localStorage.setItem('esmark_settings', JSON.stringify(updatedSettings));
    console.log('✅ Settings guardados en localStorage');
    
    // Sincronizar al servidor
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSettings)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ Error guardando en servidor:', errorData.error);
      // No fallar si el servidor falla - al menos tenemos localStorage
      return { success: true };
    }
    
    console.log('✅ Settings guardados en servidor');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error guardando settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener settings del servidor y actualizar localStorage
 */
export async function getSettingsFromServer(): Promise<{ success: boolean; settings?: any; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}`);
    }
    
    const { settings } = await response.json();
    
    // Actualizar localStorage si hay settings en el servidor
    if (settings && Object.keys(settings).length > 0) {
      localStorage.setItem('esmark_settings', JSON.stringify(settings));
      console.log('✅ Settings obtenidos del servidor y guardados en localStorage');
    }
    
    return { success: true, settings };
  } catch (error: any) {
    console.error('❌ Error obteniendo settings del servidor:', error);
    return { success: false, error: error.message };
  }
}
