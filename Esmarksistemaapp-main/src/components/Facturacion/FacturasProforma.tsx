import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useNavigation } from './FacturaArea';

export function FacturasProforma() {
  const { state, deleteFactura, convertProformaToFactura } = useApp();
  const { navigateToTab } = useNavigation();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const proformas = state.facturas.filter(f => f.tipo === 'proforma');
  const totalProformas = proformas.length;
  const totalPages = Math.ceil(totalProformas / perPage);

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentProformas = proformas.slice(startIndex, endIndex);

  const handleEdit = (id: string) => {
    alert(`Editar proforma ID: ${id}\nEsta funcionalidad abrirá el formulario de creación con los datos prellenados.`);
  };

  const handleConvert = (id: string) => {
    if (confirm('¿Desea convertir esta proforma en factura emitida?')) {
      convertProformaToFactura(id);
      alert('Proforma convertida a factura exitosamente');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta proforma?')) {
      deleteFactura(id);
      alert('Proforma eliminada exitosamente');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Facturas proforma
        </h2>
        <div className="flex justify-end">
          <button
            onClick={() => navigateToTab('crear-factura')}
            className="px-4 py-2 bg-[#1976D2] text-white rounded-lg text-sm hover:bg-[#1565C0] transition-colors"
          >
            + Crear factura
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Mostrando {startIndex + 1} a {Math.min(endIndex, totalProformas)} de {totalProformas}<br />
          Total de proformas: {totalProformas}
        </p>
      </div>

      {/* Pagination Top */}
      <div className="flex justify-end mb-4">
        <Pagination />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1976D2] border-b-2 border-gray-300">
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Cliente</th>
              <th className="text-left py-3 px-4 font-medium text-white border-r border-blue-800">Fecha de creación</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Subtotal</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Descuento</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Impuestos</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Envío</th>
              <th className="text-right py-3 px-4 font-medium text-white border-r border-blue-800">Total</th>
              <th className="text-center py-3 px-4 font-medium text-white">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentProformas.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-500 border-b border-gray-200">
                  No hay proformas registradas
                </td>
              </tr>
            ) : (
              currentProformas.map((proforma) => (
                <tr key={proforma.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-900 border-r border-gray-200">{proforma.cliente.nombre}</td>
                  <td className="py-4 px-4 text-gray-700 border-r border-gray-200">{formatDate(proforma.fechaCreacion)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{proforma.subtotal.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{proforma.descuento.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{proforma.impuestos.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right text-gray-900 border-r border-gray-200">L{proforma.envio.toFixed(2)}</td>
                  <td className="py-4 px-4 text-right font-medium text-gray-900 border-r border-gray-200">L{proforma.total.toFixed(2)}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(proforma.id)}
                        className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleConvert(proforma.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        Convertir
                      </button>
                      <button
                        onClick={() => handleDelete(proforma.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bottom */}
      <div className="flex justify-end mt-4">
        <Pagination />
      </div>
    </div>
  );
}
