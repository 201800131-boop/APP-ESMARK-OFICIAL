import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  Calendar,
  User,
  Phone,
  DollarSign,
  Clock,
  X,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import OrderViewDialog from './OrderViewDialog';

export interface PendingQuote {
  id: string;
  order_number: string;
  client_name: string;
  client_phone?: string;
  created_at: string;
  total_amount: string | number;
  status: string;
  items?: any[];
}

interface PendingQuotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotes: PendingQuote[];
  onViewQuote?: (quote: PendingQuote) => void;
  onNavigateToList?: () => void;
}

export default function PendingQuotesDialog({
  open,
  onOpenChange,
  quotes,
  onViewQuote,
  onNavigateToList,
}: PendingQuotesDialogProps) {
  // Validar que quotes sea un array
  const validQuotes = Array.isArray(quotes) ? quotes : [];
  
  const totalAmount = validQuotes.reduce(
    (sum, quote) => sum + (parseFloat(quote.total_amount as string) || 0),
    0
  );

  const getQuoteAge = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const getAgeColor = (days: number) => {
    if (days > 7) return 'text-red-600 bg-red-100';
    if (days > 3) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  const [selectedQuote, setSelectedQuote] = useState<PendingQuote | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleViewQuote = (quote: PendingQuote) => {
    setSelectedQuote(quote);
    setViewDialogOpen(true);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col bg-linear-to-br from-purple-50 via-white to-pink-50 p-6">
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl text-gray-900">
                  Cotizaciones Pendientes
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {validQuotes.length} cotizacion{validQuotes.length !== 1 ? 'es' : ''} esperando respuesta del cliente
                </DialogDescription>
              </div>
            </div>

            {/* Resumen de cotizaciones */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700">PENDIENTES</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{validQuotes.length}</p>
              </div>
              
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">VALOR POTENCIAL</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  L {totalAmount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Lista de cotizaciones */}
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            <div className="space-y-3">
              {validQuotes
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((quote) => {
                  const daysOld = getQuoteAge(quote.created_at);
                  
                  return (
                    <div
                      key={quote.id}
                      className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icono de antigüedad */}
                        <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${getAgeColor(daysOld)}`}>
                          <div className="text-center">
                            <p className="text-lg font-bold">{daysOld}</p>
                            <p className="text-[10px] font-medium leading-none">
                              {daysOld === 1 ? 'día' : 'días'}
                            </p>
                          </div>
                        </div>

                        {/* Información de la cotización */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">
                                Cotización #{quote.order_number}
                              </h4>
                              <Badge className="bg-purple-100 text-purple-700 border-2 border-purple-300 mt-1">
                                PENDIENTE
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-purple-600">
                                L {parseFloat(quote.total_amount as string).toLocaleString('es-HN', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Información del cliente */}
                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <User className="w-4 h-4 text-blue-600" />
                              <span className="font-medium">{quote.client_name}</span>
                            </div>
                            
                            {quote.client_phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Phone className="w-4 h-4 text-green-600" />
                                <a 
                                  href={`tel:${quote.client_phone}`}
                                  className="hover:text-blue-600 hover:underline"
                                >
                                  {quote.client_phone}
                                </a>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Calendar className="w-4 h-4 text-purple-600" />
                              <span>
                                Creada {formatDistanceToNow(new Date(quote.created_at), { 
                                  addSuffix: true, 
                                  locale: es 
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Alerta de seguimiento */}
                          {daysOld > 7 && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 mb-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-red-600 shrink-0" />
                                <p className="text-xs text-red-700 font-medium">
                                  ¡Atención! Esta cotización tiene más de una semana sin respuesta
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Botón de acción */}
                          {onViewQuote && (
                            <Button
                              onClick={() => handleViewQuote(quote)}
                              variant="outline"
                              size="sm"
                              className="w-full border-2 border-purple-300 hover:bg-purple-50 hover:border-purple-400 text-purple-700"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver cotización y hacer seguimiento
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="shrink-0 border-t-2 border-gray-200 pt-4 mt-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-sm text-purple-900">
                  <strong>Consejo:</strong> Haz seguimiento regular a las cotizaciones para aumentar la tasa de conversión a pedidos confirmados.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1"
              >
                Cerrar
              </Button>
              {onNavigateToList && (
                <Button
                  onClick={onNavigateToList}
                  className="flex-1 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver todas las cotizaciones
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogo para ver la cotización */}
      <OrderViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        order={selectedQuote}
      />
    </>
  );
}
