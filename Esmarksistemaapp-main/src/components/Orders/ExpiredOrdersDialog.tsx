import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Clock,
  Calendar,
  User,
  Phone,
  Package,
  AlertCircle,
  ExternalLink,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OrderViewDialog from './OrderViewDialog';

interface ExpiredOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: any[];
  onViewOrder?: (order: any) => void;
  onNavigateToList?: () => void;
}

export default function ExpiredOrdersDialog({
  open,
  onOpenChange,
  orders,
  onViewOrder,
  onNavigateToList,
}: ExpiredOrdersDialogProps) {
  const safeOrders = orders || [];
  const calculateDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [viewOrderDialogOpen, setViewOrderDialogOpen] = useState(false);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setViewOrderDialogOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col p-0 bg-linear-to-br from-red-50 to-orange-50">
          {/* Header con gradiente rojo */}
          <div className="relative bg-linear-to-r from-red-600 via-red-700 to-orange-600 text-white p-6">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <DialogHeader>
                <DialogDescription className="sr-only">
                  Lista completa de pedidos vencidos con fechas pasadas
                </DialogDescription>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30 animate-pulse">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                      🚨 Pedidos Vencidos
                      <Badge variant="destructive" className="text-sm px-3 py-1 bg-white text-red-700">
                        {safeOrders.length}
                      </Badge>
                    </DialogTitle>
                    <p className="text-red-100 text-sm mt-1">
                      Pedidos con fechas de entrega pasadas que requieren atención inmediata
                    </p>
                  </div>
                </div>
              </DialogHeader>
            </div>
          </div>

          {/* Contenido con scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            {safeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¡Excelente trabajo!
                </h3>
                <p className="text-gray-600">
                  No hay pedidos vencidos en este momento
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {safeOrders.map((order, idx) => {
                  const daysOverdue = calculateDaysOverdue(order.due_date);
                  
                  return (
                    <div
                      key={order.id || idx}
                      className="group relative bg-white rounded-xl border-2 border-red-200 hover:border-red-400 hover:shadow-lg transition-all overflow-hidden"
                    >
                      {/* Barra lateral de urgencia */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${ daysOverdue > 7 ? 'bg-red-700' : daysOverdue > 3 ? 'bg-red-600' : 'bg-red-500' }`}></div>

                      <div className="p-4 pl-6">
                        {/* Encabezado del pedido */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 text-lg">
                                {order.customer_name || order.client_name || order.name || 'Sin nombre'}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                #{order.order_number || order.number || 'N/A'}
                              </Badge>
                            </div>
                            
                            {/* Estado del pedido */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {order.status}
                              </Badge>
                              
                              {/* Badge de días vencidos */}
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${ daysOverdue > 7 ? 'bg-red-700 text-white' : daysOverdue > 3 ? 'bg-red-600 text-white' : 'bg-red-500 text-white' }`}>
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">
                                  Vencido hace {daysOverdue} día{daysOverdue !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Total del pedido */}
                          <div className="text-right ml-4">
                            <p className="text-xs text-gray-600">Total</p>
                            <p className="text-xl font-bold text-gray-900">
                              L {parseFloat(order.total_amount || 0).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>

                        {/* Información detallada */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          {/* Fecha de vencimiento */}
                          <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                            <Calendar className="w-4 h-4 text-red-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600">Fecha de entrega</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                {format(new Date(order.due_date), "d 'de' MMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>

                          {/* Teléfono */}
                          {order.customer_phone && (
                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                              <Phone className="w-4 h-4 text-green-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600">Teléfono</p>
                                <a 
                                  href={`tel:${order.customer_phone}`}
                                  className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors"
                                >
                                  {order.customer_phone}
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Productos */}
                          {order.items && order.items.length > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                              <Package className="w-4 h-4 text-purple-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-600">Productos</p>
                                <p className="font-semibold text-gray-900 text-sm">
                                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notas si existen */}
                        {order.notes && (
                          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                            <p className="text-xs text-yellow-800">
                              <span className="font-semibold">Nota:</span> {order.notes}
                            </p>
                          </div>
                        )}

                        {/* Botón de ver detalle */}
                        <Button
                          onClick={() => handleViewOrder(order)}
                          variant="outline"
                          size="sm"
                          className="w-full border-2 border-red-300 hover:bg-red-50 hover:border-red-400 text-red-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver detalles completos
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer con acción */}
          {orders.length > 0 && onNavigateToList && (
            <div className="border-t-2 border-red-200 bg-white p-4">
              <Button
                onClick={() => {
                  onNavigateToList();
                  onOpenChange(false);
                }}
                className="w-full bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
              >
                <Package className="w-4 h-4 mr-2" />
                Ver en lista de pedidos
              </Button>
            </div>
          )}
        </DialogContent>

        {/* Dialog para ver detalles del pedido */}
        <OrderViewDialog
          open={viewOrderDialogOpen}
          onOpenChange={setViewOrderDialogOpen}
          order={selectedOrder}
        />
      </Dialog>
    </>
  );
}
