import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import PaymentCalculator, { PaymentResult } from '../Payment/PaymentCalculator';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    total: number;
    paid_amount?: number;
  };
  onPaymentComplete: (payment: PaymentResult) => void;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  order,
  onPaymentComplete,
}: PaymentDialogProps) {
  const handlePaymentConfirm = (payment: PaymentResult) => {
    onPaymentComplete(payment);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Registrar Pago - Pedido #{order.order_number}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Cliente: {order.customer_name}
          </p>
        </DialogHeader>

        <PaymentCalculator
          totalAmount={order.total}
          existingPayments={order.paid_amount || 0}
          onPaymentConfirm={handlePaymentConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
