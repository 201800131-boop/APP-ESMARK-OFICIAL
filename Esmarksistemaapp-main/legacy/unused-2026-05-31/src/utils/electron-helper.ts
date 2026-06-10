/**
 * Utilidades para detectar y trabajar con Electron
 */

// Detectar si estamos corriendo en Electron
export const isElectron = (): boolean => {
  return !!(
    typeof window !== 'undefined' &&
    window.electron &&
    window.electron.isElectron
  );
};

// Obtener versión de la app
export const getAppVersion = async (): Promise<string> => {
  if (isElectron() && window.electron?.getAppVersion) {
    return await window.electron.getAppVersion();
  }
  return '1.0.0'; // Versión por defecto para web
};

// Obtener plataforma
export const getPlatform = (): string => {
  if (isElectron() && window.electron?.platform) {
    return window.electron.platform;
  }
  return 'web';
};

// Exportar archivo (PDF, etc.)
export const exportFile = async (
  data: Blob | Buffer | Uint8Array,
  filename: string
): Promise<boolean> => {
  if (isElectron() && window.electron?.exportFile) {
    // Convertir Blob a Buffer si es necesario
    let buffer: any = data;
    
    if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }
    
    const result = await window.electron.exportFile(buffer, filename);
    return result.success;
  } else {
    // Fallback para navegador web
    if (data instanceof Blob) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  }
  
  return false;
};

// Log para desarrollo
export const log = (message: string): void => {
  if (isElectron() && window.electron?.log) {
    window.electron.log(message);
  } else {
    console.log('[App]:', message);
  }
};

// Abrir carpeta de datos de usuario (solo Electron)
export const openUserData = async (): Promise<void> => {
  if (isElectron() && window.electron?.openUserData) {
    await window.electron.openUserData();
  } else {
    console.warn('openUserData solo está disponible en Electron');
  }
};

// TypeScript: Definiciones globales para window.electron
declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      openUserData: () => Promise<void>;
      exportFile: (data: any, filename: string) => Promise<{ success: boolean; path?: string }>;
      log: (message: string) => void;
      platform: string;
      isElectron: boolean;
    };
  }
}

export default {
  isElectron,
  getAppVersion,
  getPlatform,
  exportFile,
  log,
  openUserData,
};
