import React, { useState } from 'react';
import { useApp } from './context/AppContext';

export function ConfiguracionTab() {
  const { state, updateDatosFiscales } = useApp();
  const [formData, setFormData] = useState(state.datosFiscales);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDatosFiscales(formData);
    alert('Datos fiscales actualizados exitosamente');
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Datos Fiscales</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CAI */}
        <div>
          <label htmlFor="cai" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            CAI:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="cai"
            value={formData.cai}
            onChange={(e) => setFormData({ ...formData, cai: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Prefijo del número de facturación */}
        <div>
          <label htmlFor="prefijo" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Prefijo del número de facturación:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="prefijo"
            value={formData.prefijo}
            onChange={(e) => setFormData({ ...formData, prefijo: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Primer número del rango autorizado */}
        <div>
          <label htmlFor="primer-numero" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Primer número del rango autorizado:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="primer-numero"
            value={formData.primerNumero}
            onChange={(e) => setFormData({ ...formData, primerNumero: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Último número del rango autorizado */}
        <div>
          <label htmlFor="ultimo-numero" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Último número del rango autorizado:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="ultimo-numero"
            value={formData.ultimoNumero}
            onChange={(e) => setFormData({ ...formData, ultimoNumero: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Número de la siguiente factura a emitir */}
        <div>
          <label htmlFor="siguiente-factura" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Número de la siguiente factura a emitir: (Opcional)
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="siguiente-factura"
            value={formData.siguienteFactura}
            onChange={(e) => setFormData({ ...formData, siguienteFactura: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Fecha de expiración para la facturación */}
        <div>
          <label htmlFor="fecha-expiracion" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Fecha de expiración para la facturación:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="fecha-expiracion"
            value={formData.fechaExpiracion}
            onChange={(e) => setFormData({ ...formData, fechaExpiracion: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Lugar de emisión */}
        <div>
          <label htmlFor="lugar-emision" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            Lugar de emisión:
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </label>
          <input
            type="text"
            id="lugar-emision"
            value={formData.lugarEmision}
            onChange={(e) => setFormData({ ...formData, lugarEmision: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1976D2] focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full px-6 py-3 bg-[#1976D2] text-white rounded-lg font-medium hover:bg-[#1565C0] transition-colors"
          >
            Actualizar
          </button>
        </div>
      </form>
    </div>
  );
}
