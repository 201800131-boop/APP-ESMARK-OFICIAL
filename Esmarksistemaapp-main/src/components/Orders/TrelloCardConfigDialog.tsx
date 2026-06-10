import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Loader2, List, Tag, Users, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

interface TrelloCardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: {
    listId: string;
    listName: string;
    labelIds: string[];
    memberIds: string[];
  }) => void;
  defaultListId?: string;
}

export default function TrelloCardConfigDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultListId,
}: TrelloCardConfigDialogProps) {
  const [lists, setLists] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState(defaultListId || '');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [listError, setListError] = useState('');
  const [labelsError, setLabelsError] = useState('');
  const [membersError, setMembersError] = useState('');

  const normalizeCollection = <T,>(payload: any, key: string): T[] => {
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.[key])) return payload[key] as T[];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key] as T[];
    if (Array.isArray(payload?.data)) return payload.data as T[];
    return [];
  };

  const getConfiguredLists = (currentSettings: any) => {
    const candidates = [
      { id: currentSettings.trello_list_pending, name: 'Lista de pendientes configurada' },
      { id: currentSettings.trello_list_design, name: 'Lista de diseño configurada' },
      { id: currentSettings.trello_list_production, name: 'Lista de producción configurada' },
      { id: currentSettings.trello_list_ready, name: 'Lista de listos configurada' },
      { id: currentSettings.trello_list_delivered, name: 'Lista de entregados configurada' },
    ];

    return candidates.filter((list) => typeof list.id === 'string' && list.id.trim().length > 0);
  };

  const getConfiguredListName = (listId: string) => {
    if (!listId) return '';
    if (listId === settings.trello_list_pending) return 'Lista de pendientes configurada';
    if (listId === settings.trello_list_design) return 'Lista de diseño configurada';
    if (listId === settings.trello_list_production) return 'Lista de producción configurada';
    if (listId === settings.trello_list_ready) return 'Lista de listos configurada';
    if (listId === settings.trello_list_delivered) return 'Lista de entregados configurada';
    return 'Lista seleccionada';
  };

  const selectedList = lists.find((list) => list.id === selectedListId);
  const selectedListName = selectedList?.name || getConfiguredListName(selectedListId);
  const displayedLists = selectedListId && !selectedList
    ? [{ id: selectedListId, name: selectedListName }, ...lists]
    : lists;

  useEffect(() => {
    if (open) {
      console.log('🔄 TrelloCardConfigDialog abierto');
      console.log('   defaultListId:', defaultListId);
      loadTrelloData();
      // Resetear selecciones al abrir (excepto la lista que viene por defecto)
      setSelectedLabelIds([]);
      setSelectedMemberIds([]);
      // Si no hay defaultListId, resetear también la lista seleccionada
      if (!defaultListId) {
        setSelectedListId('');
      }
    }
  }, [open, defaultListId]);

  useEffect(() => {
    if (defaultListId) {
      setSelectedListId(defaultListId);
    }
  }, [defaultListId]);

  const loadTrelloData = async () => {
    try {
      setLoading(true);
      setListError('');
      setLabelsError('');
      setMembersError('');
      
      // Cargar configuración
      const settingsData = await api.getSettings();
      const currentSettings = settingsData.settings || {};
      setSettings(currentSettings);

      if (!currentSettings.trello_board_id) {
        toast.error('⚠️ Configura Trello primero', {
          description: 'Ve a Ajustes → Integraciones → Trello',
          duration: 5000,
        });
        return;
      }

      const boardId = currentSettings.trello_board_id;

      console.log('🔄 Cargando datos de Trello para el board:', boardId);

      // Cargar listas, etiquetas y miembros con manejo de errores individual
      let listsData: any = { lists: [] };
      let labelsData: any = { labels: [] };
      let membersData: any = { members: [] };

      try {
        listsData = await api.getTrelloLists(boardId);
        console.log('✅ Listas cargadas:', normalizeCollection<any>(listsData, 'lists').length);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar listas:', error);
        setListError((error as Error)?.message || 'No se pudieron cargar las listas');
      }

      try {
        labelsData = await api.getTrelloLabels(boardId);
        console.log('✅ Etiquetas cargadas:', normalizeCollection<any>(labelsData, 'labels').length);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar etiquetas:', error);
        setLabelsError((error as Error)?.message || 'No se pudieron cargar las etiquetas');
      }

      try {
        membersData = await api.getTrelloMembers(boardId);
        console.log('✅ Miembros cargados:', normalizeCollection<any>(membersData, 'members').length);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar miembros:', error);
        setMembersError((error as Error)?.message || 'No se pudieron cargar los miembros del tablero');
      }

      const normalizedLists = normalizeCollection<any>(listsData, 'lists')
        .filter((list) => list?.id)
        .map((list) => ({ id: list.id, name: list.name || 'Lista sin nombre' }));
      const configuredLists = getConfiguredLists(currentSettings);
      const mergedLists = [...normalizedLists];
      configuredLists.forEach((configured) => {
        if (!mergedLists.some((list) => list.id === configured.id)) {
          mergedLists.push(configured);
        }
      });

      const normalizedLabels = normalizeCollection<any>(labelsData, 'labels')
        .filter((label) => label?.id)
        .map((label) => ({
          id: label.id,
          name: label.name || '',
          color: label.color || 'gray',
        }));

      const normalizedMembers = normalizeCollection<any>(membersData, 'members')
        .filter((member) => member?.id)
        .map((member) => ({
          id: member.id,
          fullName: member.fullName || member.full_name || member.username || 'Miembro',
          username: member.username || member.fullName || member.full_name || 'usuario',
          avatarUrl: member.avatarUrl || member.avatar_url || null,
        }));

      setLists(mergedLists);
      setLabels(normalizedLabels);
      setMembers(normalizedMembers);

      // Pre-seleccionar la lista de producción si existe y no hay defaultListId
      console.log('🎯 Pre-selección de lista:');
      console.log('   defaultListId existe?', !!defaultListId);
      console.log('   trello_list_production:', currentSettings.trello_list_production);
      
      const preferredListId = defaultListId || currentSettings.trello_list_production || '';
      const preferredExists = mergedLists.some((list) => list.id === preferredListId);
      const nextListId = preferredExists
        ? preferredListId
        : mergedLists[0]?.id || preferredListId;

      if (nextListId) {
        console.log('   ✅ Usando lista:', nextListId);
        setSelectedListId(nextListId);
      } else {
        setSelectedListId('');
      }
      
      // Solo mostrar error si NO se pudieron cargar listas (lo más importante)
      if (mergedLists.length === 0) {
        toast.warning('⚠️ Advertencia', {
          description: 'No se pudieron cargar las listas de Trello. Verifica tu conexión.',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error loading Trello data:', error);
      toast.error('❌ Error', {
        description: 'No se pudieron cargar los datos de Trello. Verifica tu configuración.',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLabelToggle = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleConfirm = () => {
    if (!selectedListId) {
      toast.error('⚠️ Selecciona una lista', {
        description: 'Debes seleccionar la lista donde se creará la tarjeta',
        duration: 3000,
      });
      return;
    }

    const config = {
      listId: selectedListId,
      listName: selectedListName || 'Lista de Trello',
      labelIds: selectedLabelIds,
      memberIds: selectedMemberIds,
    };
    
    console.log('✅ TrelloCardConfigDialog - Configuración confirmada:', config);
    console.log('   Lista seleccionada ID:', selectedListId);
    console.log('   Lista seleccionada Nombre:', selectedListName);
    
    onConfirm(config);
    
    // Cerrar el diálogo
    onOpenChange(false);
    
    // Resetear selecciones para la próxima vez
    setTimeout(() => {
      setSelectedLabelIds([]);
      setSelectedMemberIds([]);
    }, 300);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Resetear selecciones
    setTimeout(() => {
      setSelectedLabelIds([]);
      setSelectedMemberIds([]);
    }, 300);
  };

  const getListBadge = (listId: string) => {
    if (listId === settings.trello_list_pending) {
      return <Badge className="bg-gray-500 ml-2">PENDIENTE</Badge>;
    } else if (listId === settings.trello_list_design) {
      return <Badge className="bg-blue-500 ml-2">DISEÑO</Badge>;
    } else if (listId === settings.trello_list_production) {
      return <Badge className="bg-yellow-500 ml-2">PRODUCCIÓN</Badge>;
    } else if (listId === settings.trello_list_ready) {
      return <Badge className="bg-green-500 ml-2">LISTO</Badge>;
    } else if (listId === settings.trello_list_delivered) {
      return <Badge className="bg-purple-500 ml-2">ENTREGADO</Badge>;
    }
    return null;
  };

  const getLabelColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
      sky: 'bg-sky-500',
      lime: 'bg-lime-500',
      pink: 'bg-pink-500',
      black: 'bg-gray-800',
    };
    return colorMap[color] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[650px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-purple-600" />
            Configurar Tarjeta de Trello
          </DialogTitle>
          <DialogDescription>
            Selecciona la lista, etiquetas y personas asignadas para la tarjeta
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Cargando datos de Trello...</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
            <div className="space-y-6 py-2">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={loadTrelloData}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Recargar datos de Trello
                </Button>
              </div>

              {/* Selección de Lista con Select Desplegable */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <List className="w-4 h-4" />
                  Lista de Destino *
                </Label>
                <Select 
                  value={selectedListId} 
                  onValueChange={(value) => {
                    console.log('📝 Usuario cambió lista seleccionada a:', value);
                    const list = lists.find(l => l.id === value);
                    console.log('   Nombre de la lista:', list?.name);
                    setSelectedListId(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una lista de Trello" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {displayedLists.map((list) => {
                      // Determinar el badge text basado en la configuración
                      let badgeText = '';
                      if (list.id === settings.trello_list_pending) badgeText = ' [PENDIENTE]';
                      else if (list.id === settings.trello_list_design) badgeText = ' [DISEÑO]';
                      else if (list.id === settings.trello_list_production) badgeText = ' [PRODUCCIÓN]';
                      else if (list.id === settings.trello_list_ready) badgeText = ' [LISTO]';
                      else if (list.id === settings.trello_list_delivered) badgeText = ' [ENTREGADO]';
                      
                      return (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}{badgeText}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {listError && (
                  <p className="mt-2 text-xs text-amber-700 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    No se pudieron leer todas las listas en vivo. Puedes usar las listas configuradas y luego recargar.
                  </p>
                )}
                {selectedListId && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-md border border-purple-200">
                    <p className="text-sm text-purple-700 flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4" />
                      Tarjeta se creará en: <strong>{selectedListName}</strong>
                      {getListBadge(selectedListId)}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Selección de Etiquetas */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4" />
                  Etiquetas (opcional)
                </Label>
                {labels.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-gray-600">No hay etiquetas disponibles en el tablero</p>
                    {labelsError && (
                      <p className="text-xs text-amber-700 mt-1">Detalle: {labelsError}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {labels.map((label) => (
                      <div
                        key={label.id}
                        className={`flex items-center space-x-2 p-2 rounded-lg border-2 transition-colors cursor-pointer ${ selectedLabelIds.includes(label.id) ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300' }`}
                        onClick={() => handleLabelToggle(label.id)}
                      >
                        <Checkbox
                          id={label.id}
                          checked={selectedLabelIds.includes(label.id)}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => handleLabelToggle(label.id)}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${getLabelColor(label.color)}`} />
                          <span className="text-sm">{label.name || `Etiqueta ${label.color}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Selección de Miembros */}
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" />
                  Asignar a (opcional)
                </Label>
                {members.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
                    <p className="text-sm text-gray-600">No hay miembros en el tablero</p>
                    {membersError && (
                      <p className="text-xs text-amber-700">Detalle: {membersError}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Verifica que el token de Trello tenga permisos de lectura de miembros del tablero.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors cursor-pointer ${ selectedMemberIds.includes(member.id) ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300' }`}
                        onClick={() => handleMemberToggle(member.id)}
                      >
                        <Checkbox
                          id={member.id}
                          checked={selectedMemberIds.includes(member.id)}
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => handleMemberToggle(member.id)}
                        />
                        <div className="flex-1 flex items-center gap-3">
                          {member.avatarUrl && (
                            <img
                              src={`${member.avatarUrl}/50.png`}
                              alt={member.fullName}
                              className="w-8 h-8 rounded-full"
                            />
                          )}
                          <div>
                            <p className="font-medium">{member.fullName}</p>
                            <p className="text-xs text-gray-500">@{member.username}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button 
            type="button"
            variant="outline" 
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedListId || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : (
              <>Confirmar y Crear Tarjeta</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
