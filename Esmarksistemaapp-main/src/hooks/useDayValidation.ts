import { useDay } from '../contexts/DayContext';
import { toast } from 'sonner';

/**
 * Hook para validar si hay un día operativo abierto
 * Muestra mensajes de error automáticamente
 */
export function useDayValidation() {
  const { currentDay, isLoading } = useDay();

  /**
   * Valida que haya un día operativo abierto
   * @param showToast - Si debe mostrar un toast de error
   * @returns true si hay día abierto, false si no
   */
  const requireOpenDay = (showToast: boolean = true): boolean => {
    if (isLoading) {
      if (showToast) {
        toast.info('Verificando día operativo...', {
          duration: 2000,
        });
      }
      return false;
    }

    if (!currentDay) {
      if (showToast) {
        toast.error('⚠️ No hay día operativo abierto', {
          description: 'Debes abrir un día para realizar esta acción',
          duration: 4000,
        });
      }
      return false;
    }

    return true;
  };

  /**
   * Ejecuta una acción solo si hay día operativo abierto
   * @param action - Función a ejecutar
   * @param showToast - Si debe mostrar toast de error
   */
  const withDayValidation = (action: () => void, showToast: boolean = true) => {
    if (requireOpenDay(showToast)) {
      action();
    }
  };

  return {
    currentDay,
    isLoading,
    requireOpenDay,
    withDayValidation,
    hasDayOpen: !!currentDay,
  };
}
