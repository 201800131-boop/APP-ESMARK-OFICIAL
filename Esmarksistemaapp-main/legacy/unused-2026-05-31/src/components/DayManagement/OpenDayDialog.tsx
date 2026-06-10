/**
 * 🌅 OPEN DAY DIALOG
 * 
 * Modal para abrir un nuevo día de trabajo
 * Incluye input de saldo inicial de caja
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Sunrise, DollarSign, Loader2, AlertCircle } from 'lucide-react';
import { openWorkDay } from '../../utils/work-days-api';
import { useDay } from '../../contexts/DayContext';
import { toast } from 'sonner';
import { isNotificationEnabled } from '../../utils/notification-settings';

interface OpenDayDialogProps {
  userId: string; // ID del usuario actual
  userName?: string; // 📝 Nombre del usuario actual
}

export default function OpenDayDialog({ userId, userName }: OpenDayDialogProps) {
  const { currentDay, setCurrentDay, refreshDay } = useDay();
  const [isOpen, setIsOpen] = useState(true); // Siempre abierto si no hay día
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya hay un día abierto, no mostrar el modal
  if (currentDay) {
    return null;
  }

  const handleOpenDay = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Validar saldo
      const balance = parseFloat(initialBalance);
      
      if (isNaN(balance)) {
        setError('Por favor ingresa un saldo válido');
        setIsSubmitting(false);
        return;
      }

      if (balance < 0) {
        setError('El saldo inicial no puede ser negativo');
        setIsSubmitting(false);
        return;
      }

      // Abrir día
      const newDay = await openWorkDay(userId, balance, userName);
      
      // Actualizar contexto
      setCurrentDay(newDay);
      if (isNotificationEnabled('close_day')) {
      
      // Mostrar notificación
      toast.success('¡Día de trabajo abierto!', {
        description: `Saldo inicial: L. ${balance.toFixed(2)}`
      });

      }
      setIsOpen(false);
      
    } catch (error: any) {
      console.error('Error opening day:', error);
      
      // Si el error dice que ya hay un día abierto, refrescar
      if (error.message.includes('ya existe') || error.message.includes('abierto')) {
        if (isNotificationEnabled('close_day')) {
        toast.info('Ya existe un día abierto', {
          description: 'Otro usuario ya abrió el día de trabajo'
        });
        }
        await refreshDay();
        setIsOpen(false);
      } else {
        setError(error.message || 'Error al abrir día de trabajo');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-linear-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
              <Sunrise className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Abrir Día de Trabajo</DialogTitle>
              <DialogDescription>
                No hay ningún día abierto actualmente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert className="bg-blue-50 border-blue-300">
            <AlertCircle className="w-4 h-4 text-blue-700" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>¿Qué es esto?</strong>
              <br />
              El "día de trabajo" es independiente de la fecha. Una vez abierto, todos los usuarios trabajarán sobre el mismo día hasta que se cierre manualmente.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="initial-balance" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Saldo Inicial en Caja (Lempiras)
            </Label>
            <Input
              id="initial-balance"
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="0.00"
              className="text-lg h-12"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-600">
              Ingresa el dinero en efectivo que hay en caja al iniciar el día
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
        </div>

        <DialogFooter>
          <Button
            onClick={handleOpenDay}
            disabled={isSubmitting}
            className="w-full bg-linear-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white h-12"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Abriendo día...
              </>
            ) : (
              <>
                <Sunrise className="w-5 h-5 mr-2" />
                Abrir Día de Trabajo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
