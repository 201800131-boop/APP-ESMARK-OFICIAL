import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import {
  FileText,
  ShoppingCart,
  Package,
  User,
  Calendar,
  DollarSign,
  Settings,
  LogIn,
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  ExternalLink,
  Monitor
} from 'lucide-react';
import * as api from '../../utils/api';
import { connectedUsersManager, type ConnectedUser } from '../../utils/connected-users';

interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  actionType: string;
  description: string;
  details?: any;
}

interface ActivityLogViewProps {
  embedded?: boolean;
}

export default function ActivityLogView({ embedded = false }: ActivityLogViewProps = {}) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterDate, setFilterDate] = useState<string>('todos');
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    const updateConnectedUsers = () => {
      setConnectedUsers(connectedUsersManager.getConnectedUsers());
    };

    updateConnectedUsers();
    window.addEventListener('connectedUsersChanged', updateConnectedUsers);
    const interval = setInterval(updateConnectedUsers, 5000);

    return () => {
      window.removeEventListener('connectedUsersChanged', updateConnectedUsers);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterType, filterDate, activities]);

  const normalizeActivityLog = (log: any, index: number): ActivityLog => {
    const timestamp = log?.timestamp || log?.created_at || log?.createdAt || new Date().toISOString();
    const details = log?.details && typeof log.details === 'object' ? log.details : {};

    return {
      id: String(log?.id || log?.legacy_id || log?.legacyId || `activity-${index}-${timestamp}`),
      timestamp,
      userName: String(log?.userName || log?.user_name || log?.user || log?.username || 'Sistema'),
      userRole: String(log?.userRole || log?.user_role || log?.role || 'operator'),
      actionType: String(log?.actionType || log?.action_type || log?.type || 'configuracion'),
      description: String(log?.description || log?.descripcion || 'Actividad registrada'),
      details,
    };
  };

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs();
      // Manejar ambos formatos: { logs: [] } o directamente []
      const logsArray = Array.isArray(data) ? data : (data?.logs || []);
      setActivities(logsArray.map(normalizeActivityLog));
    } catch (error) {
      console.error('Error cargando historial:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        act =>
          (act.userName || '').toLowerCase().includes(term) ||
          (act.description || '').toLowerCase().includes(term) ||
          JSON.stringify(act.details || {}).toLowerCase().includes(term)
      );
    }

    // Filtrar por tipo
    if (filterType !== 'todos') {
      filtered = filtered.filter(act => act.actionType === filterType);
    }

    // Filtrar por fecha
    if (filterDate !== 'todos') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(act => {
        const actDate = new Date(act.timestamp);
        if (Number.isNaN(actDate.getTime())) return false;
        const actDateOnly = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
        
        switch (filterDate) {
          case 'hoy':
            return actDateOnly.getTime() === today.getTime();
          case 'ayer':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return actDateOnly.getTime() === yesterday.getTime();
          case 'semana':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return actDateOnly >= weekAgo;
          case 'mes':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return actDateOnly >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredActivities(filtered);
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'pedido_creado':
      case 'pedido_editado':
      case 'pedido_estado':
      case 'pedido_eliminado':
        return <ShoppingCart className="w-5 h-5" />;
      case 'cotizacion_creada':
      case 'cotizacion_editada':
      case 'cotizacion_convertida':
      case 'proforma_creada':
      case 'proforma_eliminada':
      case 'proforma_convertida':
      case 'factura_emitida':
      case 'factura_eliminada':
      case 'recibo_creado':
      case 'recibo_eliminado':
        return <FileText className="w-5 h-5" />;
      case 'producto_creado':
      case 'producto_editado':
      case 'producto_eliminado':
      case 'inventario_ajuste':
        return <Package className="w-5 h-5" />;
      case 'cierre_dia':
      case 'inicio_dia':
        return <Calendar className="w-5 h-5" />;
      case 'caja_chica':
        return <DollarSign className="w-5 h-5" />;
      case 'usuario_login':
      case 'usuario_logout':
        return <LogIn className="w-5 h-5" />;
      case 'configuracion':
      case 'configuracion_fiscal':
        return <Settings className="w-5 h-5" />;
      case 'discount_authorized':
      case 'discount_requested':
        return <ShieldCheck className="w-5 h-5" />;
      case 'trello_sincronizado':
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case 'pedido_creado':
      case 'producto_creado':
        return 'bg-green-500';
      case 'pedido_editado':
      case 'producto_editado':
        return 'bg-blue-500';
      case 'pedido_estado':
        return 'bg-yellow-500';
      case 'pedido_eliminado':
        return 'bg-red-500';
      case 'cotizacion_creada':
      case 'cotizacion_editada':
      case 'cotizacion_convertida':
      case 'proforma_creada':
      case 'proforma_eliminada':
      case 'proforma_convertida':
        return 'bg-purple-500';
      case 'factura_emitida':
      case 'recibo_creado':
        return 'bg-cyan-600';
      case 'factura_eliminada':
      case 'recibo_eliminado':
        return 'bg-red-500';
      case 'cierre_dia':
      case 'inicio_dia':
        return 'bg-indigo-500';
      case 'caja_chica':
        return 'bg-emerald-500';
      case 'usuario_login':
      case 'usuario_logout':
        return 'bg-gray-500';
      case 'configuracion':
      case 'configuracion_fiscal':
        return 'bg-orange-500';
      case 'discount_authorized':
      case 'discount_requested':
        return 'bg-amber-500';
      case 'pago_registrado':
        return 'bg-green-500';
      case 'entrega_realizada':
        return 'bg-green-500';
      case 'cliente_creado':
        return 'bg-blue-500';
      case 'trello_sincronizado':
        return 'bg-blue-500';
      case 'backup_creado':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      pedido_creado: 'Pedido Creado',
      pedido_editado: 'Pedido Editado',
      pedido_estado: 'Estado Cambiado',
      pedido_eliminado: 'Pedido Eliminado',
      cotizacion_creada: 'Cotización',
      cotizacion_editada: 'Cotización Editada',
      cotizacion_convertida: 'Cotización Convertida',
      proforma_creada: 'Proforma Creada',
      proforma_eliminada: 'Proforma Eliminada',
      proforma_convertida: 'Proforma Convertida',
      factura_emitida: 'Factura Emitida',
      factura_eliminada: 'Factura Eliminada',
      recibo_creado: 'Recibo Creado',
      recibo_eliminado: 'Recibo Eliminado',
      producto_creado: 'Producto Nuevo',
      producto_editado: 'Producto Editado',
      producto_eliminado: 'Producto Eliminado',
      cierre_dia: 'Cierre de Día',
      inicio_dia: 'Inicio de Día',
      caja_chica: 'Caja Chica',
      usuario_login: 'Inicio de Sesión',
      usuario_logout: 'Cierre de Sesión',
      configuracion: 'Configuración',
      configuracion_fiscal: 'Configuración Fiscal',
      inventario_ajuste: 'Ajuste Inventario',
      discount_requested: 'Solicitud de Descuento',
      discount_authorized: 'Descuento Autorizado',
      pago_registrado: 'Pago Registrado',
      entrega_realizada: 'Entrega Realizada',
      cliente_creado: 'Cliente Creado',
      trello_sincronizado: 'Sincronizado con Trello',
      backup_creado: 'Backup Creado'
    };
    return labels[type] || type;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportToCSV = () => {
    const headers = ['Fecha/Hora', 'Usuario', 'Rol', 'Acción', 'Descripción', 'Detalles'];
    const rows = filteredActivities.map(act => [
      Number.isNaN(new Date(act.timestamp).getTime()) ? 'Fecha no disponible' : new Date(act.timestamp).toLocaleString('es-HN'),
      act.userName || 'Sistema',
      act.userRole === 'admin' ? 'Administrador' : 'Operador',
      getActionLabel(act.actionType),
      act.description || '',
      JSON.stringify(act.details || {})
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historial_actividad_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className={embedded ? 'activity-log-embedded' : 'app-page min-h-screen'}>
      <div className={embedded ? 'space-y-5' : 'max-w-7xl mx-auto'}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={embedded ? 'text-xl mb-1 text-gray-900 font-semibold' : 'text-3xl mb-2 text-gray-900'}>Historial de Actividad</h1>
            <p className="text-gray-800">Registro completo de todas las acciones realizadas en el sistema</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadActivities}
              variant="outline"
              className="border-blue-300 hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button
              onClick={exportToCSV}
              className="bg-none bg-green-600 hover:bg-green-700 text-white"
              disabled={filteredActivities.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-emerald-200 shadow-md">
          <CardHeader className="bg-linear-to-r from-emerald-50 to-emerald-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Usuarios Conectados
              <Badge variant="outline" className="ml-2">
                {connectedUsers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {connectedUsers.length === 0 ? (
              <p className="text-sm text-gray-700">No hay usuarios conectados en este momento.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connectedUsers.map((connectedUser) => (
                  <div
                    key={connectedUser.id}
                    className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
                  >
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">{connectedUser.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {connectedUser.role === 'admin' ? 'Administrador' : 'Operador'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Actualizado en tiempo real con Supabase.</p>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="mb-6 border-blue-200 shadow-md">
          <CardHeader className="bg-linear-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Búsqueda por texto */}
              <div>
                <label className="block text-sm mb-2 text-gray-900">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <Input
                    placeholder="Usuario, descripción, detalles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por tipo de acción */}
              <div>
                <label className="block text-sm mb-2 text-gray-900">Tipo de Acción</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas las Acciones</SelectItem>
                    <SelectItem value="pedido_creado">Pedidos Creados</SelectItem>
                    <SelectItem value="pedido_editado">Pedidos Editados</SelectItem>
                    <SelectItem value="pedido_estado">Cambios de Estado</SelectItem>
                    <SelectItem value="pedido_eliminado">Pedidos Eliminados</SelectItem>
                    <SelectItem value="cotizacion_creada">Cotizaciones</SelectItem>
                    <SelectItem value="proforma_creada">Proformas Creadas</SelectItem>
                    <SelectItem value="proforma_convertida">Proformas Convertidas</SelectItem>
                    <SelectItem value="factura_emitida">Facturas Emitidas</SelectItem>
                    <SelectItem value="factura_eliminada">Facturas Eliminadas</SelectItem>
                    <SelectItem value="recibo_creado">Recibos Creados</SelectItem>
                    <SelectItem value="recibo_eliminado">Recibos Eliminados</SelectItem>
                    <SelectItem value="producto_creado">Productos Nuevos</SelectItem>
                    <SelectItem value="producto_editado">Productos Editados</SelectItem>
                    <SelectItem value="producto_eliminado">Productos Eliminados</SelectItem>
                    <SelectItem value="cierre_dia">Cierres de Día</SelectItem>
                    <SelectItem value="caja_chica">Caja Chica</SelectItem>
                    <SelectItem value="usuario_login">Inicios de Sesión</SelectItem>
                    <SelectItem value="discount_requested">Solicitudes de Descuento</SelectItem>
                    <SelectItem value="discount_authorized">🔐 Descuentos Autorizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por fecha */}
              <div>
                <label className="block text-sm mb-2 text-gray-900">Período</label>
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todo el Historial</SelectItem>
                    <SelectItem value="hoy">Hoy</SelectItem>
                    <SelectItem value="ayer">Ayer</SelectItem>
                    <SelectItem value="semana">Última Semana</SelectItem>
                    <SelectItem value="mes">Último Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl text-blue-600">{activities.length}</p>
                <p className="text-xs text-gray-800">Total Registros</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-green-600">{filteredActivities.length}</p>
                <p className="text-xs text-gray-800">Filtrados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-purple-600">
                  {activities.filter(a => a.actionType.startsWith('pedido')).length}
                </p>
                <p className="text-xs text-gray-800">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-orange-600">
                  {activities.filter(a => a.actionType.startsWith('producto')).length}
                </p>
                <p className="text-xs text-gray-800">Productos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de actividades */}
        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="bg-linear-to-r from-gray-50 to-gray-100 border-b">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Registro de Actividades
              {filteredActivities.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {filteredActivities.length} registro{filteredActivities.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-700">Cargando historial...</p>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-700 mb-2">No se encontraron actividades</p>
                <p className="text-sm text-gray-600">
                  {searchTerm || filterType !== 'todos' || filterDate !== 'todos'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Las actividades se registrarán aquí automáticamente'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="divide-y">
                  {filteredActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icono */}
                        <div className={`${getActionColor(activity.actionType)} text-white p-3 rounded-lg shrink-0`}>
                          {getActionIcon(activity.actionType)}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getActionColor(activity.actionType)}>
                                  {getActionLabel(activity.actionType)}
                                </Badge>
                                <span className="text-sm text-gray-700">
                                  {formatTimestamp(activity.timestamp)}
                                </span>
                              </div>
                              <p className="text-gray-900">{activity.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-800">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span>{activity.userName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                {activity.userRole === 'admin' ? 'Administrador' : 'Operador'}
                              </Badge>
                            </div>
                            {/* Badge de origen (Trello vs Interfaz) */}
                            {activity.details?.Origen && (
                              <div className="flex items-center gap-1">
                                {activity.details.Origen === 'Trello' ? (
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Trello
                                  </Badge>
                                ) : activity.details.Origen === 'Interfaz Local' ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs flex items-center gap-1">
                                    <Monitor className="w-3 h-3" />
                                    Interfaz
                                  </Badge>
                                ) : null}
                              </div>
                            )}
                          </div>

                          {/* Detalles adicionales */}
                          {activity.details && Object.keys(activity.details).length > 0 && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                              <p className="text-gray-700 mb-1">Detalles:</p>
                              <div className="space-y-1">
                                {Object.entries(activity.details).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="text-gray-800 font-medium">{key}:</span>
                                    <span className="text-gray-800">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
