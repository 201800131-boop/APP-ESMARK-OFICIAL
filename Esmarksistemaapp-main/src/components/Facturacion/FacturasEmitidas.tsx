import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { generateFacturaPDF } from './utils/pdfGenerator';

export function FacturasEmitidas() {
  const { state, deleteFactura, addFactura } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container') && !target.closest('button')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const facturas = state.facturas.filter(f => f.tipo === 'emitida');
  const totalFacturas = facturas.length;
  const totalPages = Math.ceil(totalFacturas / perPage);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentFacturas = facturas.slice(startIndex, endIndex);

  const toggleMenu = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 256, // 256px es el ancho del menú (w-64)
      });
      setOpenMenuId(id);
    }
  };

  const handleView = (id: string) => {
    setOpenMenuId(null);
    alert(`Ver detalles de factura ID: ${id}`);
  };

  const handleDownloadOriginal = (id: string) => {
    const factura = facturas.find(f => f.id === id);
    if (!factura) return;

    const pdf = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdf.save(`factura-original-${factura.numeroFactura}.pdf`);
    setOpenMenuId(null);
  };

  const handleDownloadCopiaEmisor = (id: string) => {
    const factura = facturas.find(f => f.id === id);
    if (!factura) return;

    const pdf = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdf.save(`factura-copia-emisor-${factura.numeroFactura}.pdf`);
    setOpenMenuId(null);
  };

  const handleDownloadAmbas = (id: string) => {
    const factura = facturas.find(f => f.id === id);
    if (!factura) return;

    const pdfOriginal = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdfOriginal.save(`factura-original-${factura.numeroFactura}.pdf`);

    setTimeout(() => {
      const pdfCopia = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
      pdfCopia.save(`factura-copia-emisor-${factura.numeroFactura}.pdf`);
    }, 500);

    setOpenMenuId(null);
  };

  const handleClonar = (id: string) => {
    const factura = facturas.find(f => f.id === id);
    if (!factura) return;

    const nuevaFactura = {
      tipo: 'emitida' as const,
      numeroFactura: `${state.datosFiscales.prefijo}-${String(state.nextInvoiceNumber).padStart(8, '0')}`,
      cliente: factura.cliente,
      productos: factura.productos,
      nota: factura.nota,
      estado: 'Emitida' as const,
      fechaEmision: new Date().toISOString().split('T')[0],
      subtotal: factura.subtotal,
      descuento: factura.descuento,
      impuestos: factura.impuestos,
      envio: factura.envio,
      total: factura.total,
    };

    addFactura(nuevaFactura);
    setOpenMenuId(null);
    alert('Factura clonada exitosamente');
  };

  const handleDelete = (id: string) => {
    setOpenMenuId(null);
    if (confirm('¿Está seguro de que desea anular esta factura?')) {
      deleteFactura(id);
      alert('Factura anulada exitosamente');
    }
  };

  const handleRefresh = () => {
    alert('Lista de facturas actualizada');
  };

  const handleDownloadReport = () => {
    alert('Descargando reporte de facturas emitidas...');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const Pagination = () => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Mostrar:</span>
      <select
        value={perPage}
        onChange={(e) => {
          setPerPage(Number(e.target.value));
          setCurrentPage(1);
        }}
        className="px-3 py-1 border border-gray-300 rounded text-sm"
      >
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={200}>200</option>
      </select>
      <button
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="px-3 py-1 bg-[#1976D2] text-white rounded text-sm">{currentPage}</span>
      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          Facturas emitidas
        </h2>
        <button
          onClick={handleDownloadReport}
          className="px-4 py-2 bg-[#1976D2] text-white rounded-lg text-sm hover:bg-[#1565C0] transition-colors"
        >
          Descargar reporte
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Mostrando {startIndex + 1} a {Math.min(endIndex, totalFacturas)} de {totalFacturas}<br />
          Total de facturas: {totalFacturas}
        </p>
      </div>

      {/* Pagination Top */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handleRefresh}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
        >
          Actualizar lista
        </button>
        <Pagination />
      </div>

      {/* Table */}
      <div className="overflow-visible">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1976D2] border-b-2 border-gray-300">
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Cliente</th>
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Número de factura</th>
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Fecha de emisión</th>
              <th className="text-center py-3 px-4 font-medium text-white border-r border-blue-800">Cant. de artículos</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Subtotal</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Descuento</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Impuestos</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Envío</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Total</th>
              <th className="text-center py-3 px-4 font-medium text-white">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentFacturas.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-gray-500 border-b border-gray-200">
                  No hay facturas emitidas
                </td>
              </tr>
            ) : (
              currentFacturas.map((factura) => (
                <tr key={factura.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-900 border-r border-gray-200">{factura.cliente.nombre}</td>
                  <td className="py-4 px-4 text-gray-700 border-r border-gray-200">{factura.numeroFactura}</td>
                  <td className="py-4 px-4 border-r border-gray-200">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {factura.estado}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 border-r border-gray-200">{formatDate(factura.fechaEmision)}</td>
                  <td className="py-4 px-4 text-center text-gray-900 border-r border-gray-200">{factura.productos.length}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{factura.subtotal.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{factura.descuento.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{factura.impuestos.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{factura.envio.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 border-r border-gray-200">L{factura.total.toFixed(2)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={(e) => toggleMenu(factura.id, e)}
                        className="px-4 py-2 border-2 border-gray-400 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        Acciones
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination Bottom */}
      <div className="flex justify-end mt-4">
        <Pagination />
      </div>

      {/* Menú flotante */}
      {openMenuId && menuPosition && (
        <div
          className="menu-container fixed w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999]"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <div className="py-2">
            <button
              onClick={() => handleView(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-[#1976D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-gray-700">Ver factura</span>
            </button>
            <button
              onClick={() => handleDownloadOriginal(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-[#1976D2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-gray-700">Descargar factura original</span>
            </button>
            <button
              onClick={() => handleDownloadCopiaEmisor(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-gray-700">Descargar copia de emisor</span>
            </button>
            <button
              onClick={() => handleDownloadAmbas(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              <span className="text-gray-700">Descargar ambas copias</span>
            </button>
            <button
              onClick={() => handleClonar(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-gray-700">Clonar factura</span>
            </button>
            <button
              onClick={() => handleDelete(openMenuId)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm border-t border-gray-200"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="text-gray-700">Anular Factura</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
