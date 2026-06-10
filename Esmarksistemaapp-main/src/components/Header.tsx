import React, { useState, useEffect, useRef } from 'react';
import { Bell, LogOut, Users, RefreshCw, AlertTriangle, Package, Clock, CheckCircle, FileText, TrendingUp, Crown, UserRound, Wifi } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { connectedUsersManager, ConnectedUser } from '../utils/connected-users';
import { getNotificationSettings, NOTIFICATION_SETTINGS_EVENT } from '../utils/notification-settings';
import { getTrelloOrders } from '../utils/trello-orders';
import { api } from '../utils/api';
import { getCurrentWorkDay, getWorkDayDateKey, isPendingPreviousWorkDay } from '../utils/work-days-api';
import { approveDiscountRequest, DISCOUNT_REQUESTS_EVENT, listDiscountRequests, syncDiscountRequestsFromSupabase } from '../utils/discount-requests';
import ExpiredOrdersDialog from './Orders/ExpiredOrdersDialog';
import ExpiringOrdersDialog from './Orders/ExpiringOrdersDialog';
import TodayDeliveriesDialog from './Orders/TodayDeliveriesDialog';
import PendingQuotesDialog, { type PendingQuote } from './Orders/PendingQuotesDialog';
import LowStockDialog, { type LowStockProduct } from './Inventory/LowStockDialog';
import ConnectedAvatarGroup, { type AvatarGroupUser } from './ConnectedAvatarGroup';
import DayStatusBadge from './DayManagement/DayStatusBadge'; // 📅 Badge de estado del día

interface User {
  id?: string;
  username: string;
  name: string;
  role: string;
  photo?: string;
}

interface HeaderProps {
  onNavigate: (view: any, data?: any) => void;
  user?: User;
  onLogout?: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  details?: string;
  time: string;
  timestamp: Date;
  read: boolean;
  type: 'overdue' | 'stock' | 'delivery' | 'quote' | 'warning' | 'info' | 'success';
  priority: 'high' | 'medium' | 'low';
  action?: () => void;
  metadata?: {
    count?: number;
    items?: string[];
    client?: string;
    orderId?: string;
  };
}

const DISMISSED_NOTIFICATIONS_KEY = 'esmark_dismissed_notifications';

