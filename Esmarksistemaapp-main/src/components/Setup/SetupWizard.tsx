/**
 * Setup Wizard Component - Primera configuración de la aplicación
 * Se muestra automáticamente si no existe config.json
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Settings, Database, Trello, Laptop } from 'lucide-react';
import { toast } from 'sonner';

interface SetupWizardProps {
  onComplete: (config: AppConfig) => void;
}

interface AppConfig {
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

// Prefill config from environment variables to avoid manual copy/paste
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const envTrelloBoardId = import.meta.env.VITE_TRELLO_BOARD_ID || '';

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<{ supabase: boolean; trello: boolean } | null>(null);

  const [config, setConfig] = useState<AppConfig>({
    env: 'production',
    companyId: 'ESMARK',
    supabaseUrl: envSupabaseUrl,
    supabaseAnonKey: envSupabaseAnonKey,
    trello: {
      mode: 'via_api',
      boardId: envTrelloBoardId,
      apiBase: 'https://api.trello.com/1'
    },
    device: {
      name: `PC-${Math.random().toString(36).substring(7).toUpperCase()}`,
      createdAt: new Date().toISOString()
    }
  });

  const testConnections = async () => {
    setTesting(true);
    setTestResults(null);

    try {
      // Test Supabase
      const supabaseOk = await testSupabaseConnection(config.supabaseUrl, config.supabaseAnonKey);
      
      // Test Trello
      const trelloOk = await testTrelloConnection(config.trello.boardId, config.trello.apiBase);

      setTestResults({ supabase: supabaseOk, trello: trelloOk });

      if (supabaseOk && trelloOk) {
        toast.success('✅ Todas las conexiones exitosas');
      } else {
        toast.error('❌ Falló una o más conexiones');
      }
    } catch (error) {
      console.error('Error testing connections:', error);
      toast.error('Error al probar conexiones');
    } finally {
      setTesting(false);
    }
  };

  const testSupabaseConnection = async (url: string, key: string): Promise<boolean> => {
    try {
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }
  };

  const testTrelloConnection = async (boardId: string, apiBase: string): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBase}/boards/${boardId}?fields=name`);
      return response.ok;
    } catch (error) {
      console.error('Trello connection failed:', error);
      return false;
    }
  };

  const handleSaveConfig = () => {
    // Guardar configuración vía IPC
    if (window.electron) {
      window.electron.saveConfig(config);
    }

    // TAMBIÉN guardar en localStorage para web
    const esmarkSettings = {
      supabase_url: config.supabaseUrl,
      supabase_anon_key: config.supabaseAnonKey,
      trello_board_id: config.trello.boardId,
      device_name: config.device.name,
      created_at: config.device.createdAt
    };
    localStorage.setItem('esmark_settings', JSON.stringify(esmarkSettings));
    localStorage.setItem('setup_complete', 'true');

    onComplete(config);
    toast.success('✅ Configuración guardada correctamente');
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Settings className="w-7 h-7" />
            Configuración Inicial - EsmarkSystem
          </CardTitle>
          <CardDescription className="text-blue-100">
            Configure su aplicación por primera vez
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                1
              </div>
              <span className="text-sm font-semibold">Supabase</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                2
              </div>
              <span className="text-sm font-semibold">Trello</span>
            </div>
            <div className="flex-1 h-1 bg-gray-300 mx-4" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                3
              </div>
              <span className="text-sm font-semibold">Dispositivo</span>
            </div>
          </div>

          {/* Step 1: Supabase */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Database className="w-6 h-6" />
                <h3 className="text-lg font-bold">Configuración de Supabase</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabaseUrl">URL de Supabase *</Label>
                <Input
                  id="supabaseUrl"
                  type="url"
                  placeholder="https://tu-proyecto.supabase.co"
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supabaseKey">Anon Key (Pública) *</Label>
                <Input
                  id="supabaseKey"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={config.supabaseAnonKey}
                  onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                />
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Importante:</strong> Solo usa la Anon Key (pública), NUNCA la Service Role Key.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => setStep(2)} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={false}
              >
                Siguiente: Configurar Trello
              </Button>
            </div>
          )}

          {/* Step 2: Trello */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Trello className="w-6 h-6" />
                <h3 className="text-lg font-bold">Configuración de Trello</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boardId">ID del Tablero de Trello *</Label>
                <Input
                  id="boardId"
                  type="text"
                  placeholder="5f9a8b7c6d5e4f3a2b1c0d9e"
                  value={config.trello.boardId}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    trello: { ...config.trello, boardId: e.target.value }
                  })}
                />
                <p className="text-xs text-gray-600">
                  Encuentra el ID en la URL del tablero: trello.com/b/<strong>[ID]</strong>/nombre
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(1)} 
                  variant="outline"
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button 
                  onClick={() => setStep(3)} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={false}
                >
                  Siguiente: Dispositivo
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Device & Test */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600 mb-4">
                <Laptop className="w-6 h-6" />
                <h3 className="text-lg font-bold">Información del Dispositivo</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deviceName">Nombre del Dispositivo *</Label>
                <Input
                  id="deviceName"
                  type="text"
                  placeholder="PC-Caja-1"
                  value={config.device.name}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    device: { ...config.device, name: e.target.value }
                  })}
                />
                <p className="text-xs text-gray-600">
                  Identifica este equipo (ej: PC-Caja-1, PC-Administracion, etc.)
                </p>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900">Información Adicional</h4>
                
                <p className="text-sm text-gray-600">
                  ℹ️ Las credenciales se verificarán automáticamente cuando se conecte por primera vez.
                </p>

                <details className="text-sm text-gray-600 cursor-pointer">
                  <summary className="font-medium">🔧 Verificar Conexiones (Opcional)</summary>
                  
                  {testResults && (
                    <div className="space-y-2 mt-3 p-2 bg-gray-50 rounded">
                      <div className={`flex items-center gap-2 ${testResults.supabase ? 'text-green-600' : 'text-red-600'}`}>
                        {testResults.supabase ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-sm font-medium">
                          Supabase: {testResults.supabase ? '✅ Conectado' : '❌ Error de conexión'}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 ${testResults.trello ? 'text-green-600' : 'text-red-600'}`}>
                        {testResults.trello ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-sm font-medium">
                          Trello: {testResults.trello ? '✅ Conectado' : '❌ Error de conexión'}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={testConnections} 
                    variant="outline"
                    className="w-full mt-3"
                    disabled={testing}
                  >
                    {testing ? 'Probando...' : 'Probar Conexiones Ahora'}
                  </Button>
                </details>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setStep(2)} 
                  variant="outline"
                  className="flex-1"
                >
                  Atrás
                </Button>
                <Button 
                  onClick={handleSaveConfig} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Guardar y Continuar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
