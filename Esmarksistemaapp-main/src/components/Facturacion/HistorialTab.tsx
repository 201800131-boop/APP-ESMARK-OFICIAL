import React, { useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { useApp } from './context/AppContext';

interface RangoData {
  id: number;
  creador: string;
  estado: 'Activo';
  fechaCreacion: string;
  facturasEmitidas: number;
  rangoAutorizado: string;
  cai: string;
  fechaVencimiento: string;
  lugarEmision: string;
}

export function HistorialTab() {
  const { state } = useApp();
  const [expandedRows, setExpandedRows] = useState<number[]>([1]);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Calculate facturas emitidas from state
  const facturasEmitidas = state.facturas.filter(f => f.tipo === 'emitida').length;

  const rangos: RangoData[] = [
    {
      id: 1,
      creador: 'Olga Sarmiento',
      estado: 'Activo',
      fechaCreacion: '15 ene 2026',
      facturasEmitidas,
      rangoAutorizado: `${state.datosFiscales.prefijo}-${state.datosFiscales.primerNumero} - ${state.datosFiscales.prefijo}-${state.datosFiscales.ultimoNumero}`,
      cai: state.datosFiscales.cai,
      fechaVencimiento: state.datosFiscales.fechaExpiracion,
      lugarEmision: state.datosFiscales.lugarEmision,
    },
  ];

  const Pagination = () => (
    <div className="flex items-center gap-2">
      <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
      <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button className="px-3 py-2 bg-[#1976D2] text-white rounded">
        1
      </button>
      <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <button className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50">
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          Historial de rangos de facturación
        </h2>
        <p className="text-gray-600 text-sm leading-relaxed">
          Esta tabla muestra el historial de rangos utilizados anteriormente. Cada fila representa un rango nuevo, incluyendo la fecha y hora del cambio, el usuario que lo realizó, y los detalles del cambio.
        </p>
      </div>

      {/* Top Pagination */}
      <div className="flex justify-end mb-4">
        <Pagination />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1976D2]">
              <th className="text-left py-3 px-4 text-sm font-medium text-white">
                Creador
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white">
                Estado
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white">
                Fecha de creación
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white">
                Facturas emitidas
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-white">
                Detalles
              </th>
            </tr>
          </thead>
          <tbody>
            {rangos.map((rango) => (
              <React.Fragment key={rango.id}>
                <tr className="bg-gray-50">
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {rango.creador}
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      {rango.estado}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {rango.fechaCreacion}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {rango.facturasEmitidas} facturas
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => toggleRow(rango.id)}
                      className="flex items-center gap-1 text-[#1976D2] hover:text-[#1565C0] transition-colors text-sm"
                    >
                      {expandedRows.includes(rango.id) ? (
                        <>
                          Ocultar detalles
                          <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Ver detalles
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRows.includes(rango.id) && (
                  <tr className="bg-white">
                    <td colSpan={5} className="px-4 py-6">
                      <div className="max-w-4xl">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-blue-100 border-b border-blue-200">
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">
                                Campo
                              </th>
                              <th className="text-left py-2 px-4 text-sm font-medium text-gray-900">
                                Valor
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                Rango autorizado del:
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {rango.rangoAutorizado}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                CAI:
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {rango.cai}
                              </td>
                            </tr>
                            <tr className="border-b border-gray-200">
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                Fecha de vencimiento:
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {rango.fechaVencimiento}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                Lugar de emisión:
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-700">
                                {rango.lugarEmision}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div className="flex justify-end mt-4">
        <Pagination />
      </div>
    </div>
  );
}
