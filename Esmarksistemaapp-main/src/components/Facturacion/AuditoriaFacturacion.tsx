import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useApp } from './context/AppContext';

export function AuditoriaFacturacion() {
  const { state } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    rangoFechas: '',
    historialDe: 'Todos',
    accion: 'Todos',
    numeroFactura: '',
    orden: 'Fecha/Hora más reciente',
    tamanoPagina: '20',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      rangoFechas: '',
      historialDe: 'Todos',
      accion: 'Todos',
      numeroFactura: '',
      orden: 'Fecha/Hora más reciente',
      tamanoPagina: '20',
    });
    setCurrentPage(1);
  };

  const filteredEventos = useMemo(() => {
    let eventos = [...state.auditoria];

    // Filter by historialDe
    if (filters.historialDe !== 'Todos') {
      eventos = eventos.filter(e => e.historialDe === filters.historialDe);
    }

    // Filter by accion
    if (filters.accion !== 'Todos') {
      eventos = eventos.filter(e => e.accion === filters.accion);
    }

    // Filter by numeroFactura
    if (filters.numeroFactura.trim()) {
      eventos = eventos.filter(e =>
        e.numeroFactura?.includes(filters.numeroFactura.trim())
      );
    }

    // Sort
    if (filters.orden === 'Fecha/Hora más reciente') {
      eventos.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
    } else if (filters.orden === 'Fecha/Hora más antigua') {
      eventos.sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());
    } else if (filters.orden === 'Usuario A-Z') {
      eventos.sort((a, b) => a.usuario.localeCompare(b.usuario));
    } else if (filters.orden === 'Usuario Z-A') {
      eventos.sort((a, b) => b.usuario.localeCompare(a.usuario));
    }

    return eventos;
  }, [state.auditoria, filters]);

  const pageSize = parseInt(filters.tamanoPagina);
  const totalPages = Math.ceil(filteredEventos.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentEventos = filteredEventos.slice(startIndex, endIndex);

  const formatFechaHora = (fechaHora: string) => {
    const date = new Date(fechaHora);
    return date.toLocaleDateString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 facturacion-list-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Auditoría - Historial de actividad</h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Rango de fechas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rango de fechas
          </label>
          <input
            type="text"
            placeholder="dd/mm/yyyy - dd/mm/yyyy"
            value={filters.rangoFechas}
            onChange={(e) => handleFilterChange('rangoFechas', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Historial de */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Historial de
          </label>
          <div className="relative">
            <select
              value={filters.historialDe}
              onChange={(e) => handleFilterChange('historialDe', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent bg-white"
            >
              <option>Todos</option>
              <option>Facturas</option>
              <option>Proformas</option>
              <option>Rangos</option>
              <option>Configuración</option>
              <option>Empresa</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Acción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Acción
          </label>
          <div className="relative">
            <select
              value={filters.accion}
              onChange={(e) => handleFilterChange('accion', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent bg-white"
            >
              <option>Todos</option>
              <option>Creación</option>
              <option>Edición</option>
              <option>Eliminación</option>
              <option>Conversión</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Número de factura */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de factura
          </label>
          <input
            type="text"
            placeholder="000-001-01-00000001"
            value={filters.numeroFactura}
            onChange={(e) => handleFilterChange('numeroFactura', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>
      </div>

      {/* Second row of filters */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {/* Orden */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Orden
          </label>
          <div className="relative">
            <select
              value={filters.orden}
              onChange={(e) => handleFilterChange('orden', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent bg-white"
            >
              <option>Fecha/Hora más reciente</option>
              <option>Fecha/Hora más antigua</option>
              <option>Usuario A-Z</option>
              <option>Usuario Z-A</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Tamaño de página */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tamaño de página
          </label>
          <div className="relative">
            <select
              value={filters.tamanoPagina}
              onChange={(e) => handleFilterChange('tamanoPagina', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent bg-white"
            >
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Empty space */}
        <div></div>

        {/* Limpiar filtros button */}
        <div className="flex items-end">
          <button
            onClick={handleClearFilters}
            className="text-[#1976D2] text-sm font-medium hover:underline mb-2"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6">
        {filteredEventos.length === 0 ? (
          <p className="text-sm text-gray-500">No hay resultados.</p>
        ) : (
          <p className="text-sm text-gray-600">
            Mostrando {startIndex + 1} a {Math.min(endIndex, filteredEventos.length)} de {filteredEventos.length} eventos
          </p>
        )}
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Fecha/Hora
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Acción
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Historial de
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                Resumen de cambios
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            {currentEventos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No hay eventos para mostrar
                </td>
              </tr>
            ) : (
              currentEventos.map((evento) => (
                <tr key={evento.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {formatFechaHora(evento.fechaHora)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {evento.usuario}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      evento.accion === 'Creación' ? 'bg-green-100 text-green-800' :
                      evento.accion === 'Edición' ? 'bg-blue-100 text-blue-800' :
                      evento.accion === 'Eliminación' ? 'bg-red-100 text-red-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {evento.accion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {evento.historialDe}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {evento.resumenCambios}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                    {evento.ip}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Total: {filteredEventos.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 border border-gray-300 rounded text-sm ${
              currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            «
          </button>
          <button className="px-3 py-1 bg-[#1976D2] text-white rounded text-sm">
            {currentPage}
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages || filteredEventos.length === 0}
            className={`px-3 py-1 border border-gray-300 rounded text-sm ${
              currentPage >= totalPages || filteredEventos.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            »
          </button>
        </div>
      </div>
    </div>
  );
}