function readDismissedNotifications(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveDismissedNotifications(ids: string[]) {
  try {
    localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // no-op
  }
}

export default function Header({ onNavigate, user, onLogout }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncIn, setNextSyncIn] = useState<number>(300); // 5 minutos en segundos
  const [isTrelloConfigured, setIsTrelloConfigured] = useState(false);
  
  // Estados para diálogos
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [showExpiringDialog, setShowExpiringDialog] = useState(false);
  const [showTodayDeliveriesDialog, setShowTodayDeliveriesDialog] = useState(false);
  const [showPendingQuotesDialog, setShowPendingQuotesDialog] = useState(false);
  const [showLowStockDialog, setShowLowStockDialog] = useState(false);
  const [overdueOrders, setOverdueOrders] = useState<any[]>([]);
  const [upcomingOrders, setUpcomingOrders] = useState<any[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState<any[]>([]);
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const lastRealtimeEventId = useRef<string | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;
  const avatarGroupUsers: AvatarGroupUser[] = user
    ? [
        { ...user, id: user.id || user.username, isCurrent: true },
        ...connectedUsers
          .filter((connectedUser) => connectedUser.id !== user.id && connectedUser.id !== user.username)
          .map((connectedUser) => ({ ...connectedUser, isCurrent: false })),
      ]
    : connectedUsers.map((connectedUser) => ({ ...connectedUser, isCurrent: false }));

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getOrderDisplayName = (order: any) => {
    return order?.client_name || order?.customer_name || order?.name || 'Pedido';
  };

  // 🔔 Cargar notificaciones dinámicas del sistema
  const loadNotifications = async () => {
    const newNotifications: Notification[] = [];
    const notificationSettings = getNotificationSettings();
    const shouldCheckTrelloOrders = isTrelloConfigured && (
      notificationSettings.overdue_orders ||
      notificationSettings.expiring_orders ||
      notificationSettings.new_orders ||
      notificationSettings.order_movements
    );

    try {
      const currentWorkDay = await getCurrentWorkDay();
      if (isPendingPreviousWorkDay(currentWorkDay)) {
        newNotifications.push({
          id: `pending-close-${currentWorkDay!.id}`,
          title: 'Cierre de dia pendiente',
          message: `La jornada del ${getWorkDayDateKey(currentWorkDay!)} sigue abierta`,
          details: 'Debe realizar el cierre pendiente. Haz clic para ir a Cierre de Dia.',
          time: 'Pendiente',
          timestamp: new Date(currentWorkDay!.opened_at),
          read: false,
          type: 'warning',
          priority: 'high',
          action: () => onNavigate('close-day'),
        });
      }

      if (user?.role === 'admin') {
        let discountRequests = listDiscountRequests();
        try {
          discountRequests = await syncDiscountRequestsFromSupabase();
        } catch (error) {
          console.warn('No se pudieron cargar descuentos desde Supabase:', error);
        }
        const pendingDiscounts = discountRequests.filter((request) => request.status === 'pending');
        pendingDiscounts.forEach((request) => {
          newNotifications.push({
            id: `discount-request-${request.id}`,
            title: 'Solicitud de descuento',
            message: `${request.operator.name} solicita L ${request.discountAmount.toFixed(2)} para ${request.customerName || 'pedido en curso'}`,
            details: 'Haz clic para autorizar y aplicar el descuento al pedido del operador.',
            time: 'Ahora',
            timestamp: new Date(request.createdAt),
            read: false,
            type: 'warning',
            priority: 'high',
            action: () => {
              const approved = approveDiscountRequest(request.id, {
                username: user.username,
                name: user.name || user.username,
              });
              if (approved) {
                toast.success('Descuento autorizado', {
                  description: `Se autorizo L ${approved.discountAmount.toFixed(2)} para ${approved.operator.name}`,
                });
                loadNotifications();
              }
            },
            metadata: {
              client: request.customerName,
              items: request.items.slice(0, 5).map((item) => `${item.description} - L ${item.discount.toFixed(2)}`),
            },
          });
        });
      }

      // 1. Pedidos vencidos desde Trello
      if (shouldCheckTrelloOrders) {
        const result = await getTrelloOrders();
        if (result.success && result.orders) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // PEDIDOS VENCIDOS
          const overdueOrdersList = result.orders.filter((o: any) => {
            if (!o.due_date) return false;
            if (o.status === 'LISTO PARA ENTREGA' || o.status === 'ENTREGADO' || o.status === 'CANCELADO') return false;
            const dueDate = new Date(o.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today;
          });

          if (notificationSettings.overdue_orders && overdueOrdersList.length > 0) {
            // Guardar pedidos vencidos en el estado
            setOverdueOrders(overdueOrdersList);
            
            const sortedOverdue = overdueOrdersList.sort((a: any, b: any) => {
              const dateA = new Date(a.due_date).getTime();
              const dateB = new Date(b.due_date).getTime();
              return dateA - dateB; // Más antiguos primero
            });

            const daysOverdue = Math.floor(
              (today.getTime() - new Date(sortedOverdue[0].due_date).getTime()) / (1000 * 60 * 60 * 24)
            );

            newNotifications.push({
              id: 'overdue-orders',
              title: `${overdueOrdersList.length} Pedido${overdueOrdersList.length !== 1 ? 's' : ''} Vencido${overdueOrdersList.length !== 1 ? 's' : ''}`,
              message: `El más antiguo lleva ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''} de retraso`,
              details: `Haz clic para ver todos los pedidos vencidos y tomar acción inmediata`,
              time: 'Ahora',
              timestamp: new Date(),
              read: false,
              type: 'overdue',
              priority: 'high',
              action: () => setShowExpiredDialog(true),
              metadata: {
                count: overdueOrdersList.length,
                items: sortedOverdue.slice(0, 5).map((o: any) =>
                  `${getOrderDisplayName(o)} - ${o.order_number || 'N/A'} (${Math.floor((today.getTime() - new Date(o.due_date).getTime()) / (1000 * 60 * 60 * 24))} días)`
                ),
              }
            });
          }

          // PEDIDOS POR VENCER (próximos 3 días)
          const upcomingOrdersList = result.orders.filter((o: any) => {
            if (!o.due_date) return false;
            if (o.status === 'LISTO PARA ENTREGA' || o.status === 'ENTREGADO' || o.status === 'CANCELADO') return false;
            const dueDate = new Date(o.due_date);
            dueDate.setHours(0, 0, 0, 0);
            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
            return dueDate >= today && dueDate <= threeDaysFromNow;
          });

          if (notificationSettings.expiring_orders && upcomingOrdersList.length > 0) {
            // Guardar pedidos por vencer en el estado
            setUpcomingOrders(upcomingOrdersList);
            
            newNotifications.push({
              id: 'upcoming-orders',
              title: `${upcomingOrdersList.length} Pedido${upcomingOrdersList.length !== 1 ? 's' : ''} Próximo${upcomingOrdersList.length !== 1 ? 's' : ''} a Vencer`,
              message: `Vencen en los próximos 3 días`,
              details: 'Revisa el progreso y asegúrate de cumplir con las fechas de entrega',
              time: 'Hace 15 min',
              timestamp: new Date(Date.now() - 15 * 60 * 1000),
              read: false,
              type: 'warning',
              priority: 'medium',
              action: () => setShowExpiringDialog(true),
              metadata: {
                count: upcomingOrdersList.length,
                items: upcomingOrdersList.slice(0, 5).map((o: any) => {
                  const dueDate = new Date(o.due_date);
                  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return `${getOrderDisplayName(o)} - ${o.order_number || 'N/A'} (${daysUntil} día${daysUntil !== 1 ? 's' : ''})`;
                }),
              }
            });
          }

          // ENTREGAS PARA HOY
          const todayDeliveriesList = result.orders.filter((o: any) => {
            if (!o.due_date || o.status !== 'LISTO PARA ENTREGA') return false;
            const dueDate = new Date(o.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });

          if (notificationSettings.expiring_orders && todayDeliveriesList.length > 0) {
            const totalAmount = todayDeliveriesList.reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount) || 0), 0);
            
            setTodayDeliveries(todayDeliveriesList);
            
            newNotifications.push({
              id: 'today-deliveries',
              title: `${todayDeliveriesList.length} Entrega${todayDeliveriesList.length !== 1 ? 's' : ''} Programada${todayDeliveriesList.length !== 1 ? 's' : ''} para Hoy`,
              message: `Valor total: L ${totalAmount.toFixed(2)}`,
              details: 'Coordina las entregas y confirma que todo esté listo',
              time: 'Hoy',
              timestamp: new Date(),
              read: false,
              type: 'delivery',
              priority: 'high',
              action: () => setShowTodayDeliveriesDialog(true),
              metadata: {
                count: todayDeliveriesList.length,
                items: todayDeliveriesList.map((o: any) =>
                  `${getOrderDisplayName(o)} - ${o.order_number || 'N/A'} (L ${parseFloat(o.total_amount || 0).toFixed(2)})`
                ),
              }
            });
          }

          // COTIZACIONES PENDIENTES
          const pendingQuotesList = result.orders.filter((o: any) => o.status === 'COTIZACIÓN');
          
          if (notificationSettings.new_orders && pendingQuotesList.length > 0) {
            const oldestQuote = pendingQuotesList.reduce((oldest: any, current: any) => {
              const oldestDate = new Date(oldest.created_at || 0).getTime();
              const currentDate = new Date(current.created_at || 0).getTime();
              return currentDate < oldestDate ? current : oldest;
            }, pendingQuotesList[0]);

            const daysOld = Math.floor((today.getTime() - new Date(oldestQuote.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24));

            setPendingQuotes(pendingQuotesList);
            
            newNotifications.push({
              id: 'pending-quotes',
              title: `${pendingQuotesList.length} Cotizacion${pendingQuotesList.length !== 1 ? 'es' : ''} Pendiente${pendingQuotesList.length !== 1 ? 's' : ''}`,
              message: daysOld > 0 ? `La más antigua tiene ${daysOld} día${daysOld !== 1 ? 's' : ''}` : 'Requieren seguimiento',
              details: 'Haz seguimiento con los clientes para convertir cotizaciones en pedidos',
              time: 'Hace 2 horas',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              read: false,
              type: 'quote',
              priority: 'low',
              action: () => setShowPendingQuotesDialog(true),
              metadata: {
                count: pendingQuotesList.length,
                items: pendingQuotesList.slice(0, 5).map((o: any) =>
                  `${getOrderDisplayName(o)} - ${o.order_number || 'N/A'}`
                ),
              }
            });
          }
        }
      }

      // 2. STOCK BAJO desde Supabase
      const lowStockProductsList = notificationSettings.stock_low
        ? ((await api.getProducts()).products || []).filter((p: any) =>
            p.stock !== undefined && p.min_stock !== undefined && p.stock <= p.min_stock
          )
        : [];

      if (lowStockProductsList.length > 0) {
        // Separar productos sin stock y con stock bajo
        const outOfStock = lowStockProductsList.filter((p: any) => p.stock === 0);
        const lowStock = lowStockProductsList.filter((p: any) => p.stock > 0);

        setLowStockProducts(lowStockProductsList);
        
        newNotifications.push({
          id: 'low-stock',
          title: `${lowStockProductsList.length} Producto${lowStockProductsList.length !== 1 ? 's' : ''} con Stock Bajo`,
          message: outOfStock.length > 0 
            ? `${outOfStock.length} agotado${outOfStock.length !== 1 ? 's' : ''}, ${lowStock.length} con stock crítico`
            : `Todos por debajo del stock mínimo`,
          details: 'Revisa el inventario y programa reabastecimiento',
          time: 'Hace 1 hora',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          read: false,
          type: 'stock',
          priority: outOfStock.length > 0 ? 'high' : 'medium',
          action: () => setShowLowStockDialog(true),
          metadata: {
            count: lowStockProductsList.length,
            items: lowStockProductsList.slice(0, 5).map((p: any) => 
              `${p.name} - Stock: ${p.stock}/${p.min_stock} ${p.unit || ''}`
            ),
          }
        });
      }

      const dismissed = new Set(readDismissedNotifications());
      setNotifications(newNotifications.filter((notification) =>
        notification.id.startsWith('pending-close-') || !dismissed.has(notification.id)
      ));
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const dismissNotification = (id: string) => {
    if (id.startsWith('pending-close-')) return;
    saveDismissedNotifications([...readDismissedNotifications(), id]);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAllNotifications = () => {
    saveDismissedNotifications([
      ...readDismissedNotifications(),
      ...notifications
        .filter((notification) => !notification.id.startsWith('pending-close-'))
        .map((notification) => notification.id),
    ]);
    setNotifications((current) => current.filter((notification) => notification.id.startsWith('pending-close-')));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'stock': return <Package className="w-4 h-4 text-orange-600" />;
      case 'delivery': return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case 'quote': return <FileText className="w-4 h-4 text-purple-600" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  // Actualizar lista de usuarios conectados
  useEffect(() => {
    const updateUsers = () => {
      setConnectedUsers(connectedUsersManager.getOtherUsers());
      setLastSyncTime(new Date());
      setNextSyncIn(300); // Reiniciar el contador a 5 minutos
    };

    // Actualizar inmediatamente
    updateUsers();

    // Actualizar cada 3 segundos
    const interval = setInterval(updateUsers, 3000);

    // Escuchar cambios
    window.addEventListener('connectedUsersChanged', updateUsers);

    return () => {
      clearInterval(interval);
      window.removeEventListener('connectedUsersChanged', updateUsers);
    };
  }, []);

  // 🔔 Cargar notificaciones periódicamente
  useEffect(() => {
    // Cargar inmediatamente
    loadNotifications();

    // Actualizar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);

    return () => clearInterval(interval);
  }, [isTrelloConfigured, onNavigate]);

  useEffect(() => {
    const reloadDiscountRequests = () => loadNotifications();
    window.addEventListener(DISCOUNT_REQUESTS_EVENT, reloadDiscountRequests);
    window.addEventListener(NOTIFICATION_SETTINGS_EVENT, reloadDiscountRequests);
    window.addEventListener('storage', reloadDiscountRequests);
    return () => {
      window.removeEventListener(DISCOUNT_REQUESTS_EVENT, reloadDiscountRequests);
      window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, reloadDiscountRequests);
      window.removeEventListener('storage', reloadDiscountRequests);
    };
  }, [user?.role, user?.username]);

  useEffect(() => {
    const handleRealtime = (event: Event) => {
      const settings = getNotificationSettings();
      if (!settings.trello_sync) return;

      loadNotifications();
      setLastSyncTime(new Date());
      setNextSyncIn(300);

      const detail = (event as CustomEvent).detail || {};
      const eventId = detail.eventId || null;
      if (eventId && eventId === lastRealtimeEventId.current) return;
      if (eventId) lastRealtimeEventId.current = eventId;

      const actionType = detail.actionType || '';
      const cardName = detail.cardName || 'Pedido';
      const listName = detail.listName || '';
      const listBeforeName = detail.listBeforeName || '';

      let title = '';
      let description = '';

      if (actionType === 'createCard' && !settings.new_orders) return;
      if (actionType !== 'createCard' && !settings.order_movements) return;

      if (actionType === 'updateCard' && listName) {
        title = 'Pedido movido';
        description = listBeforeName ? `${cardName} -> ${listName}` : `${cardName} a ${listName}`;
      } else if (actionType === 'createCard') {
        title = 'Nuevo pedido en Trello';
        description = cardName;
      } else if (actionType === 'commentCard') {
        title = 'Nuevo comentario en pedido';
        description = cardName;
      } else if (actionType === 'deleteCard') {
        title = 'Pedido eliminado en Trello';
        description = cardName;
      } else if (actionType) {
        title = 'Actualizacion en Trello';
        description = cardName;
      }

      if (title && description) {
        toast.info(title, { description, duration: 4000 });
      }
    };

    window.addEventListener('trelloRealtimeUpdate', handleRealtime);
    return () => {
      window.removeEventListener('trelloRealtimeUpdate', handleRealtime);
    };
  }, [isTrelloConfigured, onNavigate]);

  // Verificar configuración de Trello y countdown de sincronización
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('esmark_settings') || '{}');
    setIsTrelloConfigured(!!(settings.trello_enabled && settings.trello_board_id));

    // Countdown para próxima sincronización
    const countdown = setInterval(() => {
      setNextSyncIn((prev) => {
        if (prev <= 1) {
          setLastSyncTime(new Date());
          return 300; // Reiniciar a 5 minutos
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleViewPendingQuote = (quote: PendingQuote) => {
    onNavigate('orders-list', { orderId: quote.id });
    setShowPendingQuotesDialog(false);
  };

  const handleNavigateToQuotesList = () => {
    onNavigate('orders-list', { initialFilter: 'COTIZACION' });
    setShowPendingQuotesDialog(false);
  };

  const handleNavigateToLowStock = () => {
    onNavigate('inventory', { filter: 'low-stock' });
    setShowLowStockDialog(false);
  };

  return (
    <header className="app-header h-16 flex items-center justify-between px-3 sm:px-6 shadow-lg border-b border-slate-800 relative">
      {/* Barra de color decorativa inferior sutil */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-800"></div>
      
      <div className="flex-1 min-w-0" />

      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 ml-2 sm:ml-4 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Notificaciones"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-white/20 backdrop-blur-sm text-white shadow-lg border border-white/30">
                  {unreadCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-96 bg-white shadow-2xl rounded-2xl border-0" align="end">
            <div className="space-y-0">
              {/* Header limpio y minimalista */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-gray-900 font-bold text-xl">Notifications</h3>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Opciones de notificaciones"
                  title="Opciones de notificaciones"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Lista de notificaciones limpia */}
              <div className="max-h-[500px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 px-5">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">All caught up</p>
                    <p className="text-gray-500 text-sm">We'll notify you about important events</p>
                  </div>
                ) : (
                  notifications
                    .sort((a, b) => {
                      const priorityOrder = { high: 0, medium: 1, low: 2 };
                      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                      if (priorityDiff !== 0) return priorityDiff;
                      return b.timestamp.getTime() - a.timestamp.getTime();
                    })
                    .map((notification, index) => (
                      <div
                        key={notification.id}
                        className={`group relative px-5 py-4 cursor-pointer transition-all hover:bg-gray-50 ${
                          index !== notifications.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                        onClick={() => {
                          dismissNotification(notification.id);
                          if (notification.action) notification.action();
                        }}
                      >
                        <div className="flex gap-3">
                          {/* Avatar/Icono con indicador de estado */}
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              notification.type === 'overdue' ? 'bg-red-100' :
                              notification.type === 'stock' ? 'bg-orange-100' :
                              notification.type === 'delivery' ? 'bg-blue-100' :
                              notification.type === 'quote' ? 'bg-purple-100' :
                              notification.type === 'success' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              <div className="w-5 h-5">
                                {getNotificationIcon(notification.type)}
                              </div>
                            </div>
                            {/* Indicador de no leído */}
                            {!notification.read && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          
                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            {/* Mensaje principal */}
                            <p className="text-gray-900 text-sm leading-snug">
                              <span className="font-semibold">{notification.title}</span>
                              {notification.message && (
                                <span className="text-gray-600"> {notification.message}</span>
                              )}
                            </p>
                            
                            {/* Metadata con viñeta */}
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                              <span className="capitalize">
                                {notification.type === 'overdue' ? 'Pedidos' :
                                 notification.type === 'stock' ? 'Inventario' :
                                 notification.type === 'delivery' ? 'Entregas' :
                                 notification.type === 'quote' ? 'Cotizaciones' :
                                 'Sistema'}
                              </span>
                              <span>•</span>
                              <span>{notification.time}</span>
                            </div>
                          </div>
                          
                          {/* Menú de tres puntos */}
                          <button
                            className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Opciones de notificacion"
                            title="Opciones de notificacion"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                            </div>
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
              
              {/* Footer simplificado */}
              {notifications.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <button
                    className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors text-center"
                    onClick={dismissAllNotifications}
                  >
                    Ocultar todas
                  </button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 🔄 Indicador de Sincronización con Trello */}
        {isTrelloConfigured && user && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="relative p-2 hover:bg-white/10 rounded-lg transition-colors group"
                aria-label="Sincronizacion Trello"
                title="Sincronizacion Trello"
              >
                <RefreshCw className={`w-5 h-5 text-blue-400 ${nextSyncIn < 10 ? 'animate-spin' : ''}`} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] font-bold text-white">✓</span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 bg-white" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                    Sincronización Trello
                  </h3>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Activa
                  </Badge>
                </div>
                
                <div className="bg-linear-to-r from-blue-50 to-blue-100 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Próxima sincronización:</span>
                    <span className="text-lg font-bold text-blue-600 font-mono">
                      {formatTimeRemaining(nextSyncIn)}
                    </span>
                  </div>
                  
                  {lastSyncTime && (
                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs text-gray-600">
                        Última sincronización: {lastSyncTime.toLocaleTimeString('es-HN')}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => {
                    loadNotifications();
                    setLastSyncTime(new Date());
                    setNextSyncIn(300);
                  }}
                  className="w-full bg-none bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Ahora
                </Button>

                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-900">
                    <strong>🔄 Auto-sincronización:</strong> El sistema sincroniza automáticamente con Trello cada 5 minutos para importar nuevos pedidos.
                  </p>
                </div>

                <div className="text-xs text-gray-500 text-center">
                  Los pedidos se guardan en Trello como fuente de verdad
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* 📅 Estado del Día Operativo */}
        <DayStatusBadge />

        {/* Usuarios conectados - Siempre visible */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="connected-avatar-group-trigger"
              aria-label={`${avatarGroupUsers.length} usuario${avatarGroupUsers.length !== 1 ? 's' : ''} conectado${avatarGroupUsers.length !== 1 ? 's' : ''}: ${avatarGroupUsers.map((connectedUser) => connectedUser.name).join(', ')}`}
            >
              <ConnectedAvatarGroup users={avatarGroupUsers} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-3xl border-slate-200 bg-white shadow-[0_24px_70px_-22px_rgba(15,23,42,0.45)]"
            align="end"
            sideOffset={10}
          >
            <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 via-white to-blue-50 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-slate-900">Usuarios en línea</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Actividad en tiempo real</p>
                  </div>
                </div>
                <Badge className="shrink-0 gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {avatarGroupUsers.length} conectado{avatarGroupUsers.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>

            <div className="space-y-3 p-4">
              <div className={connectedUsers.length > 3 ? 'max-h-80 space-y-2 overflow-y-auto pr-1' : 'space-y-2'}>
                {/* Usuario actual */}
                {user && (
                  <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-linear-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm shadow-blue-100/70">
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-blue-600 font-bold text-white shadow-md shadow-blue-200">
                        {user.photo ? (
                          <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-sm font-bold leading-snug text-slate-900">
                          {user.name}
                        </p>
                        <Badge className="shrink-0 rounded-full border-0 bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-none">
                          TÚ
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        {user.role === 'admin' ? (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5 text-blue-500" />
                        )}
                        {user.role === 'admin' ? 'Administrador' : 'Operador'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Otros usuarios conectados */}
                {connectedUsers.length > 0 ? (
                  connectedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-linear-to-br from-slate-600 to-slate-800 font-bold text-white shadow-md shadow-slate-200">
                          {u.photo ? (
                            <img src={u.photo} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(u.name)
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{u.name}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          {u.role === 'admin' ? (
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <UserRound className="h-3.5 w-3.5 text-blue-500" />
                          )}
                          {u.role === 'admin' ? 'Administrador' : 'Operador'}
                        </p>
                      </div>
                      <div className="shrink-0 text-[11px] font-bold text-emerald-600">
                        Activo
                      </div>
                    </div>
                  ))
                ) : (
                  !user && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                      <Users className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No hay usuarios conectados</p>
                    </div>
                  )
                )}
              </div>

              {connectedUsers.length === 0 && user && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <Wifi className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Solo tú estás conectado</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                      Los demás usuarios aparecerán aquí al iniciar sesión.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {user && (
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 pl-2 sm:pl-4 border-l border-white/30">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Nombre de usuario - oculto en pantallas muy pequeñas */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/80">{user.role === 'admin' ? 'Administrador' : 'Operador'}</p>
              </div>
            </div>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                title="Cerrar sesión"
                className="text-white hover:text-white hover:bg-white/20 shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Salir</span>
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Diálogos para pedidos vencidos y por vencer */}
      <ExpiredOrdersDialog
        open={showExpiredDialog}
        onOpenChange={setShowExpiredDialog}
        orders={overdueOrders}
        onViewOrder={(order) => {
          onNavigate('orders-list', { orderId: order.id });
          setShowExpiredDialog(false);
        }}
        onNavigateToList={() => {
          onNavigate('orders-list', { initialFilter: 'overdue' });
          setShowExpiredDialog(false);
        }}
      />

      <ExpiringOrdersDialog
        open={showExpiringDialog}
        onOpenChange={setShowExpiringDialog}
        orders={upcomingOrders}
        onViewOrder={(order) => {
          onNavigate('orders-list', { orderId: order.id });
          setShowExpiringDialog(false);
        }}
        onNavigateToList={() => {
          onNavigate('orders-list', { initialFilter: 'to-expire' });
          setShowExpiringDialog(false);
        }}
      />

      <TodayDeliveriesDialog
        open={showTodayDeliveriesDialog}
        onOpenChange={setShowTodayDeliveriesDialog}
        orders={todayDeliveries}
        onViewOrder={(order) => {
          onNavigate('orders-list', { orderId: order.id });
          setShowTodayDeliveriesDialog(false);
        }}
        onNavigateToList={() => {
          onNavigate('orders-list', { initialFilter: 'ready' });
          setShowTodayDeliveriesDialog(false);
        }}
      />

      <PendingQuotesDialog
        open={showPendingQuotesDialog}
        onOpenChange={setShowPendingQuotesDialog}
        quotes={pendingQuotes}
        onViewQuote={handleViewPendingQuote}
        onNavigateToList={handleNavigateToQuotesList}
      />

      <LowStockDialog
        open={showLowStockDialog}
        onOpenChange={setShowLowStockDialog}
        products={lowStockProducts}
        onNavigateToInventory={handleNavigateToLowStock}
      />
    </header>
  );
}
