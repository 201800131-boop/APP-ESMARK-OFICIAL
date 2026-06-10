import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  Truck,
  CheckCircle,
  AlertCircle,
  Hash,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateStickerPrice, calculateBannerPrice } from '../../utils/stickerBannerPricing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import PaymentSection from './PaymentSection';

interface OrderViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onChangeStatus?: (orderId: string, newStatus: string) => void;
  onViewTrelloCard?: (order: any) => void;
  onDeliver?: (orderId: string) => void;
}

export default function OrderViewDialog({
  open,
  onOpenChange,
  order,
  onEdit,
  onDelete,
  onChangeStatus,
  onViewTrelloCard,
  onDeliver,
}: OrderViewDialogProps) {
  const [currentStatus, setCurrentStatus] = useState(order?.status || '');
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (order?.status) {
      setCurrentStatus(order.status);
    }
  }, [order?.status]);

  if (!order) return null;

  const orderCreatorName = order.trello_card_created_by_name || order.created_by_name || order.created_by || 'Sistema';

  const allStatuses = [
    'COTIZACIÓN',
    'PENDIENTE DE INFORMACIÓN',
    'PEDIDO INGRESADO',
    'DISEÑO EN PROCESO',
    'PENDIENTE DE CONFIRMACIÓN',
    'REVISIÓN DE ÁREA',
    'DISEÑO FINALIZADO',
    'PEDIDO LISTO PARA IMPRESIÓN',
    'IMPRESIÓN EN PROCESO',
    'CORTE EN PROCESO',
    'IMPRESIÓN Y CORTE FINALIZADA',
    'PEDIDO LISTO PARA SUBLIMACIÓN',
    'SUBLIMACIÓN EN PROCESO',
    'SUBLIMACIÓN TERMINADA',
    'CORTE PVC, ACRÍLICO',
    'CORTE FINALIZADO',
    'INSTALACIÓN',
    'LISTO PARA ENTREGA',
    'ENTREGADO',
    'CANCELADO',
  ];

  const getStatusColor = (status: string): string => {
    const statusColors: { [key: string]: string } = {
      'COTIZACIÓN': 'bg-purple-100 text-purple-800 border-purple-200',
      'PENDIENTE DE INFORMACIÓN': 'bg-gray-100 text-gray-800 border-gray-300',
      'PEDIDO INGRESADO': 'bg-blue-100 text-blue-800 border-blue-300',
      'DISEÑO EN PROCESO': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'PENDIENTE DE CONFIRMACIÓN': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'REVISIÓN DE ÁREA': 'bg-orange-100 text-orange-800 border-orange-300',
      'DISEÑO FINALIZADO': 'bg-teal-100 text-teal-800 border-teal-300',
      'PEDIDO LISTO PARA IMPRESIÓN': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'IMPRESIÓN EN PROCESO': 'bg-blue-100 text-blue-800 border-blue-300',
      'CORTE EN PROCESO': 'bg-pink-100 text-pink-800 border-pink-300',
      'IMPRESIÓN Y CORTE FINALIZADA': 'bg-green-100 text-green-800 border-green-300',
      'PEDIDO LISTO PARA SUBLIMACIÓN': 'bg-orange-100 text-orange-800 border-orange-300',
      'SUBLIMACIÓN EN PROCESO': 'bg-red-100 text-red-800 border-red-300',
      'SUBLIMACIÓN TERMINADA': 'bg-green-100 text-green-800 border-green-300',
      'CORTE PVC, ACRÍLICO': 'bg-gray-100 text-gray-800 border-gray-300',
      'CORTE FINALIZADO': 'bg-green-100 text-green-800 border-green-300',
      'INSTALACIÓN': 'bg-blue-100 text-blue-800 border-blue-300',
      'LISTO PARA ENTREGA': 'bg-blue-500 text-white border-blue-600',
      'ENTREGADO': 'bg-green-500 text-white border-green-600',
      'CANCELADO': 'bg-red-500 text-white border-red-600',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ENTREGADO') return <CheckCircle className="w-5 h-5" />;
    if (status === 'CANCELADO') return <AlertCircle className="w-5 h-5" />;
    if (status === 'LISTO PARA ENTREGA') return <Package className="w-5 h-5" />;
    if (status.includes('DISEÑO')) return <ExternalLink className="w-5 h-5" />;
    if (status.includes('IMPRESIÓN')) return <Package className="w-5 h-5" />;
    return <Clock className="w-5 h-5" />;
  };

  const isOverdue = order.due_date && new Date(order.due_date) < new Date() &&
    order.status !== 'ENTREGADO' && order.status !== 'CANCELADO';

  const daysUntilDue = order.due_date
    ? Math.ceil((new Date(order.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const paymentTotal = parseFloat(order.total_amount || order.total || 0);
  const paymentPaid = parseFloat(order.amount_paid || order.paid || 0);
  const paymentBalance = Math.max(paymentTotal - paymentPaid, 0);
  const paymentLabel = (
    order.payment_status ||
    (paymentBalance <= 0 ? 'PAGADO' : paymentPaid > 0 ? 'ABONO' : 'PENDIENTE')
  ).toString().toUpperCase();

  const paymentBadgeColor = () => {
    if (paymentLabel === 'PAGADO') return 'bg-green-100 text-green-800 border-green-200';
    if (paymentLabel === 'ABONO' || paymentLabel === 'PARCIAL') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const canDeliver = order.status !== 'ENTREGADO' && order.status !== 'CANCELADO';
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const isImportedDescriptionOrder =
    Boolean(order.trello_card_id || order.source?.toString().includes('trello')) &&
    orderItems.length > 0 &&
    orderItems.every((item: any) => {
      const price = parseFloat(item.unit_price || item.precio_unitario || item.price || 0);
      const subtotal = parseFloat(item.total || item.subtotal || 0);
      return price <= 0 && subtotal <= 0;
    });

  const getItemDescription = (item: any) =>
    item.product_name || item.name || item.descripcion || item.description || 'Detalle del pedido';

  const parseImportedLine = (text: string) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const lower = normalized.toLowerCase();
    const quantityMatch = normalized.match(/^(\d+(?:[.,]\d+)?)\b/);
    const quantity = quantityMatch ? Math.max(parseFloat(quantityMatch[1].replace(',', '.')), 1) : 1;
    const sizeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:x|por|×)\s*(\d+(?:[.,]\d+)?)\s*(cm|cms|centimetros|centímetros|pulgadas|in|metros|m)\b/i);
    const singleSizeMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(cm|cms|centimetros|centímetros|pulgadas|in|metros|m)\b/i);
    const type = lower.includes('sticker') || lower.includes('calcoman')
      ? 'Sticker'
      : lower.includes('banner') || lower.includes('lona')
        ? 'Banner'
        : lower.includes('pvc')
          ? 'PVC'
          : lower.includes('dise')
            ? 'Diseño'
            : 'Detalle';

    let width = 0;
    let height = 0;
    let unit = 'cm';

    if (sizeMatch) {
      width = parseFloat(sizeMatch[1].replace(',', '.'));
      height = parseFloat(sizeMatch[2].replace(',', '.'));
      unit = sizeMatch[3].toLowerCase();
    } else if (singleSizeMatch) {
      width = parseFloat(singleSizeMatch[1].replace(',', '.'));
      height = width;
      unit = singleSizeMatch[2].toLowerCase();
    }

    const toMeters = (value: number) => {
      if (!value) return 0;
      if (unit === 'm' || unit === 'metros') return value;
      if (unit === 'pulgadas' || unit === 'in') return value * 0.0254;
      return value / 100;
    };

    let estimatedTotal = 0;
    if (width > 0 && height > 0) {
      try {
        if (type === 'Sticker') {
          estimatedTotal = calculateStickerPrice(toMeters(width), toMeters(height), quantity).totalPrice || 0;
        } else if (type === 'Banner') {
          estimatedTotal = calculateBannerPrice(toMeters(width), toMeters(height), quantity).totalPrice || 0;
        }
      } catch {
        estimatedTotal = 0;
      }
    }

    const unitPrice = estimatedTotal > 0 ? estimatedTotal / quantity : 0;

    return {
      original: normalized,
      quantity,
      type,
      size: width > 0 && height > 0 ? `${width}${width === height ? '' : ` x ${height}`} ${unit}` : 'Sin medida',
      shape: lower.includes('redondo') || lower.includes('redonda') ? 'Redondo' : lower.includes('cuadr') ? 'Cuadrado' : '',
      estimatedTotal,
      unitPrice,
      isEstimable: quantityMatch !== null && width > 0 && height > 0 && ['Sticker', 'Banner', 'PVC'].includes(type),
    };
  };

  const importedEstimations = isImportedDescriptionOrder
    ? orderItems
        .map((item: any) => parseImportedLine(getItemDescription(item)))
        .filter((item) => item.isEstimable)
    : [];

  const handleDeliver = () => {
    if (onDeliver) {
      onDeliver(order.id);
      onOpenChange(false);
    } else if (onChangeStatus) {
      onChangeStatus(order.id, 'ENTREGADO');
      onOpenChange(false);
    }
  };

  const scrollToPayment = () => {
    if (bodyRef.current) {
      const el = bodyRef.current.querySelector('#payment-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="order-view-dialog order-view-floating w-full max-w-[1120px] max-h-[88vh] p-0 overflow-hidden flex flex-col bg-white shadow-2xl text-[13px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogDescription className="sr-only">
          Vista detallada del pedido con información del cliente, productos y estado
        </DialogDescription>

        {/* Header fijo */}
        <div className="order-view-header sticky top-0 z-20 border-b-2 bg-linear-to-r from-blue-50 to-indigo-50 px-8 py-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 relative">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {order.client_name || order.customer_name || 'Pedido'}
                    <span className="text-blue-600 font-semibold">#{order.order_number || order.number}</span>
                  </DialogTitle>
                  <p className="text-xs text-slate-700">
                    Creado el {order.created_at ? format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'} por <span className="font-semibold">{orderCreatorName}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onChangeStatus ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={`${getStatusColor(currentStatus)} text-sm px-4 py-2 rounded-xl flex items-center gap-2 border-2 shadow-sm hover:shadow-md transition-all duration-200 font-semibold`}>
                        {getStatusIcon(currentStatus)}
                        <span>{currentStatus}</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto" align="start">
                      {allStatuses.map((status) => (
                        <DropdownMenuItem
                          key={status}
                          onClick={() => {
                            if (status !== currentStatus) {
                              onChangeStatus(order.id, status);
                              setCurrentStatus(status);
                            }
                          }}
                          className="cursor-pointer flex-col items-start"
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className={`w-3 h-3 rounded-full ${status === currentStatus ? 'bg-blue-600' : 'bg-gray-300'}`} />
                            <span className={status === currentStatus ? 'font-semibold' : ''}>{status}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Badge className={`${getStatusColor(currentStatus)} text-xs px-3 py-1.5 flex items-center gap-2`}>
                    {getStatusIcon(currentStatus)}
                    {currentStatus}
                  </Badge>
                )}
                {order.due_date && (
                  <Badge variant="outline" className="text-xs px-3 py-1.5 flex items-center gap-1.5 border-slate-300">
                    <Calendar className="w-3.5 h-3.5" />
                    {isOverdue
                      ? `Vencido hace ${Math.abs(daysUntilDue || 0)} días`
                      : daysUntilDue === 0
                      ? 'Vence hoy'
                      : daysUntilDue === 1
                      ? 'Vence mañana'
                      : `Vence en ${daysUntilDue} días`}
                  </Badge>
                )}
              </div>
            </div>
            <div className="order-view-header-actions">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="order-view-actions-button gap-2">
                    <MoreHorizontal className="w-4 h-4" />
                    Acciones
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="order-view-actions-menu w-52" align="end">
                  {onViewTrelloCard && (
                    <DropdownMenuItem onClick={() => onViewTrelloCard(order)} className="gap-2 cursor-pointer">
                      <ExternalLink className="w-4 h-4" />
                      Ver en Trello
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(order)} className="gap-2 cursor-pointer">
                      <Edit className="w-4 h-4" />
                      Editar pedido
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(order.id)} className="order-view-delete-item gap-2 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge className={`${paymentBadgeColor()} text-sm px-4 py-2 flex items-center gap-2 border-2 shadow-md font-bold`}>
                {paymentLabel === 'PAGADO' ? '✅' : paymentLabel === 'ABONO' ? '💰' : '⚠️'} {paymentLabel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Body scrollable */}
        <div ref={bodyRef} className="order-view-body flex-1 overflow-y-auto bg-slate-50 px-10 py-6">
          <Tabs defaultValue="info" className="order-view-tabs space-y-5">
            <TabsList className="order-view-tab-list w-full grid grid-cols-1 md:grid-cols-3 bg-white border-2 border-slate-200 p-1">
              <TabsTrigger value="info" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md">📋 Información del pedido</TabsTrigger>
              <TabsTrigger value="pago" className="data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md">💰 Estado de pago</TabsTrigger>
              <TabsTrigger value="entrega" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md">🚚 Entregar</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
                <div className="space-y-4">
                  <div className="order-view-card order-view-summary-card bg-white rounded-xl border-2 border-slate-200 p-6 shadow-md hover:shadow-lg transition-shadow space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        Resumen del pedido
                      </div>
                      <Badge variant="outline" className="text-xs border-slate-300">
                        {currentStatus}
                      </Badge>
                    </div>
                    <div className="order-view-metrics grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                        <p className="text-blue-700 text-xs font-semibold">Total</p>
                        <p className="font-bold text-blue-900 text-lg">L {paymentTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                        <p className="text-green-700 text-xs font-semibold">Pagado</p>
                        <p className="font-bold text-green-900 text-lg">L {paymentPaid.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 border-2 border-amber-200">
                        <p className="text-amber-700 text-xs font-semibold">Pendiente</p>
                        <p className="font-bold text-amber-900 text-lg">
                          L {paymentBalance.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-3 border-2 border-indigo-200">
                        <p className="text-indigo-700 text-xs font-semibold">Entrega</p>
                        <p className="font-bold text-indigo-900 text-base">
                          {order.due_date ? format(new Date(order.due_date), 'dd/MM/yyyy') : 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                    {isImportedDescriptionOrder ? (
                      <div className="space-y-3">
                        <div className="order-view-description-panel">
                          <div className="order-view-description-head">
                            <Package className="w-4 h-4" />
                            <div>
                              <p>Descripción del pedido</p>
                              <span>Texto original recibido del pedido.</span>
                            </div>
                          </div>
                          <div className="order-view-description-list">
                            {orderItems.map((item: any, idx: number) => (
                              <div key={idx} className="order-view-description-line">
                                <p>{getItemDescription(item)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {importedEstimations.length > 0 && (
                          <div className="order-view-smart-card">
                            <div className="order-view-description-head">
                              <DollarSign className="w-4 h-4" />
                              <div>
                                <p>Estimación inteligente</p>
                                <span>Solo productos detectados con cantidad y medida.</span>
                              </div>
                            </div>
                            <div className="order-view-bento-list">
                              {importedEstimations.map((parsed, idx: number) => (
                                  <div key={`${parsed.original}-${idx}`} className="order-view-bento-card">
                                    <div className="order-view-bento-top">
                                      <span>{parsed.type}</span>
                                      <strong>{parsed.quantity}</strong>
                                    </div>
                                    <p>{parsed.original}</p>
                                    <div className="order-view-bento-grid">
                                      <div>
                                        <span>Medida</span>
                                        <strong>{parsed.size}</strong>
                                      </div>
                                      <div>
                                        <span>Forma</span>
                                        <strong>{parsed.shape || 'General'}</strong>
                                      </div>
                                      <div>
                                        <span>Precio unidad</span>
                                        <strong>{parsed.unitPrice > 0 ? `L ${parsed.unitPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : 'Por definir'}</strong>
                                      </div>
                                      <div>
                                        <span>Total estimado</span>
                                        <strong>{parsed.estimatedTotal > 0 ? `L ${parsed.estimatedTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}` : 'Por definir'}</strong>
                                      </div>
                                    </div>
                                  </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div className="order-view-items border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="order-view-items-head grid grid-cols-12 text-xs font-semibold bg-linear-to-r from-slate-100 to-slate-50 text-slate-700 px-4 py-3 border-b-2 border-slate-200">
                        <div className="col-span-6">Descripción</div>
                        <div className="col-span-2 text-right">Cant.</div>
                        <div className="col-span-2 text-right">Precio</div>
                        <div className="col-span-2 text-right">Subtotal</div>
                      </div>
                      {order.items && order.items.length > 0 ? (
                        <>
                          <div className="divide-y divide-slate-200">
                            {order.items.map((item: any, idx: number) => (
                              <div key={idx} className="order-view-item-row grid grid-cols-12 text-sm px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
                                <div className="col-span-6 text-slate-900 font-medium">{item.product_name || item.name || item.descripcion || 'Item'}</div>
                                <div className="col-span-2 text-right text-slate-700">{item.quantity || item.unidades || 1}</div>
                                <div className="col-span-2 text-right text-slate-700">
                                  L {(parseFloat(item.unit_price || item.precio_unitario || 0)).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="col-span-2 text-right font-bold text-slate-900">
                                  L {(parseFloat(item.total || item.subtotal || 0)).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-6 px-4 py-3 bg-linear-to-r from-slate-50 to-slate-100 text-base font-bold text-slate-900 border-t-2 border-slate-200">
                            <div>Total: L {paymentTotal.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </>
                      ) : (
                        <div className="px-4 py-6 text-sm text-slate-600 bg-slate-50 text-center">
                          <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="font-medium">Sin items registrados</p>
                        </div>
                      )}
                    </div>
                    )}
                  </div>

                  <div className="order-view-card bg-white rounded-xl border-2 border-slate-200 p-5 shadow-md hover:shadow-lg transition-shadow space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      Movimientos
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                        <span className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-green-900">Creado</p>
                          <p className="text-xs text-green-700">{order.created_at ? new Date(order.created_at).toLocaleString('es-HN') : 'N/A'}</p>
                        </div>
                      </div>
                      {order.due_date && (
                        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <span className="w-3 h-3 rounded-full bg-blue-500 mt-1 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900">Entrega programada</p>
                            <p className="text-xs text-blue-700">{new Date(order.due_date).toLocaleString('es-HN')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="order-view-card bg-white rounded-xl border-2 border-slate-200 p-6 shadow-md hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      Información del cliente
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-slate-500" />
                        <span>{order.client_name || order.customer_name || 'Cliente'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        <span>{order.customer_phone || 'Sin teléfono'}</span>
                      </div>
                      {order.customer_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          <span>{order.customer_email}</span>
                        </div>
                      )}
                      {order.customer_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                          <span>{order.customer_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pago" className="space-y-4">
              <div id="payment-panel" className="bg-white rounded-xl border-2 border-slate-200 shadow-md">
                <PaymentSection order={order} onPaymentProcessed={() => onOpenChange(false)} />
              </div>
            </TabsContent>

            <TabsContent value="entrega" className="space-y-4">
              <div className="bg-white rounded-xl border-2 border-slate-200 p-8 shadow-md space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-indigo-600" />
                    </div>
                    Entrega del pedido
                  </div>
                  <Badge variant="outline" className="text-xs border-slate-300">
                    {currentStatus}
                  </Badge>
                </div>
                {paymentLabel === 'PAGADO' ? (
                  canDeliver ? (
                    <div className="space-y-4">
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          El pedido está completamente pagado y listo para entregar.
                        </p>
                      </div>
                      <Button onClick={handleDeliver} className="gap-2 bg-none bg-green-600 hover:bg-green-700 text-white shadow-lg text-base px-6 py-3 w-full md:w-auto">
                        <Truck className="w-5 h-5" />
                        Marcar como Entregado
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700">El pedido ya está entregado o cancelado.</p>
                  )
                ) : (
                  <div className="flex items-start gap-3 text-amber-800 bg-linear-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-6 shadow-sm">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-base mb-1">Pago Pendiente</p>
                      <p className="text-sm">Completa el pago en la pestaña "Estado de pago" para habilitar la entrega del pedido.</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="order-view-footer order-view-footer-return">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="order-view-back-button">
            Regresar
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
