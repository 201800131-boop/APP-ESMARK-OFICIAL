/**
 * Historial de Documentos Generados
 * Muestra todos los recibos, facturas y cotizaciones generados
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  Download,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  User,
  DollarSign,
  Filter,
  RefreshCw,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Document {
  id: string;
  tipo: 'factura' | 'recibo' | 'cotizacion';
  numero_correlativo: string;
  cliente_nombre: string;
  total: number;
  fecha_emision: string;
  estado: 'activo' | 'anulado' | 'pagado' | 'vencido';
  generado_por_nombre?: string;
  pdf_url?: string;
  pedido_id?: string;
  caja_chica_id?: string;
  anulado_el?: string;
  motivo_anulacion?: string;
}

interface DocumentHistoryProps {
  tipo?: 'factura' | 'recibo' | 'cotizacion' | 'all';
  pedido_id?: string;
  caja_chica_id?: string;
  limit?: number;
}

export default function DocumentHistory({ 
  tipo = 'all', 
  pedido_id,
  caja_chica_id,
  limit = 50 
}: DocumentHistoryProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [tipo, pedido_id, caja_chica_id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (tipo !== 'all') params.append('tipo', tipo);
      if (pedido_id) params.append('pedido_id', pedido_id);
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/esmark-sync/documents?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar documentos');
      }
      
      const data = await response.json();
      setDocuments(data.documents || []);
      
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    if (!doc.pdf_url) {
      toast.error('URL de PDF no disponible');
      return;
    }
    
    try {
      window.open(doc.pdf_url, '_blank');
      toast.success('Descargando documento...');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Error al descargar');
    }
  };

  const handleAnular = async () => {
    if (!selectedDoc || !motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo de anulación');
      return;
    }
    
    try {
      setAnulando(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/esmark-sync/documents/${selectedDoc.id}/anular`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            motivo: motivoAnulacion,
            anulado_por: 'usuario_actual' // TODO: obtener del contexto
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Error al anular documento');
      }
      
      toast.success('Documento anulado correctamente');
      setShowAnularModal(false);
      setSelectedDoc(null);
      setMotivoAnulacion('');
      loadDocuments();
      
    } catch (error: any) {
      console.error('Error anulando:', error);
      toast.error('Error al anular documento');
    } finally {
      setAnulando(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Activo</Badge>;
      case 'anulado':
        return <Badge className="bg-red-600"><Ban className="w-3 h-3 mr-1" />Anulado</Badge>;
      case 'pagado':
        return <Badge className="bg-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Pagado</Badge>;
      case 'vencido':
        return <Badge className="bg-amber-600"><AlertCircle className="w-3 h-3 mr-1" />Vencido</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'factura':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Factura</Badge>;
      case 'recibo':
        return <Badge variant="outline" className="border-green-500 text-green-700">Recibo</Badge>;
      case 'cotizacion':
        return <Badge variant="outline" className="border-purple-500 text-purple-700">Cotización</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const filteredDocuments = filterEstado === 'all' 
    ? documents 
    : documents.filter(d => d.estado === filterEstado);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Historial de Documentos Generados
              {filteredDocuments.length > 0 && (
                <Badge variant="secondary">{filteredDocuments.length}</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadDocuments}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={filterEstado === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterEstado('all')}
            >
              <Filter className="w-4 h-4 mr-1" />
              Todos
            </Button>
            <Button
              variant={filterEstado === 'activo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterEstado('activo')}
            >
              Activos
            </Button>
            <Button
              variant={filterEstado === 'pagado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterEstado('pagado')}
            >
              Pagados
            </Button>
            <Button
              variant={filterEstado === 'anulado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterEstado('anulado')}
            >
              Anulados
            </Button>
          </div>

          {/* Tabla de documentos */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              Cargando documentos...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              No hay documentos generados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 text-sm">Tipo</th>
                    <th className="text-left p-3 text-sm">No. Documento</th>
                    <th className="text-left p-3 text-sm">Cliente</th>
                    <th className="text-right p-3 text-sm">Total</th>
                    <th className="text-left p-3 text-sm">Fecha</th>
                    <th className="text-left p-3 text-sm">Estado</th>
                    <th className="text-center p-3 text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {getTipoBadge(doc.tipo)}
                      </td>
                      <td className="p-3">
                        <div className="font-mono font-semibold text-sm">
                          {doc.numero_correlativo}
                        </div>
                        {doc.generado_por_nombre && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {doc.generado_por_nombre}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="max-w-[200px] truncate" title={doc.cliente_nombre}>
                          {doc.cliente_nombre}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="font-semibold flex items-center justify-end gap-1">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          L. {doc.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          {new Date(doc.fecha_emision).toLocaleDateString('es-HN')}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.fecha_emision).toLocaleTimeString('es-HN', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        {getEstadoBadge(doc.estado)}
                        {doc.anulado_el && (
                          <div className="text-xs text-red-600 mt-1">
                            {new Date(doc.anulado_el).toLocaleDateString('es-HN')}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          {doc.pdf_url && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                                title="Descargar PDF"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.pdf_url, '_blank')}
                                title="Ver PDF"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {doc.estado === 'activo' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowAnularModal(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                              title="Anular documento"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Anulación */}
      {showAnularModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Ban className="w-5 h-5" />
                Anular Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Esta acción no se puede deshacer.
                </p>
                <p className="text-sm text-red-700 mt-2">
                  Documento: <strong>{selectedDoc.numero_correlativo}</strong>
                </p>
                <p className="text-sm text-red-700">
                  Cliente: <strong>{selectedDoc.cliente_nombre}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Motivo de Anulación <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full border rounded p-2 text-sm h-24 resize-none"
                  placeholder="Ingrese el motivo de la anulación..."
                  value={motivoAnulacion}
                  onChange={(e) => setMotivoAnulacion(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAnularModal(false);
                    setSelectedDoc(null);
                    setMotivoAnulacion('');
                  }}
                  disabled={anulando}
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  onClick={handleAnular}
                  disabled={anulando || !motivoAnulacion.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {anulando ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Anulando...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Confirmar Anulación
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
