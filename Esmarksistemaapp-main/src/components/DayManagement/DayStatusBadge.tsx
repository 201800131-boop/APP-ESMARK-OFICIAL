import React from 'react';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Sunrise, Moon, Clock, DollarSign, User } from 'lucide-react';
import { useDay } from '../../contexts/DayContext';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DayStatusBadge() {
  const { currentDay } = useDay();

  if (!currentDay) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
        <Moon className="w-3 h-3 mr-1" />
        Sin dia abierto
      </Badge>
    );
  }

  const openedDate = new Date(currentDay.opened_at);
  const timeAgo = formatDistanceToNow(openedDate, { addSuffix: true, locale: es });
  const formattedDate = format(openedDate, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 border-green-300 cursor-pointer hover:bg-green-200 transition-colors"
        >
          <Sunrise className="w-3 h-3 mr-1" />
          Dia abierto
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <Sunrise className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Dia de trabajo abierto</h4>
              <p className="text-xs text-gray-600">ID: {currentDay.id}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">Abierto {timeAgo}</p>
                <p className="text-xs text-gray-500">{formattedDate}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">Saldo inicial</p>
                <p className="text-xs text-gray-500">
                  L. {currentDay.initial_cash_balance.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium">Abierto por</p>
                <p className="text-xs text-gray-500">{currentDay.opened_by_name || currentDay.opened_by}</p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 text-center">
              Este dia se comparte en linea entre todos los usuarios.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
