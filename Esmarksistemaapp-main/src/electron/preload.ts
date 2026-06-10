import { contextBridge, ipcRenderer } from 'electron';

// Exponer APIs seguras al renderer process
contextBridge.exposeInMainWorld('electron', {
  // Información de la aplicación
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Operaciones de sistema
  openUserData: () => ipcRenderer.invoke('open-user-data'),
  
  // Exportar archivos
  exportFile: (data: any, filename: string) => 
    ipcRenderer.invoke('export-file', { data, filename }),
  
  // Configuración
  configExists: () => ipcRenderer.invoke('config:exists'),
  configLoad: () => ipcRenderer.invoke('config:load'),
  configSave: (config: any) => ipcRenderer.invoke('config:save', config),
  saveConfig: (config: any) => ipcRenderer.invoke('config:save', config), // Alias legacy
  
  // Logging
  log: (message: string) => ipcRenderer.send('log', message),
  
  // Plataforma
  platform: process.platform,
  isElectron: true,
});

// Exponer API de actualizaciones
contextBridge.exposeInMainWorld('esmarkUpdates', {
  onStatus: (cb: (payload: any) => void) => {
    const listener = (_: any, payload: any) => cb(payload);
    ipcRenderer.on('updates:status', listener);
    return () => ipcRenderer.removeListener('updates:status', listener);
  },
  check: () => ipcRenderer.invoke('updates:check'),
  install: () => ipcRenderer.invoke('updates:install'),
});

// TypeScript definitions para window.electron
declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      openUserData: () => Promise<void>;
      exportFile: (data: any, filename: string) => Promise<{ success: boolean; path?: string }>;
      configExists: () => Promise<boolean>;
      configLoad: () => Promise<any>;
      configSave: (config: any) => Promise<{ success: boolean; error?: string }>;
      saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
      log: (message: string) => void;
      platform: string;
      isElectron: boolean;
    };
    esmarkUpdates?: {
      onStatus: (cb: (payload: any) => void) => () => void;
      check: () => Promise<any>;
      install: () => Promise<any>;
    };
  }
}
