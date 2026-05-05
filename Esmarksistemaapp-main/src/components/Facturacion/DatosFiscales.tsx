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
    <div className="bg-white rounded-xl shadow-sm">
      {/* Secondary Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 px-8 pt-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                pb-4 text-sm font-medium transition-all relative
                ${
                  activeTab === tab.id
                    ? 'text-[#1976D2]'
                    : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1976D2]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-8">
        {activeTab === 'configuracion' && <ConfiguracionTab />}
        {activeTab === 'historial' && <HistorialTab />}
      </div>
    </div>
  );
}
