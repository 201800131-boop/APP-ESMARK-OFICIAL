import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Separator } from '../ui/separator';
import { 
  Calendar, 
  DollarSign, 
  Package, 
  FileText, 
  TrendingUp, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  ShoppingCart,
  CreditCard,
  Banknote,
  Download,
  Printer,
  Lock,
  Clock,
  Users,
  LogOut,
  History
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CashCountDialog, { type CashCount } from './CashCountDialog';
import { generateCloseDayPDF } from '../../utils/close-day-pdf';
import { toast } from 'sonner';
import { useDay } from '../../contexts/DayContext';
import WorkDaysHistoryView from '../WorkDays/WorkDaysHistoryView';
import { closeWorkDay, getWorkDayDateKey, isPendingPreviousWorkDay, saveDayReport, workDaysAPI } from '../../utils/work-days-api';
import { isNotificationEnabled } from '../../utils/notification-settings';

const DAY_STATUS_EVENT = 'esmark:day-status-changed';
const BUSINESS_TIME_ZONE = 'America/Tegucigalpa';
const CLOSE_DEADLINE_MINUTES = 16 * 60 + 30;
const CLOSE_EXTENSION_MINUTES = 2 * 60;
const CLOSE_FINAL_DEADLINE_MINUTES = CLOSE_DEADLINE_MINUTES + CLOSE_EXTENSION_MINUTES;

function businessDateParts(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '0000';
  const month = parts.find((part) => part.type === 'month')?.value || '00';
  const day = parts.find((part) => part.type === 'day')?.value || '00';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);

  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: hour * 60 + minute,
  };
}

function localDateKey(value: Date | string) {
  return businessDateParts(value).dateKey;
}

interface CloseDayReport {
  date: string;
  orders: {
    total: number;
    delivered: number;
    pending: number;
    production: number;
    design: number;
    list: any[];
  };
  financial: {
    totalSales: number;
    totalPaid: number;
    totalPending: number;
    cash: number;
    card: number;
    transfer: number;
  };
  quotes: {
    total: number;
    amount: number;
    accepted: number;
    pending: number;
    list: any[]; // ✨ NUEVO: Lista de cotizaciones del día
  };
  pettyCash: {
    initial: number;
    current: number;
    expenses: number;
    income: number;
  };
  inventory: {
    movements: number;
    lowStock: number;
  };
  activities?: any[]; // ✨ NUEVO: Historial de actividades del día
  cashCount?: CashCount;
}

interface CloseDayViewProps {
  onLogout?: () => void;
  onNavigate?: (view: string, data?: any) => void;
  initialTab?: 'start' | 'history';
}

