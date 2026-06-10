import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Calendar, MessageSquare, Save } from 'lucide-react';
import { toast } from 'sonner';

interface OrderEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSave: (updatedOrder: any) => void;
}

const paymentStatusOptions = ['PENDIENTE', 'ABONO', 'PAGADO'];

export default function OrderEditDialog({
  open,
  onOpenChange,
  order,
  onSave,
}: OrderEditDialogProps) {
  const [notes, setNotes] = useState(order?.notes || '');
  const [dueDate, setDueDate] = useState(order?.due_date ? order.due_date.split('T')[0] : '');
  const [paymentStatus, setPaymentStatus] = useState(order?.payment_status || paymentStatusOptions[0]);

  useEffect(() => {
    if (!order) return;
    setNotes(order.notes || '');
    setDueDate(order.due_date ? order.due_date.split('T')[0] : '');
    setPaymentStatus(order.payment_status || paymentStatusOptions[0]);
  }, [order, open]);

  const handleSave = () => {
    if (!order) return;
    const payload = {
      ...order,
      notes,
      due_date: dueDate || order.due_date,
      payment_status: paymentStatus,
    };
    onSave(payload);
    toast.success('Pedido actualizado localmente', { duration: 2500 });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-3xl max-h-[88vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <DialogTitle className="text-lg font-bold">Editar pedido #{order?.order_number || order?.number || 'N/A'}</DialogTitle>
          </div>
          <p className="text-xs text-gray-500">
            Ajusta notas, fecha de entrega y estado de pago sin salir de esta ventana.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-gray-600">Notas</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-28"
              placeholder="Añade observaciones, avances o recordatorios"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600">Fecha de entrega</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <label className="text-xs font-semibold text-gray-600">
              Estado de pago
            </label>
            <div className="flex flex-wrap gap-2">
              {paymentStatusOptions.map((option) => (
                <Badge
                  key={option}
                  className={`px-3 py-1 text-xs font-semibold cursor-pointer transition ${ paymentStatus === option ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700' }`}
                  onClick={() => setPaymentStatus(option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4" />
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
