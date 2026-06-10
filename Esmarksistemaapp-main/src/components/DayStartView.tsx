import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, DollarSign, AlertTriangle, Eye, Loader2, Users } from 'lucide-react';
import { connectedUsersManager, type ConnectedUser } from '../utils/connected-users';
import { logDayStart } from '../utils/activity-logger';
import { toast } from 'sonner';
import { openWorkDay, workDaysAPI } from '../utils/work-days-api';
import { useDay } from '../contexts/DayContext';

interface DayStartViewProps {
  user: {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'operator';
  };
  onComplete: () => void;
}

type BillKey = 'b500' | 'b200' | 'b100' | 'b50' | 'b20' | 'b10' | 'b5' | 'b2' | 'b1';

const DENOMINATIONS: Array<{ key: BillKey; label: string; value: number; column: 1 | 2 }> = [
  { key: 'b500', label: 'L 500', value: 500, column: 1 },
  { key: 'b100', label: 'L 100', value: 100, column: 1 },
  { key: 'b20', label: 'L 20', value: 20, column: 1 },
  { key: 'b5', label: 'L 5', value: 5, column: 1 },
  { key: 'b1', label: 'L 1', value: 1, column: 1 },
  { key: 'b200', label: 'L 200', value: 200, column: 2 },
  { key: 'b50', label: 'L 50', value: 50, column: 2 },
  { key: 'b10', label: 'L 10', value: 10, column: 2 },
  { key: 'b2', label: 'L 2', value: 2, column: 2 },
];

const EMPTY_BILLS: Record<BillKey, number> = {
  b500: 0,
  b200: 0,
  b100: 0,
  b50: 0,
  b20: 0,
  b10: 0,
  b5: 0,
  b2: 0,
  b1: 0,
};