export default function CloseDayView({ onLogout, onNavigate, initialTab = 'start' }: CloseDayViewProps = {}) {
  const { currentDay, setCurrentDay } = useDay();
  const [activeTab, setActiveTab] = useState<'start' | 'history'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [report, setReport] = useState<CloseDayReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [showCashCount, setShowCashCount] = useState(false);
  const [cashCounted, setCashCounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const currentDayDateKey = currentDay ? getWorkDayDateKey(currentDay) : null;
  const currentBusinessTime = businessDateParts(now);
  const todayDateKey = currentBusinessTime.dateKey;
  const selectedDateKey = localDateKey(selectedDate);
  const closeWindowExpired = currentBusinessTime.minutes > CLOSE_FINAL_DEADLINE_MINUTES;
  const closeWindowExtended = currentBusinessTime.minutes > CLOSE_DEADLINE_MINUTES && !closeWindowExpired;
  const hasPendingPreviousDay = isPendingPreviousWorkDay(currentDay);
  const selectedOpenDay = !!currentDay && currentDay.status === 'open' && selectedDateKey === currentDayDateKey;
  const canCloseToday = selectedOpenDay && (hasPendingPreviousDay || !closeWindowExpired);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!currentDayDateKey) return;
    setSelectedDate(new Date(`${currentDayDateKey}T12:00:00`));
  }, [currentDayDateKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    checkIfDayClosed();
    loadData();
  }, [selectedDate]);

  const checkIfDayClosed = async () => {
    const today = format(selectedDate, 'yyyy-MM-dd');
    const days = await workDaysAPI.getHistory(60);
    setIsClosed(days.some((day) => {
      const openedAt = format(new Date(day.opened_at), 'yyyy-MM-dd');
      return openedAt === today && day.status === 'closed';
    }));
  };
  const loadData = async () => {
    try {
      const ordersData = await api.getOrders();
      setOrders(ordersData.orders || []);

      const quotesData = await api.getQuotes();
      setQuotes(quotesData.quotes || []);

      const productsData = await api.getProducts();
      setProducts(productsData.products || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };
  const generateReport = async () => {
    if (!currentDay) {
      toast.error('No hay un dia operativo abierto para cerrar.');
      return;
    }

    if (!canCloseToday) {
      toast.error(closeWindowExpired
        ? 'El cierre vencio. La hora maxima con aplazamiento es 6:30 p. m.'
        : 'Seleccione la fecha de la jornada abierta para realizar el cierre.');
      return;
    }

    setIsProcessing(true);
    setLoading(true);

    try {
      const today = format(selectedDate, 'yyyy-MM-dd');
      
      // PEDIDOS DEL DÍA
      const ordersToday = orders.filter(o => {
        if (!o.created_at) return false;
        const orderDate = format(new Date(o.created_at), 'yyyy-MM-dd');
        return orderDate === today;
      });

      const deliveredOrders = ordersToday.filter(o => o.status === 'ENTREGADO');
      const pendingOrders = ordersToday.filter(o => 
        o.status === 'PENDIENTE' || o.status === 'LISTO'
      );
      const productionOrders = ordersToday.filter(o => o.status === 'PRODUCCION');
      const designOrders = ordersToday.filter(o => o.status === 'DISEÑO');

      // INFORMACIÓN FINANCIERA
      const totalSales = ordersToday.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalPaid = ordersToday.reduce((sum, o) => sum + (o.amount_paid || o.paid_amount || 0), 0);
      const totalPending = totalSales - totalPaid;

      // Desglose por método de pago
      let cashTotal = 0;
      let cardTotal = 0;
      let transferTotal = 0;

      ordersToday.forEach(order => {
        const paid = order.amount_paid || order.paid_amount || 0;
        switch (order.payment_type) {
          case 'EFECTIVO':
            cashTotal += paid;
            break;
          case 'TARJETA':
            cardTotal += paid;
            break;
          case 'TRANSFERENCIA':
            transferTotal += paid;
            break;
          default:
            cashTotal += paid; // Por defecto efectivo
        }
      });

      // COTIZACIONES DEL DÍA
      const quotesToday = quotes.filter(q => {
        if (!q.fecha) return false;
        const quoteDate = format(new Date(q.fecha), 'yyyy-MM-dd');
        return quoteDate === today;
      });

      const acceptedQuotes = quotesToday.filter(q => q.estado === 'ACEPTADA');
      const pendingQuotes = quotesToday.filter(q => 
        q.estado === 'PENDIENTE' || q.estado === 'ENVIADA' || q.estado === 'BORRADOR'
      );
      const quotesAmount = quotesToday.reduce((sum, q) => sum + (q.total || 0), 0);

      // CAJA CHICA
      const initialAmount = currentDay?.initial_cash_balance || 0;
      const movementsList = await workDaysAPI.getPettyCashMovements(currentDay?.id || null);
      let expenses = 0;
      let income = 0;
      let currentAmount = initialAmount;

      if (movementsList.length > 0) {
        const todayMovements = movementsList.filter((m: any) => {
          if (!m.created_at) return false;
          const movDate = format(new Date(m.created_at), 'yyyy-MM-dd');
          return movDate === today;
        });

        expenses = todayMovements
          .filter((m: any) => m.movement_type === 'expense')
          .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

        income = todayMovements
          .filter((m: any) => m.movement_type === 'income')
          .reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);

        currentAmount = initialAmount - expenses + income;
      }
      // INVENTARIO
      const lowStockProducts = products.filter(p => 
        p.stock !== undefined && p.min_stock !== undefined && p.stock <= p.min_stock
      );

      const activityData = await api.getActivityLogs();
      const dayActivities = (activityData.logs || []).filter((activity: any) => {
        if (!activity.created_at) return false;
        return format(new Date(activity.created_at), 'yyyy-MM-dd') === today;
      });
      const reportData: CloseDayReport = {
        date: today,
        orders: {
          total: ordersToday.length,
          delivered: deliveredOrders.length,
          pending: pendingOrders.length,
          production: productionOrders.length,
          design: designOrders.length,
          list: ordersToday,
        },
        financial: {
          totalSales,
          totalPaid,
          totalPending,
          cash: cashTotal,
          card: cardTotal,
          transfer: transferTotal,
        },
        quotes: {
          total: quotesToday.length,
          amount: quotesAmount,
          accepted: acceptedQuotes.length,
          pending: pendingQuotes.length,
          list: quotesToday,
        },
        pettyCash: {
          initial: initialAmount,
          current: currentAmount,
          expenses,
          income,
        },
        inventory: {
          movements: ordersToday.length, // Pedidos que afectaron inventario
          lowStock: lowStockProducts.length,
        },
        activities: dayActivities,
      };

      setReport(reportData);
      
      // Mostrar automáticamente el dialog de conteo de efectivo
      setShowCashCount(true);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error al generar el reporte');
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleCashCountConfirm = (cashCount: CashCount) => {
    if (!report) return;
    
    // Agregar conteo de efectivo al reporte
    const updatedReport = {
      ...report,
      cashCount,
    };
    
    setReport(updatedReport);
    setCashCounted(true);
    setShowCashCount(false);
    
    toast.success('Conteo de efectivo registrado exitosamente');
  };

  const closeDay = async () => {
    if (!report) return;

    if (!currentDay) {
      toast.error('No hay un dia operativo abierto para cerrar.');
      return;
    }

    if (!canCloseToday) {
      toast.error(closeWindowExpired
        ? 'El cierre vencio. La hora maxima con aplazamiento es 6:30 p. m.'
        : 'Seleccione la fecha de la jornada abierta para realizar el cierre.');
      return;
    }

    if (!cashCounted || !report.cashCount) {
      toast.error('Debe realizar el conteo de efectivo antes de cerrar el dia');
      setShowCashCount(true);
      return;
    }

    const confirmClose = window.confirm(
      'Esta seguro de cerrar el dia?\n\nEsta accion guardara el reporte final en Supabase y generara el PDF.'
    );

    if (!confirmClose) return;

    try {
      setIsProcessing(true);
      const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
      const finalReport = {
        ...report,
        closedAt: new Date().toISOString(),
        closedBy: currentUser?.name || currentUser?.username || 'Sistema',
      };

      if (currentDay?.id) {
        const closeNotes = report.cashCount.notes?.trim()
          ? `Observaciones del conteo: ${report.cashCount.notes.trim()}`
          : `Cierre de dia ${report.date}`;

        await closeWorkDay(
          currentDay.id,
          currentUser?.id || currentUser?.username || 'system',
          closeNotes,
          currentUser?.name || currentUser?.username || 'Sistema',
          report.cashCount.total
        );
      }

      await saveDayReport(currentDay?.id || null, finalReport, currentUser?.id || currentUser?.username);
      setCurrentDay(null);
      window.dispatchEvent(new Event(DAY_STATUS_EVENT));

      try {
        generateCloseDayPDF(finalReport);
      } catch (pdfError) {
        console.warn('Advertencia al generar PDF:', pdfError);
      }

      setIsClosed(true);
      setIsProcessing(false);
      const shouldLogoutNow = window.confirm(
        'Dia cerrado correctamente.\n\nDesea cerrar sesion ahora?\n\nAceptar: cerrar sesion ahora\nCancelar: mas tarde'
      );

      if (shouldLogoutNow) onLogout?.();
      if (isNotificationEnabled('close_day')) {
        toast.success('Dia cerrado exitosamente en Supabase. PDF generado.');
      }
    } catch (error) {
      console.error('Error closing day:', error);
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : 'Error al cerrar el dia');
    }
  };


  const exportToPDF = () => {
    if (!report) return;
    generateCloseDayPDF(report);
    toast.success('Reporte exportado a PDF exitosamente');
  };

  const printReport = () => {
    window.print();
  };

  const renderCloseDayTabs = () => (
    <div className="close-day-tabs-bar">
      <button
        type="button"
        className={`close-day-tab ${activeTab === 'start' ? 'is-active' : ''}`}
        onClick={() => setActiveTab('start')}
      >
        <Lock className="w-4 h-4" />
        Inicio de cierre
      </button>
      <button
        type="button"
        className={`close-day-tab ${activeTab === 'history' ? 'is-active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        <History className="w-4 h-4" />
        Historial de días
      </button>
    </div>
  );

  const renderCloseDayHeader = (title = 'Cierre de Día', description?: string) => (
    <div className="close-day-page-header">
      <div>
        <h1 className="text-gray-900">{title}</h1>
        {description && <p className="text-gray-800">{description}</p>}
      </div>
    </div>
  );

  if (activeTab === 'history') {
    return (
      <div className="app-page close-day-page space-y-6">
        {renderCloseDayHeader('Cierre de Día', 'Inicio de cierre e historial operativo en una sola pantalla')}
        {renderCloseDayTabs()}
        <WorkDaysHistoryView
          embedded
          onViewReport={(dayId) => onNavigate?.('day-report', { dayId })}
        />
      </div>
    );
  }

  if (!report && !loading) {
    return (
      <div className="app-page close-day-page space-y-6">
        {renderCloseDayHeader(
          'Cierre de Día',
          `Genera el reporte completo de operaciones del ${format(selectedDate, 'PPP', { locale: es })}`
        )}
        {renderCloseDayTabs()}

        <Card className="border-2 border-gray-300 shadow-lg bg-linear-to-br from-gray-50 to-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl text-gray-900">
              {isClosed ? '🔒 Día Cerrado' : 'Iniciar Cierre de Día'}
            </CardTitle>
            <CardDescription className="text-gray-700">
              {isClosed 
                ? 'Este día ya ha sido cerrado y no se puede modificar'
                : 'Recopila y analiza todas las operaciones del día antes de cerrar'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isClosed ? (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <p className="text-gray-900 font-medium mb-2">
                  Día cerrado exitosamente
                </p>
                <p className="text-sm text-gray-700">
                  Puede consultar el reporte en el historial de cierres
                </p>
              </div>
            ) : (
              <>
                {hasPendingPreviousDay && canCloseToday && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-950">
                        Tiene un cierre de dia pendiente.
                      </p>
                      <p className="text-xs text-red-900 mt-1">
                        La jornada del {currentDayDateKey} sigue abierta. Puede realizar su cierre ahora.
                      </p>
                    </div>
                  </div>
                )}

                {!canCloseToday && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-950">
                        {closeWindowExpired && !hasPendingPreviousDay
                          ? 'La ventana de cierre ya vencio.'
                          : 'Seleccione la jornada abierta.'}
                      </p>
                      <p className="text-xs text-amber-900 mt-1">
                        {closeWindowExpired && !hasPendingPreviousDay
                          ? 'La hora limite es 4:30 p. m., con aplazamiento maximo hasta las 6:30 p. m.'
                          : currentDay
                          ? `El dia abierto corresponde a ${currentDayDateKey || 'una fecha anterior'}.`
                          : 'No hay un dia operativo abierto para cerrar.'}
                      </p>
                    </div>
                  </div>
                )}

                {closeWindowExtended && canCloseToday && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-950">
                        Cierre en ventana de aplazamiento.
                      </p>
                      <p className="text-xs text-blue-900 mt-1">
                        La hora regular era 4:30 p. m. Todavia puede cerrarse hasta las 6:30 p. m.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Recopilación de Pedidos</p>
                      <p className="text-xs text-gray-700">Todos los pedidos creados, entregados y pendientes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Análisis Financiero</p>
                      <p className="text-xs text-gray-700">Ventas totales, cobros y pendientes por cobrar</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Desglose de Pagos</p>
                      <p className="text-xs text-gray-700">Efectivo, tarjeta y transferencias del día</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cotizaciones Generadas</p>
                      <p className="text-xs text-gray-700">Resumen de cotizaciones y estado actual</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Control de Caja Chica</p>
                      <p className="text-xs text-gray-700">Saldo inicial, movimientos y saldo final</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-700 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Estado de Inventario</p>
                      <p className="text-xs text-gray-700">Movimientos y productos con stock bajo</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={generateReport}
                  disabled={isProcessing || !canCloseToday}
                  variant="primary"
                  size="lg"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 border-gray-900 shadow-lg [&_svg]:text-white"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generando reporte...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      {canCloseToday ? 'Iniciar Cierre de Día' : 'Cierre no disponible'}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-page close-day-page space-y-6">
        {renderCloseDayHeader('Cierre de Día', 'Preparando el reporte operativo del día')}
        {renderCloseDayTabs()}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-900">Generando reporte completo del día...</p>
            <p className="text-sm text-gray-700 mt-2">Recopilando pedidos, pagos, cotizaciones y más...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="app-page close-day-page space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Reporte de Cierre del Día</h1>
          <p className="text-gray-800">
            {format(new Date(report.date), 'PPP', { locale: es })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printReport} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          {!isClosed && (
            <Button onClick={closeDay} variant="destructive" size="sm" disabled={!canCloseToday || isProcessing}>
              <Lock className="w-4 h-4 mr-2" />
              Cerrar Día
            </Button>
          )}
        </div>
      </div>
      {renderCloseDayTabs()}

      {isClosed && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-700 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-900">Día cerrado exitosamente</p>
            <p className="text-xs text-green-800">Este reporte ha sido guardado. Si necesita reiniciar el día, un administrador puede hacerlo desde Ajustes &gt; Sistema.</p>
          </div>
        </div>
      )}

      {/* Botones de Acción - Solo mostrar cuando no esté cerrado */}
      {!isClosed && (
        <div className="hidden">
          <Button 
            onClick={printReport} 
            variant="outline"
            size="sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            onClick={exportToPDF} 
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button 
            onClick={() => setShowCashCount(true)}
            variant="primary"
            size="sm"
            disabled={cashCounted}
          >
            {cashCounted ? '✓ Conteo Realizado' : 'Conteo de Efectivo'}
          </Button>
          <Button 
            onClick={closeDay}
            variant="destructive"
            size="lg"
            disabled={isProcessing || !cashCounted || !canCloseToday}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Cerrando...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Cerrar Día
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dialog de Cierre - Confirmación Final */}

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-gray-200 shadow-md bg-linear-to-br from-gray-50 to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-900">Ventas Totales</CardTitle>
            <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
              <DollarSign className="w-4 h-4 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              L {report.financial.totalSales.toFixed(2)}
            </div>
            <p className="text-xs text-gray-700 mt-1">
              {report.orders.total} pedidos del día
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md bg-linear-to-br from-gray-50 to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-900">Total Cobrado</CardTitle>
            <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
              <Wallet className="w-4 h-4 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              L {report.financial.totalPaid.toFixed(2)}
            </div>
            <Badge variant="success" className="mt-1">
              {report.financial.totalSales > 0
                ? `${((report.financial.totalPaid / report.financial.totalSales) * 100).toFixed(1)}% cobrado`
                : 'Sin ventas'}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md bg-linear-to-br from-gray-50 to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-900">Por Cobrar</CardTitle>
            <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
              <Clock className="w-4 h-4 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              L {report.financial.totalPending.toFixed(2)}
            </div>
            <p className="text-xs text-gray-700 mt-1">
              Pendiente de cobro
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md bg-linear-to-br from-gray-50 to-gray-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-gray-900">Cotizaciones</CardTitle>
            <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
              <FileText className="w-4 h-4 text-gray-700" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {report.quotes.total}
            </div>
            <p className="text-xs text-gray-700 mt-1">
              L {report.quotes.amount.toFixed(2)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desglose de Pedidos */}
      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            Desglose de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-700 mb-1">Total del Día</p>
              <p className="text-2xl font-semibold text-gray-900">{report.orders.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-sm text-green-800 mb-1">Entregados</p>
              <p className="text-2xl font-semibold text-green-900">{report.orders.delivered}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-800 mb-1">En Producción</p>
              <p className="text-2xl font-semibold text-yellow-900">{report.orders.production}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-700 mb-1">En Diseño</p>
              <p className="text-2xl font-semibold text-gray-900">{report.orders.design}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="close-day-balance-grid grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
      {/* Desglose de Pagos */}
      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-700" />
            Desglose de Pagos Recibidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="close-day-row flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
                  <Banknote className="w-5 h-5 text-gray-700" />
                </div>
                <span className="font-medium text-gray-900">Efectivo</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                L {report.financial.cash.toFixed(2)}
              </span>
            </div>
            <div className="close-day-row flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
                  <CreditCard className="w-5 h-5 text-gray-700" />
                </div>
                <span className="font-medium text-gray-900">Tarjeta</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                L {report.financial.card.toFixed(2)}
              </span>
            </div>
            <div className="close-day-row flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-200 border border-gray-300">
                  <TrendingUp className="w-5 h-5 text-gray-700" />
                </div>
                <span className="font-medium text-gray-900">Transferencia</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">
                L {report.financial.transfer.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="close-day-row close-day-total flex items-center justify-between bg-gray-100 border-2 border-gray-300 rounded-lg">
              <span className="font-semibold text-gray-900">TOTAL COBRADO</span>
              <span className="text-xl font-bold text-gray-900">
                L {report.financial.totalPaid.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Caja Chica */}
      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-700" />
            Control de Caja Chica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="close-day-row flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-900">Saldo Inicial</span>
              <span className="font-semibold text-gray-900">L {report.pettyCash.initial.toFixed(2)}</span>
            </div>
            <div className="close-day-row flex items-center justify-between bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-900">+ Ingresos</span>
              <span className="font-semibold text-green-900">L {report.pettyCash.income.toFixed(2)}</span>
            </div>
            <div className="close-day-row flex items-center justify-between bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-900">- Egresos</span>
              <span className="font-semibold text-red-900">L {report.pettyCash.expenses.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="close-day-row close-day-total flex items-center justify-between bg-gray-100 border-2 border-gray-300 rounded-lg">
              <span className="font-semibold text-gray-900">SALDO FINAL</span>
              <span className="text-xl font-bold text-gray-900">
                L {report.pettyCash.current.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      <div className="close-day-bento grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Resumen de Cotizaciones */}
      <Card className="lg:col-span-5 border border-gray-200 shadow-md h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-700" />
            Resumen de Cotizaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-700 mb-1">Total</p>
              <p className="text-xl font-semibold text-gray-900">{report.quotes.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-xs text-green-800 mb-1">Aceptadas</p>
              <p className="text-xl font-semibold text-green-900">{report.quotes.accepted}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-xs text-yellow-800 mb-1">Pendientes</p>
              <p className="text-xl font-semibold text-yellow-900">{report.quotes.pending}</p>
            </div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-900">Monto total</span>
              <span className="text-lg font-semibold text-gray-900">
                L {report.quotes.amount.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado de Inventario */}
      <Card className="lg:col-span-3 border border-gray-200 shadow-md h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-700" />
            Estado de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">Movimientos del Día</p>
              <p className="text-2xl font-semibold text-gray-900">{report.inventory.movements}</p>
              <p className="text-xs text-gray-700 mt-1">Pedidos que afectaron inventario</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 mb-2">Productos con Stock Bajo</p>
              <p className="text-2xl font-semibold text-red-900">{report.inventory.lowStock}</p>
              <p className="text-xs text-red-800 mt-1">Requieren reabastecimiento</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✨ NUEVO: Historial Detallado del Día */}
      <Card className="lg:col-span-4 border border-blue-200 shadow-md bg-blue-50/40 h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-700" />
            📋 Historial Completo del Día
          </CardTitle>
          <CardDescription>
            Todas las actividades registradas hoy
          </CardDescription>
        </CardHeader>
        <CardContent className="close-day-history-list space-y-4">
          {/* Lista de Cotizaciones del Día */}
          {report.quotes.list && report.quotes.list.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Cotizaciones ({report.quotes.list.length})
              </h3>
              <div className="space-y-2">
                {report.quotes.list.map((quote: any, index: number) => (
                  <div 
                    key={quote.id || index}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            Cotización #{quote.number || 'N/A'}
                          </span>
                          <Badge 
                            variant={
                              quote.estado === 'ACEPTADA' ? 'success' :
                              quote.estado === 'RECHAZADA' ? 'destructive' :
                              quote.estado === 'ENVIADA' ? 'default' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {quote.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          Cliente: {quote.customer_name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {quote.items?.length || 0} producto(s) ⬢ 
                          {quote.customer_phone && ` Tel: ${quote.customer_phone} ⬢`}
                          {quote.customer_email && ` Email: ${quote.customer_email}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          L {(quote.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {quote.fecha && format(new Date(quote.fecha), 'HH:mm', { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Pedidos del Día */}
          {report.orders.list && report.orders.list.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-green-600" />
                Pedidos Registrados ({report.orders.list.length})
              </h3>
              <div className="space-y-2">
                {report.orders.list.map((order: any, index: number) => (
                  <div 
                    key={order.id || index}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            Pedido #{order.order_number || 'N/A'}
                          </span>
                          <Badge 
                            variant={
                              order.status === 'ENTREGADO' ? 'success' :
                              order.status === 'PRODUCCION' ? 'default' :
                              order.status === 'DISEÑO' ? 'outline' :
                              order.status === 'LISTO' ? 'default' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                          {order.payment_status && (
                            <Badge 
                              variant={order.payment_status === 'PAGADO' ? 'success' : 'destructive'}
                              className="text-xs"
                            >
                              {order.payment_status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">
                          Cliente: {order.customer_name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.product_type} ⬢ 
                          {order.payment_type && ` ${order.payment_type} ⬢`}
                          {order.created_at && ` ${format(new Date(order.created_at), 'HH:mm', { locale: es })}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          L {(order.total || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Pagado: L {(order.amount_paid || order.paid_amount || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Si no hay actividades */}
          {(!report.quotes.list || report.quotes.list.length === 0) && 
           (!report.orders.list || report.orders.list.length === 0) && (
            <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No hay actividades registradas hoy</p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Botones de acción final */}
      {!isClosed && (
        <Card className="border-2 border-red-300 shadow-lg bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">
                ¿Confirmar Cierre de Día?
              </h3>
              <p className="text-sm text-gray-800">
                Una vez cerrado el día, no podrá modificar este reporte.
                Pero podrá reiniciar el día si es necesario.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => setReport(null)} 
                variant="outline"
              >
                Cancelar
              </Button>
              <Button 
                onClick={closeDay}
                variant="destructive"
                size="lg"
                disabled={isProcessing || !canCloseToday}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Cerrando...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Confirmar y Cerrar Día
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog de Conteo de Efectivo */}
      <CashCountDialog
        isOpen={showCashCount}
        onClose={() => setShowCashCount(false)}
        onConfirm={handleCashCountConfirm}
        expectedCash={(report?.pettyCash.initial || 0) + (report?.financial.cash || 0)}
      />
    </div>
  );
}





