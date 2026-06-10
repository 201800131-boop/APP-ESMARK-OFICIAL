import React, { useEffect, useState } from 'react';
import { useApp, DatosFiscales } from './context/AppContext';

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function HelpIcon() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FiscalField({ id, label, value, onChange, className = '' }: FieldProps) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
        {label}
        <HelpIcon />
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-[#1976D2] focus:outline-none focus:ring-2 focus:ring-[#1976D2]/20"
      />
    </div>
  );
}

export function ConfiguracionTab() {
  const { state, updateDatosFiscales } = useApp();
  const [formData, setFormData] = useState<DatosFiscales>(state.datosFiscales);

  useEffect(() => {
    setFormData(state.datosFiscales);
  }, [state.datosFiscales]);

  const updateField = (field: keyof DatosFiscales, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    updateDatosFiscales(formData);
    alert('Datos fiscales actualizados exitosamente');
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">Datos Fiscales</h2>
      </div>

      <form onSubmit={handleSubmit} className="facturacion-fiscal-form rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
          <FiscalField
            id="cai"
            label="CAI"
            value={formData.cai}
            onChange={(value) => updateField('cai', value)}
            className="md:col-span-2"
          />

          <FiscalField
            id="prefijo"
            label="Prefijo del número de facturación"
            value={formData.prefijo}
            onChange={(value) => updateField('prefijo', value)}
          />

          <FiscalField
            id="siguiente-factura"
            label="Siguiente factura a emitir"
            value={formData.siguienteFactura}
            onChange={(value) => updateField('siguienteFactura', value)}
          />

          <FiscalField
            id="primer-numero"
            label="Primer número del rango autorizado"
            value={formData.primerNumero}
            onChange={(value) => updateField('primerNumero', value)}
          />

          <FiscalField
            id="ultimo-numero"
            label="Último número del rango autorizado"
            value={formData.ultimoNumero}
            onChange={(value) => updateField('ultimoNumero', value)}
          />

          <FiscalField
            id="fecha-expiracion"
            label="Fecha de expiración"
            value={formData.fechaExpiracion}
            onChange={(value) => updateField('fechaExpiracion', value)}
          />

          <FiscalField
            id="lugar-emision"
            label="Lugar de emisión"
            value={formData.lugarEmision}
            onChange={(value) => updateField('lugarEmision', value)}
          />
        </div>

        <div className="mt-7 flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            className="min-w-44 rounded-xl bg-[#1976D2] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1976D2]/30"
          >
            Actualizar
          </button>
        </div>
      </form>
    </div>
  );
}
