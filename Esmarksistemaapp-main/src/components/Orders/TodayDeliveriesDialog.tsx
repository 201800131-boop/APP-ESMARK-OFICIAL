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
  Truck,
  Calendar,
  User,
  Phone,
  Package,
  DollarSign,
  MapPin,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import OrderViewDialog from './OrderViewDialog';

interface Order {
  id: string;
  order_number: string;
  client_name: string;
  client_phone?: string;
  due_date: string;
  total_amount: string | number;
  status: string;
  items?: any[];
  delivery_address?: string;
  customer_name?: string;
  name?: string;
}

interface TodayDeliveriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  onViewOrder?: (order: Order) => void;
  onNavigateToList?: () => void;
}

export default function TodayDeliveriesDialog({
  open,
  onOpenChange,
  orders,
  onViewOrder,
  onNavigateToList,
}: TodayDeliveriesDialogProps) {
  // Validar que orders sea un array
  const validOrders = Array.isArray(orders) ? orders : [];
  
  const totalAmount = validOrders.reduce(
    (sum, order) => sum + (parseFloat(order.total_amount as string) || 0),
    0
  );

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderViewDialogOpen, setIsOrderViewDialogOpen] = useState(false);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderViewDialogOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col bg-linear-to-br from-blue-50 via-white to-cyan-50 p-6">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl text-gray-900">
                  Entregas Programadas para Hoy
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {validOrders.length} pedido{validOrders.length !== 1 ? 's' : ''} listo{validOrders.length !== 1 ? 's' : ''} para entregar
                </DialogDescription>
              </div>
            </div>

            {/* Resumen de entregas */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">ENTREGAS HOY</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{validOrders.length}</p>
              </div>
              
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">VALOR TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  L {totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Fecha actual */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Lista de entregas */}
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            <div className="space-y-3">
              {validOrders.map((order, index) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Número de entrega */}
                    <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-blue-700">
                        {index + 1}
                      </span>
                    </div>

                    {/* Información del pedido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {order.customer_name || order.client_name || order.name || 'Sin nombre'} #{order.order_number || 'N/A'}
                          </h4>
                          <Badge className="bg-green-100 text-green-700 border-2 border-green-300 mt-1">
                            LISTO PARA ENTREGA
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-600">
                            L {(parseFloat(order.total_amount as string) || 0).toLocaleString('es-HN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Información del cliente */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <User className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">{order.client_name}</span>
                        </div>
                        
                        {order.client_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="w-4 h-4 text-green-600" />
                            <a 
                              href={`tel:${order.client_phone}`}
                              className="hover:text-blue-600 hover:underline"
                            >
                              {order.client_phone}
                            </a>
                          </div>
                        )}

                        {order.delivery_address && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin className="w-4 h-4 text-red-600" />
                            <span>{order.delivery_address}</span>
                          </div>
                        )}

                        {order.items && order.items.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Package className="w-4 h-4 text-purple-600" />
                            <span>{order.items.length} producto{order.items.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Botón de acción */}
                      {onViewOrder && (
                        <Button
                          onClick={() => handleViewOrder(order)}
                          variant="outline"
                          size="sm"
                          className="w-full border-2 border-blue-300 hover:bg-blue-50 hover:border-blue-400 text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver detalles de entrega
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="shrink-0 border-t-2 border-gray-200 pt-4 mt-4">
            <div className="flex gap-3">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
              {onNavigateToList && (
                <Button
                  onClick={onNavigateToList}
                  className="flex-1 bg-linear-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Ver todos los pedidos listos
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo de vista de pedido */}
      <OrderViewDialog
        open={isOrderViewDialogOpen}
        onOpenChange={setIsOrderViewDialogOpen}
        order={selectedOrder}
      />
    </>
  );
}
