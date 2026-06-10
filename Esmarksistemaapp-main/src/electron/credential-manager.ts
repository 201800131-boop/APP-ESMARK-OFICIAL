/**
 * Credential Manager - Gestión segura de credenciales usando Windows Credential Manager
 */

import * as keytar from 'keytar';
import log from 'electron-log';

const SERVICE_NAME = 'EsmarkSystem';

export interface StoredCredentials {
  supabaseToken?: string;
  trelloToken?: string;
  refreshToken?: string;
}

/**
 * Guarda una credencial de forma segura
 */
export async function saveCredential(key: string, value: string): Promise<boolean> {
  try {
    await keytar.setPassword(SERVICE_NAME, key, value);
    log.info(`[CredentialManager] Credencial guardada: ${key}`);
    return true;
  } catch (error) {
    log.error(`[CredentialManager] Error al guardar credencial ${key}:`, error);
    return false;
  }
}

/**
 * Obtiene una credencial guardada
 */
export async function getCredential(key: string): Promise<string | null> {
  try {
    const value = await keytar.getPassword(SERVICE_NAME, key);
    if (value) {
      log.info(`[CredentialManager] Credencial recuperada: ${key}`);
    } else {
      log.warn(`[CredentialManager] Credencial no encontrada: ${key}`);
    }
    return value;
  } catch (error) {
    log.error(`[CredentialManager] Error al recuperar credencial ${key}:`, error);
    return null;
  }
}

/**
 * Elimina una credencial
 */
export async function deleteCredential(key: string): Promise<boolean> {
  try {
    const deleted = await keytar.deletePassword(SERVICE_NAME, key);
    if (deleted) {
      log.info(`[CredentialManager] Credencial eliminada: ${key}`);
    }
    return deleted;
  } catch (error) {
    log.error(`[CredentialManager] Error al eliminar credencial ${key}:`, error);
    return false;
  }
}

/**
 * Guarda el token de Supabase
 */
export async function saveSupabaseToken(token: string): Promise<boolean> {
  return saveCredential('supabase_token', token);
}

/**
 * Obtiene el token de Supabase
 */
export async function getSupabaseToken(): Promise<string | null> {
  return getCredential('supabase_token');
}

/**
 * Guarda el token de Trello
 */
export async function saveTrelloToken(token: string): Promise<boolean> {
  return saveCredential('trello_token', token);
}

/**
 * Obtiene el token de Trello
 */
export async function getTrelloToken(): Promise<string | null> {
  return getCredential('trello_token');
}

/**
 * Guarda el refresh token
 */
export async function saveRefreshToken(token: string): Promise<boolean> {
  return saveCredential('refresh_token', token);
}

/**
 * Obtiene el refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  return getCredential('refresh_token');
}

/**
 * Limpia todas las credenciales
 */
export async function clearAllCredentials(): Promise<void> {
  try {
    await deleteCredential('supabase_token');
    await deleteCredential('trello_token');
    await deleteCredential('refresh_token');
    log.info('[CredentialManager] Todas las credenciales eliminadas');
  } catch (error) {
    log.error('[CredentialManager] Error al limpiar credenciales:', error);
  }
}

/**
 * Obtiene todas las credenciales almacenadas
 */
export async function getAllCredentials(): Promise<StoredCredentials> {
  const credentials: StoredCredentials = {};
  
  credentials.supabaseToken = await getSupabaseToken() || undefined;
  credentials.trelloToken = await getTrelloToken() || undefined;
  credentials.refreshToken = await getRefreshToken() || undefined;

  return credentials;
}
