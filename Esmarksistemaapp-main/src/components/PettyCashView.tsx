import React, { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, DollarSign, Printer, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { printReceipt } from './Documents/ReceiptPrinter';
import { useDay } from '../contexts/DayContext';
import { api } from '../utils/api';

interface PettyCashViewProps {
  onBack: () => void;
}

interface PaymentIncome {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  date: string;
  amount: number;
  payment_type: string;
  payment_status: string;
  doc_type: string;
  source_order?: any;
}

export default function PettyCashView({ onBack }: PettyCashViewProps) {
  const { currentDay } = useDay();

  const [incomes, setIncomes] = useState<PaymentIncome[]>([]);
  const [totalCash, setTotalCash] = useState(0);
  const [totalTransfer, setTotalTransfer] = useState(0);
  const [totalCard, setTotalCard] = useState(0);
  const [printSuccess, setPrintSuccess] = useState('');

  useEffect(() => {
    loadIncomes();
  }, [currentDay]);

  const loadIncomes = async () => {
    try {
      const result = await api.getOrders();
      const allOrders = result.orders || [];
      const dayOrders = currentDay
        ? allOrders.filter((order: any) => order.work_day_id === currentDay.id)
        : [];

      const paymentsIncomes: PaymentIncome[] = [];
      let cashTotal = 0;
      let transferTotal = 0;
      let cardTotal = 0;

      dayOrders.forEach((order: any) => {
        const paidAmount = Number(order.paid_amount || order.amount_paid || 0);
        if (paidAmount <= 0) return;

        const income: PaymentIncome = {
          id: order.id,
          order_id: order.id,
          order_number: order.order_number || order.number || 'N/A',
          customer_name: order.customer_name || 'Cliente',
          date: order.created_at,
          amount: paidAmount,
          payment_type: order.payment_type || 'EFECTIVO',
          payment_status: order.payment_status || 'PENDIENTE',
          doc_type: order.doc_type || order.fiscal_document_type || 'RECIBO',
          source_order: order,
        };

        paymentsIncomes.push(income);

        if (income.payment_type === 'EFECTIVO') cashTotal += paidAmount;
        else if (income.payment_type === 'TRANSFERENCIA') transferTotal += paidAmount;
        else if (income.payment_type === 'TARJETA') cardTotal += paidAmount;
      });

      setIncomes(paymentsIncomes);
      setTotalCash(cashTotal);
      setTotalTransfer(transferTotal);
      setTotalCard(cardTotal);
    } catch (error) {
      console.error('Error cargando caja chica desde Supabase:', error);
      setIncomes([]);
      setTotalCash(0);
      setTotalTransfer(0);
      setTotalCard(0);
    }
  };

  const initialAmount = currentDay?.initial_cash_balance || 0;
  const currentCashAmount = initialAmount + totalCash;
  const totalIncomes = totalCash + totalTransfer + totalCard;

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case 'EFECTIVO':
        return <DollarSign className="w-4 h-4" />;
      case 'TARJETA':
        return <CreditCard className="w-4 h-4" />;
      case 'TRANSFERENCIA':
        return <Receipt className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  const getPaymentColor = (type: string) => {
    switch (type) {
      case 'EFECTIVO':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'TARJETA':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'TRANSFERENCIA':
        return 'bg-violet-50 text-violet-700 border border-violet-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CANCELADO':
      case 'PAGADO':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'PARCIAL':
      case 'ABONO':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'PENDIENTE':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const handlePrintDocument = async (income: PaymentIncome) => {
    if (income.doc_type === 'FACTURA') {
      alert('Las facturas se gestionan desde el modulo de Facturacion.');
      return;
    }

    if (!income.source_order) {
      alert('No se encontro el pedido relacionado.');
      return;
    }

    await printReceipt({
      order: income.source_order,
      income,
      onSuccess: (message) => {
        setPrintSuccess(message);
        setTimeout(() => setPrintSuccess(''), 5000);
      },
      onError: (error) => {
        alert(`${error}`);
      },
    });
  };

  return (
    <div className="app-page petty-cash-page">
      <div className="petty-cash-hero">
        <div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2 -ml-2 text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al inicio
          </Button>
          <h1 className="text-slate-950">Control de Caja Chica</h1>
          <p className="text-slate-600">Ingresos automaticos del dia desde pedidos</p>
        </div>
      </div>

      {!currentDay && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertDescription className="text-amber-900">
            <strong>No hay dia operativo abierto.</strong> Los datos de caja chica se muestran unicamente cuando hay un dia operativo activo.
          </AlertDescription>
        </Alert>
      )}

      {printSuccess && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <AlertDescription className="text-emerald-800">{printSuccess}</AlertDescription>
        </Alert>
      )}

      <div className="petty-cash-content">
        <section className="petty-bento-grid">
          <Card className="petty-bento-card petty-bento-card--initial">
            <CardContent>
              <span className="petty-card-label">Monto inicial del dia</span>
              <strong>L {initialAmount.toFixed(2)}</strong>
              <small>Registrado al abrir caja</small>
            </CardContent>
          </Card>

          <Card className="petty-bento-card petty-bento-card--official">
            <CardContent>
              <div>
                <span className="petty-card-label">Monto oficial en caja</span>
                <strong>L {currentCashAmount.toFixed(2)}</strong>
                <small>Efectivo disponible real</small>
              </div>
              <Badge className="petty-cash-growth">
                <TrendingUp className="w-3 h-3 mr-1" />
                + L {totalCash.toFixed(2)}
              </Badge>
            </CardContent>
          </Card>

          <Card className="petty-bento-card petty-bento-card--total">
            <CardContent>
              <span className="petty-card-label">Total ingresos del dia</span>
              <strong>L {totalIncomes.toFixed(2)}</strong>
              <small>{incomes.length} {incomes.length === 1 ? 'ingreso registrado' : 'ingresos registrados'}</small>
            </CardContent>
          </Card>

          <Card className="petty-bento-card petty-payment-breakdown">
            <CardContent>
              <div className="petty-breakdown-head">
                <span>Desglose por metodo de pago</span>
                <small>Resumen del dia</small>
              </div>
              <div className="petty-payment-row">
                <div className="is-cash">
                  <DollarSign className="w-4 h-4" />
                  <span>Efectivo</span>
                  <strong>L {totalCash.toFixed(2)}</strong>
                  <small>{incomes.filter((i) => i.payment_type === 'EFECTIVO').length} pagos</small>
                </div>
                <div className="is-card">
                  <CreditCard className="w-4 h-4" />
                  <span>Tarjeta</span>
                  <strong>L {totalCard.toFixed(2)}</strong>
                  <small>{incomes.filter((i) => i.payment_type === 'TARJETA').length} pagos</small>
                </div>
                <div className="is-transfer">
                  <Receipt className="w-4 h-4" />
                  <span>Transferencia</span>
                  <strong>L {totalTransfer.toFixed(2)}</strong>
                  <small>{incomes.filter((i) => i.payment_type === 'TRANSFERENCIA').length} pagos</small>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="petty-history-card">
          <CardHeader>
            <CardTitle>Historial de ingresos del dia</CardTitle>
            <CardDescription>Pagos registrados en pedidos del dia operativo actual</CardDescription>
          </CardHeader>
          <CardContent>
            {incomes.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No hay ingresos registrados hoy</p>
                <p className="text-sm text-slate-500 mt-1">
                  Los ingresos se registran automaticamente al crear pedidos con pagos.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>No. Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Forma de pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((income) => (
                      <TableRow key={income.id}>
                        <TableCell>
                          <div className="text-sm">{new Date(income.date).toLocaleDateString('es-HN')}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(income.date).toLocaleTimeString('es-HN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{income.order_number}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{income.customer_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentColor(income.payment_type)}>
                            <span className="flex items-center gap-1">
                              {getPaymentIcon(income.payment_type)}
                              {income.payment_type}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(income.payment_status)}>
                            {income.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-slate-500">{income.doc_type}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-emerald-700">+L {income.amount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintDocument(income)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Imprimir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
