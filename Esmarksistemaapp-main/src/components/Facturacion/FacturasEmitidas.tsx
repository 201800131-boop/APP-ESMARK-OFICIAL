import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { Factura, useApp } from './context/AppContext';
import { generateFacturaPDF } from './utils/facturaCartaPdf';

export function FacturasEmitidas() {
  const { state, deleteFactura, addFactura } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.facturacion-actions-menu-wrap') && !target.closest('.facturacion-floating-actions-menu')) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const facturas = state.facturas.filter((factura) => factura.tipo === 'emitida');
  const totalFacturas = facturas.length;
  const totalPages = Math.max(1, Math.ceil(totalFacturas / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentFacturas = facturas.slice(startIndex, endIndex);

  const formatMoney = (value: number) =>
    `L${Number(value || 0).toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const openActionMenu = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 232;
    const menuHeight = 226;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12));
    setOpenMenuId(id);
    setMenuPosition({ top, left });
  };

  const handleView = (id: string) => {
    const factura = facturas.find((item) => item.id === id);
    if (factura) setSelectedFactura(factura);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDownloadOriginal = (id: string) => {
    const factura = facturas.find((item) => item.id === id);
    if (!factura) return;

    const pdf = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdf.save(`factura-original-${factura.numeroFactura}.pdf`);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDownloadCopiaEmisor = (id: string) => {
    const factura = facturas.find((item) => item.id === id);
    if (!factura) return;

    const pdf = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdf.save(`factura-copia-emisor-${factura.numeroFactura}.pdf`);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDownloadAmbas = (id: string) => {
    const factura = facturas.find((item) => item.id === id);
    if (!factura) return;

    const pdfOriginal = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
    pdfOriginal.save(`factura-original-${factura.numeroFactura}.pdf`);

    setTimeout(() => {
      const pdfCopia = generateFacturaPDF(factura, state.empresaInfo, state.datosFiscales, state.disenoConfig);
      pdfCopia.save(`factura-copia-emisor-${factura.numeroFactura}.pdf`);
    }, 500);

    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleClonar = (id: string) => {
    const factura = facturas.find((item) => item.id === id);
    if (!factura) return;

    addFactura({
      tipo: 'emitida',
      numeroFactura: `${state.datosFiscales.prefijo}-${String(state.nextInvoiceNumber).padStart(8, '0')}`,
      cliente: factura.cliente,
      productos: factura.productos,
      nota: factura.nota,
      estado: 'Emitida',
      fechaEmision: new Date().toISOString().split('T')[0],
      subtotal: factura.subtotal,
      descuento: factura.descuento,
      impuestos: factura.impuestos,
      envio: factura.envio,
      total: factura.total,
    });

    setOpenMenuId(null);
    setMenuPosition(null);
    setNotice('Factura clonada correctamente.');
  };

  const handleDelete = (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    if (confirm('Seguro que desea anular esta factura?')) {
      deleteFactura(id);
      setNotice('Factura anulada correctamente.');
    }
  };

  const handleRefresh = () => {
    setNotice('Lista actualizada.');
  };

  const handleDownloadReport = () => {
    const rows = facturas.map((factura) => [
      factura.numeroFactura || '',
      factura.cliente.nombre || '',
      factura.cliente.rtn || '',
      formatDate(factura.fechaEmision),
      factura.estado || '',
      factura.productos.length,
      factura.subtotal.toFixed(2),
      factura.descuento.toFixed(2),
      factura.impuestos.toFixed(2),
      factura.total.toFixed(2),
    ]);

    const header = ['Numero', 'Cliente', 'RTN', 'Fecha', 'Estado', 'Articulos', 'Subtotal', 'Descuento', 'Impuestos', 'Total'];
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-facturas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Reporte descargado correctamente.');
  };

  const Pagination = () => (
    <div className="facturacion-pagination facturacion-proforma-pagination">
      <span className="facturacion-per-page-label">Mostrar:</span>
      <select
        value={perPage}
        onChange={(event) => {
          setPerPage(Number(event.target.value));
          setCurrentPage(1);
        }}
      >
        <option value={30}>30</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value={200}>200</option>
      </select>
      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
        <ChevronsLeft size={16} />
      </button>
      <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
        <ChevronLeft size={16} />
      </button>
      <span className="facturacion-page-number">{currentPage}</span>
      <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
        <ChevronRight size={16} />
      </button>
      <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages}>
        <ChevronsRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="facturacion-list-page facturacion-proforma-page facturacion-emitidas-page">
      <div className="facturacion-proforma-topline">
        <div className="facturacion-proforma-count">
          <p>Mostrando pagina {currentPage} de {totalPages}</p>
          <strong>Total de facturas: {totalFacturas}</strong>
        </div>

        <div className="facturacion-proforma-toolbar">
          <button type="button" className="facturacion-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Actualizar lista
          </button>
          <Pagination />
        </div>
      </div>

      <div className="facturacion-proforma-titlebar">
        <h2>Facturas emitidas</h2>
        <button type="button" onClick={handleDownloadReport} className="facturacion-primary-btn">
          Descargar reporte
        </button>
      </div>

      {notice && (
        <div className="facturacion-inline-notice">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>
            Cerrar
          </button>
        </div>
      )}

      <div className="facturacion-proforma-table-wrap">
        <table className="facturacion-proforma-table facturacion-emitidas-table w-full text-sm border-collapse">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Numero factura</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Art.</th>
              <th>Subtotal</th>
              <th>Desc.</th>
              <th>Imp.</th>
              <th>Envio</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentFacturas.length === 0 ? (
              <tr className="facturacion-proforma-empty">
                <td colSpan={11}>No hay facturas emitidas</td>
              </tr>
            ) : (
              currentFacturas.map((factura) => (
                <tr key={factura.id}>
                  <td>
                    <div className="facturacion-client-name">{factura.cliente.nombre}</div>
                    {factura.cliente.rtn && <div className="facturacion-client-rtn">{factura.cliente.rtn}</div>}
                  </td>
                  <td>{factura.numeroFactura}</td>
                  <td>
                    <span className="facturacion-status-pill">{factura.estado || 'Emitida'}</span>
                  </td>
                  <td>{formatDate(factura.fechaEmision)}</td>
                  <td className="facturacion-center">{factura.productos.length}</td>
                  <td className="facturacion-money">{formatMoney(factura.subtotal)}</td>
                  <td className="facturacion-money">{formatMoney(factura.descuento)}</td>
                  <td className="facturacion-money">{formatMoney(factura.impuestos)}</td>
                  <td className="facturacion-money">{formatMoney(factura.envio)}</td>
                  <td className="facturacion-money facturacion-total">{formatMoney(factura.total)}</td>
                  <td>
                    <div className="facturacion-actions-menu-wrap">
                      <button
                        type="button"
                        onClick={(event) => openActionMenu(event, factura.id)}
                        className={`facturacion-action-btn facturacion-menu-trigger ${openMenuId === factura.id ? 'is-open' : ''}`}
                      >
                        <MoreHorizontal size={15} />
                        Acciones
                      </button>

                      {openMenuId === factura.id && menuPosition && createPortal(
                        <div className="facturacion-emitidas-menu facturacion-floating-actions-menu" style={{ top: menuPosition.top, left: menuPosition.left }}>
                          <button type="button" onClick={() => handleView(factura.id)}>
                            <Eye size={15} />
                            Ver factura
                          </button>
                          <button type="button" onClick={() => handleDownloadOriginal(factura.id)}>
                            <Download size={15} />
                            Descargar original
                          </button>
                          <button type="button" onClick={() => handleDownloadCopiaEmisor(factura.id)}>
                            <Download size={15} />
                            Descargar copia emisor
                          </button>
                          <button type="button" onClick={() => handleDownloadAmbas(factura.id)}>
                            <Download size={15} />
                            Descargar ambas
                          </button>
                          <button type="button" onClick={() => handleClonar(factura.id)}>
                            <Copy size={15} />
                            Clonar factura
                          </button>
                          <button type="button" onClick={() => handleDelete(factura.id)} className="is-danger">
                            <Ban size={15} />
                            Anular factura
                          </button>
                        </div>
                        ,
                        document.body
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="facturacion-proforma-bottom">
        <Pagination />
      </div>

      {selectedFactura && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Factura {selectedFactura.numeroFactura}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedFactura.cliente.nombre} - {formatDate(selectedFactura.fechaEmision)}
                </p>
              </div>
              <button
                onClick={() => setSelectedFactura(null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">RTN</p>
                <p className="mt-1 font-medium text-gray-900">{selectedFactura.cliente.rtn || 'Consumidor final'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Estado</p>
                <p className="mt-1 font-medium text-gray-900">{selectedFactura.estado || 'Emitida'}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
                <p className="mt-1 font-semibold text-gray-900">{formatMoney(selectedFactura.total)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Producto / Servicio</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cant.</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Precio</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Desc.</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">ISV</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFactura.productos.map((producto) => (
                    <tr key={producto.id} className="border-t border-gray-200">
                      <td className="px-4 py-3 text-gray-900">{producto.nombre}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{producto.cantidad}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatMoney(producto.precio)}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{producto.descuento}%</td>
                      <td className="px-4 py-3 text-center text-gray-700">{producto.impuesto}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => handleDownloadOriginal(selectedFactura.id)}
                className="rounded-lg bg-[#101827] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e293b]"
              >
                Descargar original
              </button>
              <button
                onClick={() => handleDownloadCopiaEmisor(selectedFactura.id)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Descargar copia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