export default function DayStartView({ user, onComplete }: DayStartViewProps) {
  const { currentDay, setCurrentDay, refreshDay } = useDay();
  const [bills, setBills] = useState<Record<BillKey, number>>(EMPTY_BILLS);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [dayAlreadyClosed, setDayAlreadyClosed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Usar fecha local para evitar problemas de zona horaria (UTC vs Local)
  const [date] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const total = DENOMINATIONS.reduce((sum, denom) => sum + (bills[denom.key] || 0) * denom.value, 0);

  useEffect(() => {
    if (currentDay) {
      onComplete();
    }
  }, [currentDay, onComplete]);
  
  // Verificar si el dia actual ya fue cerrado en Supabase
  useEffect(() => {
    let mounted = true;

    workDaysAPI.getHistory(60).then((days) => {
      if (!mounted) return;
      const wasClosed = days.some((day) => {
        const openedDate = new Date(day.opened_at);
        const key = `${openedDate.getFullYear()}-${String(openedDate.getMonth() + 1).padStart(2, '0')}-${String(openedDate.getDate()).padStart(2, '0')}`;
        return key === date && day.status === 'closed';
      });
      setDayAlreadyClosed(wasClosed);
    }).catch((error) => {
      console.error('Error verificando dia cerrado:', error);
      setDayAlreadyClosed(false);
    });

    return () => {
      mounted = false;
    };
  }, [date]);
  // Actualizar lista de usuarios conectados
  useEffect(() => {
    const updateConnectedUsers = () => {
      const users = connectedUsersManager.getConnectedUsers();
      setConnectedUsers(users);
    };

    // Actualizar inicialmente
    updateConnectedUsers();

    // Escuchar cambios
    window.addEventListener('connectedUsersChanged', updateConnectedUsers);

    // Actualizar cada 2 segundos
    const interval = setInterval(updateConnectedUsers, 2000);

    return () => {
      window.removeEventListener('connectedUsersChanged', updateConnectedUsers);
      clearInterval(interval);
    };
  }, []);

  const handleBillChange = (key: BillKey, value: string) => {
    const nextValue = Number.parseInt(value, 10);
    setBills((current) => ({
      ...current,
      [key]: Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 0,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dayAlreadyClosed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newDay = await openWorkDay(user.id, total, user.name || user.username, bills);
      setCurrentDay(newDay);

      await logDayStart({
        date,
        total,
        bills,
        opened_by: user.id,
        opened_by_name: user.name || user.username,
      });

      toast.success('Dia iniciado', {
        description: `Caja chica inicial: L ${total.toLocaleString('es-HN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      });
      onComplete();
    } catch (error: any) {
      console.error('Error iniciando dia:', error);
      await refreshDay();

      const message = String(error?.message || 'No se pudo iniciar el dia');
      toast.error('No se pudo iniciar el dia', {
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBillColumn = (column: 1 | 2) => (
    <div className="space-y-3 w-full flex flex-col items-center">
      {DENOMINATIONS.filter((denom) => denom.column === column).map((denom) => (
        <div key={denom.key} className="w-full max-w-[220px]">
          <Label htmlFor={denom.key} className="text-gray-900 text-xs block mb-1.5">
            {denom.label}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id={denom.key}
              type="number"
              min="0"
              value={bills[denom.key] || ''}
              onChange={(e) => handleBillChange(denom.key, e.target.value)}
              placeholder="0"
              className="bg-white border-gray-300 text-gray-700 text-xs h-8 px-3"
              style={{ width: '110px', minWidth: '110px' }}
              disabled={isSubmitting}
            />
            <span
              className="text-xs font-semibold text-green-700 whitespace-nowrap"
              style={{ minWidth: '78px' }}
            >
              {bills[denom.key] > 0 ? `L ${(bills[denom.key] * denom.value).toLocaleString()}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col items-center justify-center p-4 overflow-auto">
      <Card className="w-full max-w-xl shadow-2xl border border-gray-300 bg-white relative z-10 rounded-xl overflow-hidden">
        {/* Header verde original */}
        <CardHeader
          className="text-white py-3 px-4"
          style={{
            background: "linear-gradient(90deg, #15803d 0%, #22c55e 100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <div>
              <CardTitle className="text-white text-base font-semibold">Inicio de Dia</CardTitle>
              <p className="text-white/90 text-xs mt-0.5 font-medium">
                {new Date(date).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Advertencia: dia ya cerrado */}
            {dayAlreadyClosed && (
              <Alert className="bg-red-50 border-red-300">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-900">
                  <p className="font-semibold mb-1">DIA YA CERRADO</p>
                  <p className="text-xs mb-3">
                    Este dia ya fue cerrado anteriormente. No puedes iniciar un nuevo dia. 
                    Solo puedes entrar en <strong>Modo Observacion</strong> para revisar datos.
                  </p>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Banner informativo */}
            {!dayAlreadyClosed && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs text-blue-900 font-medium">
                    Registra el desglose de billetes en caja chica para iniciar el dia.
                  </p>
                  <p className="text-[11px] text-blue-800 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {connectedUsers.length || 1} usuario(s) conectado(s)
                  </p>
                </div>
              </div>
            )}

            {/* Desglose de billetes */}
            {!dayAlreadyClosed && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-900">Desglose de Billetes (Lempiras)</h3>
              
              {/* Grid de 2 columnas */}
              <div className="grid grid-cols-2 gap-x-10 gap-y-3 justify-items-center w-fit mx-auto">
                {renderBillColumn(1)}
                {renderBillColumn(2)}
              </div>

              {/* Total Caja Chica */}
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between mt-4">
                <span className="text-xs text-gray-900 font-semibold">Total Caja Chica:</span>
                <span className="text-base font-bold text-gray-900">
                  L {total.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            )}

            {/* Botones de accion */}
            <div className={dayAlreadyClosed ? "flex justify-center pt-2" : "grid grid-cols-2 gap-3 pt-2"}>
              {!dayAlreadyClosed && (
                <Button
                  type="submit"
                  className="h-10 text-white text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    background: "linear-gradient(90deg, #15803d 0%, #22c55e 100%)",
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="w-4 h-4 mr-2" />
                  )}
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Dia'}
                </Button>
              )}
              <Button
                type="button"
                variant={dayAlreadyClosed ? "default" : "outline"}
                className={dayAlreadyClosed 
                  ? "h-10 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-200 px-8" 
                  : "h-10 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                }
                onClick={() => {
                  const message = dayAlreadyClosed 
                    ? '?Entrar en modo observacion?\n\Podras ver los datos pero no podras realizar cambios.'
                    : '?Entrar en modo observacion?';
                  
                  if (confirm(message)) onComplete();
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Modo Observacion
              </Button>
            </div>

            {/* Mensaje informativo */}
            <div className={`flex items-start gap-2 pt-2 rounded-lg px-3 py-2 ${ dayAlreadyClosed ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200' }`}>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${dayAlreadyClosed ? 'text-red-600' : 'text-yellow-600'}`} />
              <p className="text-[10px] text-gray-700 leading-relaxed">
                {dayAlreadyClosed 
                  ? 'Este dia ya fue cerrado. Solo puedes acceder en modo observacion para consultar informacion historica sin realizar cambios.'
                  : 'El modo observacion te permite ver el sistema sin registrar caja chica'
                }
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



