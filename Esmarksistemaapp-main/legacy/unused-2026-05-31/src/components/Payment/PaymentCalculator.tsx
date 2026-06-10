import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { DollarSign, Calculator, Wallet, CreditCard, Banknote } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentCalculatorProps {
  totalAmount: number;
  existingPayments?: number; // Abonos ya realizados
  onPaymentConfirm: (payment: PaymentResult) => void;
}

export interface PaymentResult {
  paymentMethod: 'cash' | 'card' | 'transfer';
  amountReceived: number;
  change: number;
  isPartialPayment: boolean;
  remainingBalance: number;
  paymentType: 'full' | 'partial';
}

export default function PaymentCalculator({
  totalAmount,
  existingPayments = 0,
  onPaymentConfirm,
}: PaymentCalculatorProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [change, setChange] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);

  const pendingAmount = totalAmount - existingPayments;

  useEffect(() => {
    calculatePayment();
  }, [amountReceived, totalAmount, existingPayments]);

  const calculatePayment = () => {
    const received = parseFloat(amountReceived) || 0;
    
    if (received >= pendingAmount) {
      // Pago completo o excedente
      setChange(received - pendingAmount);
      setRemainingBalance(0);
    } else {
      // Pago parcial (abono)
      setChange(0);
      setRemainingBalance(pendingAmount - received);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  const handleConfirmPayment = () => {
    const received = parseFloat(amountReceived) || 0;

    if (received <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    const isPartial = received < pendingAmount;

    const result: PaymentResult = {
      paymentMethod,
      amountReceived: received,
      change,
      isPartialPayment: isPartial,
      remainingBalance,
      paymentType: isPartial ? 'partial' : 'full',
    };

    onPaymentConfirm(result);
  };

  const handleSetExactAmount = () => {
    setAmountReceived(pendingAmount.toFixed(2));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Calculadora de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen de montos */}
        <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total del Pedido:</span>
            <span className="font-bold text-lg">L {totalAmount.toFixed(2)}</span>
          </div>
          
          {existingPayments > 0 && (
            <>
              <div className="flex justify-between items-center text-green-700">
                <span className="text-sm">Abonos Previos:</span>
                <span className="font-semibold">L {existingPayments.toFixed(2)}</span>
              </div>
              <div className="border-t border-blue-300 pt-2" />
            </>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Saldo Pendiente:</span>
            <span className="font-bold text-xl text-blue-700">
              L {pendingAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="cash">
                <Wallet className="w-4 h-4 mr-2" />
                Efectivo
              </TabsTrigger>
              <TabsTrigger value="card">
                <CreditCard className="w-4 h-4 mr-2" />
                Tarjeta
              </TabsTrigger>
              <TabsTrigger value="transfer">
                <Banknote className="w-4 h-4 mr-2" />
                Transferencia
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Monto recibido */}
        <div className="space-y-2">
          <Label>Monto Recibido</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                L
              </span>
              <Input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="pl-8 text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleSetExactAmount}
            >
              Exacto
            </Button>
          </div>

          {/* Botones de monto rápido */}
          {paymentMethod === 'cash' && (
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                >
                  L {amount}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Resultados */}
        {amountReceived && parseFloat(amountReceived) > 0 && (
          <div className="space-y-3">
            {/* Tipo de pago */}
            <div className="flex justify-center">
              {parseFloat(amountReceived) >= pendingAmount ? (
                <Badge className="bg-green-500 text-white px-4 py-2 text-base">
                  ✅ Pago Completo
                </Badge>
              ) : (
                <Badge className="bg-orange-500 text-white px-4 py-2 text-base">
                  💰 Abono Parcial
                </Badge>
              )}
            </div>

            {/* Cambio o saldo pendiente */}
            {change > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-800">
                    💵 Cambio a devolver:
                  </span>
                  <span className="text-2xl font-bold text-green-700">
                    L {change.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {remainingBalance > 0 && (
              <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-300">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-orange-800">
                    📊 Saldo Restante:
                  </span>
                  <span className="text-2xl font-bold text-orange-700">
                    L {remainingBalance.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Se registrará como abono parcial
                </p>
              </div>
            )}

            {/* Desglose detallado */}
            <div className="p-3 bg-gray-50 rounded border text-sm space-y-1">
              <div className="flex justify-between">
                <span>Monto Recibido:</span>
                <span className="font-semibold">L {parseFloat(amountReceived).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saldo Pendiente:</span>
                <span className="font-semibold">L {pendingAmount.toFixed(2)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-bold">
                <span>{change > 0 ? 'Cambio:' : 'Queda por Pagar:'}</span>
                <span className={change > 0 ? 'text-green-600' : 'text-orange-600'}>
                  L {(change > 0 ? change : remainingBalance).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botón de confirmación */}
        <Button
          onClick={handleConfirmPayment}
          disabled={!amountReceived || parseFloat(amountReceived) <= 0}
          className="w-full"
          size="lg"
        >
          <DollarSign className="w-5 h-5 mr-2" />
          Confirmar Pago
        </Button>
      </CardContent>
    </Card>
  );
}
