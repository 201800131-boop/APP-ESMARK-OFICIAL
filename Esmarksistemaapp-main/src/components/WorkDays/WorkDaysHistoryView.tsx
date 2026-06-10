import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  User,
  Search,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart3, // 📊 NUEVO: Icono para reportes
} from 'lucide-react';
import { workDaysAPI, WorkDay } from '../../utils/work-days-api';
import { toast } from 'sonner';

export default function WorkDaysHistoryView({ 
  onBack,
  onViewReport, // 📊 NUEVO: Callback para ver reporte
  embedded = false,
}: { 
  onBack?: () => void;
  onViewReport?: (dayId: string) => void; // 📊 NUEVO: Opcional
  embedded?: boolean;
}) {
  const [workDays, setWorkDays] = useState<WorkDay[]>([]);
  const [filteredDays, setFilteredDays] = useState<WorkDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterDays();
  }, [searchQuery, dateFrom, dateTo, workDays]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const days = await workDaysAPI.getHistory();
      setWorkDays(days);
      setFilteredDays(days);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      toast.error('Error al cargar historial', {
        description: error.message,
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterDays = () => {
    let filtered = [...workDays];

    // Filtrar por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (day) =>
          day.day_number.toString().includes(query) ||
          day.opened_by_name?.toLowerCase().includes(query) ||
          day.closed_by_name?.toLowerCase().includes(query) ||
          day.notes?.toLowerCase().includes(query)
      );
    }

    // Filtrar por rango de fechas
    if (dateFrom) {
      filtered = filtered.filter((day) => {
        const dayDate = new Date(day.opened_at).toISOString().split('T')[0];
        return dayDate >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter((day) => {
        const dayDate = new Date(day.opened_at).toISOString().split('T')[0];
        return dayDate <= dateTo;
      });
    }

    setFilteredDays(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const exportToCSV = () => {
    const headers = [
      'Número de Día',
      'Fecha Apertura',
      'Hora Apertura',
      'Fecha Cierre',
      'Hora Cierre',
      'Usuario Apertura',
      'Usuario Cierre',
      'Saldo Inicial',
      'Saldo Final',
      'Diferencia',
      'Notas',
    ];

    const rows = filteredDays.map((day) => {
      const openDate = new Date(day.opened_at);
      const closeDate = day.closed_at ? new Date(day.closed_at) : null;
      const difference = day.final_cash_balance
        ? day.final_cash_balance - day.initial_cash_balance
        : 0;

      return [
        day.day_number,
        openDate.toLocaleDateString('es-HN'),
        openDate.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }),
        closeDate ? closeDate.toLocaleDateString('es-HN') : 'N/A',
        closeDate
          ? closeDate.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
          : 'N/A',
        day.opened_by_name || 'N/A',
        day.closed_by_name || 'N/A',
        `L ${day.initial_cash_balance.toFixed(2)}`,
        day.final_cash_balance ? `L ${day.final_cash_balance.toFixed(2)}` : 'N/A',
        `L ${difference.toFixed(2)}`,
        day.notes || 'Sin notas',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `historial_dias_operativos_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('✅ Exportación completada', {
      description: 'El archivo CSV se ha descargado correctamente',
      duration: 3000,
    });
  };

  const totalInitialBalance = workDays.reduce((sum, day) => sum + (day.initial_cash_balance || 0), 0);
  const totalFinalBalance = workDays.reduce((sum, day) => sum + (day.final_cash_balance || 0), 0);
  const totalDifference = totalFinalBalance - totalInitialBalance;

  if (loading) {
    return (
      <div className={embedded ? 'close-day-history-panel space-y-6' : 'app-page space-y-6'}>
        {!embedded && onBack && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        )}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Cargando historial...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embedded ? 'close-day-history-panel space-y-5' : 'app-page space-y-6'}>
      {/* Header */}
      {!embedded && (
      <div className="flex items-center justify-between">
        <div>
          {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          )}
          <h1 className="text-gray-900">Historial de Días Operativos</h1>
          <p className="text-gray-600">
            Consulta todos los días cerrados y sus detalles
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2" disabled={filteredDays.length === 0}>
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>
      )}

      {embedded && (
        <div className="close-day-history-toolbar flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="close-day-history-kicker">Historial de cierres</p>
            <h2 className="text-xl font-semibold text-slate-950">Días operativos cerrados</h2>
            <p className="text-sm text-slate-600">Consulta cierres, saldos y notas sin salir de Cierre de Día.</p>
          </div>
          <Button onClick={exportToCSV} className="close-day-history-export gap-2 self-start lg:self-auto" disabled={filteredDays.length === 0}>
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      )}

      {embedded && workDays.length > 0 && (
        <div className="close-day-history-bento">
          <div className="close-day-bento-card close-day-bento-card--days">
            <div className="close-day-bento-icon">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p>Días cerrados</p>
              <strong>{workDays.length}</strong>
            </div>
          </div>
          <div className="close-day-bento-card close-day-bento-card--initial">
            <div className="close-day-bento-icon">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p>Saldo inicial total</p>
              <strong>L {totalInitialBalance.toFixed(2)}</strong>
            </div>
          </div>
          <div className="close-day-bento-card close-day-bento-card--final">
            <div className="close-day-bento-icon">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p>Saldo final total</p>
              <strong>L {totalFinalBalance.toFixed(2)}</strong>
            </div>
          </div>
          <div className={`close-day-bento-card close-day-bento-card--difference ${totalDifference > 0 ? 'is-positive' : totalDifference < 0 ? 'is-negative' : 'is-neutral'}`}>
            <div className="close-day-bento-icon">
              {totalDifference < 0 ? <TrendingDown className="w-4 h-4" /> : totalDifference > 0 ? <TrendingUp className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            </div>
            <div>
              <p>Diferencia acumulada</p>
              <strong>{totalDifference > 0 ? '+' : ''}L {totalDifference.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="close-day-history-filters">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="md:col-span-2 space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por número, usuario o notas..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Fecha Desde */}
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Botón limpiar filtros */}
          {(searchQuery || dateFrom || dateTo) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="close-day-history-clear">
              Limpiar filtros
            </Button>
          )}

          {/* Contador */}
          <p className="text-sm text-gray-600">
            Mostrando <strong>{filteredDays.length}</strong> de{' '}
            <strong>{workDays.length}</strong> días
          </p>
        </CardContent>
      </Card>

      {/* Lista de días */}
      {filteredDays.length === 0 ? (
        <Alert>
          <AlertDescription>
            {workDays.length === 0
              ? 'No hay días cerrados en el historial'
              : 'No se encontraron días con los filtros aplicados'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="close-day-history-list-cards space-y-4">
          {filteredDays.map((day) => {
            const openDate = new Date(day.opened_at);
            const closeDate = day.closed_at ? new Date(day.closed_at) : null;
            const difference = day.final_cash_balance
              ? day.final_cash_balance - day.initial_cash_balance
              : 0;
            const isProfit = difference > 0;

            return (
              <Card
                key={day.id}
                className="close-day-history-card border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <CardHeader className="close-day-history-card-header pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="close-day-history-card-icon">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Día Operativo #{day.day_number}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {openDate.toLocaleDateString('es-HN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge className="close-day-history-status">CERRADO</Badge>
                  </div>
                </CardHeader>
                <CardContent className="close-day-history-card-content pt-4">
                  <div className="close-day-history-meta grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Hora Apertura */}
                    <div className="close-day-history-meta-item">
                      <p className="text-xs text-gray-600 mb-1">Hora Apertura</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-green-600" />
                        {openDate.toLocaleTimeString('es-HN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Hora Cierre */}
                    <div className="close-day-history-meta-item">
                      <p className="text-xs text-gray-600 mb-1">Hora Cierre</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-red-600" />
                        {closeDate
                          ? closeDate.toLocaleTimeString('es-HN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </p>
                    </div>

                    {/* Usuario Apertura */}
                    <div className="close-day-history-meta-item">
                      <p className="text-xs text-gray-600 mb-1">Abierto por</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1 truncate">
                        <User className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate">{day.opened_by_name || 'N/A'}</span>
                      </p>
                    </div>

                    {/* Usuario Cierre */}
                    <div className="close-day-history-meta-item">
                      <p className="text-xs text-gray-600 mb-1">Cerrado por</p>
                      <p className="font-semibold text-gray-900 flex items-center gap-1 truncate">
                        <User className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate">{day.closed_by_name || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Saldos */}
                  <div className="close-day-history-money mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="close-day-money-box is-initial">
                      <p className="text-xs text-green-700 mb-1">Saldo Inicial</p>
                      <p className="font-semibold text-green-900 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />L{' '}
                        {day.initial_cash_balance.toFixed(2)}
                      </p>
                    </div>

                    <div className="close-day-money-box is-final">
                      <p className="text-xs text-blue-700 mb-1">Saldo Final</p>
                      <p className="font-semibold text-blue-900 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />L{' '}
                        {day.final_cash_balance?.toFixed(2) || '0.00'}
                      </p>
                    </div>

                    <div
                      className={`close-day-money-box ${ isProfit ? 'is-positive' : difference === 0 ? 'is-neutral' : 'is-negative' }`}
                    >
                      <p
                        className={`text-xs mb-1 ${ isProfit ? 'text-emerald-700' : difference === 0 ? 'text-gray-700' : 'text-red-700' }`}
                      >
                        Diferencia
                      </p>
                      <p
                        className={`font-semibold flex items-center gap-1 ${ isProfit ? 'text-emerald-900' : difference === 0 ? 'text-gray-900' : 'text-red-900' }`}
                      >
                        {isProfit ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : difference === 0 ? (
                          <DollarSign className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {isProfit ? '+' : ''}L {difference.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Notas */}
                  {day.notes && (
                    <div className="close-day-history-notes mt-4">
                      <p className="text-xs text-amber-700 mb-1 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Notas de Cierre
                      </p>
                      <p className="text-sm text-amber-900">{day.notes}</p>
                    </div>
                  )}

                  {/* 📊 NUEVO: Botón para ver reporte */}
                  {onViewReport && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        onClick={() => onViewReport(day.id)}
                        className="close-day-history-report gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Ver Reporte
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
