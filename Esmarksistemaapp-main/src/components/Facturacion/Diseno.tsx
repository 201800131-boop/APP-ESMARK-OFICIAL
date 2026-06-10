import React, { useEffect, useState } from 'react';
import { useApp, DisenoConfig } from './context/AppContext';
import { amountToWords } from '../../utils/number-to-words';

const DEFAULT_DISENO_CONFIG: DisenoConfig = {
  colorEtiquetas: '#DC3545',
  colorEncabezadoTabla: '#1F2D3D',
  colorTotales: '#1F2D3D',
  colorFondoPagina: '#FFFFFF',
  encabezadoModo: 'solido',
  colorEncabezadoFinal: '#2563EB',
  colorTextoEncabezado: '#FFFFFF',
  radioBloques: 18,
  altoEncabezado: 190,
  tamanoLogo: 30,
  fuenteTitulo: 10,
  fuenteTexto: 8,
  espaciado: 5,
};

function mergeDisenoConfig(config: DisenoConfig): DisenoConfig {
  return { ...DEFAULT_DISENO_CONFIG, ...config };
}

function formatReceiptMoney(value: number) {
  return `L ${Number(value || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function Diseno() {
  const { state, updateDisenoConfig } = useApp();
  const tipoDocumento: 'recibo' = 'recibo';
  const [config, setConfig] = useState<DisenoConfig>(() => mergeDisenoConfig(state.disenoConfig));

  useEffect(() => {
    setConfig(mergeDisenoConfig(state.disenoConfig));
  }, [state.disenoConfig]);

  const handleConfigChange = (changes: Partial<DisenoConfig>) => {
    setConfig((current) => {
      const updated = mergeDisenoConfig({ ...current, ...changes });
      updateDisenoConfig(updated);
      return updated;
    });
  };

  const handleNumberConfigChange = (key: keyof DisenoConfig, value: string) => {
    handleConfigChange({ [key]: parseInt(value, 10) } as Partial<DisenoConfig>);
  };

  const handleSave = () => {
    alert('Los cambios del diseño ya se aplican en tiempo real');
  };

  const handleReset = () => {
    setConfig(DEFAULT_DISENO_CONFIG);
    updateDisenoConfig(DEFAULT_DISENO_CONFIG);
  };

  const documentLabel = 'Recibo';
  const headerBackground = config.encabezadoModo === 'degradado'
    ? `linear-gradient(135deg, ${config.colorEncabezadoTabla}, ${config.colorEncabezadoFinal || config.colorEncabezadoTabla})`
    : config.colorEncabezadoTabla;
  const headerTextColor = config.colorTextoEncabezado || '#FFFFFF';
  const blockRadius = config.radioBloques ?? 18;
  const headerHeight = config.altoEncabezado ?? 190;
  const previewKey = [
    tipoDocumento,
    config.colorEtiquetas,
    config.colorEncabezadoTabla,
    config.colorEncabezadoFinal,
    config.colorTextoEncabezado,
    config.colorTotales,
    config.encabezadoModo,
    config.radioBloques,
    config.altoEncabezado,
    config.tamanoLogo,
    config.fuenteTitulo,
    config.fuenteTexto,
    config.espaciado,
    state.empresaInfo.logo || '',
  ].join('|');

  const VistaPrevia = () => {
    const isRecibo = tipoDocumento === 'recibo';
    const pageWidthPx = 816;
    const pageHeightPx = isRecibo ? 528 : 1056;
    const previewScale = isRecibo ? 0.82 : 0.62;
    const receiptNumber = `REC-${String(state.nextReciboNumber).padStart(6, '0')}`;

    if (isRecibo) {
      return (
        <div
          key={previewKey}
          className="bg-linear-to-br from-gray-50 to-gray-100 rounded-lg overflow-auto border border-gray-200 flex items-start justify-center"
          style={{ height: 'calc(100vh - 190px)', minHeight: '560px', padding: '28px 18px 18px' }}
        >
          <div style={{ width: `${pageWidthPx * previewScale}px`, height: `${pageHeightPx * previewScale}px` }}>
            <div
              style={{
                width: `${pageWidthPx}px`,
                height: `${pageHeightPx}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                background: '#FFFFFF',
                padding: '34px',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  overflow: 'hidden',
                  border: `2px solid ${config.colorEncabezadoTabla}`,
                  borderRadius: `${Math.max(10, blockRadius)}px`,
                  background: '#FFFFFF',
                  padding: '12px',
                  fontSize: `${config.fuenteTexto * 1.2}px`,
                }}
              >
                <header style={{ display: 'grid', gridTemplateColumns: '1fr 158px', gap: '8px', border: '1px solid #cbd5e1', borderRadius: `${Math.max(8, blockRadius - 3)}px`, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '10px', minWidth: 0 }}>
                    <div style={{ width: `${Math.max(40, config.tamanoLogo * 1.55)}px`, height: `${Math.max(40, config.tamanoLogo * 1.55)}px`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: `${Math.max(8, blockRadius * 0.45)}px`, background: '#FFFFFF', padding: '4px' }}>
                      {state.empresaInfo.logo ? (
                        <img src={state.empresaInfo.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: `${config.fuenteTexto + 1}px`, fontWeight: 700 }}>Logo</span>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h1 style={{ margin: 0, color: config.colorEncabezadoTabla, fontSize: `${config.fuenteTitulo * 1.55}px`, lineHeight: 1, fontWeight: 900, letterSpacing: '0.04em' }}>
                        {state.empresaInfo.razonSocial || state.empresaInfo.nombreComercial || 'ESMARK MEDIA'}
                      </h1>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginTop: '7px', color: '#475569', fontSize: `${Math.max(8, config.fuenteTexto)}px`, lineHeight: 1.18 }}>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Direccion:</strong> {state.empresaInfo.direccion || 'Juticalpa, Olancho, Honduras'}</p>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Tel:</strong> {state.empresaInfo.telefono || '+504 9999-9999'}</p>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>Correo:</strong> {state.empresaInfo.email || 'esmarkmedia@gmail.com'}</p>
                        <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>RTN:</strong> {state.empresaInfo.rtn || '08011999012345'}</p>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '7px', border: `1px solid ${config.colorEtiquetas}33`, background: `${config.colorEtiquetas}12`, borderRadius: '8px', padding: '3px 8px' }}>
                        <span style={{ color: config.colorEncabezadoTabla, fontSize: '7.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha de emision</span>
                        <span style={{ color: '#0f172a', fontSize: '8.5px', fontWeight: 900 }}>2026-01-16</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: `${Math.max(9, blockRadius - 4)}px`, background: '#f8fafc', padding: '6px 8px', textAlign: 'center' }}>
                    <p style={{ margin: 0, color: config.colorEncabezadoTabla, fontSize: `${config.fuenteTitulo + 2}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.11em' }}>Recibo</p>
                    <h2 style={{ width: '100%', margin: '7px 0 0', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#FFFFFF', color: '#020617', padding: '5px 8px', fontSize: `${config.fuenteTitulo + 3}px`, lineHeight: 1, fontWeight: 900 }}>N {receiptNumber}</h2>
                    <p style={{ display: 'inline-block', margin: '7px 0 0', border: `1px solid ${config.colorEncabezadoTabla}`, borderRadius: '8px', background: config.colorEncabezadoTabla, color: headerTextColor, padding: '3px 8px', fontSize: '8px', fontWeight: 900 }}>PAGADO</p>
                  </div>
                </header>

                <section style={{ border: '1px solid #cbd5e1', borderRadius: `${Math.max(8, blockRadius - 4)}px`, background: '#f8fafc', padding: '8px 12px' }}>
                  <p style={{ margin: 0, color: config.colorEncabezadoTabla, fontSize: `${Math.max(8, config.fuenteTexto)}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Recibido de</p>
                  <p style={{ margin: '6px 0 0', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#FFFFFF', color: '#020617', padding: '6px 8px', fontSize: `${config.fuenteTexto + 3}px`, fontWeight: 700 }}>Cliente</p>
                </section>

                <section style={{ border: '1px solid #cbd5e1', borderRadius: `${Math.max(8, blockRadius - 4)}px`, padding: '8px 12px' }}>
                  <p style={{ margin: 0, color: config.colorEncabezadoTabla, fontSize: `${Math.max(8, config.fuenteTexto)}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Concepto</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginTop: '6px' }}>
                    <p style={{ margin: 0, color: '#1e293b', fontSize: `${config.fuenteTexto + 2.5}px`, fontWeight: 600, lineHeight: 1.25 }}>Recibo de pago por productos o servicios realizados.</p>
                    <p style={{ margin: 0, flexShrink: 0, color: '#475569', fontSize: `${config.fuenteTexto + 2}px` }}>Metodo: <strong style={{ color: config.colorEncabezadoTabla }}>Efectivo</strong></p>
                  </div>
                </section>

                <section style={{ border: '1px solid #cbd5e1', borderRadius: `${Math.max(8, blockRadius - 4)}px`, padding: '8px 12px' }}>
                  <p style={{ margin: 0, color: config.colorEncabezadoTabla, fontSize: `${Math.max(8, config.fuenteTexto)}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em' }}>Cantidad en letras</p>
                  <p style={{ margin: '6px 0 0', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', color: '#0f172a', padding: '6px 8px', fontSize: `${config.fuenteTexto + 2.5}px`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{amountToWords(850)}</p>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px' }}>
                  <div style={{ overflow: 'hidden', border: `1px solid ${config.colorTotales}`, borderRadius: `${Math.max(10, blockRadius - 4)}px`, background: config.colorTotales, color: '#FFFFFF' }}>
                    {[
                      ['Saldo anterior', formatReceiptMoney(850)],
                      ['Abono', formatReceiptMoney(850)],
                      ['Saldo actual', formatReceiptMoney(0)],
                    ].map(([label, value], index) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', borderBottom: index === 2 ? '0' : '1px solid rgba(255,255,255,0.18)', padding: '8px 14px' }}>
                        <span style={{ fontSize: `${config.fuenteTexto + 1.5}px`, fontWeight: 500 }}>{label}</span>
                        <strong style={{ fontSize: `${config.fuenteTexto + (index === 1 ? 4 : 2)}px`, fontWeight: 900 }}>{value}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '84px', border: '1px solid #cbd5e1', borderRadius: `${Math.max(8, blockRadius - 5)}px`, padding: '8px 16px 12px' }}>
                    <div style={{ width: '2.7in', textAlign: 'center' }}>
                      {state.empresaInfo.firma && <img src={state.empresaInfo.firma} alt="Firma" style={{ width: '120px', height: '42px', objectFit: 'contain', margin: '0 auto 2px' }} />}
                      <div style={{ borderTop: '1px solid #1f2937', paddingTop: '4px' }}>
                        <p style={{ margin: 0, color: '#0f172a', fontSize: `${config.fuenteTexto + 3}px`, fontWeight: 700 }}>Firma</p>
                      </div>
                    </div>
                  </div>
                </section>

                <p style={{ margin: 0, textAlign: 'center', color: config.colorEncabezadoTabla, fontSize: `${config.fuenteTexto + 1.5}px`, fontStyle: 'italic', lineHeight: 1 }}>Gracias por su preferencia</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="facturacion-live-preview" key={previewKey}>
        <div className="facturacion-live-page-wrap" style={{ width: `${pageWidthPx * previewScale}px`, height: `${pageHeightPx * previewScale}px` }}>
          <div className="facturacion-live-page" style={{ width: `${pageWidthPx}px`, minHeight: `${pageHeightPx}px`, backgroundColor: '#FFFFFF', transform: `scale(${previewScale})`, transformOrigin: 'top left', fontSize: `${config.fuenteTexto * 1.42}px` }}>
            <div className="facturacion-live-header" style={{ minHeight: `${headerHeight}px`, background: headerBackground, borderRadius: `${blockRadius + 10}px`, color: headerTextColor }}>
              <div className="facturacion-live-logo" style={{ width: `${Math.max(112, config.tamanoLogo * 4)}px`, height: `${Math.max(58, config.tamanoLogo * 2.1)}px`, borderRadius: `${Math.max(8, blockRadius * 0.65)}px` }}>
                {state.empresaInfo.logo ? <img src={state.empresaInfo.logo} alt="Logo" /> : <strong>Logo</strong>}
              </div>
              <div className="facturacion-live-company">
                <h2 style={{ fontSize: `${config.fuenteTitulo * 2.05}px` }}>{state.empresaInfo.razonSocial || state.empresaInfo.nombreComercial || 'Empresa S.A.'}</h2>
                <p>Tel: {state.empresaInfo.telefono || '+504 9999-0000'}</p>
                <p>RTN: {state.empresaInfo.rtn || '0000-0000-000000'}</p>
              </div>
              <div className="facturacion-live-invoice" style={{ borderRadius: `${Math.max(12, blockRadius)}px` }}>
                <p style={{ color: config.colorEtiquetas }}>FACTURA</p>
                <h3>N {state.datosFiscales.prefijo}-{state.datosFiscales.siguienteFactura}</h3>
                <span style={{ backgroundColor: config.colorTotales, borderRadius: `${Math.max(8, blockRadius * 0.65)}px` }}>ORIGINAL: CLIENTE</span>
              </div>
            </div>
            <div className="facturacion-live-table" style={{ borderRadius: `${Math.max(8, blockRadius * 0.75)}px` }}>
              <div className="facturacion-live-table-head" style={{ backgroundColor: config.colorEncabezadoTabla }}>
                <span>PRODUCTO / DESCRIPCION</span><span>CAN.</span><span>PRECIO</span><span>DESCUENTO</span><span>IMPUESTO</span><span>TOTAL</span>
              </div>
              <div className="facturacion-live-table-row"><span>Banner full color 2m x 1m</span><span>1</span><span>L850.00</span><span>0.00%</span><span>15.00%</span><span>L977.50</span></div>
              <div className="facturacion-live-table-row"><span>Stickers troquelados</span><span>50</span><span>L8.00</span><span>5.00%</span><span>15.00%</span><span>L437.00</span></div>
            </div>
            <div className="facturacion-live-bottom">
              <div className="facturacion-live-fiscal" style={{ borderRadius: `${blockRadius}px` }}><p><strong>Notas:</strong> Vista previa del diseno de factura.</p></div>
              <div className="facturacion-live-totals" style={{ backgroundColor: config.colorTotales, borderRadius: `${blockRadius}px` }}><div style={{ backgroundColor: config.colorEtiquetas }}><span>Total factura</span><strong>L 1,414.50</strong></div></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="facturacion-design max-w-[1800px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Diseño de recibos
        </h2>
        <p className="text-sm text-gray-600">
          Personaliza la apariencia de los recibos. Las facturas usan el diseño establecido.
        </p>
      </div>

      <div className="facturacion-design-layout">
        {/* Panel de configuración */}
        <div className="facturacion-design-controls">
              <div className="bg-white rounded-xl shadow-sm p-4 space-y-4 facturacion-design-panel">
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-5 bg-[#1976D2] rounded mr-2"></span>
                Colores
              </h3>
              <div className="space-y-3">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Etiquetas
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorEtiquetas}
                    onInput={(e) => handleConfigChange({ colorEtiquetas: e.currentTarget.value })}
                    onChange={(e) => handleConfigChange({ colorEtiquetas: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorEtiquetas}
                    onChange={(e) => handleConfigChange({ colorEtiquetas: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#DC3545"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Encabezado de tabla
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorEncabezadoTabla}
                    onInput={(e) => handleConfigChange({ colorEncabezadoTabla: e.currentTarget.value })}
                    onChange={(e) => handleConfigChange({ colorEncabezadoTabla: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorEncabezadoTabla}
                    onChange={(e) => handleConfigChange({ colorEncabezadoTabla: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#1F2D3D"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Encabezado: tipo de fondo
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfigChange({ encabezadoModo: 'solido' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${config.encabezadoModo !== 'degradado' ? 'bg-[#1976D2] text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Sólido
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange({ encabezadoModo: 'degradado' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${config.encabezadoModo === 'degradado' ? 'bg-[#1976D2] text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Degradado
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Color final del degradado
                </label>
                <div className={`flex gap-2 ${config.encabezadoModo !== 'degradado' ? 'opacity-60' : ''}`}>
                  <input
                    type="color"
                    value={config.colorEncabezadoFinal || '#2563EB'}
                    onInput={(e) => handleConfigChange({ colorEncabezadoFinal: e.currentTarget.value, encabezadoModo: 'degradado' })}
                    onChange={(e) => handleConfigChange({ colorEncabezadoFinal: e.target.value, encabezadoModo: 'degradado' })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorEncabezadoFinal || '#2563EB'}
                    onChange={(e) => handleConfigChange({ colorEncabezadoFinal: e.target.value, encabezadoModo: 'degradado' })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#2563EB"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Texto del encabezado
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorTextoEncabezado || '#FFFFFF'}
                    onInput={(e) => handleConfigChange({ colorTextoEncabezado: e.currentTarget.value })}
                    onChange={(e) => handleConfigChange({ colorTextoEncabezado: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorTextoEncabezado || '#FFFFFF'}
                    onChange={(e) => handleConfigChange({ colorTextoEncabezado: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Totales
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorTotales}
                    onInput={(e) => handleConfigChange({ colorTotales: e.currentTarget.value })}
                    onChange={(e) => handleConfigChange({ colorTotales: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorTotales}
                    onChange={(e) => handleConfigChange({ colorTotales: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#1F2D3D"
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-5 bg-[#1976D2] rounded mr-2"></span>
                Tamaños y espaciado
              </h3>
              <div className="space-y-4">

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Alto del encabezado
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.altoEncabezado ?? 190} px
                  </span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="260"
                  value={config.altoEncabezado ?? 190}
                  onInput={(e) => handleNumberConfigChange('altoEncabezado', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('altoEncabezado', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Redondeo de bloques
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.radioBloques ?? 18} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={config.radioBloques ?? 18}
                  onInput={(e) => handleNumberConfigChange('radioBloques', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('radioBloques', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Tamaño del logo
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.tamanoLogo} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  value={config.tamanoLogo}
                  onInput={(e) => handleNumberConfigChange('tamanoLogo', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('tamanoLogo', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Fuente título
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.fuenteTitulo} pt
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="16"
                  value={config.fuenteTitulo}
                  onInput={(e) => handleNumberConfigChange('fuenteTitulo', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('fuenteTitulo', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Fuente texto
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.fuenteTexto} pt
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="12"
                  value={config.fuenteTexto}
                  onInput={(e) => handleNumberConfigChange('fuenteTexto', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('fuenteTexto', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-gray-600">
                    Espaciado
                  </label>
                  <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-1 rounded">
                    {config.espaciado} px
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  value={config.espaciado}
                  onInput={(e) => handleNumberConfigChange('espaciado', e.currentTarget.value)}
                  onChange={(e) => handleNumberConfigChange('espaciado', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>
            </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              La vista previa de {documentLabel.toLowerCase()} se actualiza en tiempo real conforme cambias los ajustes.
            </div>

            {/* Botones de acción */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full px-5 py-2.5 bg-[#1976D2] text-white rounded-lg hover:bg-[#1565C0] transition-all font-medium shadow-sm hover:shadow-md"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Restaurar predeterminado
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="facturacion-design-preview-shell">
            <div className="bg-white rounded-xl shadow-sm p-4 facturacion-preview-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Vista previa
              </h3>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                Media Carta (8.5" × 5.5")
              </span>
            </div>
            <VistaPrevia />
          </div>
        </div>
      </div>
    </div>
  );
}
