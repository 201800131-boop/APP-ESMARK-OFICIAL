import React, { useState, useEffect } from 'react';

// Devuelve 'text-gray-900' o 'text-white' según la luminosidad del color de fondo
function getLabelTextColor(hexColor: string): string {
  try {
    const hex = (hexColor || '').replace('#', '');
    if (hex.length < 6) return 'text-white';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? 'text-gray-900' : 'text-white';
  } catch {
    return 'text-white';
  }
}

import { api } from '../../utils/api';
import { getTrelloOrders, isTrelloConfigured, deleteTrelloOrder, updateTrelloOrder } from '../../utils/trello-orders';
import { syncOrderCounter } from '../../utils/order-number-generator';
import { getCurrentUserName } from '../../utils/get-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
// Accordion components removed - now using Cards for better visual organization
import { Search, Plus, MoreVertical, Edit, Copy, ExternalLink, Truck, Eye, DollarSign, Send, AlertCircle, AlertTriangle, Trash2, RefreshCw, Info, Filter, X, Check, Clock, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { isNotificationEnabled } from '../../utils/notification-settings';
import TrelloCardConfigDialog from './TrelloCardConfigDialog';
import OrderViewDialog from './OrderViewDialog';
import OrderEditDialog from './OrderEditDialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface OrdersListViewProps {
  onNavigate: (view: any, data?: any) => void;
  initialFilter?: string; // filtros
  initialSearch?: string;
}

const TRELLO_LISTS_CACHE_KEY = 'esmark_trello_lists_cache';

function normalizeTrelloLists(data: any): Array<{ id: string; name: string }> {
  const rawLists = Array.isArray(data) ? data : Array.isArray(data?.lists) ? data.lists : [];
  return rawLists
    .map((list: any) => ({ id: String(list?.id || ''), name: String(list?.name || '').trim() }))
    .filter((list) => list.id && list.name);
}

function readCachedTrelloLists(): Array<{ id: string; name: string }> {
  try {
    const cached = JSON.parse(localStorage.getItem(TRELLO_LISTS_CACHE_KEY) || '[]');
    return normalizeTrelloLists(cached);
  } catch {
    return [];
  }
}

function cacheTrelloLists(lists: Array<{ id: string; name: string }>) {
  try {
    localStorage.setItem(TRELLO_LISTS_CACHE_KEY, JSON.stringify(lists));
  } catch {
    // no-op
  }
}

