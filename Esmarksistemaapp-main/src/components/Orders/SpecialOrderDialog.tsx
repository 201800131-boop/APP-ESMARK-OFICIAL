import React, { useState, useEffect } from 'react';
import { safeParse } from '../../utils/safe-parse';
import { api } from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Star, Calendar as CalendarIcon, Plus, Trash2, Check, 
  AlertTriangle, Percent, DollarSign, ShoppingCart, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import DiscountAuthDialog from './DiscountAuthDialog';
import { logActivity } from '../../utils/activity-logger';
import {
  consumeDiscountRequest,
  createDiscountRequest,
  DISCOUNT_REQUESTS_EVENT,
  listDiscountRequests,
  syncDiscountRequestsFromSupabase,
} from '../../utils/discount-requests';

interface SpecialOrderItem {
  descripcion: string;
  cantidad: number;
  precio_original: number;
  precio_con_descuento: number; // CAMBIO: Ahora es el campo principal editable
  descuento_lempiras: number; // Se calcula automáticamente
  subtotal: number;
}

interface SpecialOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: any[];
  settings: any;
  onSaveOrder: (orderData: any) => Promise<void>;
  onTransferDiscount?: (discountAmount: number) => void; // NUEVO: Para transferir descuento
  initialItems?: SpecialOrderItem[]; // Items precargados desde el formulario principal
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialDueDate?: Date;
  initialDueTime?: string;
  currentUser?: { username: string; name: string; role: 'admin' | 'operator' } | null;
}

