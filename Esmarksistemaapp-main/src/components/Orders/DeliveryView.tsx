import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { getTrelloOrders, updateTrelloOrder, isTrelloConfigured } from '../../utils/trello-orders';
import { getCurrentUserName } from '../../utils/get-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Package, Check, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DeliveryViewProps {
  onNavigate: (view: any, data?: any) => void;
}

export default function DeliveryView({ onNavigate }: DeliveryViewProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deliveringAll, setDeliveringAll] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const handleRealtime = () => {
      loadOrders({ silent: true });
    };

    window.addEventListener('trelloRealtimeUpdate', handleRealtime);
    return () => {
      window.removeEventListener('trelloRealtimeUpdate', handleRealtime);
    };
  }, []);

  const loadOrders = async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Verificar si Trello está configurado
      if (!isTrelloConfigured()) {
        console.info('ℹ️ Trello no está configurado');
        setOrders([]);
        if (silent) {
          return;
        }
        toast.warning('⚠️ Configura Trello', {
          description: 'Ve a Ajustes → Auto Trello para configurar las credenciales',
          duration: 5000,
        });
        return;
      }
      
      // Obtener pedidos desde Trello
      const result = await getTrelloOrders();
      
      if (result.success && result.orders) {
        // Filtrar solo pedidos listos para entrega (no entregados ni cancelados)
        const readyOrders = result.orders.filter(
          (o: any) => o.status === 'LISTO PARA ENTREGA'
        );
        setOrders(readyOrders);
        console.log(`✅ ${readyOrders.length} pedidos listos para entrega`);
      } else {
        throw new Error(result.error || 'Error al cargar pedidos');
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      if (silent) {
        setOrders([]);
        return;
      }
      toast.error('❌ Error al cargar pedidos', {
        description: error.message || 'No se pudieron cargar los pedidos',
        duration: 5000,
      });
      setOrders([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleToggleDelivered = async (order: any) => {
    if (!order.trello_card_id) {
      toast.error('⚠️ Pedido sin tarjeta de Trello', {
        description: 'Este pedido no está vinculado a Trello',
        duration: 3000,
      });
      return;
    }

    if (!confirm(`¿Marcar pedido #${order.number} como ENTREGADO?`)) return;
    
    try {
      console.log(`📦 Marcando pedido ${order.number} como ENTREGADO`);
      
      const deliveryInfo = {
        status: 'ENTREGADO',
        delivered_at: new Date().toISOString(),
        delivered_by: getCurrentUserName()
      };
      
      const result = await updateTrelloOrder(order.trello_card_id, deliveryInfo);
      
      if (result.success) {
        console.log('✅ Pedido marcado como entregado en Trello');
        
        toast.success('🎉 ¡Pedido Entregado!', {
          description: `Pedido #${order.number} movido a la lista de Entregados`,
          duration: 3000,
        });
        
        // Recargar pedidos
        await loadOrders();
      } else {
        throw new Error(result.error || 'Error al actualizar el estado');
      }
      
    } catch (error: any) {
      console.error('Error updating delivery status:', error);
      toast.error('❌ Error al marcar como entregado', {
        description: error.message || 'No se pudo actualizar el estado',
        duration: 3000,
      });
    }
  };

  const handleDeliverAll = async () => {
    if (filteredOrders.length === 0) {
      toast.warning('⚠️ No hay pedidos para entregar', {
        description: 'No hay pedidos listos para entrega',
        duration: 3000,
      });
      return;
    }

    const confirmed = confirm(
      `🚚 ENTREGAR TODOS LOS PEDIDOS\n\n` +
      `Se marcarán ${filteredOrders.length} pedido(s) como ENTREGADOS y se moverán a la lista de Entregados en Trello.\n\n` +
      `¿Deseas continuar?`
    );

    if (!confirmed) return;

    try {
      setDeliveringAll(true);
      
      const deliveryInfo = {
        status: 'ENTREGADO',
        delivered_at: new Date().toISOString(),
        delivered_by: getCurrentUserName()
      };

      let successCount = 0;
      let failCount = 0;

      // Procesar todos los pedidos filtrados
      for (const order of filteredOrders) {
        if (!order.trello_card_id) {
          console.warn(`⚠️ Pedido ${order.number} no tiene tarjeta de Trello`);
          failCount++;
          continue;
        }

        try {
          const result = await updateTrelloOrder(order.trello_card_id, deliveryInfo);
          
          if (result.success) {
            console.log(`✅ Pedido ${order.number} marcado como entregado`);
            successCount++;
          } else {
            console.error(`❌ Error en pedido ${order.number}:`, result.error);
            failCount++;
          }
        } catch (error) {
          console.error(`❌ Error procesando pedido ${order.number}:`, error);
          failCount++;
        }
      }

      // Mostrar resultado
      if (successCount > 0) {
        toast.success(`🎉 ¡${successCount} pedido(s) entregado(s)!`, {
          description: failCount > 0 
            ? `${failCount} pedido(s) no se pudieron entregar` 
            : 'Todos los pedidos fueron movidos a la lista de Entregados',
          duration: 5000,
        });
      }

      if (failCount > 0 && successCount === 0) {
        toast.error('❌ No se pudieron entregar los pedidos', {
          description: 'Verifica la configuración de Trello',
          duration: 5000,
        });
      }

      // Recargar pedidos
      await loadOrders();
      
    } catch (error: any) {
      console.error('Error en entrega masiva:', error);
      toast.error('❌ Error al entregar pedidos', {
        description: error.message || 'Ocurrió un error inesperado',
        duration: 5000,
      });
    } finally {
      setDeliveringAll(false);
    }
  };

  const filteredOrders = orders.filter(order => 
    !searchQuery || 
    order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.number?.toString().includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Entrega de Pedidos</h1>
        <p className="text-gray-800">
          Marcar pedidos como entregados
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <Input
                placeholder="Buscar pedido por cliente o número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {filteredOrders.length > 0 && (
              <Button
                onClick={handleDeliverAll}
                disabled={deliveringAll}
                className="bg-green-600 hover:bg-green-700"
              >
                {deliveringAll ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Entregando...
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    Entregar Todos ({filteredOrders.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay pedidos listos para entrega</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-foreground">
                        Pedido #{order.number}
                      </h3>
                      <Badge className="bg-green-100 text-green-800">
                        {order.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <p>Cliente: {order.customer_name}</p>
                      <p>Teléfono: {order.customer_phone}</p>
                      {order.due_date && (
                        <p>Fecha de entrega: {format(new Date(order.due_date), 'dd/MM/yyyy')}</p>
                      )}
                      <p>Total: L. {order.total?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Button
                      onClick={() => handleToggleDelivered(order)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Marcar como Entregado
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
