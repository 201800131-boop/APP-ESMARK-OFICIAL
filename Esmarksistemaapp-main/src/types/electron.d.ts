// Type definitions for Electron integration

/**
 * Configuración de la aplicación guardada en config.json
 */
export interface AppConfig {
  // Configuración de Supabase
  supabaseUrl: string;
  supabaseKey: string;

  // Configuración de Trello
  trelloApiKey: string;
  trelloToken: string;
  trelloBoardId: string;

  // Información del dispositivo/tienda
  deviceName: string;
  storeName: string;
  storeAddress?: string;

  // Metadatos
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * API de Electron expuesta al renderer process
 */
export interface ElectronAPI {
  // Información de la aplicación
  getAppVersion: () => Promise<string>;
  getAppPath: () => Promise<string>;

  // Operaciones de sistema
  openUserData: () => Promise<void>;

  // Exportar archivos
  exportFile: (data: any, filename: string) => Promise<{
    success: boolean;
    path?: string;
  }>;

  // Configuración
  configExists: () => Promise<boolean>;
  configLoad: () => Promise<AppConfig | null>;
  configSave: (config: AppConfig) => Promise<{
    success: boolean;
    error?: string;
  }>;
  saveConfig: (config: AppConfig) => Promise<{
    success: boolean;
    error?: string;
  }>; // Alias legacy

  // Logging
  log: (message: string) => void;

  // Información de plataforma
  platform: string;
  isElectron: boolean;
}

/**
 * API de actualizaciones
 */
export interface UpdatesAPI {
  onStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  check: () => Promise<UpdateCheckResult>;
  install: () => Promise<void>;
}

/**
 * Payload del estado de actualización
 */
export interface UpdateStatusPayload {
  type: 'checking' | 'available' | 'not-available' | 'downloaded' | 'error' | 'progress';
  message?: string;
  version?: string;
  progress?: {
    percent: number;
    transferred: number;
    total: number;
  };
  error?: Error;
}

/**
 * Resultado de verificación de actualización
 */
export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  releaseNotes?: string;
}

/**
 * Extensión de la interfaz Window global
 */
declare global {
  interface Window {
    electron?: ElectronAPI;
    esmarkUpdates?: UpdatesAPI;
  }
}

export {};