export default function SpecialOrderDialog({
  open,
  onOpenChange,
  customers,
  settings,
  onSaveOrder,
  onTransferDiscount,
  initialItems = [],
  initialCustomerName = '',
  initialCustomerPhone = '',
  initialDueDate,
  initialDueTime = '12:00',
  currentUser = null
}: SpecialOrderDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState<string>('12:00');
  const [items, setItems] = useState<SpecialOrderItem[]>([]);
  
  // Form temporal para agregar producto
  const [tempItem, setTempItem] = useState({
    descripcion: '',
    cantidad: 1,
    precio_original: 0,
    precio_con_descuento: 0 // CAMBIO: Ahora se edita el precio final directamente
  });

  const [motivoDescuento, setMotivoDescuento] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para el diálogo de autorización
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authorizedBy, setAuthorizedBy] = useState<{ username: string; name: string } | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  // Cargar usuarios desde Supabase
  const [users, setUsers] = useState<any[]>([]);
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const result = await api.getUsers();
        setUsers(result.users || []);
      } catch (error) {
        console.error('Error cargando usuarios para pedido especial:', error);
        setUsers([]);
      }
    };

    void loadUsers();
  }, []);

  // Cargar datos iniciales cuando se abre el diálogo (SIN solicitar autorización automáticamente)
  useEffect(() => {
    if (open) {
      console.log(' [SpecialOrderDialog] Diálogo abierto - Cargando datos iniciales');
      
      // Cargar datos del cliente
      if (initialCustomerName) setCustomerName(initialCustomerName);
      if (initialCustomerPhone) setCustomerPhone(initialCustomerPhone);
      if (initialDueDate) setDueDate(initialDueDate);
      if (initialDueTime) setDueTime(initialDueTime);
      
      // Cargar items iniciales - El precio se puede editar manualmente
      if (initialItems.length > 0) {
        const itemsParaEditar = initialItems.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_original: item.precio_original,
          precio_con_descuento: item.precio_original, // Empieza con el precio original
          descuento_lempiras: 0, // Sin descuento inicial
          subtotal: item.precio_original * item.cantidad
        }));
        setItems(itemsParaEditar);
        
        toast.success('✨ Datos importados', {
          description: `${itemsParaEditar.length} producto(s) - Ahora puedes editar los precios manualmente`,
          duration: 3000,
        });
      }
    } else {
      // LIMPIAR al cerrar
      setAuthorizedBy(null);
      setPendingRequestId(null);
    }
  }, [open, initialItems, initialCustomerName, initialCustomerPhone, initialDueDate, initialDueTime]);

  useEffect(() => {
    if (!open || !pendingRequestId) return;

    const checkApproval = async () => {
      let requests = listDiscountRequests();
      try {
        requests = await syncDiscountRequestsFromSupabase();
      } catch {
        requests = listDiscountRequests();
      }
      const request = requests.find((item) => item.id === pendingRequestId);
      if (request?.status === 'approved' && request.authorizedBy) {
        consumeDiscountRequest(request.id);
        setPendingRequestId(null);
        setAuthorizedBy(request.authorizedBy);
        toast.success('Descuento autorizado por administracion', {
          description: `${request.authorizedBy.name} aprobo el descuento. Se aplicara al pedido.`,
          duration: 4000,
        });
        void applyAuthorizedDiscount(request.authorizedBy);
      }
    };

    checkApproval();
    const interval = window.setInterval(checkApproval, 2000);
    window.addEventListener(DISCOUNT_REQUESTS_EVENT, checkApproval);
    window.addEventListener('storage', checkApproval);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(DISCOUNT_REQUESTS_EVENT, checkApproval);
      window.removeEventListener('storage', checkApproval);
    };
  }, [open, pendingRequestId]);

  const agregarProducto = () => {
    if (!tempItem.descripcion || tempItem.cantidad <= 0 || tempItem.precio_original <= 0) {
      toast.error('⚠️ Completa todos los campos', {
        description: 'Descripción, cantidad y precio original son obligatorios',
        duration: 3000,
      });
      return;
    }

    // CAMBIO: Calcular descuento automáticamente basado en la diferencia de precios
    const precio_con_descuento = tempItem.precio_con_descuento || tempItem.precio_original;
    const descuento_lempiras = tempItem.precio_original - precio_con_descuento;
    const subtotal = precio_con_descuento * tempItem.cantidad;

    // Validar que el precio con descuento no sea negativo
    if (precio_con_descuento < 0) {
      toast.error('Advertencia: Precio inválido', {
        description: 'El precio con descuento no puede ser negativo',
        duration: 3000,
      });
      return;
    }

    const newItem: SpecialOrderItem = {
      descripcion: tempItem.descripcion,
      cantidad: tempItem.cantidad,
      precio_original: tempItem.precio_original,
      precio_con_descuento: precio_con_descuento,
      descuento_lempiras: descuento_lempiras,
      subtotal: subtotal
    };

    setItems([...items, newItem]);
    
    // Reset form
    setTempItem({
      descripcion: '',
      cantidad: 1,
      precio_original: 0,
      precio_con_descuento: 0
    });
    
    toast.success('✅ Producto agregado', {
      duration: 2000,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // NUEVO: Actualizar cantidad de un producto ya agregado
  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      toast.error('⚠️ La cantidad debe ser mayor a 0', {
        duration: 2000,
      });
      return;
    }

    const updatedItems = items.map((item, i) => {
      if (i === index) {
        const subtotal = item.precio_con_descuento * newQuantity;
        return { ...item, cantidad: newQuantity, subtotal };
      }
      return item;
    });

    setItems(updatedItems);
    toast.success('✅ Cantidad actualizada', {
      duration: 2000,
    });
  };

  // NUEVO: Actualizar precio con descuento de un producto ya agregado
  const updateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) {
      toast.error('⚠️ El precio no puede ser negativo', {
        duration: 2000,
      });
      return;
    }

    const updatedItems = items.map((item, i) => {
      if (i === index) {
        const descuento_lempiras = item.precio_original - newPrice;
        const subtotal = newPrice * item.cantidad;
        return { 
          ...item, 
          precio_con_descuento: newPrice,
          descuento_lempiras: descuento_lempiras,
          subtotal 
        };
      }
      return item;
    });

    setItems(updatedItems);
    toast.success('✅ Precio actualizado', {
      description: `Subtotal: L. ${(newPrice * items[index].cantidad).toFixed(2)}`,
      duration: 2000,
    });
  };

  // NUEVO: Actualizar subtotal manualmente (recalcula el precio unitario)
  const updateItemSubtotal = (index: number, newSubtotal: number) => {
    if (newSubtotal < 0) {
      toast.error('⚠️ El subtotal no puede ser negativo', {
        duration: 2000,
      });
      return;
    }

    const updatedItems = items.map((item, i) => {
      if (i === index) {
        // Calcular el nuevo precio unitario basado en el subtotal
        const precio_con_descuento = item.cantidad > 0 ? newSubtotal / item.cantidad : 0;
        const descuento_lempiras = item.precio_original - precio_con_descuento;
        
        return { 
          ...item, 
          precio_con_descuento,
          descuento_lempiras,
          subtotal: newSubtotal
        };
      }
      return item;
    });

    setItems(updatedItems);
    toast.success('✅ Subtotal actualizado', {
      description: `Precio unitario: L. ${(newSubtotal / items[index].cantidad).toFixed(2)}`,
      duration: 2000,
    });
  };

  const calcularTotales = () => {
    // IMPORTANTE: El ISV está INCLUIDO en el precio
    // Por lo tanto, el total es simplemente la suma de subtotales
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Calcular el descuento total aplicado
    const descuento_total = items.reduce((sum, item) => 
      sum + ((item.precio_original - item.precio_con_descuento) * item.cantidad), 0
    );
    
    // Calcular ISV incluido (desglose del total)
    const tasa_isv = (settings.isv_percent || 15) / 100;
    const subtotal_sin_isv = total / (1 + tasa_isv);
    const isv = total - subtotal_sin_isv;
    
    return { 
      subtotal: subtotal_sin_isv, 
      isv, 
      total, 
      descuento_total 
    };
  };

  const totales = calcularTotales();

  const applyAuthorizedDiscount = async (authUser: { username: string; name: string }) => {
    console.log('OK [SpecialOrderDialog] Aplicando descuento autorizado por:', authUser.name);

    await logActivity(
      'discount_authorized',
      `Descuento de L. ${totales.descuento_total.toFixed(2)} autorizado`,
      {
        authorized_by: authUser.name,
        authorized_username: authUser.username,
        discount_amount: totales.descuento_total,
        reason: motivoDescuento,
        items_count: items.length,
        items: items.map(item => ({
          description: item.descripcion,
          original_price: item.precio_original,
          discounted_price: item.precio_con_descuento,
          quantity: item.cantidad,
          discount: item.descuento_lempiras
        }))
      }
    );

    if (onTransferDiscount) {
      onTransferDiscount(totales.descuento_total);
      console.log('OK Descuento transferido:', totales.descuento_total);
    }

    toast.success('Descuento aplicado', {
      description: `Descuento de L. ${totales.descuento_total.toFixed(2)} autorizado por ${authUser.name}`,
      duration: 4000,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleApplyDiscount = async () => {
    console.log(' [SpecialOrderDialog] Iniciando proceso de aplicación de descuento');

    // Validaciones mínimas PRIMERO (antes de pedir autorización)
    if (items.length === 0) {
      toast.error('⚠️ Agrega al menos un producto con descuento', {
        duration: 3000,
      });
      return;
    }

    if (totales.descuento_total === 0) {
      toast.warning('⚠️ No hay descuentos aplicados', {
        description: 'Los productos tienen el precio original',
        duration: 3000,
      });
      return;
    }

    if (!motivoDescuento) {
      toast.error('⚠️ Indica el motivo del descuento', {
        description: 'Es obligatorio justificar los descuentos especiales',
        duration: 3000,
      });
      return;
    }

    if (currentUser?.role === 'admin' && !authorizedBy) {
      const adminAuth = { username: currentUser.username, name: currentUser.name || currentUser.username };
      setAuthorizedBy(adminAuth);
      await applyAuthorizedDiscount(adminAuth);
      return;
    }

    if (!authorizedBy) {
      const request = createDiscountRequest({
        orderDraftId: `order-draft:${Date.now()}`,
        operator: {
          username: currentUser?.username || 'operador',
          name: currentUser?.name || currentUser?.username || 'Operador',
        },
        discountAmount: totales.descuento_total,
        reason: motivoDescuento,
        customerName: customerName || initialCustomerName || 'Cliente sin nombre',
        items: items.map((item) => ({
          description: item.descripcion,
          quantity: item.cantidad,
          originalPrice: item.precio_original,
          discountedPrice: item.precio_con_descuento,
          discount: item.descuento_lempiras,
        })),
      });
      setPendingRequestId(request.id);
      toast.info('Solicitud enviada al administrador', {
        description: 'Cuando el admin autorice, el descuento se aplicara automaticamente a este pedido.',
        duration: 6000,
      });
      return;
    }

    await applyAuthorizedDiscount(authorizedBy);
  };

  // Manejar cancelación de autorización
  const handleAuthCancel = () => {
    console.log('Cancelado: [SpecialOrderDialog] Autorización cancelada - Cerrando diálogo');
    setShowAuthDialog(false);
    onOpenChange(false); // Cerrar el diálogo principal también
    toast.info('Cancelado: Operación cancelada', {
      description: 'Se requiere autorización para aplicar descuentos especiales',
      duration: 3000,
    });
  };

  const handleAuthorized = async (authUser: { username: string; name: string }) => {
    console.log('✅ [SpecialOrderDialog] Descuento autorizado por:', authUser.name);
    setAuthorizedBy(authUser);
    
    toast.success('✅ Autorización confirmada', {
      description: `${authUser.name} autorizó el descuento - Ahora puedes aplicarlo`,
      duration: 3000,
    });

    // Después de autorizar, el usuario debe hacer clic en "Aplicar Descuento" nuevamente
    // NO se aplica automáticamente, para que el usuario confirme
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setDueDate(undefined);
    setDueTime('12:00');
    setItems([]);
    setTempItem({
      descripcion: '',
      cantidad: 1,
      precio_original: 0,
      precio_con_descuento: 0
    });
    setMotivoDescuento('');
    setAuthorizedBy(null);
  };

  const isCustomerRegistered = customers.some((c: any) => c.name === customerName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="special-order-dialog w-[min(94vw,980px)] max-w-[980px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="special-order-dialog-header">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <span className="special-order-dialog-icon">
              <Star className="w-6 h-6" />
            </span>
            Pedido Especial
          </DialogTitle>
          <DialogDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Aplica descuentos especiales a los productos. El descuento se transferirá al pedido principal.</span>
            {authorizedBy && (
              <Badge className="bg-green-100 text-green-800 border-green-300 ml-4">
                ✅ Autorizado por: {authorizedBy.name}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Agregar Productos con Descuento */}
          <div className="special-order-entry-panel bg-linear-to-r from-amber-50 to-orange-50 p-4 rounded-lg border-2 border-amber-300">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Agregar Producto con Descuento
              </h3>
              <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                💡 Precios con ISV incluido
              </Badge>
            </div>
            
            <div className="special-order-form-grid grid grid-cols-1 gap-4 mb-4">
              <div className="special-order-desc-field space-y-2">
                <Label>Descripción del Producto *</Label>
                <Textarea
                  value={tempItem.descripcion}
                  onChange={(e) => setTempItem({...tempItem, descripcion: e.target.value})}
                  placeholder="Descripción detallada del producto"
                  rows={3}
                />
              </div>

              <div className="special-order-small-field space-y-2">
                <Label>Cantidad *</Label>
                <Input
                  type="number"
                  min="1"
                  value={tempItem.cantidad || ''}
                  onChange={(e) => setTempItem({...tempItem, cantidad: parseInt(e.target.value) || 1})}
                  placeholder="1"
                />
              </div>

              <div className="special-order-money-field space-y-2">
                <Label>Precio Original *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tempItem.precio_original || ''}
                  onChange={(e) => setTempItem({...tempItem, precio_original: parseFloat(e.target.value) || 0})}
                  placeholder="L. 0.00"
                />
              </div>

              <div className="special-order-money-field space-y-2">
                <Label>Precio con Descuento *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempItem.precio_con_descuento || ''}
                    onChange={(e) => setTempItem({...tempItem, precio_con_descuento: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                    className="pr-8"
                  />
                  <DollarSign className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            {tempItem.precio_original > 0 && (
              <div className="special-order-price-preview bg-white p-3 rounded border-2 border-amber-200 mb-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Precio Original:</span>
                    <div className="font-bold text-gray-900">L. {tempItem.precio_original.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Precio con Descuento:</span>
                    <div className="font-bold text-green-600">
                      L. {(tempItem.precio_con_descuento || tempItem.precio_original).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Ahorro:</span>
                    <div className="font-bold text-orange-600">
                      - L. {(tempItem.precio_original - (tempItem.precio_con_descuento || tempItem.precio_original)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={agregarProducto}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </div>

          {/* Lista de Productos */}
          {items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Productos del Pedido ({items.length})
              </h3>
              
              {items.map((item, index) => (
                <div key={index} className="special-order-item-row bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-2">{item.descripcion}</div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 block mb-1">Cantidad:</span>
                          <Input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20 h-9"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1 text-[14px]">Precio Original:</span>
                          <div className="font-bold line-through text-gray-500 mt-2">L. {item.precio_original.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">✏️ Precio Final:</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precio_con_descuento}
                            onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                            className="w-28 h-9 font-bold text-green-700"
                          />
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Descuento:</span>
                          <div className="font-bold text-orange-600 mt-2">- L. {item.descuento_lempiras.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">% Desc:</span>
                          <div className="font-bold text-purple-600 mt-2">
                            {item.precio_original > 0 ? ((item.descuento_lempiras / item.precio_original) * 100).toFixed(1) : '0'}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">✏️ Subtotal:</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.subtotal}
                            onChange={(e) => updateItemSubtotal(index, parseFloat(e.target.value) || 0)}
                            className="w-32 h-9 font-bold text-green-700 text-base"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Motivo del Descuento */}
          {items.length > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <Label htmlFor="motivo-descuento" className="font-bold text-yellow-900 mb-2 block">
                Motivo del Descuento Especial * (OBLIGATORIO)
              </Label>
              <Textarea
                id="motivo-descuento"
                value={motivoDescuento}
                onChange={(e) => setMotivoDescuento(e.target.value)}
                placeholder="Ejemplo: Cliente frecuente, compra al por mayor, promoción especial, etc."
                rows={3}
                required
                className="border-yellow-400"
              />
              <p className="text-xs text-yellow-700 mt-2">
                Advertencia: Este campo es obligatorio para auditoría. Justifica claramente por qué se aplica el descuento.
              </p>
            </div>
          )}

          {/* Resumen */}
          {items.length > 0 && (
            <div className="special-order-summary bg-linear-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-400">
              <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Resumen del Descuento
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-red-600 font-medium">Descuento Total Aplicado:</span>
                  <strong className="text-red-700 text-lg">- L. {totales.descuento_total.toFixed(2)}</strong>
                </div>
                <div className="h-px bg-green-300"></div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <strong>L. {totales.subtotal.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ISV ({settings.isv_percent || 15}%):</span>
                  <strong>L. {totales.isv.toFixed(2)}</strong>
                </div>
                <div className="h-px bg-green-300"></div>
                <div className="flex justify-between">
                  <span className="font-bold text-lg">TOTAL:</span>
                  <strong className="text-2xl text-green-700">L. {totales.total.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="special-order-actions flex justify-end gap-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
              className="special-order-cancel-button"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApplyDiscount}
              disabled={loading || items.length === 0 || !motivoDescuento}
              className="special-order-submit-button bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8"
            >
              {loading ? (
                <>Guardando...</>
              ) : pendingRequestId ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Esperando admin
                </>
              ) : authorizedBy ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Aplicar Descuento Autorizado
                </>
              ) : currentUser?.role === 'admin' ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Aplicar descuento
                </>
              ) : (
                <>
                  <Star className="w-5 h-5 mr-2" />
                  Solicitar descuento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Diálogo de Autorización de Descuento */}
      <DiscountAuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthorized={handleAuthorized}
        onCancel={handleAuthCancel}
        discountAmount={totales.descuento_total}
        users={users}
      />
    </Dialog>
  );
}