export default function OrdersListView({ onNavigate, initialFilter, initialSearch }: OrdersListViewProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any>(null);
  const [showTrelloConfig, setShowTrelloConfig] = useState(false);
  const [pendingTrelloOrder, setPendingTrelloOrder] = useState<any>(null);
  const [showListSelector, setShowListSelector] = useState(false);
  const [trelloConfigured, setTrelloConfigured] = useState(false);
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  // Variables de estado para sincronización con Trello
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  // Variables de estado para monitoreo de tarjetas de Trello
  const [showTrelloCardDetails, setShowTrelloCardDetails] = useState(false);
  const [selectedTrelloCard, setSelectedTrelloCard] = useState<any>(null);
  const [loadingCardDetails, setLoadingCardDetails] = useState(false);
  const [updatingFromTrello, setUpdatingFromTrello] = useState<string | null>(null);
  const [showAllStatusFilters, setShowAllStatusFilters] = useState(false);
  const [trelloLists, setTrelloLists] = useState<Array<{ id: string; name: string }>>([]);
  
  // Estado para ordenamiento simple
  const [sortBy, setSortBy] = useState('orderNumber'); // 'orderNumber', 'recent', 'oldest', 'dueDate', 'client', 'amount'

  useEffect(() => {
    setSearchQuery(initialSearch || '');
  }, [initialSearch]);

  const getOrderDisplayName = (order: any) => {
    const clientName = typeof order?.client_name === 'string' ? order.client_name.trim() : '';
    if (clientName) return `Pedido de ${clientName}`;
    const orderName = typeof order?.name === 'string' ? order.name.trim() : '';
    if (orderName) return `Pedido ${orderName}`;
    return 'Pedido';
  };

  const handleLocalOrderUpdate = (updatedOrder: any) => {
    setOrders((prev: any[]) =>
      prev.map((order) => (order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order))
    );
    setViewingOrder((prev: any) => (prev?.id === updatedOrder.id ? { ...prev, ...updatedOrder } : prev));
    setOrderToEdit(null);
    toast.success('Pedido actualizado en linea', { duration: 2500 });
  };

  useEffect(() => {
    const initializeOrders = async () => {
      await checkTrelloConfiguration();
      await loadOrders();
      // Auto-sincronizar si Trello está configurado y no hay pedidos
    };
    
    initializeOrders();
  }, []);

  useEffect(() => {
    const handleRealtime = () => {
      loadOrdersSilently();
    };

    window.addEventListener('trelloRealtimeUpdate', handleRealtime);
    return () => {
      window.removeEventListener('trelloRealtimeUpdate', handleRealtime);
    };
  }, []);

  const checkTrelloConfiguration = async () => {
    try {
      const configured = isTrelloConfigured();
      setTrelloConfigured(configured);
      setTrelloLists(readCachedTrelloLists());

      let settings: any = {};
      try {
        const settingsData = await api.getSettings();
        settings = settingsData.settings || {};
      } catch {
        settings = {};
      }
      let boardId = settings.trello_board_id || '';
      if (!boardId) {
        try {
          const localSettings = JSON.parse(localStorage.getItem('esmark_settings') || '{}');
          boardId = localSettings.trello_board_id || '';
        } catch {
          boardId = '';
        }
      }

      if (boardId) {
        try {
          const listsData = await api.getTrelloLists(boardId);
          const freshLists = normalizeTrelloLists(listsData);
          setTrelloLists(freshLists);
          cacheTrelloLists(freshLists);
        } catch (listError) {
          console.warn('No se pudieron cargar las listas reales de Trello:', listError);
        }
      }
      
      console.log('🔧 Configuración de Trello:', configured ? '✅ Configurado' : '❌ No configurado');
    } catch (error) {
      console.error('Error verificando configuración de Trello:', error);
      setTrelloConfigured(false);
      setTrelloLists(readCachedTrelloLists());
    }
  };

  const persistTrelloOrdersOnline = async (trelloOrders: any[]) => {
    if (!trelloOrders.length) return;
    const results = await Promise.allSettled(trelloOrders.map((order) => api.upsertOrder(order)));
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`${failed.length} pedido(s) de Trello no se pudieron guardar en Supabase`, failed);
    }
  };

  // Cargar pedidos sincronizando Trello -> Supabase
  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('Cargando pedidos en linea...');

      if (isTrelloConfigured()) {
        const trelloResult = await getTrelloOrders();
        if (trelloResult.success && trelloResult.orders) {
          await persistTrelloOrdersOnline(trelloResult.orders);
        }
        const cachedLists = readCachedTrelloLists();
        if (cachedLists.length > 0) setTrelloLists(cachedLists);
      }

      const result = await api.getOrders();
      const onlineOrders = result.orders || [];
      setOrders(onlineOrders);
      setLastSync(new Date());
      syncOrderCounter(onlineOrders);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      toast.error('Error de conexion', {
        description: error.message || 'No se pudo conectar con Supabase',
        duration: 5000
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrdersSilently = async () => {
    try {
      if (isTrelloConfigured()) {
        const trelloResult = await getTrelloOrders();
        if (trelloResult.success && trelloResult.orders) {
          await persistTrelloOrdersOnline(trelloResult.orders);
        }
        const cachedLists = readCachedTrelloLists();
        if (cachedLists.length > 0) setTrelloLists(cachedLists);
      }

      const result = await api.getOrders();
      const onlineOrders = result.orders || [];
      setOrders(onlineOrders);
      setLastSync(new Date());
      syncOrderCounter(onlineOrders);
    } catch (error) {
      console.error('Error en carga silenciosa:', error);
    }
  };
  const autoSyncIfNeeded = async () => {
    try {
      // Verificar si Trello está configurado
      if (!isTrelloConfigured()) {
        console.log('⏭️ Auto-sync omitida: Trello no configurado');
        setOrders([]);
        return;
      }

      console.log('\n🔄 ═══════════════════════════════════════════════════════');
      console.log('🔄 AUTO-SINCRONIZACIÓN: Cargando pedidos desde Trello...');
      console.log('🔄 ═══════════════════════════════════════════════════════\n');

      setIsSyncing(true);

      // Cargar pedidos desde Trello
      const result = await getTrelloOrders();
      
      if (result.success && result.orders) {
        console.log(`✅ Auto-sync: ${result.orders.length} pedidos cargados`);
        await persistTrelloOrdersOnline(result.orders);
        await loadOrdersSilently();
        setLastSync(new Date());
        
        if (result.orders.length > 0 && isNotificationEnabled('trello_sync')) {
          toast.success('✅ Pedidos cargados', {
            description: `${result.orders.length} pedidos desde Trello`,
            duration: 3000,
          });
        }
      } else {
        console.log('ℹ️ No se encontraron pedidos en Trello');
        setOrders([]);
      }
    } catch (error: any) {
      console.error('❌ Error en auto-sync:', error);
      setSyncError(error.message);
      setOrders([]);
    } finally {
      setIsSyncing(false);
    }
  };

  // Esta función ya no es necesaria - usamos getTrelloOrders() directamente

  const handleClearAllAndResync = async () => {
    if (!trelloConfigured) {
      toast.error('⚠️ Configura Trello primero', {
        description: 'Ve a Ajustes → Integraciones → Trello para configurar las credenciales',
        duration: 5000,
      });
      return;
    }

    // Confirmación antes de limpiar
    if (!window.confirm('⚠️ ADVERTENCIA: Esto eliminará TODOS los pedidos del sistema y los re-importará desde Trello.\n\n¿Estás seguro de continuar?')) {
      return;
    }

    try {
      setLoading(true);
      setIsSyncing(true); // ⚠️ ARREGLO: Activar estado de sincronización
      setSyncError(null);
      
      // 1. Limpiar vista actual antes de importar desde Trello
      console.log('Limpiando vista actual de pedidos...');
      setOrders([]);
      
      if (isNotificationEnabled('trello_sync')) {
        toast.info('🗑️ Pedidos limpiados. Importando desde Trello...', {
          description: 'Obteniendo tarjetas reales del tablero...',
          duration: 3000,
        });
      }

      // 2. Importar TODO desde Trello (sin IDs existentes = importa todo)
      console.log('📥 Importando TODAS las tarjetas desde Trello...');
      const result = await api.syncTrelloOrders([]);  // Array vacío = importar todo
      console.log('📊 Resultado de importación:', result);

      if (result.success) {
        setLastSync(new Date());
        
        // 3. Guardar pedidos importados
        if (result.orders && result.orders.length > 0) {
          await persistTrelloOrdersOnline(result.orders);
          console.log(`✅ ${result.orders.length} pedidos importados desde Trello`);
          
          if (isNotificationEnabled('trello_sync')) {
            toast.success(`✅ Importación completa`, {
              description: `${result.orders.length} pedidos reales importados desde Trello`,
              duration: 5000,
            });
          }
        } else {
          if (isNotificationEnabled('trello_sync')) {
            toast.warning('⚠️ No se encontraron tarjetas en Trello', {
              description: 'Verifica que tu tablero tenga tarjetas activas',
              duration: 5000,
            });
          }
        }

        // 4. Recargar pedidos
        await loadOrders();
      } else {
        throw new Error(result.message || 'Error en la importación');
      }
    } catch (error: any) {
      console.error('❌ Error en limpieza e importación:', error);
      setSyncError(error.message || 'Error desconocido');
      
      if (isNotificationEnabled('trello_sync')) {
        toast.error('❌ Error al importar', {
          description: error.message || 'No se pudieron importar los pedidos desde Trello',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false); // ⚠️ ARREGLO: Desactivar estado de sincronización
    }
  };

  // 🔄 SINCRONIZAR TODO DESDE TRELLO - Reemplaza TODOS los pedidos con tarjetas de Trello
  const handleSyncAllFromTrello = async () => {
    if (!trelloConfigured) {
      toast.error('⚠️ Configura Trello primero', {
        description: 'Ve a Ajustes → Integraciones → Trello',
        duration: 5000,
      });
      return;
    }

    // Confirmación
    const confirmed = window.confirm(
      '🔄 SINCRONIZACIÓN COMPLETA\n\n' +
      'Esto reemplazará TODOS los pedidos del sistema con las tarjetas actuales de Trello.\n\n' +
      '✅ Se importarán TODAS las tarjetas de Trello\n' +
      '⚠️ Se eliminarán pedidos manuales que no estén en Trello\n\n' +
      '¿Deseas continuar?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setIsSyncing(true);
      setSyncError(null);
      
      if (isNotificationEnabled('trello_sync')) {
        toast.info('🔄 Sincronizando TODO desde Trello...', {
          description: 'Importando todas las tarjetas del tablero...',
          duration: 3000,
        });
      }

      console.log('\n🔵 ═══════════════════════════════════════════════════════');
      console.log('🔵 SINCRONIZACIÓN COMPLETA - IMPORTANDO TODO DESDE TRELLO');
      console.log('🔵 ═══════════════════════════════════════════════════════');

      // Importar TODO desde Trello (array vacío = sin filtros)
      const result = await api.syncTrelloOrders([]);
      console.log('📊 Resultado:', result);

      if (result.success) {
        // Reemplazar completamente los pedidos con las tarjetas de Trello
        const orders = result.orders || [];
        await persistTrelloOrdersOnline(orders);
        setLastSync(new Date());
        
        console.log(`✅ ${orders.length} pedidos importados desde Trello`);
        
        if (orders.length > 0) {
          if (isNotificationEnabled('trello_sync')) {
            toast.success('✅ Sincronización completa exitosa', {
              description: `${orders.length} pedidos (tarjetas) ahora en el sistema`,
              duration: 5000,
            });
          }
        } else {
          if (isNotificationEnabled('trello_sync')) {
            toast.info('ℹ️ Sincronización completada', {
              description: 'No se encontraron tarjetas activas en Trello',
              duration: 5000,
            });
          }
        }

        await loadOrders();
      } else {
        throw new Error(result.message || 'Error en la sincronización');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      setSyncError(error.message);
      
      if (isNotificationEnabled('trello_sync')) {
        toast.error('❌ Error al sincronizar', {
          description: error.message || 'No se pudo completar la sincronización',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  // 🔄 RECARGAR PEDIDOS DESDE TRELLO
  const handleSyncFromTrello = async () => {
    // Verificar configuración primero
    if (!isTrelloConfigured()) {
      toast.error('⚠️ Configura Trello primero', {
        description: 'Ve a Ajustes → Integraciones → Auto Trello para configurar las credenciales',
        duration: 5000,
      });
      return;
    }

    try {
      setLoading(true);
      setIsSyncing(true);
      setSyncError(null);
      
      if (isNotificationEnabled('trello_sync')) {
        toast.info('🔄 Recargando pedidos desde Trello...', {
          description: 'Obteniendo todas las tarjetas activas...',
          duration: 3000,
        });
      }

      console.log('\n🔵 ═══════════════════════════════════════════════════════');
      console.log('🔵 RECARGA DESDE TRELLO');
      console.log('🔵 ═══════════════════════════════════════════════════════\n');

      // Cargar pedidos directamente desde Trello
      const result = await getTrelloOrders();
      console.log('📊 Resultado:', result);

      if (result.success && result.orders) {
        await persistTrelloOrdersOnline(result.orders);

        // Actualizar estado inmediatamente con los pedidos
        await loadOrdersSilently();
        setLastSync(new Date());
        
        const total = result.orders.length;
        
        if (isNotificationEnabled('trello_sync')) {
          toast.success('✅ Pedidos recargados', {
            description: `${total} pedido(s) desde Trello`,
            duration: 5000,
          });
        }

        console.log(`✅ ${total} pedidos cargados en el estado`);
      } else {
        throw new Error(result.error || 'No se pudieron cargar las tarjetas');
      }
    } catch (error: any) {
      console.error('❌ Error recargando desde Trello:', error);
      
      // Mensaje de error más claro según el tipo de error
      let errorMessage = error.message || 'Error desconocido';
      let errorDescription = 'Verifica la configuración en Ajustes → Auto Trello';
      
      if (errorMessage.includes('no está configurado')) {
        errorMessage = '⚠️ Trello no configurado';
        errorDescription = 'Ve a Ajustes → Auto Trello y configura tus credenciales';
      } else if (errorMessage.includes('401')) {
        errorMessage = '🔐 Token expirado';
        errorDescription = 'Ve a Ajustes → Auto Trello y vuelve a autorizar';
      } else if (errorMessage.includes('404')) {
        errorMessage = '❌ Tablero no encontrado';
        errorDescription = 'Verifica el Board ID en Ajustes → Auto Trello';
      }
      
      setSyncError(errorMessage);
      
      if (isNotificationEnabled('trello_sync')) {
        toast.error(errorMessage, {
          description: errorDescription,
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    const displayName = order.customer_name || order.name || order.number || 'este pedido';
    const confirmed = window.confirm(`¿Deseas archivar ${displayName} en Trello?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const cardId = order.trello_card_id || order.id;
      const result = await deleteTrelloOrder(cardId);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo archivar el pedido');
      }

      setOrders((prev: any[]) => prev.filter((item) => item.id !== orderId));
      setViewingOrder((prev: any) => (prev?.id === orderId ? null : prev));
      setShowOrderDetails(false);
      if (isNotificationEnabled('order_movements')) {
        toast.success('Pedido archivado', {
          description: `Se archivó ${displayName}`,
          duration: 3000,
        });
      }
    } catch (error: any) {
      console.error('Error archivando pedido:', error);
      toast.error('Error al archivar', {
        description: error.message || 'No se pudo archivar el pedido',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrelloCard = (order: any) => {
    if (!order) return;
    // Guardar el pedido y abrir configuración de Trello
    setPendingTrelloOrder(order);
    setShowListSelector(true);
  };

  const handleTrelloConfigConfirmed = async (config: {
    listId: string;
    listName: string;
    labelIds: string[];
    memberIds: string[];
  }) => {
    if (!pendingTrelloOrder) return;

    const order = pendingTrelloOrder;

    try {
      // Obtener configuración
      const settingsData = await api.getSettings();
      const settings = settingsData.settings || {};

      if (!settings.trello_board_id) {
        toast.error('⚠️ Configura Trello primero', {
          description: 'Ve a Ajustes → Integraciones → Trello',
          duration: 5000,
        });
        return;
      }

      // Nombre de la tarjeta: solo nombre del cliente
      const cardName = order.customer_name;
      
      // Descripción: productos sin tipo de material
      let cardDesc = `📦 Productos:\n`;
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          cardDesc += `\n⬢ ${item.descripcion || item.product_name || 'Producto'}`;
          // NO incluir tipo ni material
          if (item.ancho && item.alto && item.unidad) {
            const unidadDisplay = {
              'cm': 'cm',
              'pulgadas': 'in',
              'metros': 'm',
              'pies': 'ft'
            }[item.unidad as 'cm' | 'pulgadas' | 'metros' | 'pies'] || item.unidad;
            cardDesc += `\n  - Medidas: ${item.ancho} × ${item.alto} ${unidadDisplay}`;
          }
          cardDesc += `\n  - Cantidad: ${item.unidades || item.quantity || 1} unidad(es)\n`;
        });
      }

      // Fecha de entrega en el campo correcto de Trello (no en descripción)
      let dueDate = null;
      if (order.due_date) {
        dueDate = new Date(order.due_date);
        if (order.due_time) {
          const [hours, minutes] = order.due_time.split(':');
          dueDate.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      console.log(`🔵 Creando tarjeta en Trello (lista: ${config.listName})...`);
      console.log('📊 Configuración recibida:', {
        listId: config.listId,
        listName: config.listName,
        labelIds: config.labelIds,
        memberIds: config.memberIds
      });
      
      if (isNotificationEnabled('trello_sync')) {
        toast.info('📤 Creando tarjeta...', {
          description: `Creando en lista: ${config.listName}`,
          duration: 2000,
        });
      }

      const cardPayload = {
        name: cardName,
        desc: cardDesc,
        due: dueDate ? dueDate.toISOString() : null,
        listId: config.listId,
        labelIds: config.labelIds,
        memberIds: config.memberIds,
        attachments: order.attached_photos || []
      };
      
      console.log('📤 Payload enviado a API:', cardPayload);
      
      const result = await api.createTrelloCard(cardPayload);
      
      if (result.card) {
        console.log('✅ Tarjeta creada:', result.card.id);
        
        await api.updateOrder(order.id, {
          ...order,
          trello_url: result.card.url,
          trello_card_id: result.card.id,
        });
        
        // Recargar pedidos
        await loadOrders();
        
        if (isNotificationEnabled('new_orders')) {
          toast.success('✅ Tarjeta de Trello creada', {
            description: `"${cardName}" creada exitosamente`,
            duration: 4000,
            action: {
              label: 'Ver en Trello',
              onClick: () => window.open(result.card.url, '_blank')
            }
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Error al crear tarjeta:', error);
      toast.error('❌ Error al crear tarjeta de Trello', {
        description: error.message || 'Verifica tu configuración de Trello en Ajustes → Integraciones',
        duration: 5000,
      });
    } finally {
      setPendingTrelloOrder(null);
      setShowListSelector(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      // Estados principales (según imagen del usuario)
      case 'PEDIDO INGRESADO': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'PENDIENTE DE INFORMACIÓN': return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'DISEÑO': return 'bg-pink-100 text-pink-800 border border-pink-300';
      case 'DISEÑO EN PROCESO': return 'bg-pink-100 text-pink-800 border border-pink-300';
      case 'ESPERANDO APROBACIÓN': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'EN PRODUCCIÓN': return 'bg-purple-100 text-purple-800 border border-purple-300';
      case 'CONTROL DE CALIDAD': return 'bg-teal-100 text-teal-800 border border-teal-300';
      case 'LISTO PARA ENTREGA': return 'bg-green-100 text-green-800 border border-green-300';
      case 'ENTREGADO': return 'bg-gray-100 text-gray-800 border border-gray-300';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border border-red-300';
      
      // Estados legacy de Trello (mantener compatibilidad)
      case 'PENDIENTE DE CONFIRMACIÓN': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'REVISIÓN DE ÁREA': return 'bg-sky-100 text-sky-800 border border-sky-300';
      case 'DISEÑO FINALIZADO': return 'bg-violet-100 text-violet-800 border border-violet-300';
      case 'PEDIDO LISTO PARA IMPRESIÓN': return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
      case 'IMPRESIÓN EN PROCESO': return 'bg-indigo-200 text-indigo-900 border border-indigo-400';
      case 'CORTE EN PROCESO': return 'bg-pink-100 text-pink-800 border border-pink-300';
      case 'IMPRESIÓN Y CORTE FINALIZADA': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'PEDIDO LISTO PARA SUBLIMACIÓN': return 'bg-rose-100 text-rose-800 border border-rose-300';
      case 'SUBLIMACIÓN EN PROCESO': return 'bg-rose-200 text-rose-900 border border-rose-400';
      case 'SUBLIMACIÓN TERMINADA': return 'bg-teal-100 text-teal-800 border border-teal-300';
      case 'CORTE PVC, ACRÍLICO': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'CORTE FINALIZADO': return 'bg-lime-100 text-lime-800 border border-lime-300';
      case 'INSTALACIÓN': return 'bg-cyan-100 text-cyan-800 border border-cyan-300';
      
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const orderToUpdate = orders.find(o => o.id === orderId);
      if (!orderToUpdate) return;

      console.log(`🔄 Cambiando estado de pedido ${orderId} a ${newStatus}`);
      
      // Si el pedido tiene trello_card_id, actualizar en Trello también
      if (orderToUpdate.trello_card_id && isTrelloConfigured()) {
        console.log('📋 Actualizando estado en Trello...');
        
        const result = await updateTrelloOrder(orderToUpdate.trello_card_id, {
          status: newStatus
        });
        
        if (result.success) {
          console.log('✅ Estado actualizado en Trello');
          
          // Mensajes especiales según el estado
          if (isNotificationEnabled('order_movements') && newStatus === 'ENTREGADO') {
            toast.success('🎉 ¡Pedido Entregado!', {
              description: `${getOrderDisplayName(orderToUpdate)} movido a la lista de Entregados en Trello`,
              duration: 5000,
            });
          } else if (isNotificationEnabled('order_movements') && newStatus === 'LISTO PARA ENTREGA') {
            toast.success('✅ Listo para Entrega', {
              description: `${getOrderDisplayName(orderToUpdate)} marcado y checklist actualizado en Trello`,
              duration: 4000,
            });
          } else if (isNotificationEnabled('order_movements')) {
            toast.success('✅ Estado actualizado', {
              description: `${getOrderDisplayName(orderToUpdate)} ahora está en ${newStatus}`,
              duration: 3000,
            });
          }
          
          // Recargar pedidos desde Trello
          await loadOrders();
        } else {
          console.error('❌ Error actualizando en Trello:', result.error);
          toast.error('⚠️ Error al actualizar en Trello', {
            description: result.error || 'No se pudo actualizar el estado',
            duration: 5000,
          });
        }
      } else {
        // Si no hay Trello configurado, mostrar advertencia
        console.warn('⚠️ Trello no está configurado o el pedido no tiene tarjeta asociada');
        toast.warning('⚠️ Sin sincronización con Trello', {
          description: 'Este pedido no está vinculado a Trello. Configura Trello en Ajustes.',
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('❌ Error al actualizar estado', {
        description: 'No se pudo actualizar el estado del pedido',
        duration: 3000,
      });
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    if (!confirm('¿Marcar este pedido como ENTREGADO?')) return;
    
    const orderToDeliver = orders.find(o => o.id === orderId);
    if (!orderToDeliver) return;

    try {
      console.log(`📦 Marcando pedido ${orderId} como ENTREGADO`);
      
      // Si el pedido tiene trello_card_id, actualizar en Trello con información de entrega
      if (orderToDeliver.trello_card_id && isTrelloConfigured()) {
        console.log('📋 Actualizando estado en Trello con info de entrega...');
        
        const deliveryInfo = {
          status: 'ENTREGADO',
          delivered_at: new Date().toISOString(),
          delivered_by: getCurrentUserName()
        };
        
        const result = await updateTrelloOrder(orderToDeliver.trello_card_id, deliveryInfo);
        
        if (result.success) {
          console.log('✅ Pedido marcado como entregado en Trello');
          
          if (isNotificationEnabled('order_movements')) {
            toast.success('🎉 ¡Pedido Entregado!', {
              description: `${getOrderDisplayName(orderToDeliver)} entregado por ${deliveryInfo.delivered_by}`,
              duration: 5000,
            });
          }
          
          // Recargar pedidos desde Trello
          await loadOrders();
        } else {
          throw new Error(result.error || 'Error al actualizar el estado');
        }
      } else {
        // Si no hay Trello configurado, mostrar advertencia
        console.warn('⚠️ Trello no está configurado o el pedido no tiene tarjeta asociada');
        toast.warning('⚠️ Sin sincronización con Trello', {
          description: 'Este pedido no está vinculado a Trello. Configura Trello en Ajustes.',
          duration: 5000,
        });
      }
      
    } catch (error: any) {
      console.error('Error marcando pedido como entregado:', error);
      toast.error('❌ Error al marcar como entregado', {
        description: error.message || 'No se pudo actualizar el estado del pedido',
        duration: 3000,
      });
    }
  };

  const handleViewOrder = (order: any) => {
    setViewingOrder(order);
    setShowOrderDetails(true);
  };

  const calculateBalance = (order: any) => {
    const total = order.total || 0;
    const paid = order.amount_paid || 0;
    return total - paid;
  };

  const getPaymentStatusBadge = (order: any) => {
    const balance = calculateBalance(order);
    
    if (balance <= 0) {
      return <Badge variant="success">PAGADO</Badge>;
    } else if (order.amount_paid > 0) {
      return <Badge variant="warning">ABONADO</Badge>;
    } else {
      return <Badge variant="destructive">PENDIENTE</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    // Búsqueda por texto
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const customerName = (order.customer_name || order.client_name || '').toLowerCase();
    const orderName = (order.name || order.title || '').toLowerCase();
    const orderNumber = (order.number || order.order_number || '').toString().toLowerCase();
    const productMatches = Array.isArray(order.products)
      ? order.products.some((p: any) =>
          (p.name || p.product_name || '').toLowerCase().includes(normalizedQuery)
        )
      : false;

    const matchesSearch =
      !normalizedQuery ||
      customerName.includes(normalizedQuery) ||
      orderName.includes(normalizedQuery) ||
      orderNumber.includes(normalizedQuery) ||
      productMatches;
    
    // Filtros especiales desde el dashboard
    if (statusFilter === 'to-expire') {
      // Pedidos a vencer: próximos 7 días y NO listos para entrega, entregados ni cancelados
      if (!order.due_date) return false;
      if (order.status === 'LISTO PARA ENTREGA' || order.status === 'ENTREGADO' || order.status === 'CANCELADO') return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const dueDate = new Date(order.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return matchesSearch && dueDate >= today && dueDate <= sevenDaysFromNow;
    }
    
    if (statusFilter === 'overdue') {
      // Pedidos VENCIDOS: fechas pasadas y NO listos para entrega, entregados ni cancelados
      if (!order.due_date) return false;
      if (order.status === 'LISTO PARA ENTREGA' || order.status === 'ENTREGADO' || order.status === 'CANCELADO') return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(order.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return matchesSearch && dueDate < today;
    }
    
    if (statusFilter === 'ready') {
      // Pedidos listos para entrega
      return matchesSearch && order.status === 'LISTO PARA ENTREGA';
    }
    
    if (statusFilter === 'recently-added') {
      // Pedidos recién ingresados: últimas 48 horas
      if (!order.created_at && !order.dateCreated) return false;
      
      const now = new Date();
      const orderDate = new Date(order.dateCreated || order.created_at);
      const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      
      // Solo pedidos de las últimas 48 horas que estén en estados de ingreso
      const isInIngresoStatus = order.status === 'PEDIDO INGRESADO' || order.status === 'PENDIENTE DE INFORMACIÓN';
      return matchesSearch && hoursDiff <= 48 && isInIngresoStatus;
    }

    if (statusFilter.startsWith('trello-list:')) {
      const listId = statusFilter.replace('trello-list:', '');
      return matchesSearch && order.trello_list_id === listId;
    }
    
    // Filtros normales por estado
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Función de ordenamiento
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        // Más reciente primero (por fecha de creación de la tarjeta)
        const dateA = new Date(a.dateCreated || a.created_at || a.date || 0).getTime();
        const dateB = new Date(b.dateCreated || b.created_at || b.date || 0).getTime();
        return dateB - dateA;
      case 'oldest':
        // Más antiguo primero (por fecha de creación de la tarjeta)
        const dateA2 = new Date(a.dateCreated || a.created_at || a.date || 0).getTime();
        const dateB2 = new Date(b.dateCreated || b.created_at || b.date || 0).getTime();
        return dateA2 - dateB2;
      case 'orderNumber':
        // Por número de pedido (consecutivo)
        const numA = parseInt(a.number || '0', 10);
        const numB = parseInt(b.number || '0', 10);
        return numA - numB;
      case 'dueDate':
        // Por fecha de entrega (próximos primero)
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'client':
        // Alfabético por cliente
        return (a.customer_name || '').localeCompare(b.customer_name || '');
      case 'amount':
        // Por monto (mayor primero)
        return (b.total_amount || 0) - (a.total_amount || 0);
      default:
        // Por defecto: por número de pedido
        const numA_def = parseInt(a.number || '0', 10);
        const numB_def = parseInt(b.number || '0', 10);
        return numA_def - numB_def;
    }
  });

  const isClosedOrder = (order: any) =>
    order.status === 'LISTO PARA ENTREGA' ||
    order.status === 'ENTREGADO' ||
    order.status === 'CANCELADO';

  const getDueDate = (order: any) => order.due_date || order.due_at;

  const overdueCount = orders.filter(o => {
    const rawDate = getDueDate(o);
    if (!rawDate || isClosedOrder(o)) return false;
    const dueDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  const expiringCount = orders.filter(o => {
    const rawDate = getDueDate(o);
    if (!rawDate || isClosedOrder(o)) return false;
    const dueDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= sevenDaysFromNow;
  }).length;

  const urgentCount = orders.filter(o => {
    const rawDate = getDueDate(o);
    if (!rawDate || isClosedOrder(o)) return false;
    const dueDate = new Date(rawDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= threeDaysFromNow;
  }).length;

  const countByStatus = (statuses: string[]) =>
    orders.filter(o => statuses.includes(o.status)).length;

  const recentCount = (() => {
    const now = new Date();
    return orders.filter(o => {
      const rawDate = o.dateCreated || o.created_at;
      if (!rawDate) return false;
      const orderDate = new Date(rawDate);
      const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 48 && ['PEDIDO INGRESADO', 'PENDIENTE DE INFORMACIÓN'].includes(o.status);
    }).length;
  })();

  const dashboardStats = [
    { label: 'Urgentes', value: urgentCount, helper: 'Requieren atencion', filter: 'to-expire', tone: 'danger', Icon: AlertTriangle },
    { label: 'Total', value: orders.length, helper: 'Pedidos visibles', filter: 'all', tone: 'neutral', Icon: ShoppingCart },
    { label: 'Ingreso', value: countByStatus(['PENDIENTE DE INFORMACIÓN', 'PEDIDO INGRESADO']), helper: 'En ingreso', filter: 'PEDIDO INGRESADO', tone: 'amber', Icon: Plus },
    { label: 'Diseño', value: countByStatus(['DISEÑO EN PROCESO', 'PENDIENTE DE CONFIRMACIÓN', 'REVISIÓN DE ÁREA', 'DISEÑO FINALIZADO']), helper: 'En diseno', filter: 'DISEÑO EN PROCESO', tone: 'violet', Icon: Edit },
    { label: 'Produccion', value: countByStatus(['PEDIDO LISTO PARA IMPRESIÓN', 'IMPRESIÓN EN PROCESO', 'CORTE EN PROCESO', 'IMPRESIÓN Y CORTE FINALIZADA', 'PEDIDO LISTO PARA SUBLIMACIÓN', 'SUBLIMACIÓN EN PROCESO', 'SUBLIMACIÓN TERMINADA', 'CORTE PVC, ACRÍLICO', 'CORTE FINALIZADO', 'INSTALACIÓN']), helper: 'En produccion', filter: 'IMPRESIÓN EN PROCESO', tone: 'blue', Icon: Send },
    { label: 'Listos', value: countByStatus(['LISTO PARA ENTREGA', 'ENTREGADO']), helper: 'Listos para entrega', filter: 'ready', tone: 'green', Icon: Check },
  ];

  const statusGroups = [
    {
      title: 'Ingreso',
      tone: 'amber',
      items: [
        { label: 'Nuevo', filter: 'recently-added', value: recentCount },
        { label: 'Info', filter: 'PENDIENTE DE INFORMACIÓN', value: countByStatus(['PENDIENTE DE INFORMACIÓN']) },
        { label: 'Ingresado', filter: 'PEDIDO INGRESADO', value: countByStatus(['PEDIDO INGRESADO']) },
      ],
    },
    {
      title: 'Diseño',
      tone: 'violet',
      items: [
        { label: 'Proceso', filter: 'DISEÑO EN PROCESO', value: countByStatus(['DISEÑO EN PROCESO']) },
        { label: 'Confirmar', filter: 'PENDIENTE DE CONFIRMACIÓN', value: countByStatus(['PENDIENTE DE CONFIRMACIÓN']) },
        { label: 'Revisión', filter: 'REVISIÓN DE ÁREA', value: countByStatus(['REVISIÓN DE ÁREA']) },
        { label: 'Final', filter: 'DISEÑO FINALIZADO', value: countByStatus(['DISEÑO FINALIZADO']) },
      ],
    },
    {
      title: 'Producción',
      tone: 'blue',
      items: [
        { label: 'Impresión', filter: 'IMPRESIÓN EN PROCESO', value: countByStatus(['PEDIDO LISTO PARA IMPRESIÓN', 'IMPRESIÓN EN PROCESO']) },
        { label: 'Sublimación', filter: 'SUBLIMACIÓN EN PROCESO', value: countByStatus(['PEDIDO LISTO PARA SUBLIMACIÓN', 'SUBLIMACIÓN EN PROCESO', 'SUBLIMACIÓN TERMINADA']) },
        { label: 'Corte', filter: 'CORTE EN PROCESO', value: countByStatus(['CORTE EN PROCESO', 'CORTE PVC, ACRÍLICO', 'CORTE FINALIZADO']) },
        { label: 'Instalar', filter: 'INSTALACIÓN', value: countByStatus(['INSTALACIÓN']) },
      ],
    },
    {
      title: 'Salida',
      tone: 'green',
      items: [
        { label: 'Listo', filter: 'LISTO PARA ENTREGA', value: countByStatus(['LISTO PARA ENTREGA']) },
        { label: 'Entregado', filter: 'ENTREGADO', value: countByStatus(['ENTREGADO']) },
        { label: 'Cancelado', filter: 'CANCELADO', value: countByStatus(['CANCELADO']) },
      ],
    },
  ];

  const allStatusOptions = trelloLists.map((list, index) => ({
    label: list.name,
    filter: `trello-list:${list.id}`,
    short: list.name,
    tone: index < 2 ? 'amber' : index < Math.max(trelloLists.length - 3, 2) ? 'blue' : 'green',
    Icon: index < 2 ? Plus : index < Math.max(trelloLists.length - 3, 2) ? Send : Check,
    value: orders.filter((order) => order.trello_list_id === list.id).length,
  }));
  const visibleStatusOptions = showAllStatusFilters
    ? allStatusOptions
    : allStatusOptions.filter((item) => item.value > 0 || item.filter === statusFilter).slice(0, 8);

  const activeFilterLabel =
    statusFilter === 'all' ? 'Todos' :
    statusFilter === 'to-expire' ? 'Por vencer' :
    statusFilter === 'overdue' ? 'Vencidos' :
    statusFilter === 'ready' ? 'Listos' :
    statusFilter === 'recently-added' ? 'Nuevos' :
    statusFilter;

  const findDuplicates = () => {
    console.log('🔍 Buscando pedidos duplicados...');
    
    const duplicateGroups: any[] = [];
    const seen = new Map<string, any[]>();
    
    // Agrupar por diferentes criterios
    orders.forEach(order => {
      // Criterio 1: Mismo número de pedido
      if (order.number) {
        const key = `number_${order.number}`;
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(order);
      }
      
      // Criterio 2: Mismo trello_card_id (si existe)
      if (order.trello_card_id) {
        const key = `trello_${order.trello_card_id}`;
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(order);
      }
      
      // Criterio 3: Mismo cliente + fecha + total similar (±10 lempiras)
      if (order.customer_name && order.created_at && order.total) {
        const dateKey = new Date(order.created_at).toISOString().split('T')[0];
        const totalKey = Math.floor(order.total / 10) * 10; // Redondear a decenas
        const key = `combo_${order.customer_name.toLowerCase()}_${dateKey}_${totalKey}`;
        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(order);
      }
    });
    
    // Filtrar solo grupos con duplicados
    seen.forEach((group, key) => {
      if (group.length > 1) {
        // Eliminar duplicados exactos del mismo pedido
        const uniqueOrders = Array.from(new Map(group.map(o => [o.id, o])).values());
        
        if (uniqueOrders.length > 1) {
          duplicateGroups.push({
            key,
            criterion: key.startsWith('number_') ? 'Mismo número' : 
                      key.startsWith('trello_') ? 'Mismo Trello ID' : 
                      'Cliente + Fecha + Total similar',
            orders: uniqueOrders.sort((a, b) => 
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )
          });
        }
      }
    });
    
    console.log(`📊 Encontrados ${duplicateGroups.length} grupos de duplicados`);
    
    if (duplicateGroups.length === 0) {
      toast.success('✅ No se encontraron duplicados', {
        description: 'Todos los pedidos son únicos',
        duration: 3000,
      });
      return;
    }
    
    // Ordenar grupos por cantidad de duplicados
    duplicateGroups.sort((a, b) => b.orders.length - a.orders.length);
    
    setDuplicates(duplicateGroups);
    setShowDuplicatesDialog(true);
    
    toast.info(`⚠️ ${duplicateGroups.length} grupos de duplicados encontrados`, {
      description: 'Revisa y elimina los que no necesites',
      duration: 5000,
    });
  };

  const toggleOrderForDeletion = (orderId: string) => {
    const newSet = new Set(selectedForDeletion);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedForDeletion(newSet);
  };

  const selectAllInGroup = (groupOrders: any[]) => {
    // Seleccionar todos excepto el más reciente
    const newSet = new Set(selectedForDeletion);
    groupOrders.slice(1).forEach(order => {
      newSet.add(order.id);
    });
    setSelectedForDeletion(newSet);
  };

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) {
      toast.error('⚠️ No hay pedidos seleccionados', {
        description: 'Selecciona al menos un pedido para eliminar',
        duration: 3000,
      });
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar ${selectedForDeletion.size} pedido(s) duplicado(s)?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log(`🗑️ Eliminando ${selectedForDeletion.size} pedidos duplicados...`);
      
      for (const orderId of Array.from(selectedForDeletion)) {
        console.log(`Eliminando ${orderId} en Supabase...`);
        await api.deleteOrder(orderId);
      }
      
      toast.success(`✅ ${selectedForDeletion.size} pedidos eliminados`, {
        description: 'Cambios guardados en Supabase',
        duration: 5000,
      });
      
      // Limpiar selección y recargar
      setSelectedForDeletion(new Set());
      setShowDuplicatesDialog(false);
      await loadOrders();
      
    } catch (error: any) {
      console.error('❌ Error al eliminar duplicados:', error);
      toast.error('❌ Error al eliminar pedidos', {
        description: error.message || 'No se pudieron eliminar los pedidos',
        duration: 5000,
      });
    }
  };

  // 🔍 Obtener detalles de una tarjeta de Trello
  const handleViewTrelloCard = async (order: any) => {
    if (!order.trello_card_id) {
      toast.error('⚠️ Este pedido no tiene tarjeta de Trello', {
        duration: 3000,
      });
      return;
    }

    try {
      setLoadingCardDetails(true);
      setShowTrelloCardDetails(true);
      
      console.log(`🔍 Obteniendo detalles de tarjeta ${order.trello_card_id}...`);
      
      const result = await api.getTrelloCardDetails(order.trello_card_id);
      
      if (result.success && result.card) {
        setSelectedTrelloCard({
          ...result.card,
          orderId: order.id,
          orderNumber: order.number,
          customerName: order.customer_name
        });
        
        console.log('✅ Detalles de tarjeta obtenidos:', result.card);
      } else {
        throw new Error('No se pudieron obtener los detalles de la tarjeta');
      }
    } catch (error: any) {
      console.error('❌ Error al obtener detalles de tarjeta:', error);
      setShowTrelloCardDetails(false);
      
      toast.error('❌ Error al obtener tarjeta de Trello', {
        description: error.message || 'No se pudo conectar con Trello',
        duration: 5000,
      });
    } finally {
      setLoadingCardDetails(false);
    }
  };

  // 🔄 Actualizar pedido desde su tarjeta de Trello
  const handleUpdateFromTrello = async (order: any) => {
    if (!order.trello_card_id) {
      toast.error('⚠️ Este pedido no tiene tarjeta de Trello', {
        duration: 3000,
      });
      return;
    }

    try {
      setUpdatingFromTrello(order.id);
      
      console.log(`🔄 Actualizando pedido ${order.number} desde tarjeta de Trello...`);
      console.log(`📌 Order ID: ${order.id}, Card ID: ${order.trello_card_id}`);
      
      if (!order.trello_card_id) {
        throw new Error('Este pedido no tiene una tarjeta de Trello asociada');
      }
      
      const result = await api.updateOrderFromTrelloCard(order.id, order.trello_card_id);
      
      console.log('📥 Resultado de la API:', result);
      
      if (result.success && result.updates) {
        await api.updateOrder(order.id, { ...order, ...result.updates });
        
        await loadOrders();
        
        toast.success('✅ Pedido actualizado desde Trello', {
          description: `Estado: ${result.updates.status}${result.updates.labels ? ' | Etiquetas: ' + result.updates.labels : ''}`,
          duration: 5000,
        });
        
        console.log('✅ Pedido actualizado:', result.updates);
      } else {
        const errorMsg = result.error || 'No se pudo actualizar el pedido';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error al actualizar desde Trello:', error);
      
      // Mostrar error más descriptivo
      let errorDescription = error.message || 'No se pudo sincronizar con Trello';
      
      // Si el error menciona configuración, dar más detalles
      if (errorDescription.includes('Configuración')) {
        errorDescription = 'Por favor configura las credenciales de Trello en Ajustes > Trello > Configuración Automática';
      }
      
      toast.error('❌ Error al actualizar pedido desde Trello', {
        description: errorDescription,
        duration: 8000,
      });
    } finally {
      setUpdatingFromTrello(null);
    }
  };

  return (
    <div className="app-page orders-page space-y-6">
      <div className="orders-board space-y-3">
        <section className="orders-command-center">
          <div className="orders-hero">
            <div className="orders-title-block">
              <div className="orders-page-mark">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h1>Pedidos</h1>
                <p>{filteredOrders.length} visibles / {orders.length} total / {activeFilterLabel}</p>
              </div>
            </div>

            <div className="orders-primary-actions">
              <Button
                onClick={() => setStatusFilter('overdue')}
                variant={statusFilter === 'overdue' ? 'default' : 'outline'}
                disabled={loading}
                className="orders-action-chip orders-action-chip--danger"
                title="Vencidos"
              >
                <Clock className="h-4 w-4" />
                <span>Vencidos</span>
                <strong>{overdueCount}</strong>
              </Button>
              <Button
                onClick={() => setStatusFilter('to-expire')}
                variant={statusFilter === 'to-expire' ? 'default' : 'outline'}
                disabled={loading}
                className="orders-action-chip orders-action-chip--warning"
                title="Por vencer"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Vence</span>
                <strong>{expiringCount}</strong>
              </Button>

              {trelloConfigured && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loading || isSyncing}
                      className="orders-icon-action"
                      title="Sincronizar Trello"
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Trello</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem
                      onClick={handleSyncAllFromTrello}
                      disabled={loading || isSyncing}
                      className="cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2 text-purple-600" />
                      Mostrar todas
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSyncFromTrello}
                      disabled={loading || isSyncing}
                      className="cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                      Revisar nuevas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                onClick={() => onNavigate('order-form')}
                variant="default"
                className="orders-new-button"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </div>

          <div className="orders-system-row">
            <div className={`orders-sync-pill ${trelloConfigured ? 'is-ready' : 'is-muted'}`}>
              {trelloConfigured ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{trelloConfigured ? 'Trello activo' : 'Trello opcional'}</span>
              {lastSync && <small>{format(lastSync, 'dd/MM HH:mm', { locale: es })}</small>}
            </div>
            {!trelloConfigured && (
              <Button
                onClick={() => onNavigate('settings')}
                variant="ghost"
                size="sm"
                className="orders-link-button"
              >
                Configurar
              </Button>
            )}
            {statusFilter !== 'all' && (
              <Button
                onClick={() => setStatusFilter('all')}
                variant="ghost"
                size="sm"
                className="orders-clear-filter"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </section>

        {/* Error de sincronización */}
        {syncError && (
          <Alert className="bg-red-50 border-red-400">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>❌ Error al revisar Trello:</strong> {syncError}
              <Button
                onClick={handleSyncFromTrello}
                variant="outline"
                size="sm"
                className="ml-4 border-red-600 text-red-600 hover:bg-red-100"
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section className="orders-flow-strip orders-flow-modern">
          <button type="button" className="orders-flow-arrow" aria-label="Grupo anterior de columnas">
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="orders-flow-pills">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`orders-filter-pill orders-filter-pill--all ${statusFilter === 'all' ? 'is-active' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span>Todos</span>
              <strong>{orders.length}</strong>
            </button>

            {visibleStatusOptions.map((item) => {
              const FlowIcon = item.Icon || Filter;
              return (
              <button
                key={item.filter}
                type="button"
                onClick={() => setStatusFilter(item.filter)}
                title={item.label}
                className={`orders-filter-pill orders-tone-${item.tone} ${statusFilter === item.filter ? 'is-active' : ''}`}
              >
                <FlowIcon className="h-3.5 w-3.5" />
                <span>{item.short}</span>
                <strong>{item.value}</strong>
              </button>
            )})}

            {trelloLists.length === 0 && (
              <button
                type="button"
                className="orders-no-trello-lists"
                onClick={handleSyncFromTrello}
                disabled={isSyncing}
              >
                {isSyncing ? 'Cargando listas de Trello...' : 'Cargar listas reales de Trello'}
              </button>
            )}

            {allStatusOptions.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllStatusFilters((value) => !value)}
                className="orders-filter-pill orders-more-pill"
              >
                <span>{showAllStatusFilters ? 'Ver menos' : 'Mas columnas'}</span>
                <strong>{allStatusOptions.length}</strong>
              </button>
            )}
          </div>

          <button type="button" className="orders-flow-arrow" aria-label="Siguiente grupo de columnas">
            <ChevronRight className="h-4 w-4" />
          </button>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="orders-column-select">
              <SelectValue placeholder="Lista de Trello" />
            </SelectTrigger>
            <SelectContent className="max-h-96">
              <SelectItem value="all">Todos los pedidos</SelectItem>
              <SelectItem value="overdue">Vencidos</SelectItem>
              <SelectItem value="to-expire">Por vencer</SelectItem>
              <SelectItem value="ready">Listos para entrega</SelectItem>
              <SelectItem value="recently-added">Nuevos recientes</SelectItem>
              {allStatusOptions.map((item) => (
                <SelectItem key={item.filter} value={item.filter}>
                  {item.label} ({item.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      </div>

      <Card className="orders-results-card border border-gray-300 shadow-lg">
        <CardHeader className="orders-search-panel border-b">
          <div className="orders-toolbar">
            <div className="orders-search-field flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
              <Input
                placeholder="Buscar por cliente o numero..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="orders-search-input pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="orders-status-select">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PEDIDO INGRESADO">Pedido ingresado</SelectItem>
                <SelectItem value="PENDIENTE DE INFORMACIÓN">Pendiente de informacion</SelectItem>
                <SelectItem value="DISEÑO">Diseno</SelectItem>
                <SelectItem value="DISEÑO EN PROCESO">Diseno en proceso</SelectItem>
                <SelectItem value="ESPERANDO APROBACIÓN">Esperando aprobacion</SelectItem>
                <SelectItem value="EN PRODUCCIÓN">En produccion</SelectItem>
                <SelectItem value="CONTROL DE CALIDAD">Control de calidad</SelectItem>
                <SelectItem value="LISTO PARA ENTREGA">Listo para entrega</SelectItem>
                <SelectItem value="ENTREGADO">Entregado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="orders-sort-select">
                <span className="orders-select-label">Ordenar</span>
                <SelectValue placeholder="Numero" />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="orderNumber">Numero</SelectItem>
              <SelectItem value="recent">Recientes</SelectItem>
              <SelectItem value="oldest">Antiguos</SelectItem>
              <SelectItem value="dueDate">Entrega</SelectItem>
              <SelectItem value="client">Cliente A-Z</SelectItem>
              <SelectItem value="amount">Monto</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="orders-count-badge">
            {sortedOrders.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-900">Cargando pedidos...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-12">
              {orders.length === 0 ? (
                <>
                  {/* No hay pedidos en el sistema */}
                  <div className="max-w-2xl mx-auto">
                    {trelloConfigured ? (
                      <>
                        {/* Trello configurado - invitar a importar */}
                        <div className="bg-linear-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-8 mb-6">
                          <ExternalLink className="w-16 h-16 mx-auto mb-4 text-purple-600" />
                          <h3 className="text-gray-900 text-xl font-semibold mb-3">
                            📋 ¿Tienes pedidos en Trello?
                          </h3>
                          <p className="text-gray-800 mb-6">
                            Detectamos que Trello está configurado. Puedes importar todas las tarjetas de tu tablero de Trello para administrarlas aquí.
                          </p>
                          <div className="flex flex-col gap-3 items-center">
                            <Button
                              onClick={handleSyncAllFromTrello}
                              disabled={isSyncing}
                              className="bg-none bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-6"
                            >
                              {isSyncing ? (
                                <>
                                  <div className="w-5 h-5 mr-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  Importando tarjetas...
                                </>
                              ) : (
                                <>
                                  <ExternalLink className="w-5 h-5 mr-3" />
                                  Importar TODAS las Tarjetas de Trello
                                </>
                              )}
                            </Button>
                            <p className="text-sm text-gray-700">
                              O crea un pedido manualmente:
                            </p>
                            <Button
                              onClick={() => onNavigate('order-form')}
                              variant="outline"
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Crear Pedido Manual
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Trello NO configurado - opciones de inicio */}
                        <div className="bg-linear-to-br from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl p-8">
                          <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-center mb-4">
                              <AlertTriangle className="w-16 h-16 text-orange-600" />
                            </div>
                            <h3 className="text-gray-900 text-2xl font-bold mb-3 text-center">
                              ⚙️ Configuración Requerida
                            </h3>
                            <p className="text-gray-800 mb-6 text-center">
                              El sistema ahora guarda los pedidos en <strong>Trello</strong>.
                              Necesitas configurar la integración antes de crear pedidos.
                            </p>
                            
                            <div className="bg-white rounded-lg p-6 mb-6 border border-orange-200">
                              <h4 className="text-gray-900 mb-3">📋 Pasos rápidos:</h4>
                              <ol className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start">
                                  <span className="text-orange-600 mr-2">1.</span>
                                  Ve a <strong>Ajustes → Auto Trello</strong>
                                </li>
                                <li className="flex items-start">
                                  <span className="text-orange-600 mr-2">2.</span>
                                  Sigue las instrucciones para obtener tu API Key y Token
                                </li>
                                <li className="flex items-start">
                                  <span className="text-orange-600 mr-2">3.</span>
                                  Copia el ID de tu tablero de Trello
                                </li>
                                <li className="flex items-start">
                                  <span className="text-orange-600 mr-2">4.</span>
                                  Guarda la configuración
                                </li>
                              </ol>
                            </div>

                            <div className="flex flex-col gap-3 items-center">
                              <Button
                                onClick={() => onNavigate('settings')}
                                className="bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-lg px-8 py-6 shadow-lg"
                              >
                                <ExternalLink className="w-5 h-5 mr-2" />
                                Configurar Trello Ahora
                              </Button>
                              <p className="text-xs text-gray-600">
                                ⏱️ Solo toma 2 minutos configurarlo
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Hay pedidos pero ninguno coincide con el filtro */}
                  <p className="text-gray-900 text-lg mb-2">No hay pedidos que coincidan con el filtro</p>
                  <p className="text-gray-700 text-sm">
                    Intenta cambiar los criterios de búsqueda o filtro.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="orders-data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[rgb(61,58,58)]">Pedido</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Cliente</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Fecha</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Entrega</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Total</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Abono</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Debe</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Pago</TableHead>
                    <TableHead className="text-[rgb(54,54,54)] text-center">Checklist</TableHead>
                    <TableHead className="text-[rgb(54,54,54)]">Estado</TableHead>
                    <TableHead className="text-center text-[rgb(54,54,54)]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.map((order) => {
                    const isSelected = selectedOrderId === order.id;
                    const balance = calculateBalance(order);
                    const amountPaid = order.amount_paid || 0;
                    
                    return (
                      <TableRow 
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        onDoubleClick={() => handleViewOrder(order)}
                        className={`cursor-pointer transition-all duration-200 ${ isSelected ? 'bg-linear-to-r from-blue-100 to-blue-50 border-l-8 border-l-blue-600 shadow-lg shadow-blue-200/50 scale-[1.02]' : 'hover:bg-gray-50 hover:shadow-md' }`}
                        title="Doble clic para ver detalles"
                      >
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{order.number}</span>
                            {order.trello_card_id && (
                              <TooltipProvider>
                                <div className="flex items-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge 
                                        variant="outline" 
                                        className="bg-purple-50 text-purple-700 border-purple-300 text-xs cursor-pointer hover:bg-purple-100 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewTrelloCard(order);
                                        }}
                                      >
                                        📋 Trello
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Click para ver detalles de la tarjeta</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateFromTrello(order);
                                        }}
                                        disabled={updatingFromTrello === order.id}
                                      >
                                        {updatingFromTrello === order.id ? (
                                          <div className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <RefreshCw className="w-3 h-3 text-purple-600" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Actualizar estado desde Trello</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{order.customer_name}</div>
                            {order.customer_phone && (
                              <div className="text-sm text-gray-700">{order.customer_phone}</div>
                            )}
                            {order.labels && (
                              <div className="text-xs text-purple-600 mt-1">🏷️ {order.labels}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900">
                          {order.created_at ? format(new Date(order.created_at), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-gray-900">
                          {order.due_date || order.due_at ? format(new Date(order.due_date || order.due_at), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-lg text-gray-900">L. {order.total?.toFixed(2) || '0.00'}</span>
                        </TableCell>
                        <TableCell>
                          {amountPaid > 0 ? (
                            <span className="text-green-600 font-medium">L. {amountPaid.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {balance > 0 ? (
                            <span className="text-red-600 font-medium">L. {balance.toFixed(2)}</span>
                          ) : (
                            <span className="text-green-600 font-medium">L. 0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(order)}
                        </TableCell>
                        <TableCell className="text-center">
                          {order.checklist_progress ? (
                            <div className="flex items-center justify-center gap-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${ order.checklist_progress.completed === order.checklist_progress.total ? 'bg-green-50 text-green-700 border-green-300' : 'bg-gray-50 text-gray-700 border-gray-300' }`}
                              >
                                {order.checklist_progress.completed === order.checklist_progress.total && '✅ '}
                                {order.checklist_progress.completed}/{order.checklist_progress.total}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botón Ver Detalles */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrder(order);
                              }}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>

                            {/* Botón Crear Tarjeta Trello - Solo si no existe */}
                            {!order.trello_card_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateTrelloCard(order);
                                }}
                                className="border-purple-600 text-purple-600 hover:bg-purple-50"
                                title="Crear tarjeta en Trello"
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Trello
                              </Button>
                            )}

                            {/* Botón Entregar - Solo si está listo para entrega */}
                            {order.status === 'LISTO PARA ENTREGA' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeliverOrder(order.id);
                                }}
                                className="border-green-600 text-green-600 hover:bg-green-50"
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                Entregar
                              </Button>
                            )}

                            {/* Menú de Acciones */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onNavigate('order-form', { orderId: order.id })}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                {order.trello_card_id && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleViewTrelloCard(order)}>
                                      <Info className="w-4 h-4 mr-2" />
                                      Ver Detalles de Trello
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateFromTrello(order)}>
                                      <RefreshCw className="w-4 h-4 mr-2" />
                                      Actualizar desde Trello
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {order.trello_url && (
                                  <DropdownMenuItem onClick={() => window.open(order.trello_url, '_blank')}>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Abrir en Trello
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'PENDIENTE')}>
                                  🟡 Cambiar a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'PENDIENTE DE INFORMACIÓN')}>
                                  🟠 Pendiente de Información
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'DISEÑO')}>
                                  🟣 Cambiar a Diseño
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'DISEÑO EN PROCESO')}>
                                  🎨 Diseño en Proceso
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'ESPERANDO APROBACIÓN')}>
                                  🔵 Esperando Aprobación
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'EN PRODUCCIÓN')}>
                                  🏭 En Producción
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'CONTROL DE CALIDAD')}>
                                  ✅ Control de Calidad
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'LISTO PARA ENTREGA')}>
                                  📦 Listo para Entrega
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'ENTREGADO')}>
                                  🎉 Marcar como Entregado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, 'CANCELADO')}>
                                  ❌ Cancelar Pedido
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Detalles del Pedido - Nuevo componente moderno */}
        <OrderViewDialog
          open={showOrderDetails}
          onOpenChange={setShowOrderDetails}
          order={viewingOrder}
          onEdit={(order) => {
            setOrderToEdit(order);
            setShowOrderDetails(false);
          }}
          onDelete={async (orderId) => {
            await handleDeleteOrder(orderId);
          }}
          onChangeStatus={async (orderId, newStatus) => {
            if (newStatus === 'ENTREGADO') {
              await handleDeliverOrder(orderId);
            } else {
              await handleStatusChange(orderId, newStatus);
            }
          }}
          onDeliver={async (orderId) => {
            await handleDeliverOrder(orderId);
          }}
          onViewTrelloCard={(order) => {
            if (order.trello_url) {
              window.open(order.trello_url, '_blank');
            }
          }}
        />

        <OrderEditDialog
          open={Boolean(orderToEdit)}
          order={orderToEdit}
          onOpenChange={(open) => {
            if (!open) setOrderToEdit(null);
          }}
          onSave={handleLocalOrderUpdate}
        />

      {/* Configuración de Tarjeta de Trello */}
      <TrelloCardConfigDialog
        open={showListSelector}
        onOpenChange={setShowListSelector}
        onConfirm={handleTrelloConfigConfirmed}
      />

      {/* Dialog de Detalles de Tarjeta de Trello */}
      <Dialog open={showTrelloCardDetails} onOpenChange={setShowTrelloCardDetails}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              Detalles de Tarjeta de Trello
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Información sincronizada desde Trello
            </DialogDescription>
          </DialogHeader>

          {loadingCardDetails ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700">Obteniendo información de Trello...</p>
            </div>
          ) : selectedTrelloCard ? (
            <div className="space-y-4">
              {/* Información del Pedido */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Pedido #{selectedTrelloCard.orderNumber}</h3>
                <p className="text-blue-800">{selectedTrelloCard.customerName}</p>
              </div>

              {/* Estado de la Tarjeta */}
              {selectedTrelloCard.closed ? (
                <Alert className="bg-red-50 border-red-300">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <AlertDescription className="text-red-900">
                    ⚠️ Esta tarjeta está archivada en Trello
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-300">
                  <AlertCircle className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-green-900">
                    ✅ Tarjeta activa en Trello
                  </AlertDescription>
                </Alert>
              )}

              {/* Detalles de la Tarjeta */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Nombre de la Tarjeta</p>
                    <p className="font-medium text-gray-900">{selectedTrelloCard.name}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Lista Actual</p>
                    <p className="font-medium text-gray-900">{selectedTrelloCard.listName}</p>
                  </div>
                </div>

                {selectedTrelloCard.due && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Fecha de Entrega</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(selectedTrelloCard.due), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                )}

                {selectedTrelloCard.labels && selectedTrelloCard.labels.length > 0 && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrelloCard.labels.map((label: any, index: number) => (
                        <Badge 
                          key={index}
                          style={{ backgroundColor: label.color || '#gray' }}
                          className={getLabelTextColor(label.color || '')}
                        >
                          {label.name || 'Sin nombre'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrelloCard.desc && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-2">Descripción</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedTrelloCard.desc}</p>
                  </div>
                )}

                {selectedTrelloCard.lastActivity && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Última Actividad</p>
                    <p className="text-sm text-gray-900">
                      {format(new Date(selectedTrelloCard.lastActivity), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-4 border-t border-gray-300">
                <Button
                  onClick={() => {
                    const order = orders.find(o => o.id === selectedTrelloCard.orderId);
                    if (order) {
                      handleUpdateFromTrello(order);
                      setShowTrelloCardDetails(false);
                    }
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar Pedido desde Trello
                </Button>
                <Button
                  onClick={() => {
                    if (selectedTrelloCard.url) {
                      window.open(selectedTrelloCard.url, '_blank');
                    }
                  }}
                  variant="outline"
                  className="flex-1 border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir en Trello
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Pedidos Duplicados */}
      <Dialog open={showDuplicatesDialog} onOpenChange={setShowDuplicatesDialog}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-6xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Pedidos Duplicados Detectados
            </DialogTitle>
            <DialogDescription className="text-gray-700">
              Se encontraron {duplicates.length} grupos de pedidos que podrían estar duplicados.
              Revisa cada grupo y selecciona los que deseas eliminar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Resumen */}
            <Alert className="bg-orange-50 border-orange-300">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Recomendación:</strong> Mantén el pedido más reciente de cada grupo y elimina los demás.
                {selectedForDeletion.size > 0 && (
                  <span className="block mt-2 font-semibold">
                    📝 {selectedForDeletion.size} pedido(s) seleccionado(s) para eliminar
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Grupos de Duplicados */}
            <div className="space-y-4">
              {duplicates.map((group, groupIndex) => (
                <Card key={groupIndex} className="border-2 border-orange-200">
                  <CardHeader className="bg-orange-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-gray-900">
                          Grupo {groupIndex + 1}: {group.criterion}
                        </CardTitle>
                        <p className="text-sm text-gray-700 mt-1">
                          {group.orders.length} pedidos duplicados
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllInGroup(group.orders)}
                        className="border-orange-600 text-orange-600 hover:bg-orange-100"
                      >
                        Seleccionar duplicados
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {group.orders.map((order: any, orderIndex: number) => {
                        const isSelected = selectedForDeletion.has(order.id);
                        const isNewest = orderIndex === 0;
                        
                        return (
                          <div
                            key={order.id}
                            className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${ isSelected ? 'bg-red-50 border-red-400' : isNewest ? 'bg-green-50 border-green-400' : 'bg-white border-gray-300' }`}
                          >
                            {/* Checkbox */}
                            <div className="flex items-center h-full pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOrderForDeletion(order.id)}
                                disabled={isNewest && group.orders.length > 1}
                                className={isNewest ? 'opacity-50' : ''}
                              />
                            </div>

                            {/* Información del Pedido */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">
                                      Pedido #{order.number}
                                    </h4>
                                    {isNewest && (
                                      <Badge className="bg-green-600">MÁS RECIENTE</Badge>
                                    )}
                                    {isSelected && (
                                      <Badge variant="destructive">PARA ELIMINAR</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    Cliente: <span className="font-medium">{order.customer_name}</span>
                                  </p>
                                </div>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Fecha de Creación</p>
                                  <p className="font-medium text-gray-900">
                                    {order.created_at 
                                      ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')
                                      : '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Fecha de Entrega</p>
                                  <p className="font-medium text-gray-900">
                                    {order.due_date || order.due_at
                                      ? format(new Date(order.due_date || order.due_at), 'dd/MM/yyyy')
                                      : '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Total</p>
                                  <p className="font-medium text-gray-900">
                                    L. {order.total?.toFixed(2) || '0.00'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Artículos</p>
                                  <p className="font-medium text-gray-900">
                                    {order.items?.length || 0} producto(s)
                                  </p>
                                </div>
                              </div>

                              {/* Detalles adicionales */}
                              {order.trello_card_id && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Trello ID:</span> {order.trello_card_id}
                                </div>
                              )}
                              
                              {order.items && order.items.length > 0 && (
                                <div className="mt-2 text-xs text-gray-700">
                                  <span className="font-medium">Productos:</span>{' '}
                                  {order.items.map((item: any) => 
                                    item.descripcion || item.product_name
                                  ).join(', ')}
                                </div>
                              )}
                            </div>

                            {/* Botón Ver */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleViewOrder(order);
                                setShowDuplicatesDialog(false);
                              }}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-gray-300">
              <div className="text-sm text-gray-700">
                {selectedForDeletion.size > 0 ? (
                  <span className="font-semibold text-red-600">
                    ⚠️ {selectedForDeletion.size} pedido(s) seleccionado(s) para eliminar
                  </span>
                ) : (
                  <span>Selecciona los pedidos duplicados que deseas eliminar</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDuplicatesDialog(false);
                    setSelectedForDeletion(new Set());
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={selectedForDeletion.size === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar {selectedForDeletion.size > 0 ? `(${selectedForDeletion.size})` : ''}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

