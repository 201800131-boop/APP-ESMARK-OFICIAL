/**
 * Panel de pago y documento fiscal vinculado.
 */

import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Link2,
  ReceiptText,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { isNotificationEnabled } from '../../utils/notification-settings';

interface PaymentSectionProps {
  order: any;
  onPaymentProcessed: () => void;
}

function money(value: number) {
  return `L. ${Number(value || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeDocumentType(value: any) {
  return String(value || '').trim().toUpperCase();
}

function getBillingDocument(order: any) {
  const rawType = normalizeDocumentType(
    order.linked_billing_document_type ||
      order.fiscal_document_type ||
      order.doc_type ||
      order.document_type
  );

  const id =
    order.linked_billing_document_id ||
    order.linked_document_id ||
    order.billing_document_id ||
    order.invoice_id ||
    order.receipt_id ||
    null;

  const number =
    order.linked_billing_document_number ||
    order.billing_document_number ||
    order.invoice_number ||
    order.numeroFactura ||
    order.receipt_correlative ||
    order.receipt_number ||
    order.numeroRecibo ||
    null;

  const isReceipt = rawType.includes('RECIBO') || Boolean(order.receipt_correlative || order.receipt_id);
  const isProforma = rawType.includes('PROFORMA') || rawType === 'PROFORMA';
  const isFactura = rawType.includes('FACTURA') || rawType === 'EMITIDA';
  const generateLater = rawType.includes('DESPUES') || rawType.includes('DESPUÉS') || rawType.includes('GENERAR');

  if (isReceipt) {
    return {
      status: id || number ? 'linked' : 'pending',
      label: 'Recibo',
      number: number || id || 'Sin numero',
      id,
      icon: ReceiptText,
      tone: 'emerald',
    };
  }

  if (isProforma) {
    return {
      status: id || number ? 'linked' : 'pending',
      label: 'Factura proforma',
      number: number || id || 'Sin numero',
      id,
      icon: FileText,
      tone: 'blue',
    };
  }

  if (isFactura) {
    return {
      status: id || number ? 'linked' : 'pending',
      label: 'Factura',
      number: number || id || 'Sin numero',
      id,
      icon: FileText,
      tone: 'indigo',
    };
  }

  if (generateLater) {
    return {
      status: 'later',
      label: 'Documento fiscal',
      number: 'Generar despues',
      id: null,
      icon: Clock,
      tone: 'amber',
    };
  }

  return {
    status: 'none',
    label: 'Documento fiscal',
    number: 'Sin documento vinculado',
    id: null,
    icon: FileText,
    tone: 'slate',
  };
}

export default function PaymentSection({ order, onPaymentProcessed }: PaymentSectionProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [generateReceipt, setGenerateReceipt] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const total = parseFloat(order.total || order.total_amount || 0);
  const paid = parseFloat(order.amount_paid || order.paid || 0);
  const pending = Math.max(total - paid, 0);
  const billingDoc = getBillingDocument(order);
  const BillingIcon = billingDoc.icon;

  const normalizedStatus = (order.payment_status || '').toString().toLowerCase();
  const paymentLabel =
    normalizedStatus === 'paid' || normalizedStatus === 'pagado'
      ? 'PAGADO'
      : normalizedStatus === 'partial' || normalizedStatus === 'abono' || normalizedStatus === 'parcial'
        ? 'PARCIAL'
        : 'PENDIENTE';

  const paymentAction =
    paymentLabel === 'PENDIENTE'
      ? 'Registrar pago'
      : paymentLabel === 'PARCIAL'
        ? 'Completar pago'
        : null;

  const paymentTone =
    paymentLabel === 'PAGADO'
      ? 'bg-emerald-600 text-white border-emerald-700'
      : paymentLabel === 'PARCIAL'
        ? 'bg-amber-500 text-white border-amber-600'
        : 'bg-rose-600 text-white border-rose-700';

  const billingToneClass: Record<string, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
  };

  const billingBadge =
    billingDoc.status === 'linked'
      ? 'Vinculado'
      : billingDoc.status === 'later'
        ? 'Pendiente'
        : 'Sin vinculo';

  const hasPrimaryBillingDocument = billingDoc.status === 'linked' && billingDoc.label !== 'Recibo';
  const paymentAmountNumber = Number(paymentAmount || 0);
  const receivedAmountNumber = Number(receivedAmount || paymentAmount || 0);
  const changeAmount = paymentMethod === 'cash'
    ? Math.max(receivedAmountNumber - paymentAmountNumber, 0)
    : 0;

  const paymentItems = useMemo(() => {
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      return [{
        descripcion: `Pago pedido #${order.order_number || order.number || ''}`.trim(),
        cantidad: 1,
        precio_unitario: paymentAmountNumber,
        total: paymentAmountNumber,
      }];
    }

    return items.map((item: any) => {
      const quantity = Number(item.quantity || item.cantidad || item.unidades || 1) || 1;
      const itemTotal = Number(item.total || item.subtotal || item.unit_price || item.precio_unitario || 0);
      return {
        descripcion: item.product_name || item.name || item.descripcion || item.description || 'Producto',
        cantidad: quantity,
        precio_unitario: quantity > 0 ? itemTotal / quantity : itemTotal,
        total: itemTotal,
      };
    });
  }, [order.items, order.number, order.order_number, paymentAmountNumber]);

  const openPaymentDialog = () => {
    const suggestedAmount = pending > 0 ? pending : total > 0 ? total : '';
    setPaymentAmount(suggestedAmount ? String(suggestedAmount) : '');
    setReceivedAmount(suggestedAmount ? String(suggestedAmount) : '');
    setPaymentMethod('cash');
    setGenerateReceipt(!hasPrimaryBillingDocument && billingDoc.label !== 'Recibo');
    setPaymentDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    if (paymentAmountNumber <= 0) {
      toast.error('Ingresa un monto mayor a cero.');
      return;
    }

    if (paymentMethod === 'cash' && receivedAmountNumber < paymentAmountNumber) {
      toast.error('El monto recibido no puede ser menor al pago.');
      return;
    }

    setIsSaving(true);
    try {
      let generatedReceipt: any = null;
      if (generateReceipt && !hasPrimaryBillingDocument) {
        generatedReceipt = await api.generateDocument({
          tipo: 'recibo',
          cliente_nombre: order.client_name || order.customer_name || 'Cliente',
          cliente_rtn: order.customer_rtn || order.rtn || undefined,
          cliente_direccion: order.customer_address || undefined,
          cliente_telefono: order.customer_phone || undefined,
          subtotal: paymentAmountNumber,
          impuesto: 0,
          descuento: 0,
          total: paymentAmountNumber,
          items: paymentItems,
          generado_por: 'sistema',
          generado_por_nombre: 'Sistema',
          pedido_id: order.id,
          notas: `Pago registrado para pedido #${order.order_number || order.number || ''}`.trim(),
          datos_extra: {
            payment_method: paymentMethod,
            received_amount: receivedAmountNumber,
            change_amount: changeAmount,
          },
        });
      }

      const newPaid = paid + paymentAmountNumber;
      const newStatus = total > 0 && newPaid < total ? 'ABONO' : 'PAGADO';
      const receiptNumber =
        generatedReceipt?.correlativo ||
        generatedReceipt?.documento?.correlativo ||
        generatedReceipt?.document?.correlativo ||
        generatedReceipt?.numero ||
        generatedReceipt?.numeroRecibo ||
        undefined;
      const receiptId =
        generatedReceipt?.id ||
        generatedReceipt?.documento?.id ||
        generatedReceipt?.document?.id ||
        undefined;

      const updates: Record<string, any> = {
        amount_paid: newPaid,
        paid_amount: newPaid,
        payment_status: newStatus,
        payment_type: paymentMethod,
        payment_method: paymentMethod,
        received_amount: receivedAmountNumber,
        change_amount: changeAmount,
        paid_at: new Date().toISOString(),
      };

      if (generatedReceipt) {
        updates.receipt_correlative = receiptNumber;
        updates.receipt_id = receiptId;
        if (!hasPrimaryBillingDocument) {
          updates.fiscal_document_type = 'RECIBO';
          updates.linked_billing_document_type = 'RECIBO';
          updates.linked_billing_document_id = receiptId;
          updates.linked_document_id = receiptId;
        }
      }

      await api.updateOrder(order.id, updates);
      if (isNotificationEnabled('payment_updates')) {
        toast.success('Pago registrado correctamente', {
          description: receiptNumber ? `Recibo vinculado: ${receiptNumber}` : newStatus,
        });
      }
      setPaymentDialogOpen(false);
      onPaymentProcessed();
    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error('No se pudo registrar el pago', {
        description: error?.message || 'Intenta nuevamente.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="payment-panel-modern">
      <div className="payment-panel-header">
        <div>
          <p className="payment-eyebrow">Pedido #{order.order_number || order.number || 'N/A'}</p>
          <h3>Estado de pago y facturacion</h3>
          <span>Consulta el cobro y el documento fiscal relacionado con este pedido.</span>
        </div>
        <Badge className={`payment-status-badge ${paymentTone}`}>
          {paymentLabel === 'PAGADO' ? <CheckCircle className="w-4 h-4" /> : paymentLabel === 'PARCIAL' ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {paymentLabel}
        </Badge>
      </div>

      <div className="payment-metrics-grid">
        <div className="payment-metric payment-metric-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="payment-metric payment-metric-paid">
          <span>Pagado</span>
          <strong>{money(paid)}</strong>
        </div>
        <div className="payment-metric payment-metric-pending">
          <span>Pendiente</span>
          <strong>{money(pending)}</strong>
        </div>
      </div>

      <div className="payment-bento-grid">
        <div className="payment-card">
          <div className="payment-card-title">
            <TrendingUp className="w-4 h-4" />
            <div>
              <p>Resumen del cobro</p>
              <span>Estado actual: {paymentLabel}</span>
            </div>
          </div>
          <div className="payment-lines">
            <div>
              <span>Total del pedido</span>
              <strong>{money(total)}</strong>
            </div>
            <div>
              <span>Monto pagado</span>
              <strong>{money(paid)}</strong>
            </div>
            <div>
              <span>Saldo pendiente</span>
              <strong>{money(pending)}</strong>
            </div>
          </div>
          {paymentAction && (
            <Button
              variant="outline"
              className="payment-action-button w-full gap-2"
              onClick={openPaymentDialog}
            >
              <DollarSign className="w-4 h-4" />
              {paymentAction}
            </Button>
          )}
        </div>

        <div className={`payment-card payment-billing-card ${billingToneClass[billingDoc.tone] || billingToneClass.slate}`}>
          <div className="payment-card-title">
            <BillingIcon className="w-4 h-4" />
            <div>
              <p>Documento fiscal</p>
              <span>{billingDoc.label}</span>
            </div>
          </div>
          <div className="payment-document-box">
            <div>
              <span>Estado</span>
              <strong>{billingBadge}</strong>
            </div>
            <div>
              <span>Numero / referencia</span>
              <strong>{billingDoc.number}</strong>
            </div>
            {billingDoc.id && (
              <div>
                <span>ID vinculado</span>
                <strong>{String(billingDoc.id).slice(0, 18)}{String(billingDoc.id).length > 18 ? '...' : ''}</strong>
              </div>
            )}
          </div>
          {billingDoc.status === 'linked' ? (
            <p className="payment-document-note">
              <Link2 className="w-4 h-4" />
              Este pedido ya tiene {billingDoc.label.toLowerCase()} vinculada.
            </p>
          ) : billingDoc.status === 'later' ? (
            <p className="payment-document-note">
              <Clock className="w-4 h-4" />
              Se guardo para generar el documento despues desde Facturacion.
            </p>
          ) : (
            <p className="payment-document-note">
              <AlertCircle className="w-4 h-4" />
              No hay factura ni recibo vinculado a este pedido.
            </p>
          )}
        </div>
      </div>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="payment-register-dialog sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Guarda el pago del pedido y vincula un recibo cuando corresponda.
            </DialogDescription>
          </DialogHeader>

          <div className="payment-register-form">
            <div className="payment-register-summary">
              <div>
                <span>Total</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Pagado</span>
                <strong>{money(paid)}</strong>
              </div>
              <div>
                <span>Pendiente</span>
                <strong>{money(pending)}</strong>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="payment-amount">Monto a registrar</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(event) => {
                  setPaymentAmount(event.target.value);
                  if (paymentMethod !== 'cash') setReceivedAmount(event.target.value);
                }}
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label>Metodo de pago</Label>
              <Select value={paymentMethod} onValueChange={(value) => {
                setPaymentMethod(value);
                if (value !== 'cash') setReceivedAmount(paymentAmount);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona metodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'cash' && (
              <div className="grid gap-2">
                <Label htmlFor="received-amount">Monto recibido</Label>
                <Input
                  id="received-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={receivedAmount}
                  onChange={(event) => setReceivedAmount(event.target.value)}
                  placeholder="0.00"
                />
                <p className="payment-change-preview">Cambio: {money(changeAmount)}</p>
              </div>
            )}

            {!hasPrimaryBillingDocument && billingDoc.label !== 'Recibo' && (
              <label className="payment-receipt-toggle">
                <input
                  type="checkbox"
                  checked={generateReceipt}
                  onChange={(event) => setGenerateReceipt(event.target.checked)}
                />
                <span>
                  Generar y vincular recibo automaticamente
                  <small>El recibo quedara asociado a este pedido en Facturacion.</small>
                </span>
              </label>
            )}

            {hasPrimaryBillingDocument && (
              <div className="payment-register-note">
                Este pedido ya tiene {billingDoc.label.toLowerCase()} vinculada. El pago se registrara sin reemplazar ese documento.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment} disabled={isSaving} className="payment-save-button">
              {isSaving ? 'Guardando...' : 'Guardar pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
