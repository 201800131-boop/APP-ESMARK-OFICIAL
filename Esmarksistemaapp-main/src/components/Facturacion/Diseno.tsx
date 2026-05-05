import React, { useState } from 'react';
import { useApp, DisenoConfig } from './context/AppContext';

export function Diseno() {
  const { state, updateDisenoConfig } = useApp();
  const [config, setConfig] = useState<DisenoConfig>(state.disenoConfig);
  const [tipoDocumento, setTipoDocumento] = useState<'factura' | 'recibo'>('factura');

  const handleSave = () => {
    updateDisenoConfig(config);
    alert('Diseño actualizado exitosamente');
  };

  const handleReset = () => {
    const defaultConfig: DisenoConfig = {
      colorEtiquetas: '#DC3545',
      colorEncabezadoTabla: '#1F2D3D',
      colorTotales: '#1F2D3D',
      tamanoLogo: 30,
      fuenteTitulo: 10,
      fuenteTexto: 8,
      espaciado: 5,
    };
    setConfig(defaultConfig);
  };

  // Vista previa en miniatura
  const VistaPrevia = () => {
    const scale = 0.85;
    const isRecibo = tipoDocumento === 'recibo';

    // Recibo = Media carta (8.5" x 5.5" = 215.9mm x 139.7mm)
    // Factura = Carta (8.5" x 11" = 215.9mm x 279.4mm)
    const paperWidth = isRecibo ? 215.9 : 215.9;
    const paperHeight = isRecibo ? 139.7 : 279.4;

    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-auto border border-gray-200 flex items-start justify-center" style={{ maxHeight: 'calc(100vh - 300px)', padding: '24px' }}>
        <div
          className="bg-white shadow-xl relative"
          style={{
            width: `${paperWidth}mm`,
            minHeight: `${paperHeight}mm`,
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            border: '1px solid #d1d5db',
            marginBottom: `${(1 - scale) * paperHeight}mm`,
            padding: '15mm',
          }}
        >
          {!isRecibo ? (
            /* DISEÑO DE FACTURA */
            <>
              {/* ENCABEZADO: Info factura a la izquierda, Logo a la derecha */}
              <div className="flex justify-between items-start mb-4">
                <div style={{ fontSize: `${config.fuenteTexto}pt` }}>
                  <p style={{ fontWeight: 'bold', fontSize: `${config.fuenteTitulo}pt` }}>Factura</p>
                  <p style={{ marginTop: `${config.espaciado}px` }}>N: 0145566-0000000004</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>FECHA EMISIÓN: 2025-10-25</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px`, fontWeight: 'bold' }}>ORIGINAL: CLIENTE</p>
                </div>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: `${config.tamanoLogo}mm`,
                    height: `${config.tamanoLogo}mm`,
                    backgroundColor: '#E8F5E9',
                    borderRadius: '8px'
                  }}
                >
                  {state.empresaInfo.logo ? (
                    <img src={state.empresaInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span style={{ fontSize: `${config.fuenteTexto * 2}pt` }}>🚀</span>
                  )}
                </div>
              </div>

              {/* DATOS DE LA EMPRESA */}
              <div style={{ marginTop: '8mm', fontSize: `${config.fuenteTexto}pt` }}>
                <p style={{ fontWeight: 'bold', fontSize: `${config.fuenteTitulo}pt` }}>{state.empresaInfo.razonSocial}</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>Sociedad Anónima Tegucigalpa</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>Teléfono: {state.empresaInfo.telefono}</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>Dirección: {state.empresaInfo.direccion}</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>RTN: {state.empresaInfo.rtn}</p>
              </div>

              {/* DATOS DEL CLIENTE */}
              <div style={{ marginTop: '8mm', fontSize: `${config.fuenteTexto}pt` }}>
                <p><strong>Cliente:</strong> Consumidor final</p>
                <p style={{ marginTop: `${config.espaciado}px` }}><strong>RTN:</strong> 000000000000</p>
              </div>

              {/* ENCABEZADO PRODUCTOS / SERVICIOS */}
              <div style={{ marginTop: '8mm', fontSize: `${config.fuenteTexto + 1}pt`, fontWeight: 'bold' }}>
                Productos / Servicios
              </div>

              {/* TABLA DE PRODUCTOS */}
              <div style={{ marginTop: '5mm' }}>
                <table style={{ width: '100%', fontSize: `${config.fuenteTexto}pt`, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: config.colorEncabezadoTabla, color: 'white' }}>
                      <th style={{ padding: '6px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ccc' }}>Producto / Descripción</th>
                      <th style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>Cant.</th>
                      <th style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Precio</th>
                      <th style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Descuento</th>
                      <th style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Impuesto (ISV)</th>
                      <th style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ddd' }}>Producto Demo</td>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L1,100.00</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>0.00%</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>15.00%</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L1,265.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ddd' }}>Producto de reserva</td>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L0.00</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>0.00%</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>0.00%</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECCIÓN INFERIOR: Info adicional y Totales */}
              <div style={{ marginTop: '10mm', display: 'flex', justifyContent: 'space-between', fontSize: `${config.fuenteTexto}pt` }}>
                {/* Columna izquierda: Información adicional */}
                <div style={{ width: '50%' }}>
                  <p><strong>No. Orden de compra exento:</strong></p>
                  <p style={{ marginTop: `${config.espaciado}px` }}><strong>No. Constancia de exoneración:</strong></p>
                  <p style={{ marginTop: `${config.espaciado}px` }}><strong>No. Registro SAG:</strong></p>
                  <p style={{ marginTop: `${config.espaciado * 2}px` }}><strong>Notas:</strong></p>
                  <p style={{ marginTop: `${config.espaciado}px` }}><strong>Código/Lugar de la factura:</strong></p>
                </div>

                {/* Columna derecha: Totales */}
                <div style={{ width: '45%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>Descuento:</span>
                    <span>0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>Importe Exento:</span>
                    <span>0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>Importe Exonerado:</span>
                    <span>0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>Importe Gravado 15%:</span>
                    <span>L1,100.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>Importe Gravado 18%:</span>
                    <span>0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado}px` }}>
                    <span>ISV 15%:</span>
                    <span>L165.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${config.espaciado * 2}px` }}>
                    <span>ISV 18%:</span>
                    <span>0.00</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold',
                    fontSize: `${config.fuenteTitulo}pt`,
                    backgroundColor: config.colorTotales,
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    <span>TOTAL FACTURA:</span>
                    <span>L1,150.00</span>
                  </div>
                </div>
              </div>

              {/* PIE DE PÁGINA */}
              <div style={{ marginTop: '12mm', fontSize: `${config.fuenteTexto - 1}pt`, borderTop: '1px solid #ddd', paddingTop: '5mm' }}>
                <div style={{ fontSize: `${config.fuenteTexto - 1.5}pt` }}>
                  <p>Rango autorizado del: (Documento protegido) al {state.datosFiscales.prefijo}-{state.datosFiscales.ultimoNumero}</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>Fecha límite de emisión: {state.datosFiscales.fechaExpiracion}</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>CAI: {state.datosFiscales.cai}</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>Lugar de emisión: {state.datosFiscales.lugarEmision || 'Tegucigalpa, Honduras'}</p>
                </div>
                <p style={{ textAlign: 'right', marginTop: '4mm', fontSize: `${config.fuenteTexto - 2}pt` }}>Página 1 de 1</p>
              </div>
            </>
          ) : (
            /* DISEÑO DE RECIBO */
            <>
              {/* ENCABEZADO: Info recibo a la izquierda, Logo a la derecha */}
              <div className="flex justify-between items-start mb-4">
                <div style={{ fontSize: `${config.fuenteTexto}pt` }}>
                  <p style={{ fontWeight: 'bold', fontSize: `${config.fuenteTitulo}pt` }}>Recibo</p>
                  <p style={{ marginTop: `${config.espaciado}px` }}>N: REC-000001</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>FECHA: 04/05/2026</p>
                  <p style={{ marginTop: `${config.espaciado / 2}px` }}>MÉTODO DE PAGO: Efectivo</p>
                </div>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: `${config.tamanoLogo}mm`,
                    height: `${config.tamanoLogo}mm`,
                    backgroundColor: '#E8F5E9',
                    borderRadius: '8px'
                  }}
                >
                  {state.empresaInfo.logo ? (
                    <img src={state.empresaInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span style={{ fontSize: `${config.fuenteTexto * 2}pt` }}>🚀</span>
                  )}
                </div>
              </div>

              {/* DATOS DE LA EMPRESA */}
              <div style={{ marginTop: '8mm', fontSize: `${config.fuenteTexto}pt` }}>
                <p style={{ fontWeight: 'bold', fontSize: `${config.fuenteTitulo}pt` }}>{state.empresaInfo.razonSocial}</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>RTN: {state.empresaInfo.rtn}</p>
                <p style={{ marginTop: `${config.espaciado / 2}px` }}>Tel: {state.empresaInfo.telefono}</p>
              </div>

              {/* RECIBIDO DE */}
              <div style={{ marginTop: '6mm', fontSize: `${config.fuenteTexto}pt` }}>
                <p><strong>Recibido de:</strong> Comercial Los Andes S. de R.L.</p>
                <p style={{ marginTop: `${config.espaciado}px` }}><strong>RTN:</strong> 0801-1990-012345</p>
              </div>

              {/* TABLA DE CONCEPTOS */}
              <div style={{ marginTop: '6mm' }}>
                <table style={{ width: '100%', fontSize: `${config.fuenteTexto}pt`, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: config.colorEncabezadoTabla, color: 'white' }}>
                      <th style={{ padding: '5px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ccc' }}>Concepto</th>
                      <th style={{ padding: '5px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>Cant.</th>
                      <th style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Precio</th>
                      <th style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ccc' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ddd' }}>Pago por servicio de mantenimiento</td>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>2</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L850.00</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L1,700.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ddd' }}>Consultoría técnica</td>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L450.00</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L450.00</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px', border: '1px solid #ddd' }}>Abono a cuenta</td>
                      <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L320.00</td>
                      <td style={{ padding: '4px', textAlign: 'right', border: '1px solid #ddd' }}>L320.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TOTAL */}
              <div style={{ marginTop: '6mm', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: `${config.fuenteTitulo}pt`,
                  backgroundColor: config.colorTotales,
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  minWidth: '150px'
                }}>
                  <span>TOTAL:</span>
                  <span>L2,470.00</span>
                </div>
              </div>

              {/* OBSERVACIONES */}
              <div style={{ marginTop: '8mm', fontSize: `${config.fuenteTexto}pt` }}>
                <p><strong>Observaciones:</strong></p>
                <p style={{ marginTop: `${config.espaciado}px` }}>Pago parcial correspondiente a la orden de compra #OC-2026-045.</p>
              </div>

              {/* FIRMA AUTORIZADA */}
              <div style={{ marginTop: '12mm', display: 'flex', justifyContent: 'center', fontSize: `${config.fuenteTexto}pt` }}>
                <div style={{ textAlign: 'center', width: '50%' }}>
                  {state.empresaInfo.firma && (
                    <div style={{ marginBottom: '5px' }}>
                      <img src={state.empresaInfo.firma} alt="Firma" style={{ width: '120px', height: '60px', objectFit: 'contain', margin: '0 auto' }} />
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #666', paddingTop: `${config.espaciado}px`, marginTop: state.empresaInfo.firma ? '0' : '30px' }}>
                    Firma Autorizada
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1800px] mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Diseño de documentos
        </h2>
        <p className="text-sm text-gray-600">
          Personaliza la apariencia de tus facturas y recibos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 sticky top-6">
            {/* Selector de tipo de documento */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Tipo de documento
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTipoDocumento('factura')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    tipoDocumento === 'factura'
                      ? 'bg-[#1976D2] text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Factura
                </button>
                <button
                  onClick={() => setTipoDocumento('recibo')}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                    tipoDocumento === 'recibo'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Recibo
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-5 bg-[#1976D2] rounded mr-2"></span>
                Colores
              </h3>
              <div className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Etiquetas
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.colorEtiquetas}
                    onChange={(e) => setConfig({ ...config, colorEtiquetas: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorEtiquetas}
                    onChange={(e) => setConfig({ ...config, colorEtiquetas: e.target.value })}
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
                    onChange={(e) => setConfig({ ...config, colorEncabezadoTabla: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorEncabezadoTabla}
                    onChange={(e) => setConfig({ ...config, colorEncabezadoTabla: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#1F2D3D"
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
                    onChange={(e) => setConfig({ ...config, colorTotales: e.target.value })}
                    className="w-11 h-11 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-[#1976D2] transition-colors"
                  />
                  <input
                    type="text"
                    value={config.colorTotales}
                    onChange={(e) => setConfig({ ...config, colorTotales: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
                    placeholder="#1F2D3D"
                  />
                </div>
              </div>
            </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-1 h-5 bg-[#1976D2] rounded mr-2"></span>
                Tamaños y espaciado
              </h3>
              <div className="space-y-5">

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
                  onChange={(e) => setConfig({ ...config, tamanoLogo: parseInt(e.target.value) })}
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
                  onChange={(e) => setConfig({ ...config, fuenteTitulo: parseInt(e.target.value) })}
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
                  onChange={(e) => setConfig({ ...config, fuenteTexto: parseInt(e.target.value) })}
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
                  onChange={(e) => setConfig({ ...config, espaciado: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1976D2]"
                />
              </div>
            </div>
            </div>

            {/* Botones de acción */}
            <div className="border-t border-gray-200 pt-6">
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  className="w-full px-6 py-3 bg-[#1976D2] text-white rounded-lg hover:bg-[#1565C0] transition-all font-medium shadow-sm hover:shadow-md"
                >
                  Guardar cambios
                </button>
                <button
                  onClick={handleReset}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Restaurar predeterminado
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vista previa */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Vista previa
              </h3>
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                {tipoDocumento === 'factura' ? 'Carta (8.5" × 11")' : 'Media Carta (8.5" × 5.5")'}
              </span>
            </div>
            <VistaPrevia />
          </div>
        </div>
      </div>
    </div>
  );
}
