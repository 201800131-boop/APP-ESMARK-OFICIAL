import { app, BrowserWindow, ipcMain } from 'electron';

// Cargar módulos dinámicamente para evitar problemas de tipos
let log: any;
let autoUpdater: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  log = require('electron-log');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { autoUpdater: au } = require('electron-updater');
  autoUpdater = au;
  
  // Configure logger for updater
  log.transports.file.level = 'info';
  // Ensure logs go under %APPDATA%/EsmarkSystem/logs/
  try {
    const userData = app.getPath('userData');
    log.transports.file.resolvePathFn = () => `${userData}/logs/updater.log`;
  } catch {}
  
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true; // Auto download by default
} catch (err) {
  console.error('[Updater] Failed to load electron-updater or electron-log:', err);
  // Crear mock objects para que la app no falle
  log = console;
  autoUpdater = null;
}

function sendStatus(win: BrowserWindow | null, payload: any) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('updates:status', payload);
}

export function registerUpdateIPC() {
  ipcMain.handle('updates:check', async () => {
    if (!autoUpdater) {
      console.warn('[Updater] autoUpdater not available');
      return { error: 'Updates not available' };
    }
    if (!app.isPackaged) {
      log.info('[Updater] Skip check: not packaged');
      return { skipped: true };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return res || null;
    } catch (err: any) {
      log.error('[Updater] checkForUpdates error:', err);
      return { error: err?.message || String(err) };
    }
  });

  ipcMain.handle('updates:install', async () => {
    if (!autoUpdater) {
      console.warn('[Updater] autoUpdater not available');
      return { error: 'Updates not available' };
    }
    if (!app.isPackaged) {
      log.info('[Updater] Skip install: not packaged');
      return { skipped: true };
    }
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (err: any) {
      log.error('[Updater] quitAndInstall error:', err);
      return { error: err?.message || String(err) };
    }
  });
}

export function initAutoUpdater(mainWindow: BrowserWindow | null) {
  if (!autoUpdater) {
    console.warn('[Updater] autoUpdater not available; skipping initialization');
    return;
  }
  
  if (!app.isPackaged) {
    log.info('[Updater] Not packaged; auto updates disabled');
    return;
  }

  log.info('[Updater] Initializing autoUpdater');

  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update');
    sendStatus(mainWindow, { status: 'CHECKING' });
  });

  autoUpdater.on('update-available', (info: any) => {
    log.info('[Updater] Update available:', info.version);
    sendStatus(mainWindow, { status: 'UPDATE_AVAILABLE', version: info.version });
  });

  autoUpdater.on('update-not-available', (_info: any) => {
    log.info('[Updater] No update available');
    sendStatus(mainWindow, { status: 'NOT_AVAILABLE' });
  });

  autoUpdater.on('download-progress', (progress: any) => {
    sendStatus(mainWindow, { status: 'DOWNLOADING', progress });
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    log.info('[Updater] Update downloaded:', info.version);
    sendStatus(mainWindow, { status: 'DOWNLOADED', version: info.version });
  });

  autoUpdater.on('error', (err: unknown) => {
    log.error('[Updater] Error:', err);
    const message = typeof err === 'object' && err && 'message' in (err as any) ? (err as any).message : String(err);
    sendStatus(mainWindow, { status: 'ERROR', message });
  });

  // Trigger initial check for updates
  autoUpdater.checkForUpdates().catch((err: unknown) => {
    log.error('[Updater] Initial check error:', err);
  });
}
