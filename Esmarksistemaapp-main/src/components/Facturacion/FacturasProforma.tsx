import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { useNavigation } from './FacturaArea';

export function FacturasProforma() {
  const { state, addFactura, deleteFactura, convertProformaToFactura } = useApp();
  const { navigateToTab } = useNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const [openEmitMenuId, setOpenEmitMenuId] = useState<string | null>(null);

  const proformas = state.facturas.filter((factura) => factura.tipo === 'proforma');
  const totalProformas = proformas.length;
  const totalPages = Math.max(1, Math.ceil(totalProformas / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentProformas = proformas.slice(startIndex, endIndex);

  const handleEdit = (id: string) => {
    alert(`Editar proforma ID: ${id}\nEsta funcionalidad abrira el formulario de creacion con los datos prellenados.`);
  };

  const handleEmit = (id: string, fechaEmision?: string) => {
    convertProformaToFactura(id, fechaEmision);
    setOpenEmitMenuId(null);
    alert('Proforma emitida como factura exitosamente');
  };

  const handleClone = (id: string) => {
    const proforma = state.facturas.find((factura) => factura.id === id && factura.tipo === 'proforma');
    if (!proforma) return;

    addFactura({
      tipo: 'proforma',
      cliente: { ...proforma.cliente },
      productos: proforma.productos.map((producto) => ({ ...producto, id: `${Date.now()}-${producto.id}` })),
      nota: proforma.nota,
      subtotal: proforma.subtotal,
      descuento: proforma.descuento,
      impuestos: proforma.impuestos,
      envio: proforma.envio,
      total: proforma.total,
    });

    alert('Proforma clonada exitosamente');
  };

  const handleDelete = (id: string) => {
    if (confirm('Seguro que desea eliminar esta proforma?')) {
      deleteFactura(id);
      alert('Proforma eliminada exitosamente');
    }
  };

  const formatMoney = (value: number) =>
    `L${Number(value || 0).toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getCreationDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
    <div className="facturacion-list-page facturacion-proforma-page">
      <div className="facturacion-proforma-topline">
        <div className="facturacion-proforma-count">
          <p>Mostrando pagina {currentPage} de {totalPages}</p>
          <strong>Total de proformas: {totalProformas}</strong>
        </div>

        <div className="facturacion-proforma-toolbar">
          <button type="button" className="facturacion-refresh-btn">
            <RefreshCw size={16} />
            Actualizar lista
          </button>
          <Pagination />
        </div>
      </div>

      <div className="facturacion-proforma-titlebar">
        <h2>Facturas proforma</h2>
        <button type="button" onClick={() => navigateToTab('crear-factura')} className="facturacion-primary-btn">
          + Crear factura
        </button>
      </div>

      <div className="facturacion-proforma-table-wrap">
        <table className="facturacion-proforma-table w-full text-sm border-collapse">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha de creacion</th>
              <th>Subtotal</th>
              <th>Descuento</th>
              <th>Impuesto</th>
              <th>Envio</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentProformas.length === 0 ? (
              <tr className="facturacion-proforma-empty">
                <td colSpan={8}>No hay proformas registradas</td>
              </tr>
            ) : (
              currentProformas.map((proforma) => {
                const creationDate = getCreationDateOnly(proforma.fechaCreacion);
                return (
                  <tr key={proforma.id}>
                    <td>
                      <div className="facturacion-client-name">{proforma.cliente.nombre}</div>
                      {proforma.cliente.rtn && <div className="facturacion-client-rtn">{proforma.cliente.rtn}</div>}
                    </td>
                    <td>{formatDate(proforma.fechaCreacion)}</td>
                    <td className="facturacion-money">{formatMoney(proforma.subtotal)}</td>
                    <td className="facturacion-money">{formatMoney(proforma.descuento)}</td>
                    <td className="facturacion-money">{formatMoney(proforma.impuestos)}</td>
                    <td className="facturacion-money">{formatMoney(proforma.envio)}</td>
                    <td className="facturacion-money facturacion-total">{formatMoney(proforma.total)}</td>
                    <td>
                      <div className="facturacion-proforma-actions">
                        <button onClick={() => handleEdit(proforma.id)} className="facturacion-action-btn" type="button">
                          <Pencil size={17} />
                          Editar
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setOpenEmitMenuId(openEmitMenuId === proforma.id ? null : proforma.id)}
                            className={`facturacion-emit-btn ${openEmitMenuId === proforma.id ? 'is-open' : ''}`}
                            type="button"
                          >
                            <Check size={17} />
                            Emitir
                            <ChevronDown size={16} />
                          </button>

                          {openEmitMenuId === proforma.id && (
                            <div className="facturacion-emit-menu facturacion-emit-menu-right">
                              <button type="button" onClick={() => handleEmit(proforma.id)}>
                                <Check size={17} />
                                Emitir con fecha de hoy
                              </button>
                              <button type="button" onClick={() => handleEmit(proforma.id, creationDate)}>
                                <Check size={17} />
                                Emitir con fecha: {formatShortDate(proforma.fechaCreacion)}
                              </button>
                            </div>
                          )}
                        </div>

                        <button onClick={() => handleClone(proforma.id)} className="facturacion-action-btn" type="button">
                          <Copy size={17} />
                          Clonar
                        </button>
                        <button onClick={() => handleDelete(proforma.id)} className="facturacion-delete-btn" type="button">
                          <Trash2 size={17} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="facturacion-proforma-bottom">
        <Pagination />
      </div>
    </div>
  );
}
