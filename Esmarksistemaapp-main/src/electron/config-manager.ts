/**
 * Config Manager - Gestión de configuración segura para EsmarkSystem
 * Maneja config.json en %APPDATA%/EsmarkSystem/
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';

export interface AppConfig {
  env: 'production' | 'development';
  companyId: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  trello: {
    mode: 'via_api' | 'direct';
    boardId: string;
    apiBase: string;
  };
  device: {
    name: string;
    createdAt: string;
  };
}

const CONFIG_DIR = path.join(app.getPath('appData'), 'EsmarkSystem');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Verifica si existe el archivo de configuración
 */
export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Lee la configuración desde el archivo
 */
export function loadConfig(): AppConfig | null {
  try {
    if (!configExists()) {
      log.warn('[ConfigManager] config.json no existe');
      return null;
    }

    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(data) as AppConfig;
    
    // Validar estructura básica
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      log.error('[ConfigManager] config.json inválido: faltan credenciales de Supabase');
      return null;
    }

    log.info('[ConfigManager] Configuración cargada correctamente');
    return config;
  } catch (error) {
    log.error('[ConfigManager] Error al leer config.json:', error);
    return null;
  }
}

/**
 * Guarda la configuración en el archivo
 */
export function saveConfig(config: AppConfig): boolean {
  try {
    // Crear directorio si no existe
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      log.info('[ConfigManager] Directorio de configuración creado:', CONFIG_DIR);
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    log.info('[ConfigManager] Configuración guardada correctamente');
    return true;
  } catch (error) {
    log.error('[ConfigManager] Error al guardar config.json:', error);
    return false;
  }
}

/**
 * Actualiza parcialmente la configuración
 */
export function updateConfig(updates: Partial<AppConfig>): boolean {
  try {
    const current = loadConfig();
    if (!current) {
      log.error('[ConfigManager] No se puede actualizar: config.json no existe');
      return false;
    }

    const updated = { ...current, ...updates };
    return saveConfig(updated);
  } catch (error) {
    log.error('[ConfigManager] Error al actualizar configuración:', error);
    return false;
  }
}

/**
 * Obtiene la ruta del directorio de configuración
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Obtiene la ruta del archivo de configuración
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Valida que la configuración tenga todos los campos requeridos
 */
export function validateConfig(config: AppConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.env) errors.push('Campo "env" requerido');
  if (!config.companyId) errors.push('Campo "companyId" requerido');
  if (!config.supabaseUrl) errors.push('Campo "supabaseUrl" requerido');
  if (!config.supabaseAnonKey) errors.push('Campo "supabaseAnonKey" requerido');
  
  if (!config.trello) {
    errors.push('Objeto "trello" requerido');
  } else {
    if (!config.trello.mode) errors.push('Campo "trello.mode" requerido');
    if (!config.trello.boardId) errors.push('Campo "trello.boardId" requerido');
    if (!config.trello.apiBase) errors.push('Campo "trello.apiBase" requerido');
  }

  if (!config.device) {
    errors.push('Objeto "device" requerido');
  } else {
    if (!config.device.name) errors.push('Campo "device.name" requerido');
    if (!config.device.createdAt) errors.push('Campo "device.createdAt" requerido');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
