import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
// import { initAutoUpdater, registerUpdateIPC } from './updater';  // ⚠️ Desabilitado: electron-updater no está disponible
import { initLogger, logInfo, logError } from './logger-manager';
import { loadConfig, saveConfig, configExists } from './config-manager';
import path from 'path';

// Reutilizar el __dirname provisto por Node para evitar redeclararlo (SyntaxError)
const appRoot = __dirname;
const devServerUrl = 'http://localhost:5173';

// Inicializar sistema de logs
initLogger();
logInfo('Aplicación iniciando...');

// Deshabilitar aceleración por hardware si hay problemas de renderizado
// app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

// Determinar si estamos en desarrollo
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  console.log('[Electron] createWindow: iniciando creación de ventana');
  // Crear la ventana principal
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'EsmarkSystem',
    icon: path.join(appRoot, '../public/favicon.ico'),
    webPreferences: {
      preload: path.join(appRoot, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
    backgroundColor: '#000000',
    show: true, // Mostrar inmediatamente para debugging
    frame: true,
    autoHideMenuBar: false,
  });

  // Crear menú de aplicación
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Recargar',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.reload(),
        },
        {
          label: 'Abrir DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.openDevTools(),
        },
        { type: 'separator' },
        {
          label: 'Salir',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'resetZoom', label: 'Zoom Normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla Completa' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de EsmarkSystem',
          click: () => {
            // Puedes crear un diálogo personalizado aquí
            console.log('EsmarkSystem v1.0.0 - EsMark Media');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Cargar la aplicación
  if (isDev) {
    console.log(`[Electron] Modo desarrollo, cargando ${devServerUrl}`);
    // En desarrollo, cargar desde Vite dev server
    mainWindow.loadURL(devServerUrl);
    // Abrir DevTools automáticamente en desarrollo
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[Electron] Modo producción, cargando archivo dist/index.html');
    // En producción, cargar desde archivos compilados
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
  }

  // Mostrar ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    console.log('[Electron] Ventana lista para mostrar');
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] did-finish-load: contenido cargado correctamente');
  });

  let retryCount = 0;
  const maxRetries = 20;
  const retryDelayMs = 1000;

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] did-fail-load:', { errorCode, errorDescription, validatedURL });
    // -102 = ERR_CONNECTION_REFUSED (dev server aún no listo)
    if (isDev && errorCode === -102 && retryCount < maxRetries) {
      retryCount++;
      console.log(`[Electron] Reintentando cargar dev server (intento ${retryCount}/${maxRetries})...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(devServerUrl);
        }
      }, retryDelayMs);
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Electron] render-process-gone:', details);
  });

  // Fijar zoom en desktop para evitar cambios por DPI/atajos
  mainWindow.webContents.setZoomFactor(1);
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {
    // Ignorar si el entorno no permite ajustar límites
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isZoomShortcut =
      (input.control || input.meta) &&
      (input.key === '+' || input.key === '-' || input.key === '=' || input.key === '0');
    const isZoomWheel = input.control && input.type === 'mouseWheel';
    if (isZoomShortcut || isZoomWheel) {
      event.preventDefault();
    }
  });

  // Abrir enlaces externos en el navegador predeterminado
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Manejar cierre de ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Cuando la app esté lista, crear la ventana
app.whenReady().then(() => {
  console.log('[Electron] app.whenReady: creando ventana');
  createWindow();

  // ⚠️ Registrar IPC de actualizaciones - DESHABILITADO por electron-updater no disponible
  // registerUpdateIPC();

  // ⚠️ Inicializar auto-updater - DESHABILITADO por electron-updater no disponible
  // try {
  //   if (app.isPackaged) {
  //     initAutoUpdater(mainWindow);
  //   } else {
  //     console.log('[Updater] Saltando auto-updater (no empaquetado)');
  //   }
  // } catch (err) {
  //   console.error('[Updater] Error al inicializar:', err);
  // }

  // En macOS, recrear ventana cuando se hace click en el dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas (excepto en macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers para comunicación con el renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// Handler para abrir carpeta de datos de usuario
ipcMain.handle('open-user-data', () => {
  const userDataPath = app.getPath('userData');
  shell.openPath(userDataPath);
});

// Handler para exportar archivos
ipcMain.handle('export-file', async (event, { data, filename }) => {
  const { dialog } = require('electron');
  const fs = require('fs').promises;
  
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: filename,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    await fs.writeFile(result.filePath, data);
    return { success: true, path: result.filePath };
  }
  
  return { success: false };
});

// Handler para logs de desarrollo
ipcMain.on('log', (event, message) => {
  console.log('[Renderer]:', message);
});

// ========== HANDLERS DE CONFIGURACIÓN ==========

// Verificar si existe configuración
ipcMain.handle('config:exists', async () => {
  try {
    const exists = await configExists();
    logInfo(`config:exists: ${exists}`);
    return exists;
  } catch (error) {
    logError('config:exists error:', error);
    return false;
  }
});

// Cargar configuración
ipcMain.handle('config:load', async () => {
  try {
    const config = await loadConfig();
    logInfo('config:load: Configuración cargada correctamente');
    return config;
  } catch (error) {
    logError('config:load error:', error);
    return null;
  }
});

// Guardar configuración
ipcMain.handle('config:save', async (event, config) => {
  try {
    await saveConfig(config);
    logInfo('config:save: Configuración guardada correctamente');
    return { success: true };
  } catch (error) {
    logError('config:save error:', error);
    return { success: false, error: String(error) };
  }
});

// Logs de errores
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
