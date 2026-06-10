import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  FolderOpen,
  Download,
  Upload,
  Plus,
  Settings
} from 'lucide-react';
import { gDriveSync } from '../../utils/google-drive-sync';

export default function GoogleDriveTab() {
  const [connected, setConnected] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [folderName, setFolderName] = useState('EsmarkSystem_Backup');
  const [folderId, setFolderId] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState(30);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('EsmarkSystem_Backup');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    const config = gDriveSync.getConfig();
    if (config) {
      setConnected(config.enabled);
      setAccessToken(config.accessToken);
      setFolderId(config.folderId);
      setFolderName(config.folderName);
      setAutoSync(config.autoSync);
      setSyncInterval(config.syncInterval);
      setLastSync(config.lastSync);
    }
  };

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      showMessage('error', 'Por favor ingresa el token de acceso');
      return;
    }

    if (!folderId.trim() && !showCreateFolder) {
      showMessage('error', 'Por favor selecciona o crea una carpeta');
      return;
    }

    try {
      const config = {
        enabled: true,
        accessToken: accessToken.trim(),
        refreshToken: '',
        folderId: folderId.trim(),
        folderName: folderName.trim(),
        lastSync: new Date().toISOString(),
        autoSync,
        syncInterval
      };

      gDriveSync.saveConfig(config);
      setConnected(true);
      showMessage('success', '✅ Conectado exitosamente a Google Drive');
      
      // Hacer primera sincronización
      await handleSyncToCloud();
      
    } catch (error) {
      console.error('Error al conectar:', error);
      showMessage('error', 'Error al conectar con Google Drive');
    }
  };

  const handleDisconnect = () => {
    gDriveSync.disconnect();
    setConnected(false);
    setAccessToken('');
    setFolderId('');
    setLastSync(null);
    showMessage('info', 'Desconectado de Google Drive');
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    showMessage('info', '☁️ Subiendo datos a Google Drive...');
    
    const result = await gDriveSync.syncToCloud();
    
    if (result.success) {
      showMessage('success', result.message);
      setLastSync(new Date().toISOString());
    } else {
      showMessage('error', result.message);
    }
    
    setSyncing(false);
  };

  const handleSyncFromCloud = async () => {
    const confirm = window.confirm(
      '⚠️ Esto sobrescribirá todos los datos locales con los datos de la nube.\n\n¿Estás seguro?'
    );
    
    if (!confirm) return;

    setSyncing(true);
    showMessage('info', '⬇️ Descargando datos desde Google Drive...');
    
    const result = await gDriveSync.syncFromCloud();
    
    if (result.success) {
      showMessage('success', result.message);
      setLastSync(new Date().toISOString());
      
      // Recargar página para aplicar cambios
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      showMessage('error', result.message);
    }
    
    setSyncing(false);
  };

  const handleLoadFolders = async () => {
    if (!accessToken.trim()) {
      showMessage('error', 'Primero ingresa el token de acceso');
      return;
    }

    setLoadingFolders(true);
    
    // Guardar token temporalmente para hacer la consulta
    gDriveSync.saveConfig({
      enabled: false,
      accessToken: accessToken.trim(),
      refreshToken: '',
      folderId: '',
      folderName: '',
      lastSync: '',
      autoSync: false,
      syncInterval: 30
    });

    const result = await gDriveSync.listFolders();
    
    if (result.success) {
      setFolders(result.folders || []);
      showMessage('success', `${result.folders?.length || 0} carpetas encontradas`);
    } else {
      showMessage('error', result.message);
    }
    
    setLoadingFolders(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showMessage('error', 'Ingresa un nombre para la carpeta');
      return;
    }

    setLoadingFolders(true);
    
    const result = await gDriveSync.createFolder(newFolderName.trim());
    
    if (result.success) {
      setFolderId(result.folderId || '');
      setFolderName(newFolderName.trim());
      setShowCreateFolder(false);
      showMessage('success', 'Carpeta creada exitosamente');
      
      // Recargar lista de carpetas
      await handleLoadFolders();
    } else {
      showMessage('error', result.message);
    }
    
    setLoadingFolders(false);
  };

  const handleUpdateSettings = () => {
    if (connected) {
      const config = gDriveSync.getConfig();
      if (config) {
        config.autoSync = autoSync;
        config.syncInterval = syncInterval;
        gDriveSync.saveConfig(config);
        showMessage('success', 'Configuración actualizada');
      }
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Sincronización con Google Drive</h2>
        <p className="text-muted-foreground">
          Sincroniza automáticamente todos los datos del sistema con Google Drive para acceder desde múltiples PCs
        </p>
      </div>

      {message && (
        <Alert className={
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }>
          {message.type === 'success' && <Check className="w-4 h-4 text-green-600" />}
          {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
          {message.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600" />}
          <AlertDescription className={
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Estado de Conexión */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Conexión</CardTitle>
              <CardDescription>
                {connected ? 'Conectado a Google Drive' : 'No conectado'}
              </CardDescription>
            </div>
            <Badge className={connected ? 'bg-green-500' : 'bg-gray-400'}>
              {connected ? (
                <>
                  <Cloud className="w-4 h-4 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4 mr-1" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && lastSync && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Última sincronización:</strong> {formatDate(lastSync)}
              </p>
            </div>
          )}

          {!connected && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Para usar la sincronización con Google Drive, debes configurar las credenciales OAuth2.
                <br />
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium mt-2 inline-block"
                >
                  Obtener credenciales en Google Cloud Console →
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Conexión */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Google Drive</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accessToken">Token de Acceso OAuth2</Label>
            <Input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Pega tu access token de Google"
              disabled={connected}
            />
            <p className="text-xs text-muted-foreground">
              El token de acceso OAuth2 obtenido desde Google Cloud Console
            </p>
          </div>

          {!connected && accessToken && (
            <>
              <div className="space-y-2">
                <Label>Carpeta de Respaldo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLoadFolders}
                    disabled={loadingFolders}
                    className="shrink-0"
                  >
                    {loadingFolders ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FolderOpen className="w-4 h-4 mr-2" />
                    )}
                    Cargar Carpetas
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateFolder(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Carpeta
                  </Button>
                </div>
              </div>

              {showCreateFolder && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <Label htmlFor="newFolderName">Nombre de la nueva carpeta</Label>
                  <Input
                    id="newFolderName"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="EsmarkSystem_Backup"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateFolder} disabled={loadingFolders}>
                      Crear Carpeta
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateFolder(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {folders.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="folder">Seleccionar Carpeta Existente</Label>
                  <Select value={folderId} onValueChange={(value) => {
                    setFolderId(value);
                    const folder = folders.find(f => f.id === value);
                    if (folder) setFolderName(folder.name);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una carpeta" />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          📁 {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {connected && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Carpeta activa:</strong> 📁 {folderName}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Auto-Sincronización */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle>Sincronización Automática</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoSync">Sincronización Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar datos automáticamente en intervalos regulares
                </p>
              </div>
              <Switch
                id="autoSync"
                checked={autoSync}
                onCheckedChange={(checked) => {
                  setAutoSync(checked);
                  setTimeout(handleUpdateSettings, 100);
                }}
              />
            </div>

            {autoSync && (
              <div className="space-y-2">
                <Label htmlFor="syncInterval">Intervalo de Sincronización (minutos)</Label>
                <Select 
                  value={syncInterval.toString()} 
                  onValueChange={(value) => {
                    setSyncInterval(parseInt(value));
                    setTimeout(handleUpdateSettings, 100);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Cada 5 minutos</SelectItem>
                    <SelectItem value="15">Cada 15 minutos</SelectItem>
                    <SelectItem value="30">Cada 30 minutos</SelectItem>
                    <SelectItem value="60">Cada hora</SelectItem>
                    <SelectItem value="120">Cada 2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connected ? (
            <Button 
              onClick={handleConnect}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!accessToken || (!folderId && !showCreateFolder)}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Conectar a Google Drive
            </Button>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button 
                  onClick={handleSyncToCloud}
                  disabled={syncing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Subir a la Nube
                </Button>

                <Button 
                  onClick={handleSyncFromCloud}
                  disabled={syncing}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  {syncing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Descargar de la Nube
                </Button>
              </div>

              <Button 
                onClick={handleDisconnect}
                variant="destructive"
                className="w-full"
              >
                <CloudOff className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Información */}
      <Alert>
        <Settings className="w-4 h-4" />
        <AlertDescription>
          <strong>¿Cómo funciona?</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li>• Todos los datos se guardan en un archivo JSON en Google Drive</li>
            <li>• La sincronización automática sube los cambios periódicamente</li>
            <li>• Puedes descargar datos desde cualquier PC conectada</li>
            <li>• Los datos incluyen: pedidos, cotizaciones, productos, clientes, etc.</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
