import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  TrendingUp,
  AlertTriangle,
  Clock,
  Check,
  Users,
  Shield,
  User,
  Wallet,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  RefreshCw,
  Calendar // NUEVO: Icono para dia operativo
} from 'lucide-react';
import { connectedUsersManager, ConnectedUser } from '../utils/connected-users';
import { getTrelloOrders, isTrelloConfigured } from '../utils/trello-orders';
import { api } from '../utils/api';
import ExpiredOrdersDialog from './Orders/ExpiredOrdersDialog';
import ExpiringOrdersDialog from './Orders/ExpiringOrdersDialog';
import OrderViewDialog from './Orders/OrderViewDialog';
import AnimatedOrderList from './AnimatedOrderList';
import { toast } from 'sonner';
import { getNotificationSettings } from '../utils/notification-settings'; // NUEVO: Hook del dia operativo
import { useDay } from '../contexts/DayContext';
import { workDaysAPI } from '../utils/work-days-api';

interface HomeViewProps {
  user?: { name?: string; username?: string };
  onNavigate: (view: any, data?: any) => void;
}

interface SystemUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  created_at: string;
  photo?: string;
}

export default function HomeView({ onNavigate, user }: HomeViewProps) {
  const { currentDay } = useDay();

  const [stats, setStats] = useState({
    pendingOrders: 0,
    upcomingDeliveries: 0,
    lowStock: 0,
    openQuotes: 0,
    ordersToExpire: 0, // Pedidos a vencer (no listos)
    overdueOrders: 0, // Pedidos VENCIDOS (fechas pasadas)
  });
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [pettyCashAmount, setPettyCashAmount] = useState(0);
  const [pettyCashDifference, setPettyCashDifference] = useState(0);
  
  // Nuevos estados para detalles
  const [ordersToExpireDetails, setOrdersToExpireDetails] = useState<any[]>([]);
  const [overdueOrdersDetails, setOverdueOrdersDetails] = useState<any[]>([]);
  const [readyOrdersDetails, setReadyOrdersDetails] = useState<any[]>([]);
  const [lowStockDetails, setLowStockDetails] = useState<any[]>([]);
  const [openQuotesDetails, setOpenQuotesDetails] = useState<any[]>([]);
  
  // Estados para dialogos
  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [showExpiringDialog, setShowExpiringDialog] = useState(false);
  const [selectedOrderToView, setSelectedOrderToView] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadStats();
    loadUsers();
    loadPettyCash();
    
    // SINCRONIZACION AUTOMATICA con Trello cada 60 segundos
    const syncInterval = setInterval(() => {
      console.log('sincronizacion automatica con Trello...');
      loadStats(); // Recargar estadisticas desde Trello
      // No mostrar toast para evitar ruido visual
    }, 60000); // 60 segundos
    
    // Actualizar usuarios conectados cada 3 segundos
    const usersInterval = setInterval(() => {
      setConnectedUsers(connectedUsersManager.getConnectedUsers());
      loadPettyCash(); // Actualizar caja chica tambien
    }, 3000);

    // Escuchar cambios en usuarios conectados
    const handleUsersChange = () => {
      setConnectedUsers(connectedUsersManager.getConnectedUsers());
    };
    window.addEventListener('connectedUsersChanged', handleUsersChange);

    return () => {
      clearInterval(syncInterval); // Limpiar intervalo de sincronizacion
      clearInterval(usersInterval);
      window.removeEventListener('connectedUsersChanged', handleUsersChange);
    };
  }, [currentDay?.id]);

  useEffect(() => {
    const handleRealtime = () => {
      loadStats({ silent: true });
    };

    const handleOnline = () => {
      sessionStorage.removeItem('trello_backend_offline_toast_shown');
      toast.success('Conexion restablecida', {
        description: 'Re-sincronizando pedidos de Trello...',
        duration: 3000,
      });
      loadStats({ silent: true });
    };

    window.addEventListener('trelloRealtimeUpdate', handleRealtime);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('trelloRealtimeUpdate', handleRealtime);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const loadStats = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    try {
      if (!silent) {
        setLoading(true);
      }
      
      console.log('Cargando estadisticas...')      
      // CARGAR PEDIDOS DESDE TRELLO
      let orders: any[] = [];
      
      if (isTrelloConfigured()) {
        console.log('Obteniendo pedidos desde Trello...');
        const result = await getTrelloOrders();
        if (result.success && result.orders) {
          orders = result.orders;
          console.log(` ${orders.length} pedidos cargados desde Trello`);
        } else {
          console.error(' Error obteniendo pedidos de Trello:', result.error);
          // Solo mostrar error en la primera carga (cuando loading es true)
          const backendOffline = /Failed to fetch|No se pudo conectar al servidor|NOT_FOUND|Function not found/i.test(result.error || '');
          const configIncomplete = /Configuracion de Trello incompleta|Configuracion de Trello incompleta|api key\/token|trello_board_id no configurado|Credenciales de Trello faltantes/i.test(result.error || '');
          if (!silent) {
            if (backendOffline) {
              const shown = sessionStorage.getItem('trello_backend_offline_toast_shown');
              if (shown !== 'true') {
                toast.warning('Trello no disponible temporalmente', {
                  description: navigator.onLine === false
                    ? 'Sin internet: mostrando datos cargados previamente. Al reconectar se sincronizar? automaticamente.'
                    : 'Con internet activo, revisa que Supabase Edge Function esta desplegado.',
                  duration: 5000,
                });
                sessionStorage.setItem('trello_backend_offline_toast_shown', 'true');
              }
            } else if (configIncomplete) {
              // Evita toast rojo cuando falta configuracion; ya existe banner y flujo de fallback.
              console.log(' Trello con configuracion incompleta, usando fallback sin alertar error critico.');
            } else {
              toast.error('Error al cargar pedidos de Trello', {
                description: result.error || 'Verifica tu conexion y credenciales',
                duration: 5000,
              });
            }
          }
        }
      } else {
        console.log(' Trello no configurado - estadisticas de pedidos en cero');
        // No mostrar toast repetidamente, solo el banner es suficiente
      }
      
      const { quotes = [] } = await api.getQuotes();
      const { products = [] } = await api.getProducts();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear a medianoche para comparacion correcta
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      console.log('DEBUG - Fecha actual:', today.toISOString());
      console.log(' DEBUG - Fecha limite (7 dias):', sevenDaysFromNow.toISOString());
      console.log('DEBUG - Total de pedidos:', orders.length);
      
      // AANALISIS PREVIO: Ver que tenemos
      const ordersWithDate = orders.filter((o: any) => o.due_date);
      const ordersWithoutDate = orders.filter((o: any) => !o.due_date);
      const ordersByStatus = orders.reduce((acc: any, o: any) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('ANALISIS PREVIO:');
      console.log('  - Pedidos CON fecha:', ordersWithDate.length);
      console.log('  - Pedidos SIN fecha:', ordersWithoutDate.length);
      console.log('  - Pedidos por estado:', ordersByStatus);
      
      // Mostrar algunos ejemplos de pedidos con fecha
      if (ordersWithDate.length > 0) {
        console.log('EJEMPLOS de pedidos con fecha (primeros 3):');
        ordersWithDate.slice(0, 3).forEach((o: any) => {
          console.log('  -', {
            name: o.name,
            status: o.status,
            due_date: o.due_date,
            due_date_type: typeof o.due_date
          });
        });
      }
      
      // DEBUG EXTRA: Pedidos EN PROCESO con fecha de HOY
      const todayStr = today.toISOString().split('T')[0];
      const inProcessToday = orders.filter((o: any) => {
        if (o.status === 'EN PROCESO' && o.due_date) {
          const dueDateStr = new Date(o.due_date).toISOString().split('T')[0];
          return dueDateStr === todayStr;
        }
        return false;
      });
      
      console.log('EDIDOS EN PROCESO QUE VENCEN HOY:', inProcessToday.length);
      if (inProcessToday.length > 0) {
        console.log('etalles de pedidos EN PROCESO hoy:');
        inProcessToday.forEach((o: any) => {
          console.log('  -', {
            name: o.name,
            status: o.status,
            due_date: o.due_date,
            client: o.client_name
          });
        });
      }
      
      // 1. PEDIDOS LISTOS PARA ENTREGA
      const readyOrdersList = orders.filter((o: any) => {
        return o.status === 'LISTO PARA ENTREGA';
      });
      const readyOrders = readyOrdersList.length;
      
      console.log(' Pedidos listos:', readyOrders);
      
      // 2. ENTREGAS PRXIMAS (proximos 7 dias con estado LISTO)
      const upcomingDeliveriesList = orders.filter((o: any) => {
        if (!o.due_date || o.status !== 'LISTO') return false;
        const dueDate = new Date(o.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today && dueDate <= sevenDaysFromNow;
      });
      const upcomingDeliveries = upcomingDeliveriesList.length;
      
      // 2b. PEDIDOS A VENCER (proximos 7 dias)
      const ordersToExpireList = orders.filter((o: any) => {
        if (!o.due_date) {
          return false;
        }
        
        // Excluir pedidos que ya estan listos, entregados o cancelados
        if (o.status === 'LISTO PARA ENTREGA' || o.status === 'ENTREGADO' || o.status === 'CANCELADO') {
          return false;
        }
        
        const dueDate = new Date(o.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // INCLUIR pedidos con fecha en los proximos 7 dias que NO estan finalizados
        const isWithinSevenDays = dueDate >= today && dueDate <= sevenDaysFromNow;
        
        return isWithinSevenDays;
      });
      const ordersToExpire = ordersToExpireList.length;
      
      console.log(' PEDIDOS A VENCER (proximos 7 dias, NO listos/entregados/cancelados):', ordersToExpire);
      console.log('ista completa de pedidos a vencer:', ordersToExpireList.map(o => ({
        name: o.name,
        status: o.status,
        due_date: o.due_date
      })));
      
      // 2c.  PPEDIDOS VENCIDOS (fechas pasadas que NO estan completados)
      const overdueOrdersList = orders.filter((o: any) => {
        if (!o.due_date) {
          return false;
        }
        
        // Excluir pedidos que ya estan listos, entregados o cancelados
        if (o.status === 'LISTO PARA ENTREGA' || o.status === 'ENTREGADO' || o.status === 'CANCELADO') {
          return false;
        }
        
        const dueDate = new Date(o.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // Pedidos con fecha ANTERIOR a hoy
        return dueDate < today;
      });
      const overdueOrders = overdueOrdersList.length;
      
      console.log('PEDIDOS VENCIDOS (fechas pasadas, NO completados):', overdueOrders);
      console.log('ista de pedidos vencidos:', overdueOrdersList.map(o => ({
        name: o.name,
        status: o.status,
        due_date: o.due_date,
        days_overdue: Math.floor((today.getTime() - new Date(o.due_date).getTime()) / (1000 * 60 * 60 * 24))
      })));
      
      // 3. STOCK BAJO
      const lowStock = products.filter((p: any) => 
        p.stock !== undefined && p.min_stock !== undefined && p.stock <= p.min_stock
      ).length;
      
      // 4. COTIZACIONES ABIERTAS
      const openQuotes = quotes.filter((q: any) => 
        q.estado !== 'ACEPTADA' && q.estado !== 'RECHAZADA'
      ).length;
      
      console.log(' Estadisticas cargadas:', {
        readyOrders,
        upcomingDeliveries,
        ordersToExpire,
        overdueOrders,
        lowStock,
        openQuotes,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalQuotes: quotes.length,
        source: 'Pedidos desde Trello, productos y cotizaciones desde Supabase'
      });
      
      setStats({
        pendingOrders: readyOrders,
        upcomingDeliveries,
        ordersToExpire,
        overdueOrders,
        lowStock,
        openQuotes
      });
      
      // Guardar detalles para cada estadistica
      setOrdersToExpireDetails(ordersToExpire > 0 ? ordersToExpireList : []);
      setOverdueOrdersDetails(overdueOrders > 0 ? overdueOrdersList : []);
      setReadyOrdersDetails(readyOrders > 0 ? readyOrdersList : []);
      setLowStockDetails(lowStock > 0 ? products.filter((p: any) => 
        p.stock !== undefined && p.min_stock !== undefined && p.stock <= p.min_stock
      ) : []);
      setOpenQuotesDetails(openQuotes > 0 ? quotes.filter((q: any) => 
        q.estado !== 'ACEPTADA' && q.estado !== 'RECHAZADA'
      ) : []);
      
      // OTIFICACIONES (Solo toast, sin abrir dialogos automaticamente)
      const notificationSettings = getNotificationSettings();
      // Notificacion de pedidos vencidos (sin abrir dialogo)
      if (notificationSettings.overdue_orders && overdueOrders > 0) {
        // Solo mantener el toast como alerta
        toast.error(`{overdueOrders} pedido${overdueOrders !== 1 ? 's' : ''} vencido${overdueOrders !== 1 ? 's' : ''}`, {
          description: `Haz clic en la tarjeta roja para ver detalles`,
          duration: 8000,
        });
      }

      // Notificacion de pedidos proximos a vencer (sin abrir dialogo)
      if (notificationSettings.expiring_orders && ordersToExpire > 0 && overdueOrders === 0) {
        toast.warning(` ${ordersToExpire} pedido${ordersToExpire !== 1 ? 's' : ''} proximo${ordersToExpire !== 1 ? 's' : ''} a vencer`, {
          description: `Haz clic en la tarjeta naranja para mas informacion`,
          duration: 8000,
        });
      }
    }

    catch (error) {
      console.error(' Error cCargando estadisticas:', error);
      
      // Si falla, poner todo en 0
      setStats({
        pendingOrders: 0,
        upcomingDeliveries: 0,
        ordersToExpire: 0,
        overdueOrders: 0,
        lowStock: 0,
        openQuotes: 0
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadUsers = async () => {
    try {
      const { users } = await api.getUsers();
      setAllUsers(users || []);
    } catch (error) {
      console.error('Error cargando usuarios del sistema:', error);
      setAllUsers([]);
    }

    // Cargar usuarios conectados
    setConnectedUsers(connectedUsersManager.getConnectedUsers());
  };

  const loadPettyCash = async () => {
    if (!currentDay?.id) {
      setPettyCashAmount(0);
      setPettyCashDifference(0);
      return;
    }

    try {
      const movementsList = await workDaysAPI.getPettyCashMovements(currentDay.id);
      const totalOut = movementsList
        .filter((m: any) => m.movement_type === 'expense')
        .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
      const totalIn = movementsList
        .filter((m: any) => m.movement_type === 'income')
        .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
      const initialAmount = Number(currentDay.initial_cash_balance || 0);
      const currentAmount = initialAmount + totalIn - totalOut;

      setPettyCashAmount(currentAmount);
      setPettyCashDifference(currentAmount - initialAmount);
    } catch (error) {
      console.error('Error cargando caja chica desde Supabase:', error);
      setPettyCashAmount(0);
      setPettyCashDifference(0);
    }
  };
  const isUserOnline = (userId: string): boolean => {
    return connectedUsers.some(u => u.id === userId);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = () => {
    const name = user?.name?.trim();
    if (name && name.length > 0) return name;

    const username = user?.username?.trim();
    if (username && username.length > 0) return username;

    try {
      const storedUser = JSON.parse(localStorage.getItem('current_user') || 'null');
      return storedUser?.name?.trim() || storedUser?.username?.trim() || 'Usuario';
    } catch {
      return 'Usuario';
    }
  };

  // funcion para sincronizacion manual
  const getKpiTitle = (title: string) => {
    if (title.includes('Vencidos')) return 'Pedidos Vencidos';
    if (title.includes('Vencer')) return 'Pedidos a Vencer';
    return title;
  };

  const getKpiDescription = (description: string) => {
    if (description.includes('Fechas')) return 'Fechas pasadas - Urgente';
    if (description.includes('Hoy')) return 'Hoy, manana y proximos 3 dias';
    return description;
  };

  const handleManualSync = async () => {
    if (!isTrelloConfigured()) {
      toast.error('Trello no configurado', {
        description: 'Configura Trello en Ajustes primero',
        duration: 4000,
      });
      return;
    }

    setIsSyncing(true);
    const notificationSettings = getNotificationSettings();
    if (notificationSettings.trello_sync) {
      toast.info('Sincronizando con Trello...', {
        duration: 2000,
      });
    }

    try {
      await loadStats();
      if (notificationSettings.trello_sync) {
        toast.success('Sincronizacion completada', {
          description: 'Los datos se han actualizado correctamente',
          duration: 3000,
        });
      }
    } catch (error) {
      if (notificationSettings.trello_sync) {
        toast.error('Error en la sincronizacion', {
          description: 'No se pudo conectar con Trello',
          duration: 4000,
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const guardQuickAccess = (items: any[], action: () => void, emptyMessage: string) => {
    if (!items || items.length === 0) {
      toast.info(emptyMessage, { duration: 3000 });
      return;
    }
    action();
  };

  const kpiCards = [
    {
      title: 'edidos Vencidos',
      value: stats.overdueOrders,
      description: 'Fechas pasadas - ?Urgente!',
      icon: AlertTriangle,
      onClick: () => guardQuickAccess(
        overdueOrdersDetails,
        () => setShowExpiredDialog(true),
        'No hay pedidos vencidos para mostrar'
      ),
      critical: true, // Marcador para estilo critico
    },
    {
      title: ' Pedidos a Vencer',
      value: stats.ordersToExpire,
      description: 'Hoy, manana y proximos 3 dias',
      icon: AlertTriangle,
      onClick: () => guardQuickAccess(
        ordersToExpireDetails,
        () => onNavigate('orders-list', { filter: 'to-expire' }),
        'No hay pedidos proximos a vencer'
      ),
      urgent: true, // Marcador para estilo especial
    },
    {
      title: 'Pedidos Listos',
      value: stats.pendingOrders,
      description: 'Listos para entregar',
      icon: Check,
      onClick: () => guardQuickAccess(
        readyOrdersDetails,
        () => onNavigate('orders-list', { filter: 'ready' }),
        'No hay pedidos listos para entrega'
      ),
    },
    {
      title: 'Cotizaciones Abiertas',
      value: stats.openQuotes,
      description: 'Pendientes de respuesta',
      icon: FileText,
      onClick: () => guardQuickAccess(
        openQuotesDetails,
        () => onNavigate('quotes-list'),
        'No hay cotizaciones abiertas'
      ),
    },
  ];

  return (
    <div className="app-page home-dashboard space-y-4">
      {/* Header */}
      <div className="home-dashboard-header flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-1">
            Buenos dias, {getUserName()}!
          </h1>
          <p className="text-sm text-gray-800">
            {new Date().toLocaleDateString('es-HN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        {/* Boton de sincronizacion manual - Posicion prominente */}
        <Button
          variant="outline"
          size="default"
          className="home-sync-button gap-2 hover:bg-blue-50 hover:border-blue-400 border-2 transition-all shadow-sm hover:shadow-md"
          onClick={handleManualSync}
          disabled={isSyncing || !isTrelloConfigured()}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-600' : 'text-gray-700'}`} />
          <span className="font-medium">
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Trello'}
          </span>
        </Button>
      </div>

      {/* Alerta si Trello no esta configurado */}
      {!isTrelloConfigured() && (
        <Alert className="home-trello-alert border-2 border-orange-500 bg-linear-to-r from-orange-50 to-yellow-50">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-sm text-gray-900">
            <p className="font-semibold mb-1"> Trello no configurado</p>
            <p className="text-xs text-gray-700">
              Para ver los pedidos y estadisticas, necesitas configurar la integracion con Trello. 
              <Button
                variant="link"
                className="h-auto p-0 ml-1 text-xs text-blue-600 hover:text-blue-800 underline"
                onClick={() => onNavigate('settings')}
              >
                Ir a Ajustes - Integracion Trello
              </Button>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Acciones Rapidas */}
      <div className="home-top-grid">
      <Card className="home-quick-card border border-gray-200 bg-white shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-900">Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="home-quick-grid grid grid-cols-2 gap-3">
            <Button 
              variant="secondary" className="home-quick-action home-quick-action--order h-16 flex flex-col items-center justify-center gap-2 font-semibold"
              onClick={() => onNavigate('order-form')}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">Nuevo Pedido</span>
            </Button>
            <Button 
              variant="secondary" className="home-quick-action home-quick-action--quote h-16 flex flex-col items-center justify-center gap-2 font-semibold"
              onClick={() => onNavigate('quote-form')}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Cotizacion</span>
            </Button>
            <Button 
              variant="secondary" className="home-quick-action home-quick-action--inventory h-16 flex flex-col items-center justify-center gap-2 font-semibold"
              onClick={() => onNavigate('inventory')}
            >
              <Package className="w-5 h-5" />
              <span className="text-xs">Inventario</span>
            </Button>
            <Button 
              variant="secondary" className="home-quick-action home-quick-action--close h-16 flex flex-col items-center justify-center gap-2 font-semibold"
              onClick={() => onNavigate('close-day')}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-xs">Cerrar Dia</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Caja Chica */}
      <Card
        className="home-petty-card cursor-pointer hover:shadow-xl transition-all border border-gray-200 hover:border-gray-400 bg-linear-to-br from-gray-50 to-gray-100"
        onClick={() => onNavigate('petty-cash')}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
              <Wallet className="w-4 h-4 text-gray-700" />
            </div>
            <CardTitle className="text-sm text-gray-900">Caja Chica</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="home-petty-content">
            <div className="home-petty-balance">
              <p className="text-xs text-gray-700 mb-0.5">Saldo actual en caja</p>
              <p className="home-petty-amount text-xl font-semibold text-gray-900">
                L {pettyCashAmount.toFixed(2)}
              </p>
            </div>
            {pettyCashDifference !== 0 && (
              <Badge
                variant={pettyCashDifference > 0 ? 'success' : 'destructive'}
                className="text-xs"
              >
                {pettyCashDifference > 0 ? '+' : ''}L {Math.abs(pettyCashDifference).toFixed(2)}
              </Badge>
            )}
            {pettyCashDifference === 0 && (
              <Badge variant="outline" className="text-xs bg-white/70 text-green-700 border-green-200">
                Sin ingresos nuevos
              </Badge>
            )}
            <div className="home-petty-hint">
              Ver movimientos
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* KPI Cards - Todos en una fila */}
      <div className="home-kpi-grid">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          const isUrgent = (card as any).urgent;
          const isCritical = (card as any).critical;
          const tone = isCritical
            ? 'danger'
            : isUrgent
              ? 'warning'
              : card.title.includes('Listos')
                ? 'success'
                : card.title.includes('Cotizaciones')
                  ? 'info'
                  : 'neutral';
          return (
            <Card
              key={index}
              className={`home-kpi-card home-kpi-card--${tone} cursor-pointer transition-all`}
              onClick={card.onClick}
            >
              <CardHeader className="home-kpi-header flex flex-row items-center justify-between space-y-0 pb-1.5">
                <div className={`home-kpi-icon home-kpi-icon--${tone}`}>
                  <Icon className="home-kpi-icon-svg" />
                </div>
                <div className="home-kpi-copy">
                  <CardTitle className={`home-kpi-title home-kpi-title--${tone}`}>
                    {getKpiTitle(card.title)}
                  </CardTitle>
                  <p className={`home-kpi-subtitle home-kpi-subtitle--${tone}`}>
                    {getKpiDescription(card.description)}
                  </p>
                </div>
                <span className={`home-kpi-count home-kpi-count--${tone}`}>
                  {loading ? '...' : card.value}
                </span>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* CConsejos del Sistema - Ancho Completo */}
      <Card className="hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-900">Consejos del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0"></div>
              <p className="text-xs text-gray-800">
                Usa el modulo de <span className="font-medium text-gray-900">Pedidos</span> para gestionar ordenes con estados completos
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0"></div>
              <p className="text-xs text-gray-800">
                Configura precios automaticos en <span className="font-medium text-gray-900">Ajustes  Precios</span>
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0"></div>
              <p className="text-xs text-gray-800">
                Los pedidos descontaran automaticamente el stock del inventario
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5 shrink-0"></div>
              <p className="text-xs text-gray-800">
                Sincronizacion automatica con Trello al guardar pedidos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIONES DETALLADAS */}
      {/* Grid de 3 columnas: Vencidos, Proximos a Vencer, Listos */}
      <div className="home-detail-grid grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* PEDIDOS VENCIDOS */}
        <Card className="border-2 border-red-500 bg-linear-to-br from-red-50 to-orange-50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3 bg-linear-to-r from-red-100 to-orange-100 border-b border-red-200">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500 shadow-md animate-pulse">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm text-red-900 flex items-center gap-1.5">
                  Vencidos
                  <Badge variant="destructive" className="text-xs">
                    {overdueOrdersDetails.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-red-700">
                  Fechas pasadas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-3">
            <AnimatedOrderList
              orders={overdueOrdersDetails}
              tone="danger"
              emptyMessage="No hay pedidos vencidos"
              onSelect={setSelectedOrderToView}
              onViewAll={() => onNavigate('orders-list', { filter: 'overdue' })}
            />
          </CardContent>
        </Card>
        
        {/*  PEDIDOS PRXIMOS A VENCER */}
        <Card className="border-2 border-orange-400 bg-linear-to-br from-orange-50 to-yellow-50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3 bg-linear-to-r from-orange-100 to-yellow-100 border-b border-orange-200">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-500 shadow-md">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm text-orange-900 flex items-center gap-1.5">
                   Por Vencer
                  <Badge variant="warning" className="text-xs bg-orange-500 text-white">
                    {ordersToExpireDetails.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-orange-700">
                  Proximos 7 dias
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-3">
            <AnimatedOrderList
              orders={ordersToExpireDetails}
              tone="warning"
              emptyMessage="No hay pedidos próximos a vencer"
              onSelect={setSelectedOrderToView}
              onViewAll={() => onNavigate('orders-list', { filter: 'to-expire' })}
            />
          </CardContent>
        </Card>

        {/*  PEDIDOS LISTOS */}
        <Card className="border-2 border-green-400 bg-linear-to-br from-green-50 to-emerald-50 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3 bg-linear-to-r from-green-100 to-emerald-100 border-b border-green-200">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500 shadow-md">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm text-green-900 flex items-center gap-1.5">
                   Listos
                  <Badge variant="success" className="text-xs">
                    {readyOrdersDetails.length}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-green-700">
                  Para entrega
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-3">
            <AnimatedOrderList
              orders={readyOrdersDetails}
              tone="success"
              emptyMessage="No hay pedidos listos para entregar"
              onSelect={setSelectedOrderToView}
              onViewAll={() => onNavigate('orders-list', { filter: 'ready' })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dialogos para pedidos vencidos y por vencer */}
      <ExpiredOrdersDialog
        open={showExpiredDialog}
        onOpenChange={setShowExpiredDialog}
        orders={overdueOrdersDetails}
        onViewOrder={(order) => {
          // Navegar a la vista de detalle del pedido
          setSelectedOrderToView(order);
          onNavigate('orders-list', { orderId: order.id });
        }}
        onNavigateToList={() => onNavigate('orders-list', { filter: 'overdue' })}
      />

      <ExpiringOrdersDialog
        open={showExpiringDialog}
        onOpenChange={setShowExpiringDialog}
        orders={ordersToExpireDetails}
        onViewOrder={(order) => {
          // Navegar a la vista de detalle del pedido
          setSelectedOrderToView(order);
          onNavigate('orders-list', { orderId: order.id });
        }}
        onNavigateToList={() => onNavigate('orders-list', { filter: 'to-expire' })}
      />

      <OrderViewDialog
        open={selectedOrderToView !== null}
        onOpenChange={() => setSelectedOrderToView(null)}
        order={selectedOrderToView}
        onEdit={(order) => {
          onNavigate('order-form', { orderId: order.id });
        }}
      />
    </div>
  );
}




