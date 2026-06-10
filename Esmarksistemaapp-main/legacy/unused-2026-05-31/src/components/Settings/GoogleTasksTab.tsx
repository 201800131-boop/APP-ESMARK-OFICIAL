import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  CheckSquare, 
  Check, 
  AlertTriangle, 
  Plus,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { gTasksSync } from '../../utils/google-tasks-sync';
import { gDriveSync } from '../../utils/google-drive-sync';

export default function GoogleTasksTab() {
  const [connected, setConnected] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedListName, setSelectedListName] = useState('');
  const [autoCreate, setAutoCreate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [newListName, setNewListName] = useState('EsmarkSystem - Pedidos');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    // Primero intentar cargar token de Google Drive (misma cuenta)
    const driveConfig = gDriveSync.getConfig();
    if (driveConfig?.accessToken) {
      setAccessToken(driveConfig.accessToken);
    }

    // Cargar configuración de Tasks
    const tasksConfig = gTasksSync.getConfig();
    if (tasksConfig) {
      setConnected(tasksConfig.enabled);
      if (tasksConfig.accessToken) setAccessToken(tasksConfig.accessToken);
      setSelectedListId(tasksConfig.taskListId);
      setSelectedListName(tasksConfig.taskListName);
      setAutoCreate(tasksConfig.autoCreate);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleLoadLists = async () => {
    if (!accessToken.trim()) {
      showMessage('error', 'Por favor ingresa tu token de acceso de Google');
      return;
    }

    setLoading(true);
    try {
      const lists = await gTasksSync.getTaskLists(accessToken);
      setTaskLists(lists);
      showMessage('success', `${lists.length} listas encontradas`);
    } catch (error: any) {
      console.error('Error cargando listas:', error);
      showMessage('error', 'Error al cargar listas. Verifica tu token de acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!accessToken.trim()) {
      showMessage('error', 'Por favor ingresa tu token de acceso de Google');
      return;
    }

    if (!newListName.trim()) {
      showMessage('error', 'Ingresa un nombre para la lista');
      return;
    }

    setLoading(true);
    try {
      const newList = await gTasksSync.createTaskList(accessToken, newListName);
      setTaskLists([...taskLists, newList]);
      setSelectedListId(newList.id);
      setSelectedListName(newList.title);
      showMessage('success', `Lista "${newList.title}" creada exitosamente`);
    } catch (error: any) {
      console.error('Error creando lista:', error);
      showMessage('error', 'Error al crear lista. Verifica tu token de acceso.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    if (!accessToken.trim()) {
      showMessage('error', 'Por favor ingresa tu token de acceso');
      return;
    }

    if (!selectedListId) {
      showMessage('error', 'Por favor selecciona o crea una lista de tareas');
      return;
    }

    const config = {
      enabled: true,
      accessToken: accessToken.trim(),
      taskListId: selectedListId,
      taskListName: selectedListName,
      autoCreate
    };

    gTasksSync.saveConfig(config);
    setConnected(true);
    showMessage('success', '✅ Google Tasks conectado exitosamente');
  };

  const handleDisconnect = () => {
    const config = {
      enabled: false,
      accessToken: '',
      taskListId: '',
      taskListName: '',
      autoCreate: false
    };

    gTasksSync.saveConfig(config);
    setConnected(false);
    setSelectedListId('');
    setSelectedListName('');
    showMessage('info', 'Google Tasks desconectado');
  };

  const handleTestConnection = async () => {
    if (!accessToken.trim() || !selectedListId) {
      showMessage('error', 'Primero conecta Google Tasks');
      return;
    }

    setLoading(true);
    try {
      const testTask = {
        title: '✅ Tarea de prueba - EsmarkSystem',
        notes: 'Esta es una tarea de prueba creada automáticamente por EsmarkSystem.\nPuedes eliminarla desde Google Tasks.',
        status: 'needsAction' as const
      };

      await gTasksSync.createTask(accessToken, selectedListId, testTask);
      showMessage('success', '✅ ¡Conexión exitosa! Revisa tu lista en Google Tasks');
    } catch (error: any) {
      console.error('Error en prueba:', error);
      showMessage('error', 'Error al crear tarea de prueba. Verifica la configuración.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-blue-600" />
          <CardTitle>Google Tasks</CardTitle>
        </div>
        <CardDescription>
          Crea tareas automáticamente en Google Tasks cuando agregas pedidos (alternativa a Trello)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={
            message.type === 'success' ? 'bg-green-50 border-green-200' :
            message.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }>
            <AlertDescription className={
              message.type === 'success' ? 'text-green-800' :
              message.type === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Estado de conexión */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <div>
              <p className="font-medium text-gray-900">
                {connected ? 'Conectado a Google Tasks' : 'No conectado'}
              </p>
              {connected && selectedListName && (
                <p className="text-sm text-gray-600">Lista: {selectedListName}</p>
              )}
            </div>
          </div>
          <Badge className={connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {connected ? '✓ Activo' : '○ Inactivo'}
          </Badge>
        </div>

        {/* Instrucciones */}
        <Alert className="bg-linear-to-r from-blue-50 to-cyan-50 border-2 border-blue-300">
          <AlertDescription className="text-blue-900">
            <div className="space-y-3">
              <p className="font-bold text-lg">📋 Configuración Simple en 3 Pasos</p>
              <div className="space-y-2 bg-white/50 p-3 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <div>
                    <p className="font-medium">Obtén tu Token de Google</p>
                    <p className="text-sm">Si ya configuraste Google Drive, usa el mismo token. Si no:</p>
                    <ol className="text-xs ml-4 mt-1 space-y-1">
                      <li>1. Ve a <a href="https://console.cloud.google.com" target="_blank" className="underline font-bold">console.cloud.google.com</a></li>
                      <li>2. Crea un proyecto o selecciona uno existente</li>
                      <li>3. Habilita "Google Tasks API"</li>
                      <li>4. Crea credenciales OAuth 2.0 y genera un token</li>
                    </ol>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <div>
                    <p className="font-medium">Pega tu token y carga tus listas</p>
                    <p className="text-xs text-blue-700">O crea una nueva lista específica para EsmarkSystem</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <div>
                    <p className="font-medium">¡Listo! Conecta y prueba</p>
                    <p className="text-xs text-blue-700">Las tareas se crearán automáticamente al agregar pedidos</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                <p className="text-xs text-green-900">
                  ✅ <strong>Ventajas sobre Trello:</strong> Más simple, sin configuración de URLs, usa tu cuenta de Google existente, gratis sin límites
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Token de acceso */}
        <div className="space-y-2">
          <Label>Token de Acceso de Google</Label>
          <div className="flex gap-2">
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Pega tu token de acceso aquí"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button
              variant="outline"
              onClick={handleLoadLists}
              disabled={loading || !accessToken}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Cargar Listas
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            💡 Si ya configuraste Google Drive, es el mismo token
          </p>
        </div>

        {/* Selector de lista o crear nueva */}
        {taskLists.length > 0 && (
          <div className="space-y-2">
            <Label>Seleccionar Lista de Tareas</Label>
            <Select value={selectedListId} onValueChange={(value) => {
              setSelectedListId(value);
              const list = taskLists.find(l => l.id === value);
              setSelectedListName(list?.title || '');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una lista..." />
              </SelectTrigger>
              <SelectContent>
                {taskLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Crear nueva lista */}
        <div className="space-y-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Label>O Crear Nueva Lista</Label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nombre de la nueva lista"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button
              onClick={handleCreateList}
              disabled={loading || !accessToken}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Lista
            </Button>
          </div>
        </div>

        {/* Auto-crear tareas */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <Label className="text-blue-900">Crear tareas automáticamente</Label>
            <p className="text-sm text-blue-700">Crear una tarea en Google Tasks cada vez que se agrega un pedido</p>
          </div>
          <Switch
            checked={autoCreate}
            onCheckedChange={setAutoCreate}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3">
          {!connected ? (
            <Button
              onClick={handleConnect}
              disabled={!accessToken || !selectedListId}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Conectar Google Tasks
            </Button>
          ) : (
            <>
              <Button
                onClick={handleTestConnection}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Probar Conexión
              </Button>
              <Button
                onClick={handleDisconnect}
                variant="destructive"
              >
                Desconectar
              </Button>
            </>
          )}
        </div>

        {/* Link a Google Tasks */}
        <div className="pt-4 border-t">
          <a
            href="https://tasks.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Google Tasks
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
