/**
 * ðŸŒ™ CLOSE DAY DIALOG
 * 
 * Modal para cerrar el dÃ­a de trabajo
 * Incluye resumen del dÃ­a y campo de notas
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Moon, DollarSign, ShoppingCart, FileText, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { closeWorkDay } from '../../utils/work-days-api';
import { api } from '../../utils/api';
import { useDay } from '../../contexts/DayContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { isNotificationEnabled } from '../../utils/notification-settings';

interface CloseDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export default function CloseDayDialog({ open, onOpenChange, userId, userName }: CloseDayDialogProps) {
  const { currentDay, setCurrentDay } = useDay();
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daySummary, setDaySummary] = useState({
    totalOrders: 0,
    totalSales: 0,
    completedOrders: 0,
    pendingOrders: 0
  });

  // Calcular resumen del dia desde Supabase
  useEffect(() => {
    if (!open || !currentDay) return;

    (async () => {
      try {
        const result = await api.getOrders();
        const orders = result.orders || [];
        const dayOrders = orders.filter((order: any) => {
          const orderDate = new Date(order.created_at);
          const dayOpenedDate = new Date(currentDay.opened_at);
          return orderDate >= dayOpenedDate;
        });

        const totalOrders = dayOrders.length;
        const completedOrders = dayOrders.filter((o: any) => o.status === 'ENTREGADO').length;
        const pendingOrders = dayOrders.filter((o: any) => o.status !== 'ENTREGADO' && o.status !== 'CANCELADO').length;
        const totalSales = dayOrders
          .filter((o: any) => o.status === 'ENTREGADO')
          .reduce((sum: number, o: any) => sum + (parseFloat(o.total_amount || o.total) || 0), 0);

        setDaySummary({ totalOrders, totalSales, completedOrders, pendingOrders });
      } catch (error) {
        console.error('Error calculating day summary:', error);
      }
    })();
  }, [open, currentDay]);
  const handleCloseDay = async () => {
    if (!currentDay) {
      setError('No hay ningÃºn dÃ­a abierto');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Cerrar dÃ­a en el backend
      const closedDay = await closeWorkDay(currentDay.id, userId, notes || undefined, userName);
      
      // Actualizar contexto
      setCurrentDay(null);
      
      // Mostrar notificaciÃ³n
      if (isNotificationEnabled('close_day')) {
        toast.success('Â¡DÃ­a de trabajo cerrado!', {
          description: `Cerrado por ${userName}`
        });
      }

      // Cerrar modal
      onOpenChange(false);
      
      // Limpiar notas
      setNotes('');
      
    } catch (error: any) {
      console.error('Error closing day:', error);
      setError(error.message || 'Error al cerrar dÃ­a de trabajo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentDay) {
    return null;
  }

  const openedDate = new Date(currentDay.opened_at);
  const formattedOpenDate = format(openedDate, "EEEE, d 'de' MMMM 'a las' HH:mm", { locale: es });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <Moon className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Cerrar DÃ­a de Trabajo</DialogTitle>
              <DialogDescription>
                Revisa el resumen antes de cerrar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* InformaciÃ³n del dÃ­a */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">InformaciÃ³n del DÃ­a</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Abierto por:</p>
                <p className="font-medium">{currentDay.opened_by}</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha de apertura:</p>
                <p className="font-medium capitalize">{formattedOpenDate}</p>
              </div>
              <div>
                <p className="text-gray-600">Saldo inicial:</p>
                <p className="font-medium">L. {currentDay.initial_cash_balance.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">ID del dÃ­a:</p>
                <p className="font-mono text-xs">{currentDay.id}</p>
              </div>
            </div>
          </div>

          {/* Resumen del dÃ­a */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Resumen del DÃ­a
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-gray-600">Total Pedidos</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{daySummary.totalOrders}</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <p className="text-xs text-gray-600">Ventas Totales</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  L. {daySummary.totalSales.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-gray-600">Completados</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{daySummary.completedOrders}</p>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <p className="text-xs text-gray-600">Pendientes</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{daySummary.pendingOrders}</p>
              </div>
            </div>
          </div>

          {/* Notas del cierre */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas del Cierre (Opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="AÃ±ade comentarios sobre el dÃ­a (problemas, observaciones, etc.)"
              rows={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-600">
              Estas notas quedarÃ¡n guardadas en el historial del dÃ­a
            </p>
          </div>

          {error && (
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="w-4 h-4 text-red-700" />
              <AlertDescription className="text-red-900 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-amber-50 border-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <AlertDescription className="text-amber-900 text-sm">
              <strong>âš ï¸ AtenciÃ³n:</strong> Al cerrar el dÃ­a, todos los usuarios verÃ¡n el modal para abrir un nuevo dÃ­a. Esta acciÃ³n no se puede deshacer.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCloseDay}
            disabled={isSubmitting}
            className="bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cerrando dÃ­a...
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 mr-2" />
                Confirmar Cierre
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

