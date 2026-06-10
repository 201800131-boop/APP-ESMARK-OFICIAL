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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Loader2, List, CheckCircle2 } from 'lucide-react';

interface TrelloListSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectList: (listId: string, listName: string) => void;
}

export default function TrelloListSelectorDialog({
  open,
  onOpenChange,
  onSelectList,
}: TrelloListSelectorDialogProps) {
  const [lists, setLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    if (open) {
      loadLists();
    }
  }, [open]);

  const loadLists = async () => {
    try {
      setLoading(true);
      
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

      // Cargar listas del tablero
      const listsData = await api.getTrelloLists(currentSettings.trello_board_id);
      setLists(listsData.lists || []);

      // Pre-seleccionar la lista de producción si existe
      if (currentSettings.trello_list_production) {
        setSelectedListId(currentSettings.trello_list_production);
      } else if (listsData.lists && listsData.lists.length > 0) {
        setSelectedListId(listsData.lists[0].id);
      }
    } catch (error) {
      console.error('Error loading Trello lists:', error);
      toast.error('❌ Error', {
        description: 'No se pudieron cargar las listas de Trello',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedListId) {
      toast.error('⚠️ Selecciona una lista', {
        description: 'Debes seleccionar la lista donde se creará la tarjeta',
        duration: 3000,
      });
      return;
    }

    const selectedList = lists.find(l => l.id === selectedListId);
    onSelectList(selectedListId, selectedList?.name || 'Lista de Trello');
    onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[500px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="w-5 h-5 text-purple-600" />
            Seleccionar Lista de Trello
          </DialogTitle>
          <DialogDescription>
            Elige en qué lista del tablero se creará la tarjeta
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Cargando listas...</span>
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No se encontraron listas en el tablero</p>
              <p className="text-sm text-gray-500 mt-2">Verifica la configuración de Trello en Ajustes</p>
            </div>
          ) : (
            <RadioGroup value={selectedListId} onValueChange={setSelectedListId}>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-colors cursor-pointer ${ selectedListId === list.id ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300' }`}
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <RadioGroupItem value={list.id} id={list.id} />
                    <Label
                      htmlFor={list.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{list.name}</span>
                        {getListBadge(list.id)}
                      </div>
                      {selectedListId === list.id && (
                        <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedListId || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Confirmar y Crear Tarjeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
