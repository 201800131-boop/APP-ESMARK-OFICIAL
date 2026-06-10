/**
 * Google Drive Sync Manager
 * Maneja la sincronizaciÃ³n de datos del sistema con Google Drive
 */

import { safeParse } from './safe-parse';

interface GoogleDriveConfig {
  enabled: boolean;
  accessToken: string;
  refreshToken: string;
  folderId: string;
  folderName: string;
  lastSync: string;
  autoSync: boolean;
  syncInterval: number; // minutos
}

interface SyncData {
  orders: any[];
  quotes: any[];
  products: any[];
  customers: any[];
  pettyCash: any[];
  dayStarts: any[];
  users: any[];
  settings: any;
  priceConfig: any;
  timestamp: string;
}

class GoogleDriveSync {
  private config: GoogleDriveConfig | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadConfig();
  }

  // Cargar configuraciÃ³n desde localStorage
  loadConfig() {
    const stored = localStorage.getItem('esmark_gdrive_config');
    if (stored) {
      const parsed = safeParse(stored, null) as GoogleDriveConfig | null;
      this.config = parsed;
      if (this.config?.autoSync) {
        this.startAutoSync();
      }
    }
  }

  // Guardar configuraciÃ³n
  saveConfig(config: GoogleDriveConfig) {
    this.config = config;
    localStorage.setItem('esmark_gdrive_config', JSON.stringify(config));
    
    if (config.autoSync) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  // Obtener configuraciÃ³n actual
  getConfig(): GoogleDriveConfig | null {
    return this.config;
  }

  // Verificar si estÃ¡ conectado
  isConnected(): boolean {
    return !!(this.config?.enabled && this.config?.accessToken);
  }

  // Iniciar sincronizaciÃ³n automÃ¡tica
  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    const intervalMs = (this.config?.syncInterval || 30) * 60 * 1000; // Convertir minutos a ms
    
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, intervalMs);

    console.log(`ðŸ”„ Auto-sync iniciado cada ${this.config?.syncInterval || 30} minutos`);
  }

  // Detener sincronizaciÃ³n automÃ¡tica
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('â¸ï¸ Auto-sync detenido');
    }
  }

  // Los registros operativos viven en Supabase; Google Drive ya no importa/exporta bases locales viejas.
  private collectAllData(): SyncData {
    throw new Error('La copia de registros locales fue deshabilitada. Los datos oficiales estan en Supabase.');
  }

  private applyDownloadedData(_data: SyncData) {
    throw new Error('La restauracion de registros locales fue deshabilitada. Los datos oficiales estan en Supabase.');
  }
  // Subir datos a Google Drive
  async syncToCloud(): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected()) {
      return { success: false, message: 'No conectado a Google Drive' };
    }

    try {
      console.log('â˜ï¸ Iniciando sincronizaciÃ³n con Google Drive...');
      
      const data = this.collectAllData();
      const fileName = 'esmark_backup.json';
      
      // Buscar archivo existente en la carpeta
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${this.config!.folderId}' in parents and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${this.config!.accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error('Error al buscar archivo en Google Drive');
      }

      const searchData = await searchResponse.json();
      const fileExists = searchData.files && searchData.files.length > 0;
      const fileId = fileExists ? searchData.files[0].id : null;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      
      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [this.config!.folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      let uploadResponse;

      if (fileExists) {
        // Actualizar archivo existente
        uploadResponse = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${this.config!.accessToken}`
            },
            body: form
          }
        );
      } else {
        // Crear nuevo archivo
        uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.config!.accessToken}`
            },
            body: form
          }
        );
      }

      if (!uploadResponse.ok) {
        throw new Error('Error al subir archivo a Google Drive');
      }

      // Actualizar Ãºltima sincronizaciÃ³n
      if (this.config) {
        this.config.lastSync = new Date().toISOString();
        this.saveConfig(this.config);
      }

      console.log('âœ… SincronizaciÃ³n completada exitosamente');
      return { success: true, message: 'Datos sincronizados con Google Drive' };

    } catch (error) {
      console.error('âŒ Error en sincronizaciÃ³n:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Descargar datos desde Google Drive
  async syncFromCloud(): Promise<{ success: boolean; message: string; data?: SyncData }> {
    if (!this.isConnected()) {
      return { success: false, message: 'No conectado a Google Drive' };
    }

    try {
      console.log('â¬‡ï¸ Descargando datos desde Google Drive...');
      
      const fileName = 'esmark_backup.json';
      
      // Buscar archivo
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${this.config!.folderId}' in parents and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${this.config!.accessToken}`
          }
        }
      );

      if (!searchResponse.ok) {
        throw new Error('Error al buscar archivo en Google Drive');
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.files || searchData.files.length === 0) {
        return { success: false, message: 'No se encontrÃ³ archivo de respaldo en Google Drive' };
      }

      const fileId = searchData.files[0].id;

      // Descargar archivo
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${this.config!.accessToken}`
          }
        }
      );

      if (!downloadResponse.ok) {
        throw new Error('Error al descargar archivo desde Google Drive');
      }

      const data: SyncData = await downloadResponse.json();
      
      // Aplicar datos
      this.applyDownloadedData(data);

      // Actualizar Ãºltima sincronizaciÃ³n
      if (this.config) {
        this.config.lastSync = new Date().toISOString();
        this.saveConfig(this.config);
      }

      console.log('âœ… Datos descargados y aplicados exitosamente');
      return { success: true, message: 'Datos restaurados desde Google Drive', data };

    } catch (error) {
      console.error('âŒ Error al descargar datos:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Crear carpeta en Google Drive
  async createFolder(folderName: string, parentId?: string): Promise<{ success: boolean; folderId?: string; message: string }> {
    if (!this.config?.accessToken) {
      return { success: false, message: 'No hay token de acceso' };
    }

    try {
      const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      };

      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      );

      if (!response.ok) {
        throw new Error('Error al crear carpeta');
      }

      const data = await response.json();
      return { success: true, folderId: data.id, message: 'Carpeta creada exitosamente' };

    } catch (error) {
      console.error('Error al crear carpeta:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Listar carpetas en Google Drive
  async listFolders(): Promise<{ success: boolean; folders?: any[]; message: string }> {
    if (!this.config?.accessToken) {
      return { success: false, message: 'No hay token de acceso' };
    }

    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name,createdTime)",
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al listar carpetas');
      }

      const data = await response.json();
      return { success: true, folders: data.files || [], message: 'Carpetas listadas' };

    } catch (error) {
      console.error('Error al listar carpetas:', error);
      return { success: false, message: `Error: ${error}` };
    }
  }

  // Desconectar de Google Drive
  disconnect() {
    this.stopAutoSync();
    this.config = null;
    localStorage.removeItem('esmark_gdrive_config');
    console.log('ðŸ”Œ Desconectado de Google Drive');
  }
}

// Exportar instancia singleton
export const gDriveSync = new GoogleDriveSync();

