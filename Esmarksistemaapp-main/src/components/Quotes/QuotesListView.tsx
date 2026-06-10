import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../utils/api';
import { generateQuotePDF } from '../../utils/pdf-generator';
import { getBillingCompanyProfile } from '../../utils/billing-documents';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, Plus, ShoppingCart, FileText, Edit, Clock, Calendar, Phone } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import QuotePreview from './QuotePreview';

interface QuotesListViewProps {
  onNavigate: (view: any, data?: any) => void;
}

export default function QuotesListView({ onNavigate }: QuotesListViewProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [previewQuote, setPreviewQuote] = useState<any | null>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const data = await api.getQuotes();
      setQuotes(data.quotes || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async (quote: any) => {
    try {
      setGeneratingPDF(quote.id);

      let settings: any = {};
      try {
        settings = (await api.getSettings()).settings || {};
      } catch {
        const storedSettings = localStorage.getItem('esmark_settings');
        settings = storedSettings ? JSON.parse(storedSettings) : {};
      }

      let billingCompany: any = {};
      try {
        billingCompany = await getBillingCompanyProfile();
      } catch (error) {
        console.warn('No se pudo cargar el perfil de empresa de facturacion:', error);
      }

      const pdfConfig = {
        ...(settings.pdf_config || {}),
        company_name: billingCompany.razonSocial || billingCompany.nombreComercial || settings.company_name || 'ESMARK',
        company_rtn: billingCompany.rtn || settings.company_rtn || '',
        company_address: billingCompany.direccion || settings.company_address || '',
        company_phone: billingCompany.telefono || settings.company_phone || '',
        company_email: billingCompany.email || settings.company_email || '',
        company_website: settings.company_website || '',
        logo_url: billingCompany.logo || settings.logo_url || settings.company_logo || settings.pdf_config?.logo_url || '',
      };

      await generateQuotePDF(quote, pdfConfig);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setGeneratingPDF(null);
    }
  };

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

  const getExpirationInfo = (createdAt: string) => {
    const created = new Date(createdAt);
    const today = new Date();
    const daysElapsed = differenceInDays(today, created);
    const daysRemaining = 15 - daysElapsed;

    if (daysRemaining < 0) {
      return {
        expired: true,
        message: 'VENCIDA',
        color: 'bg-red-100 text-red-800 border-red-300'
      };
    }
    if (daysRemaining <= 3) {
      return {
        expired: false,
        message: `Vence en ${daysRemaining} dia${daysRemaining !== 1 ? 's' : ''}`,
        color: 'bg-orange-100 text-orange-800 border-orange-300'
      };
    }
    if (daysRemaining <= 7) {
      return {
        expired: false,
        message: `Vence en ${daysRemaining} dias`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    }

    return {
      expired: false,
      message: `${daysRemaining} dias restantes`,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  };

  const filteredQuotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return quotes;
    return quotes.filter((quote) =>
      quote.customer_name?.toLowerCase().includes(query) ||
      quote.customer_phone?.toLowerCase().includes(query) ||
      quote.number?.toString().includes(query)
    );
  }, [quotes, searchQuery]);

  const pendingCount = quotes.filter((quote) => ['PENDIENTE', 'ENVIADA', 'BORRADOR'].includes(quote.estado)).length;
  const acceptedCount = quotes.filter((quote) => quote.estado === 'ACEPTADA').length;
  const totalAmount = filteredQuotes.reduce((sum, quote) => sum + (Number(quote.total) || 0), 0);

  const openQuotePreview = (quote: any) => {
    const quoteData = quotes.find((item) => item.id === quote.id) || quote;
    setPreviewQuote(quoteData);
  };

  return (
    <div className="app-page quotes-page space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600">Da clic sobre una cotizacion para ver la vista previa</p>
        </div>
        <Button
          onClick={() => onNavigate('quote-form')}
          variant="primary"
          className="quotes-new-button quotes-primary-button w-auto self-start gap-2 px-5 lg:self-auto"
          style={{ backgroundColor: '#0f172a', borderColor: '#0f172a', color: '#ffffff', width: 'fit-content' }}
        >
          <Plus className="w-4 h-4" style={{ color: '#ffffff' }} />
          <span style={{ color: '#ffffff' }}>Nueva Cotizacion</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Resultados</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{filteredQuotes.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Pendientes</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Monto visible</p>
          <p className="mt-1 text-2xl font-black text-slate-950">L. {totalAmount.toFixed(2)}</p>
          {acceptedCount > 0 && <p className="text-xs text-slate-500">{acceptedCount} aceptada{acceptedCount !== 1 ? 's' : ''}</p>}
        </div>
      </div>

      <Card className="quotes-card overflow-hidden border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Listado de cotizaciones</p>
              <p className="text-xs text-slate-500">Click en la tarjeta para abrir la vista previa</p>
            </div>
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, telefono o numero..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />
              <p className="text-muted-foreground">Cargando cotizaciones...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
              <p className="font-semibold text-slate-700">No se encontraron cotizaciones</p>
              <p className="text-sm text-slate-500">Prueba con otro cliente o numero.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredQuotes.map((quote) => {
                const expirationInfo = getExpirationInfo(quote.created_at);
                const canCreateOrder = !expirationInfo.expired && ['PENDIENTE', 'ENVIADA', 'BORRADOR'].includes(quote.estado);

                return (
                  <div
                    role="button"
                    tabIndex={0}
                    key={quote.id}
                    onClick={() => openQuotePreview(quote)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openQuotePreview(quote);
                      }
                    }}
                    className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${
                      expirationInfo.expired ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Cotizacion #{quote.number}</p>
                          <h3 className="truncate text-base font-black text-slate-950">{quote.customer_name || 'Cliente N/A'}</h3>
                        </div>
                      </div>
                      <Badge className={`shrink-0 rounded-full ${getStatusColor(quote.estado)}`}>
                        {quote.estado}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="quotes-soft-tile rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          Telefono
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{quote.customer_phone || 'N/A'}</p>
                      </div>
                      <div className="quotes-soft-tile rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          <Calendar className="h-3.5 w-3.5" />
                          Fecha
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{quote.fecha ? format(new Date(quote.fecha), 'dd/MM/yyyy') : '-'}</p>
                      </div>
                      <div className="quotes-total-tile rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Total</p>
                        <p className="mt-1 text-sm font-black text-emerald-800">L. {quote.total?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {quote.origen || quote.source || 'Manual'}
                        </Badge>
                        {expirationInfo.expired ? (
                          <Badge className="rounded-full border-red-600 bg-red-500 text-white">
                            VENCIDA
                          </Badge>
                        ) : (
                          <Badge className={`rounded-full border ${expirationInfo.color}`}>
                            <Clock className="mr-1 h-3 w-3" />
                            {expirationInfo.message}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            onNavigate('quote-form', { quoteId: quote.id });
                          }}
                          title="Editar cotizacion"
                          className="quotes-action-button quotes-action-button--blue h-9 rounded-xl px-3"
                          style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: '#ffffff' }}
                        >
                          <Edit className="h-4 w-4" style={{ color: '#ffffff' }} />
                        </Button>
                        {canCreateOrder && (
                          <Button
                            size="sm"
                            variant="success"
                            className="quotes-action-button quotes-action-button--green h-9 rounded-xl px-3"
                            style={{ backgroundColor: '#059669', borderColor: '#047857', color: '#ffffff' }}
                            onClick={(event) => {
                              event.stopPropagation();
                              onNavigate('order-form', { fromQuote: quote });
                            }}
                            title="Crear pedido desde esta cotizacion"
                          >
                            <ShoppingCart className="h-4 w-4" style={{ color: '#ffffff' }} />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="quotes-action-button quotes-action-button--amber h-9 rounded-xl px-3"
                          style={{ backgroundColor: '#d97706', borderColor: '#b45309', color: '#ffffff' }}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGeneratePDF(quote);
                          }}
                          disabled={generatingPDF === quote.id}
                          title="Generar PDF"
                        >
                          {generatingPDF === quote.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" style={{ color: '#ffffff' }} />
                          ) : (
                            <FileText className="h-4 w-4" style={{ color: '#ffffff' }} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {previewQuote && (
        <QuotePreview
          quote={previewQuote}
          onClose={() => setPreviewQuote(null)}
          onGeneratePDF={() => {
            handleGeneratePDF(previewQuote);
            setPreviewQuote(null);
          }}
        />
      )}
    </div>
  );
}
