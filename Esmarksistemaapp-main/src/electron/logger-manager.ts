/**
 * Logger Manager - Sistema centralizado de logs para EsmarkSystem
 * Guarda logs en %APPDATA%/EsmarkSystem/logs/
 */

import log from 'electron-log';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

const LOG_DIR = path.join(app.getPath('appData'), 'EsmarkSystem', 'logs');

/**
 * Inicializa el sistema de logs
 */
export function initLogger(): void {
  // Crear directorio de logs si no existe
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Configurar electron-log
  log.transports.file.resolvePathFn = () => {
    const date = new Date().toISOString().split('T')[0];
    return path.join(LOG_DIR, `esmark-${date}.log`);
  };

  // Nivel de log
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';

  // Formato de log
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
  log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';

  // Tamaño máximo del archivo (10 MB)
  log.transports.file.maxSize = 10 * 1024 * 1024;

  log.info('==================================================');
  log.info('EsmarkSystem - Sistema de Logs Inicializado');
  log.info(`Versión de la App: ${app.getVersion()}`);
  log.info(`Entorno: ${app.isPackaged ? 'Producción' : 'Desarrollo'}`);
  log.info(`Ruta de logs: ${LOG_DIR}`);
  log.info('==================================================');
}

/**
 * Log de información general
 */
export function logInfo(message: string, ...args: any[]): void {
  log.info(message, ...args);
}

/**
 * Log de advertencias
 */
export function logWarn(message: string, ...args: any[]): void {
  log.warn(message, ...args);
}

/**
 * Log de errores
 */
export function logError(message: string, error?: any): void {
  if (error) {
    log.error(message, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...error
    });
  } else {
    log.error(message);
  }
}

/**
 * Log de debug (solo en desarrollo)
 */
export function logDebug(message: string, ...args: any[]): void {
  log.debug(message, ...args);
}

/**
 * Log de errores de red
 */
export function logNetworkError(context: string, error: any): void {
  log.error(`[Network Error - ${context}]`, {
    message: error.message,
    code: error.code,
    status: error.status,
    url: error.url,
    stack: error.stack
  });
}

/**
 * Log de errores de Supabase
 */
export function logSupabaseError(operation: string, error: any): void {
  log.error(`[Supabase Error - ${operation}]`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    stack: error.stack
  });
}

/**
 * Log de errores de Trello
 */
export function logTrelloError(operation: string, error: any): void {
  log.error(`[Trello Error - ${operation}]`, {
    message: error.message,
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    stack: error.stack
  });
}

/**
 * Log de generación de PDFs
 */
export function logPDFGeneration(action: string, details: any): void {
  log.info(`[PDF] ${action}`, details);
}

/**
 * Log de errores de PDF
 */
export function logPDFError(action: string, error: any): void {
  log.error(`[PDF Error - ${action}]`, {
    message: error.message,
    stack: error.stack
  });
}

/**
 * Obtiene la ruta del directorio de logs
 */
export function getLogDir(): string {
  return LOG_DIR;
}

/**
 * Obtiene la lista de archivos de log
 */
export function getLogFiles(): string[] {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return [];
    }
    return fs.readdirSync(LOG_DIR)
      .filter(file => file.endsWith('.log'))
      .sort()
      .reverse(); // Más recientes primero
  } catch (error) {
    log.error('[Logger] Error al listar archivos de log:', error);
    return [];
  }
}

/**
 * Lee el contenido de un archivo de log
 */
export function readLogFile(filename: string): string | null {
  try {
    const filePath = path.join(LOG_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    log.error(`[Logger] Error al leer archivo de log ${filename}:`, error);
    return null;
  }
}

/**
 * Limpia logs antiguos (más de 30 días)
 */
export function cleanOldLogs(daysToKeep: number = 30): number {
  try {
    const files = getLogFiles();
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
    let deleted = 0;

    files.forEach(file => {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        deleted++;
        log.info(`[Logger] Log antiguo eliminado: ${file}`);
      }
    });

    return deleted;
  } catch (error) {
    log.error('[Logger] Error al limpiar logs antiguos:', error);
    return 0;
  }
}

/**
 * Exporta todos los logs recientes a un archivo único
 */
export function exportLogs(outputPath: string, days: number = 7): boolean {
  try {
    const files = getLogFiles().slice(0, days);
    let content = '';

    files.forEach(file => {
      content += `\n${'='.repeat(80)}\n`;
      content += `Archivo: ${file}\n`;
      content += `${'='.repeat(80)}\n`;
      const fileContent = readLogFile(file);
      if (fileContent) {
        content += fileContent;
      }
      content += '\n';
    });

    fs.writeFileSync(outputPath, content, 'utf-8');
    log.info(`[Logger] Logs exportados a: ${outputPath}`);
    return true;
  } catch (error) {
    log.error('[Logger] Error al exportar logs:', error);
    return false;
  }
}

export default log;
