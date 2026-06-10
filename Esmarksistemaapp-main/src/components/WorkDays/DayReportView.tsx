import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  Download,
  FileText,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Clock,
  Package,
  CreditCard,
} from 'lucide-react';
import { workDaysAPI, WorkDay } from '../../utils/work-days-api';
import { api } from '../../utils/api';
import { toast } from 'sonner';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';

interface DayReportViewProps {
  dayId: string;
  onBack: () => void;
}

export default function DayReportView({ dayId, onBack }: DayReportViewProps) {
  const [workDay, setWorkDay] = useState<WorkDay | null>(null);
  const [savedDayReport, setSavedDayReport] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [pettyCashMovements, setPettyCashMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDayData();
  }, [dayId]);

  const loadDayData = async () => {
    try {
      setLoading(true);

      const day = await workDaysAPI.getById(dayId);

      if (!day) {
        toast.error('Dia no encontrado');
        onBack();
        return;
      }

      setWorkDay(day);

      const savedReport = await workDaysAPI.getLatestReport(dayId);
      setSavedDayReport(savedReport?.report || null);

      const ordersResult = await api.getOrders();
      const allOrders = ordersResult.orders || [];
      setOrders(allOrders.filter((o: any) => o.work_day_id === dayId));

      const dayMovements = await workDaysAPI.getPettyCashMovements(dayId);
      setPettyCashMovements(dayMovements);
    } catch (error: any) {
      console.error('Error cargando datos del dia:', error);
      toast.error('Error al cargar datos', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };
  const generatePDF = () => {
    if (!workDay) return;

    const reportObservations = getReportObservations();
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Crear HTML para el reporte
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Día Operativo #${workDay.day_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #4b5563; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .summary-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
          .profit { color: #059669; font-weight: bold; }
          .loss { color: #dc2626; font-weight: bold; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-success { background: #d1fae5; color: #065f46; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
        </style>
      </head>
      <body>
        <h1>📅 Reporte Día Operativo #${workDay.day_number}</h1>
        
        <div class="summary-box">
          <p><strong>Fecha:</strong> ${new Date(workDay.opened_at).toLocaleDateString('es-HN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</p>
          <p><strong>Apertura:</strong> ${new Date(workDay.opened_at).toLocaleTimeString('es-HN')} por ${workDay.opened_by_name}</p>
          <p><strong>Cierre:</strong> ${workDay.closed_at ? new Date(workDay.closed_at).toLocaleTimeString('es-HN') : 'N/A'} ${workDay.closed_by_name ? `por ${workDay.closed_by_name}` : ''}</p>
        </div>

        <h2>💰 Resumen Financiero</h2>
        <table>
          <tr>
            <th>Concepto</th>
            <th style="text-align: right;">Monto</th>
          </tr>
          <tr>
            <td>Saldo Inicial</td>
            <td style="text-align: right;">L ${workDay.initial_cash_balance.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Saldo Final</td>
            <td style="text-align: right;">L ${(workDay.final_cash_balance || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Diferencia</strong></td>
            <td style="text-align: right;" class="${
              (workDay.final_cash_balance || 0) - workDay.initial_cash_balance > 0 ? 'profit' : 'loss'
            }">
              L ${((workDay.final_cash_balance || 0) - workDay.initial_cash_balance).toFixed(2)}
            </td>
          </tr>
        </table>

        <h2>🛒 Pedidos del Día</h2>
        <p><strong>Total de pedidos:</strong> ${orders.length}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th style="text-align: right;">Total</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map((order, idx) => `
              <tr>
                <td>${order.number || idx + 1}</td>
                <td>${order.customer_name || 'Sin nombre'}</td>
                <td><span class="badge badge-${
                  order.status === 'ENTREGADO' ? 'success' : 
                  order.status === 'LISTO PARA ENTREGA' ? 'warning' : 'danger'
                }">${order.status}</span></td>
                <td style="text-align: right;">L ${(order.total || 0).toFixed(2)}</td>
                <td>${order.payment_status || 'PENDIENTE'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>💸 Movimientos de Caja Chica</h2>
        <p><strong>Total de movimientos:</strong> ${pettyCashMovements.length}</p>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Concepto</th>
              <th style="text-align: right;">Monto</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            ${pettyCashMovements.map(movement => `
              <tr>
                <td><span class="badge badge-${movement.type === 'ENTRADA' ? 'success' : 'danger'}">${movement.type}</span></td>
                <td>${movement.concept}</td>
                <td style="text-align: right;">L ${movement.amount.toFixed(2)}</td>
                <td>${new Date(movement.date).toLocaleString('es-HN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${reportObservations ? `
          <h2>Observaciones del Reporte</h2>
          <div class="summary-box">
            <p>${escapeHtml(reportObservations).replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        <p style="margin-top: 40px; color: #6b7280; font-size: 12px; text-align: center;">
          Generado el ${new Date().toLocaleString('es-HN')} - EsmarkSystem
        </p>
      </body>
      </html>
    `;

    // Abrir en nueva ventana e imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      
      // Esperar a que cargue y luego imprimir
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast.success('✅ Reporte generado', {
      description: 'El reporte se ha abierto en una nueva ventana',
      duration: 3000,
    });
  };

  if (loading || !workDay) {
    return (
      <div className="app-page space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  // Cálculos para estadísticas
  const totalVentas = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pedidosPagados = orders.filter(o => o.payment_status === 'PAGADO').length;
  const pedidosPendientes = orders.filter(o => o.payment_status === 'PENDIENTE').length;
  const pedidosAbono = orders.filter(o => o.payment_status === 'ABONO').length;

  const totalEntradas = pettyCashMovements
    .filter(m => m.type === 'ENTRADA')
    .reduce((sum, m) => sum + m.amount, 0);
  const totalSalidas = pettyCashMovements
    .filter(m => m.type === 'SALIDA')
    .reduce((sum, m) => sum + m.amount, 0);

  const difference = (workDay.final_cash_balance || 0) - workDay.initial_cash_balance;
  const isProfit = difference > 0;
  const getReportObservations = () => {
    const cashNotes = savedDayReport?.cashCount?.notes;
    if (typeof cashNotes === 'string' && cashNotes.trim()) return cashNotes.trim();
    if (typeof workDay.notes === 'string' && workDay.notes.trim()) return workDay.notes.trim();
    return '';
  };
  const reportObservations = getReportObservations();

  // Datos para gráficas
  const paymentStatusData = [
    { name: 'Pagado', value: pedidosPagados, color: '#10b981' },
    { name: 'Pendiente', value: pedidosPendientes, color: '#ef4444' },
    { name: 'Abono', value: pedidosAbono, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const cashFlowData = [
    { name: 'Inicial', monto: workDay.initial_cash_balance },
    { name: 'Entradas', monto: totalEntradas },
    { name: 'Salidas', monto: -totalSalidas },
    { name: 'Final', monto: workDay.final_cash_balance || 0 },
  ];

  return (
    <div className="app-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-gray-900">Reporte Día Operativo #{workDay.day_number}</h1>
          <p className="text-gray-600">
            {new Date(workDay.opened_at).toLocaleDateString('es-HN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <Button onClick={generatePDF} className="gap-2">
          <Download className="w-4 h-4" />
          Generar PDF
        </Button>
      </div>

      {/* Info General */}
      <Card className="border-2 border-blue-400 bg-linear-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Información del Día
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">Apertura</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <Clock className="w-4 h-4 text-green-600" />
                {new Date(workDay.opened_at).toLocaleTimeString('es-HN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Cierre</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1">
                <Clock className="w-4 h-4 text-red-600" />
                {workDay.closed_at
                  ? new Date(workDay.closed_at).toLocaleTimeString('es-HN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Abierto por</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1 truncate">
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{workDay.opened_by_name || 'N/A'}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">Cerrado por</p>
              <p className="font-semibold text-gray-900 flex items-center gap-1 truncate">
                <User className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">{workDay.closed_by_name || 'N/A'}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Financiero */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Saldo Inicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-900">
              L {workDay.initial_cash_balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Saldo Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-900">
              L {(workDay.final_cash_balance || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${isProfit ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm flex items-center gap-2 ${isProfit ? 'text-green-900' : 'text-red-900'}`}>
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Diferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${isProfit ? 'text-green-900' : 'text-red-900'}`}>
              {isProfit ? '+' : ''}L {difference.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-purple-600" />
              Total Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-900">L {totalVentas.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfica de Flujo de Efectivo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💰 Flujo de Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="monto" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfica de Estado de Pagos */}
        {paymentStatusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💳 Estado de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pedidos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              Pedidos del Día ({orders.length})
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="success">{pedidosPagados} Pagados</Badge>
              <Badge variant="warning">{pedidosAbono} Abonos</Badge>
              <Badge variant="destructive">{pedidosPendientes} Pendientes</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay pedidos en este día</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">#</th>
                    <th className="text-left py-2 px-4">Cliente</th>
                    <th className="text-left py-2 px-4">Estado</th>
                    <th className="text-right py-2 px-4">Total</th>
                    <th className="text-left py-2 px-4">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">#{order.number || idx + 1}</td>
                      <td className="py-2 px-4">{order.customer_name || 'Sin nombre'}</td>
                      <td className="py-2 px-4">
                        <Badge
                          variant={
                            order.status === 'ENTREGADO'
                              ? 'success'
                              : order.status === 'LISTO PARA ENTREGA'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right font-semibold">
                        L {(order.total || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-4">
                        <Badge
                          variant={
                            order.payment_status === 'PAGADO'
                              ? 'success'
                              : order.payment_status === 'ABONO'
                              ? 'warning'
                              : 'destructive'
                          }
                        >
                          {order.payment_status || 'PENDIENTE'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movimientos Caja Chica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Movimientos de Caja Chica ({pettyCashMovements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pettyCashMovements.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay movimientos en este día</p>
          ) : (
            <div className="space-y-2">
              {pettyCashMovements.map((movement, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${ movement.type === 'ENTRADA' ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50' }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{movement.concept}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(movement.date).toLocaleString('es-HN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={movement.type === 'ENTRADA' ? 'success' : 'destructive'}>
                        {movement.type}
                      </Badge>
                      <p
                        className={`font-bold mt-1 ${ movement.type === 'ENTRADA' ? 'text-green-900' : 'text-red-900' }`}
                      >
                        L {movement.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observaciones */}
      {reportObservations && (
        <Card className="border-2 border-amber-400 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <FileText className="w-5 h-5" />
              Observaciones del Reporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-900 whitespace-pre-wrap">{reportObservations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

