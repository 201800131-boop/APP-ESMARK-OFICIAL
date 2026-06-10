import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { X, FileText, User, Phone, Mail, Package, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuotePreviewProps {
  quote: any;
  onClose: () => void;
  onGeneratePDF: () => void;
}

export default function QuotePreview({ quote, onClose, onGeneratePDF }: QuotePreviewProps) {
  if (!quote) return null;

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'BORRADOR': return 'bg-slate-100 text-slate-700 border border-slate-300';
      case 'ENVIADA': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'ACEPTADA': return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      case 'RECHAZADA': return 'bg-red-100 text-red-800 border border-red-300';
      case 'PENDIENTE': return 'bg-amber-100 text-amber-800 border border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border border-slate-300';
    }
  };

  const items = Array.isArray(quote.items) ? quote.items : [];
  const createdDate = quote.created_at
    ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })
    : 'Fecha no disponible';

  return (
    <div className="quotes-page fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-950">Cotizacion #{quote.number}</h2>
                <Badge className={`rounded-full ${getStatusColor(quote.estado)}`}>{quote.estado}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">Creada el {createdDate}</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={onClose} className="h-10 w-10 rounded-2xl border-slate-200 bg-white">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              <section className="quotes-preview-panel rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <User className="h-4 w-4" />
                  </span>
                  <h3 className="font-black text-slate-900">Informacion del cliente</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoTile icon={<User className="h-4 w-4" />} label="Nombre" value={quote.customer_name || 'N/A'} />
                  <InfoTile icon={<Phone className="h-4 w-4" />} label="Telefono" value={quote.customer_phone || 'N/A'} />
                  <div className="md:col-span-2">
                    <InfoTile icon={<Mail className="h-4 w-4" />} label="Correo" value={quote.customer_email || 'N/A'} />
                  </div>
                </div>
              </section>

              <section className="quotes-preview-panel rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Package className="h-4 w-4" />
                  </span>
                  <h3 className="font-black text-slate-900">Productos / servicios</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">Descripcion</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-500">Cantidad</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Precio unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">No hay productos registrados.</td>
                        </tr>
                      ) : (
                        items.map((item: any, index: number) => {
                          const qty = item.qty || item.cantidad || 1;
                          const subtotal = Number(item.subtotal) || 0;
                          const unitPrice = subtotal / qty;
                          return (
                            <tr key={index} className="border-t border-slate-100">
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-900">{item.description || item.descripcion || 'Sin descripcion'}</p>
                                {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                                {(item.ancho && item.alto) && (
                                  <p className="text-xs text-slate-500">{item.ancho} x {item.alto} {item.unidad}</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="secondary" className="rounded-lg">{qty}</Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-700">L. {unitPrice.toFixed(2)}</td>
                              <td className="px-4 py-3 text-right font-black text-slate-900">L. {subtotal.toFixed(2)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="quotes-summary-panel rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <h3 className="font-black text-emerald-950">Resumen</h3>
                </div>
                <div className="space-y-3">
                  <TotalRow label="Subtotal sin ISV" value={`L. ${(quote.subtotal_sin_isv || 0).toFixed(2)}`} />
                  <TotalRow label={`ISV (${quote.isv_percent || 15}%)`} value={`L. ${(quote.isv_monto || 0).toFixed(2)}`} />
                  <Separator className="bg-emerald-200" />
                  <div className="flex items-end justify-between gap-3">
                    <span className="font-black text-emerald-950">TOTAL</span>
                    <span className="text-2xl font-black text-emerald-800">L. {(quote.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </section>

              {quote.notas && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <h4 className="mb-2 font-black text-amber-950">Notas</h4>
                  <p className="whitespace-pre-wrap text-sm text-amber-900">{quote.notas}</p>
                </section>
              )}
            </aside>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose} className="h-10 rounded-xl border-slate-200 px-5">
            Cerrar
          </Button>
          <Button
            onClick={onGeneratePDF}
            className="quotes-action-button quotes-action-button--blue h-10 rounded-xl px-5"
            style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: '#ffffff' }}
          >
            <FileText className="mr-2 h-4 w-4" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Generar PDF</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="quotes-soft-tile flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-blue-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-emerald-900/75">{label}</span>
      <span className="font-bold text-emerald-950">{value}</span>
    </div>
  );
}
