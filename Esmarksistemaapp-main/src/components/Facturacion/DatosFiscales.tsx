import React, { useState } from 'react';
import { ConfiguracionTab } from './ConfiguracionTab';
import { HistorialTab } from './HistorialTab';

export function DatosFiscales() {
  const [activeTab, setActiveTab] = useState('configuracion');

  const tabs = [
    { id: 'configuracion', label: 'Configuración' },
    { id: 'historial', label: 'Historial de rangos' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm facturacion-fiscal-screen">
      {/* Secondary Tabs */}
      <div className="border-b border-gray-200">
        <div className="facturacion-subtabs-buttons flex gap-3 px-6 pt-4 pb-3 md:px-8 md:pt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                min-w-[160px] rounded-lg px-4 py-2 text-center text-sm font-semibold transition-all
                ${
                  activeTab === tab.id
                    ? 'bg-[#1976D2] text-white shadow-sm'
                    : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB]'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="facturacion-subtab-content p-8">
        {activeTab === 'configuracion' && <ConfiguracionTab />}
        {activeTab === 'historial' && <HistorialTab />}
      </div>
    </div>
  );
}
