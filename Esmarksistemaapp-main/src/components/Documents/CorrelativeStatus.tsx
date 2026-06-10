/**
 * Panel de Estado de Correlativos
 * Muestra el estado actual de las secuencias de documentos
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Hash,
  FileText,
  Receipt,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../utils/api';
import { toast } from 'sonner';

interface Correlative {
  tipo: 'factura' | 'recibo' | 'cotizacion';
  ultimo_numero: number;
  prefijo: string;
  formato: string;
  actualizado_el: string;
  actualizado_por: string;
}

export default function CorrelativeStatus() {
  const [correlativos, setCorrelativos] = useState<Correlative[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<'factura' | 'recibo' | 'cotizacion' | null>(null);
  const [newNumber, setNewNumber] = useState('0');
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    loadCorrelativos();
  }, []);

  const loadCorrelativos = async () => {
    try {
      setLoading(true);
      
      const data = await api.getAllCorrelatives();
      setCorrelativos(data.correlativos || []);
      
      console.log('✅ Correlativos cargados desde backend:', data.correlativos);
      
    } catch (error: any) {
      console.error('Error loading correlativos:', error);
      toast.error('Error al cargar correlativos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResetDialog = (tipo: 'factura' | 'recibo' | 'cotizacion') => {
    setSelectedTipo(tipo);
    setNewNumber('0');
    setConfirmText('');
    setResetDialogOpen(true);
  };

  const handleResetCorrelative = async () => {
    if (!selectedTipo) return;

    // Validar confirmación
    if (confirmText.toUpperCase() !== 'REINICIAR') {
      toast.error('Debes escribir "REINICIAR" para confirmar');
      return;
    }

    // Validar número
    const startNumber = parseInt(newNumber);
    if (isNaN(startNumber) || startNumber < 0) {
      toast.error('El número debe ser mayor o igual a 0');
      return;
    }

    try {
      setResetting(true);

      // Obtener usuario actual
      const currentUser = localStorage.getItem('current_user');
      const userId = currentUser ? JSON.parse(currentUser).id : 'admin';

      await api.resetCorrelative(selectedTipo, startNumber, userId);

      toast.success('✅ Correlativo reiniciado exitosamente', {
        description: `${selectedTipo.toUpperCase()} reiniciado a ${startNumber}. El siguiente número será ${startNumber + 1}.`,
        duration: 6000,
      });

      // Recargar correlativos
      await loadCorrelativos();

      // Cerrar diálogo
      setResetDialogOpen(false);
      setSelectedTipo(null);
      setNewNumber('0');
      setConfirmText('');

    } catch (error: any) {
      console.error('Error resetting correlative:', error);
      toast.error('Error al reiniciar correlativo', {
        description: error.message,
      });
    } finally {
      setResetting(false);
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'factura':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'recibo':
        return <Receipt className="w-5 h-5 text-green-600" />;
      case 'cotizacion':
        return <FileSpreadsheet className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getLabel = (tipo: string) => {
    switch (tipo) {
      case 'factura':
        return 'Facturas';
      case 'recibo':
        return 'Recibos';
      case 'cotizacion':
        return 'Cotizaciones';
      default:
        return tipo;
    }
  };

  const formatNumber = (formato: string, numero: number) => {
    const numeroFormateado = numero.toString().padStart(7, '0');
    return formato.replace('{numero}', numeroFormateado);
  };
  
  const formatNextNumber = (formato: string, numero: number) => {
    const nextNum = numero + 1;
    const numeroFormateado = nextNum.toString().padStart(7, '0');
    return formato.replace('{numero}', numeroFormateado);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Estado de Correlativos
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadCorrelativos}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
            Cargando...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {correlativos.map((corr) => (
              <Card key={corr.tipo} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {getIcon(corr.tipo)}
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{getLabel(corr.tipo)}</h3>
                      
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Último Número</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {corr.ultimo_numero.toString().padStart(6, '0')}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Siguiente</p>
                          <p className="font-mono text-sm font-semibold text-blue-600">
                            {formatNextNumber(corr.formato, corr.ultimo_numero)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500">Formato</p>
                          <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {corr.formato}
                          </p>
                        </div>
                        
                        {corr.ultimo_numero > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            Activo ({corr.ultimo_numero} emitidos)
                          </div>
                        )}
                        
                        {corr.actualizado_el && (
                          <div className="text-xs text-gray-500 mt-2">
                            Actualizado: {new Date(corr.actualizado_el).toLocaleDateString('es-HN')}
                          </div>
                        )}
                        
                        {/* Botón de reiniciar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenResetDialog(corr.tipo)}
                          className="w-full mt-3 text-orange-700 border-orange-300 hover:bg-orange-50 hover:border-orange-400"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reiniciar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold">Sistema de Correlativos Seguros</p>
              <p className="mt-1">
                Los números se generan de forma atómica sin duplicados. Los documentos anulados 
                NO reutilizan números para mantener la integridad de la auditoría.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Diálogo de Reinicio de Correlativo */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Reiniciar Correlativo
            </DialogTitle>
            <DialogDescription>
              Esta acción reiniciará el correlativo de <strong>{selectedTipo?.toUpperCase()}</strong> a un número específico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Advertencia */}
            <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-semibold">¡ADVERTENCIA!</p>
                  <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                    <li>Esta acción es <strong>irreversible</strong></li>
                    <li>Puede causar <strong>duplicados</strong> si usas un número menor al actual</li>
                    <li>Solo usar en casos específicos (ej: cambio de año fiscal)</li>
                    <li>Se recomienda hacer <strong>respaldo</strong> antes de continuar</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Input de nuevo número */}
            <div className="space-y-2">
              <Label htmlFor="newNumber" className="text-sm font-semibold">
                Nuevo número inicial
              </Label>
              <Input
                id="newNumber"
                type="number"
                min="0"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                placeholder="0"
                className="text-lg font-mono"
              />
              <p className="text-xs text-gray-600">
                El siguiente documento se generará con el número: <strong>{parseInt(newNumber || '0') + 1}</strong>
              </p>
            </div>

            {/* Confirmación de texto */}
            <div className="space-y-2">
              <Label htmlFor="confirmText" className="text-sm font-semibold">
                Para confirmar, escribe: <span className="text-orange-600 font-mono">REINICIAR</span>
              </Label>
              <Input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Escribe REINICIAR"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetDialogOpen(false);
                setSelectedTipo(null);
                setNewNumber('0');
                setConfirmText('');
              }}
              disabled={resetting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetCorrelative}
              disabled={resetting || confirmText.toUpperCase() !== 'REINICIAR'}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {resetting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reiniciando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Correlativo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
