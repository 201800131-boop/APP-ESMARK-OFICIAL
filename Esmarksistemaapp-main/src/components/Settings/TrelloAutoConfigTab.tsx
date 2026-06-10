import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { autoConfigureTrello } from '../../utils/trello-auto-setup';
import { CheckCircle, XCircle, Loader2, Sparkles, ExternalLink, Settings2, Users, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import { api } from '../../utils/api';

export function TrelloAutoConfigTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Configuración avanzada
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [boardId, setBoardId] = useState('');
  const [lists, setLists] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Preferencias del usuario
  const [selectedListId, setSelectedListId] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useEffect(() => {
    loadAdvancedConfig();
  }, []);

  const loadAdvancedConfig = async () => {
    try {
      const settingsData = await api.getSettings();
      const settings = settingsData.settings || {};
      
      if (settings.trello_board_id) {
        setBoardId(settings.trello_board_id);
        await loadBoardData(settings.trello_board_id);
      }
      
      // Cargar preferencias guardadas (prioridad: Supabase, fallback localStorage)
      let prefs: any = null;
      try {
        const prefsData = await api.getTrelloPreferences();
        prefs = prefsData?.preferences || null;
      } catch (error) {
        prefs = null;
      }

      if (prefs) {
        localStorage.setItem('trello_preferences', JSON.stringify(prefs));
        setSelectedListId(prefs.listId || settings.trello_list_production || '');
        setSelectedLabelIds(prefs.labelIds || []);
        setSelectedMemberIds(prefs.memberIds || []);
      } else {
        const savedPrefs = localStorage.getItem('trello_preferences');
        if (savedPrefs) {
          const parsedPrefs = JSON.parse(savedPrefs);
          setSelectedListId(parsedPrefs.listId || settings.trello_list_production || '');
          setSelectedLabelIds(parsedPrefs.labelIds || []);
          setSelectedMemberIds(parsedPrefs.memberIds || []);
        } else {
          setSelectedListId(settings.trello_list_production || '');
        }
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const loadBoardData = async (boardId: string) => {
    try {
      console.log('🔄 Intentando cargar datos del tablero:', boardId);
      
      // Verificar que el boardId sea válido
      if (!boardId || boardId.trim() === '') {
        console.log('⚠️ Board ID vacío, saltando carga de datos');
        return;
      }
      
      // Cargar listas (con manejo de error individual)
      try {
        const listsData = await api.getTrelloLists(boardId);
        const loadedLists = Array.isArray(listsData) ? listsData : Array.isArray(listsData?.lists) ? listsData.lists : [];
        setLists(loadedLists);
        localStorage.setItem('esmark_trello_lists_cache', JSON.stringify(loadedLists));
        console.log('✅ Listas cargadas:', listsData.lists?.length || 0);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar listas (puede ser normal si no hay credenciales)');
        setLists([]);
      }
      
      // Cargar etiquetas (con manejo de error individual)
      try {
        const labelsData = await api.getTrelloLabels(boardId);
        setLabels(labelsData.labels || []);
        console.log('✅ Etiquetas cargadas:', labelsData.labels?.length || 0);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar etiquetas');
        setLabels([]);
      }
      
      // Cargar miembros (con manejo de error individual)
      try {
        const membersData = await api.getTrelloMembers(boardId);
        setMembers(membersData.members || []);
        console.log('✅ Miembros cargados:', membersData.members?.length || 0);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar miembros');
        setMembers([]);
      }
      
      console.log('📋 Carga de datos del tablero completada');
    } catch (error) {
      console.warn('⚠️ Error general cargando datos del tablero (ignorado):', error);
      // No mostrar error al usuario, es normal si no hay credenciales
      setLists([]);
      setLabels([]);
      setMembers([]);
    }
  };

  const handleAutoConfig = async () => {
    setLoading(true);
    setResult(null);

    try {
      // TUS CREDENCIALES DE TRELLO
      const API_KEY = "8f916023f9de66c96cc483bc99abd1d5";
      const TOKEN = "ATTA727ba6c4696b191284b507187b7cfb968ecb8ec9a40a3723ea774d6935dd3677D2CF1E2D";

      console.log('🚀 Iniciando configuración automática...');
      
      const result = await autoConfigureTrello(API_KEY, TOKEN);
      
      setResult(result);

      if (result.success) {
        setBoardId(result.board.id);
        await loadBoardData(result.board.id);
        setShowAdvanced(true);
        
        toast.success('✅ Trello configurado correctamente', {
          description: `Tablero: ${result.board.name}`,
          duration: 5000
        });
      } else {
        toast.error('❌ Error en configuración', {
          description: result.error,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.error('Error al configurar Trello', {
        description: error.message,
        duration: 5000
      });
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    const prefs = {
      listId: selectedListId,
      labelIds: selectedLabelIds,
      memberIds: selectedMemberIds
    };
    
    // Guardar en localStorage (fallback)
    localStorage.setItem('trello_preferences', JSON.stringify(prefs));
    
    // Guardar en Supabase
    try {
      await api.saveTrelloPreferences(prefs);
      toast.success('✅ Preferencias guardadas en todos los dispositivos', {
        description: 'Se sincronizarán automáticamente',
        duration: 3000
      });
    } catch (error) {
      console.warn('⚠️ No se pudo guardar en Supabase, usando localStorage:', error);
      toast.success('✅ Preferencias guardadas localmente', {
        description: 'Se usarán al crear tarjetas en Trello',
        duration: 3000
      });
    }

    window.dispatchEvent(new CustomEvent('trelloPreferencesUpdated', { detail: prefs }));
  };

  const toggleLabel = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      setSelectedLabelIds(selectedLabelIds.filter(id => id !== labelId));
    } else {
      setSelectedLabelIds([...selectedLabelIds, labelId]);
    }
  };

  const toggleMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  return (
    <div className="settings-panel-clean space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <Sparkles className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
          <div>
            <h3 className="text-lg text-blue-900 mb-2">
              🎯 Configuración de Trello
            </h3>
            <p className="text-sm text-blue-700">
              Configura Trello automáticamente y personaliza dónde crear las tarjetas, qué etiquetas y personas asignar.
            </p>
          </div>
        </div>
      </div>

      {/* Botón de configuración inicial */}
      {!result && (
        <Card className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            
            <div>
              <h4 className="text-lg mb-2">¿Listo para configurar Trello?</h4>
              <p className="text-sm text-gray-600 mb-6">
                Este proceso tomará solo unos segundos y configurará todo automáticamente.
              </p>
            </div>

            <Button
              onClick={handleAutoConfig}
              disabled={loading}
              size="lg"
              className="border-blue-300 bg-blue-50 px-8 text-blue-950 hover:bg-blue-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Configurar Trello Automáticamente
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Configuración Avanzada */}
      {(showAdvanced || boardId) && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <Settings2 className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="text-lg">⚙️ Configuración Avanzada</h4>
                <p className="text-sm text-gray-600">Personaliza cómo se crean las tarjetas</p>
              </div>
            </div>

            {/* Seleccionar Lista */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-blue-600" />
                Lista donde crear tarjetas
              </Label>
              <p className="text-sm text-gray-600">Elige en qué lista se crearán las nuevas tarjetas de pedidos</p>
              
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {lists.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hay listas disponibles</p>
                ) : (
                  lists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => setSelectedListId(list.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${ selectedListId === list.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300' }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${ selectedListId === list.id ? 'bg-blue-100 border-blue-500' : 'border-gray-300' }`}>
                          {selectedListId === list.id && (
                            <CheckCircle className="w-4 h-4 text-blue-700" />
                          )}
                        </div>
                        <span className={selectedListId === list.id ? 'font-medium text-blue-900' : 'text-gray-700'}>
                          {list.name}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Seleccionar Etiquetas */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-green-600" />
                Etiquetas automáticas
              </Label>
              <p className="text-sm text-gray-600">Selecciona las etiquetas que se agregarán automáticamente a las tarjetas</p>
              
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {labels.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 col-span-2">No hay etiquetas disponibles</p>
                ) : (
                  labels.map((label) => (
                    <div
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${ selectedLabelIds.includes(label.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300' }`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedLabelIds.includes(label.id)}
                          onCheckedChange={() => toggleLabel(label.id)}
                        />
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: label.color || '#cccccc' }}
                        />
                        <span className="text-sm truncate">
                          {label.name || 'Sin nombre'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Seleccionar Miembros */}
            <div className="space-y-3">
              <Label className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Personas asignadas
              </Label>
              <p className="text-sm text-gray-600">Selecciona las personas que se asignarán automáticamente a las tarjetas</p>
              
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No hay miembros disponibles</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${ selectedMemberIds.includes(member.id) ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300' }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedMemberIds.includes(member.id)}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        {member.avatarUrl && (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">{member.fullName}</p>
                          <p className="text-xs text-gray-500">@{member.username}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleSavePreferences}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Guardar Preferencias
            </Button>
          </div>
        </Card>
      )}

      {/* Resultado */}
      {result && (
        <Card className={`p-6 ${result.success ? 'border-green-500' : 'border-red-500'} border-2`}>
          <div className="space-y-4">
            {/* Encabezado del resultado */}
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
              <div>
                <h4 className={`text-lg ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                  {result.success ? '✅ Configuración Exitosa' : '❌ Error en Configuración'}
                </h4>
                <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message || result.error}
                </p>
              </div>
            </div>

            {/* Detalles del tablero */}
            {result.success && result.board && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">📋 Tablero configurado:</p>
                  <p className="font-medium text-gray-900">{result.board.name}</p>
                </div>

                <a
                  href={result.board.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir tablero en Trello
                </a>
              </div>
            )}

            {/* Siguientes pasos */}
            {result.success && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">✅ Siguientes pasos:</h5>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Configura tus preferencias arriba (lista, etiquetas, personas)</li>
                  <li>2. Ve a <strong>Pedidos → Nuevo Pedido</strong></li>
                  <li>3. Llena los datos del pedido</li>
                  <li>4. Haz clic en <strong>"Crear Tarjeta en Trello"</strong></li>
                  <li>5. ¡La tarjeta se creará con tus preferencias!</li>
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Información sobre cambios */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h4 className="text-sm font-medium text-yellow-900 mb-3">✨ Mejoras Implementadas:</h4>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>✓ <strong>Fecha correcta:</strong> La fecha de entrega ahora se muestra en el campo de fecha de Trello (no en descripción)</li>
          <li>✓ <strong>Sin tipo de material:</strong> La descripción ya no incluye el tipo de material, solo productos, medidas y cantidades</li>
          <li>✓ <strong>Lista personalizable:</strong> Elige en qué lista crear las tarjetas</li>
          <li>✓ <strong>Etiquetas automáticas:</strong> Asigna etiquetas a las tarjetas automáticamente</li>
          <li>✓ <strong>Personas asignadas:</strong> Asigna miembros a las tarjetas automáticamente</li>
        </ul>
      </Card>
    </div>
  );
}
