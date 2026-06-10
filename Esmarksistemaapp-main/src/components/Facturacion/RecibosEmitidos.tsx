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
  Printer,
  RefreshCw,
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { generateReciboPDF } from './utils/pdfGenerator';

export function RecibosEmitidos() {
  const { state, deleteRecibo, addRecibo } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
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

  const recibos = state.recibos;
  const totalRecibos = recibos.length;
  const totalPages = Math.max(1, Math.ceil(totalRecibos / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentRecibos = recibos.slice(startIndex, endIndex);

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
    const menuWidth = 238;
    const menuHeight = 260;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12));
    setOpenMenuId(id);
    setMenuPosition({ top, left });
  };

  const handleView = (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    alert(`Ver detalles de recibo ID: ${id}`);
  };

  const handleDownloadOriginal = (id: string) => {
    const recibo = recibos.find((item) => item.id === id);
    if (!recibo) return;

    const pdf = generateReciboPDF(recibo, state.empresaInfo, state.disenoConfig);
    pdf.save(`recibo-original-${recibo.numeroRecibo}.pdf`);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDownloadCopiaEmisor = (id: string) => {
    const recibo = recibos.find((item) => item.id === id);
    if (!recibo) return;

    const pdf = generateReciboPDF(recibo, state.empresaInfo, state.disenoConfig);
    pdf.save(`recibo-copia-emisor-${recibo.numeroRecibo}.pdf`);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDownloadAmbas = (id: string) => {
    const recibo = recibos.find((item) => item.id === id);
    if (!recibo) return;

    const pdfOriginal = generateReciboPDF(recibo, state.empresaInfo, state.disenoConfig);
    pdfOriginal.save(`recibo-original-${recibo.numeroRecibo}.pdf`);

    setTimeout(() => {
      const pdfCopia = generateReciboPDF(recibo, state.empresaInfo, state.disenoConfig);
      pdfCopia.save(`recibo-copia-emisor-${recibo.numeroRecibo}.pdf`);
    }, 500);

    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handlePrint = (id: string) => {
    const recibo = recibos.find((item) => item.id === id);
    if (!recibo) return;

    const pdf = generateReciboPDF(recibo, state.empresaInfo, state.disenoConfig);
    pdf.autoPrint();
    window.open(pdf.output('bloburl'), '_blank');
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleClonar = (id: string) => {
    const recibo = recibos.find((item) => item.id === id);
    if (!recibo) return;

    addRecibo({
      cliente: recibo.cliente,
      productos: recibo.productos,
      nota: recibo.nota,
      fechaEmision: new Date().toISOString().split('T')[0],
      metodoPago: recibo.metodoPago,
      subtotal: recibo.subtotal,
      descuento: recibo.descuento,
      total: recibo.total,
    });

    setOpenMenuId(null);
    setMenuPosition(null);
    setNotice('Recibo clonado correctamente.');
  };

  const handleDelete = (id: string) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    if (confirm('Seguro que desea anular este recibo?')) {
      deleteRecibo(id);
      setNotice('Recibo anulado correctamente.');
    }
  };

  const handleRefresh = () => {
    setNotice('Lista de recibos actualizada.');
  };

  const handleDownloadReport = () => {
    setNotice('Reporte de recibos preparado.');
  };

  const Pagination = () => (
    <div className="facturacion-pagination facturacion-recibos-pagination">
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
    <div className="facturacion-list-page facturacion-recibos-page">
      <div className="facturacion-recibos-topline">
        <div className="facturacion-recibos-count">
          <p>Mostrando pagina {currentPage} de {totalPages}</p>
          <strong>Total de recibos: {totalRecibos}</strong>
        </div>

        <div className="facturacion-recibos-toolbar">
          <button type="button" className="facturacion-refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Actualizar lista
          </button>
          <Pagination />
        </div>
      </div>

      <div className="facturacion-recibos-titlebar">
        <h2>Recibos emitidos</h2>
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

      <div className="facturacion-recibos-table-wrap">
        <table className="facturacion-recibos-table w-full text-sm border-collapse">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Numero recibo</th>
              <th>Fecha</th>
              <th>Metodo pago</th>
              <th>Conceptos</th>
              <th>Subtotal</th>
              <th>Desc.</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentRecibos.length === 0 ? (
              <tr className="facturacion-recibos-empty">
                <td colSpan={9}>No hay recibos emitidos</td>
              </tr>
            ) : (
              currentRecibos.map((recibo) => (
                <tr key={recibo.id}>
                  <td>
                    <div className="facturacion-client-name">{recibo.cliente.nombre}</div>
                    {recibo.cliente.rtn && <div className="facturacion-client-rtn">{recibo.cliente.rtn}</div>}
                  </td>
                  <td>{recibo.numeroRecibo}</td>
                  <td>{formatDate(recibo.fechaEmision)}</td>
                  <td>{recibo.metodoPago}</td>
                  <td className="facturacion-center">{recibo.productos.length}</td>
                  <td className="facturacion-money">{formatMoney(recibo.subtotal)}</td>
                  <td className="facturacion-money">{formatMoney(recibo.descuento)}</td>
                  <td className="facturacion-money facturacion-total">{formatMoney(recibo.total)}</td>
                  <td>
                    <div className="facturacion-actions-menu-wrap">
                      <button
                        type="button"
                        onClick={(event) => openActionMenu(event, recibo.id)}
                        className={`facturacion-action-btn facturacion-menu-trigger ${openMenuId === recibo.id ? 'is-open' : ''}`}
                      >
                        <MoreHorizontal size={15} />
                        Acciones
                      </button>

                      {openMenuId === recibo.id && menuPosition && createPortal(
                        <div className="facturacion-recibos-menu facturacion-floating-actions-menu" style={{ top: menuPosition.top, left: menuPosition.left }}>
                          <button type="button" onClick={() => handleView(recibo.id)}>
                            <Eye size={15} />
                            Ver recibo
                          </button>
                          <button type="button" onClick={() => handleDownloadOriginal(recibo.id)}>
                            <Download size={15} />
                            Descargar original
                          </button>
                          <button type="button" onClick={() => handleDownloadCopiaEmisor(recibo.id)}>
                            <Download size={15} />
                            Descargar copia emisor
                          </button>
                          <button type="button" onClick={() => handleDownloadAmbas(recibo.id)}>
                            <Download size={15} />
                            Descargar ambas
                          </button>
                          <button type="button" onClick={() => handlePrint(recibo.id)}>
                            <Printer size={15} />
                            Imprimir recibo
                          </button>
                          <button type="button" onClick={() => handleClonar(recibo.id)}>
                            <Copy size={15} />
                            Clonar recibo
                          </button>
                          <button type="button" onClick={() => handleDelete(recibo.id)} className="is-danger">
                            <Ban size={15} />
                            Anular recibo
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

      <div className="facturacion-recibos-bottom">
        <Pagination />
      </div>
    </div>
  );
}

