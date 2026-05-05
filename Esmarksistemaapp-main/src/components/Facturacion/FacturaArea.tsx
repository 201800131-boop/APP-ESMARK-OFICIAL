import React, { useState, createContext, useContext } from 'react';
import { AppProvider } from './context/AppContext';
import { DatosFiscales } from './DatosFiscales';
import { AuditoriaFacturacion } from './AuditoriaFacturacion';
import { PerfilEmpresa } from './PerfilEmpresa';
import { CrearFactura } from './CrearFactura';
import { FacturasProforma } from './FacturasProforma';
import { FacturasEmitidas } from './FacturasEmitidas';
import { RecibosEmitidos } from './RecibosEmitidos';
import { Diseno } from './Diseno';

interface NavigationContextType {
  navigateToTab: (tab: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

function FacturacionContent() {
  const [activeMainTab, setActiveMainTab] = useState('crear-factura');

  const mainTabs = [
    { id: 'crear-factura', label: 'Generar' },
    { id: 'perfil-empresa', label: 'Perfil de empresa' },
    { id: 'datos-fiscales', label: 'Datos fiscales' },
    { id: 'facturas-proforma', label: 'Facturas proforma' },
    { id: 'facturas-emitidas', label: 'Facturas emitidas' },
    { id: 'recibos-emitidos', label: 'Recibos emitidos' },
    { id: 'auditoria', label: 'Auditoria' },
    { id: 'diseno', label: 'Diseno' },
  ];

  const activeIndex = mainTabs.findIndex((tab) => tab.id === activeMainTab);

  return (
    <NavigationContext.Provider value={{ navigateToTab: setActiveMainTab }}>
      <div className="min-h-screen bg-[#F5F6FA]">
        <div className="bg-[#1F2937] py-6 px-6">
          <div className="max-w-7xl mx-auto">
            <div
              className="relative flex bg-white/5 backdrop-blur-xl rounded-2xl overflow-x-auto w-full"
              style={{
                boxShadow:
                  'inset 1px 1px 4px rgba(255, 255, 255, 0.2), inset -1px -1px 6px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className="relative z-10 py-3 text-sm font-semibold tracking-wide whitespace-nowrap transition-colors duration-300 flex items-center justify-center min-w-[180px]"
                  style={{
                    color: activeMainTab === tab.id ? '#fff' : '#e5e5e5',
                  }}
                >
                  {tab.label}
                </button>
              ))}

              <div
                className="absolute top-0 bottom-0 rounded-2xl transition-all duration-500 ease-out z-0"
                style={{
                  width: '180px',
                  transform: `translateX(${activeIndex * 180}px)`,
                  background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.3), rgba(25, 118, 210, 0.8))',
                  boxShadow: '0 0 18px rgba(25, 118, 210, 0.5), 0 0 10px rgba(100, 181, 246, 0.4) inset',
                  transitionTimingFunction: 'cubic-bezier(0.37, 1.95, 0.66, 0.56)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="p-8">
          {activeMainTab === 'crear-factura' && <CrearFactura />}
          {activeMainTab === 'perfil-empresa' && <PerfilEmpresa />}
          {activeMainTab === 'datos-fiscales' && <DatosFiscales />}
          {activeMainTab === 'facturas-proforma' && <FacturasProforma />}
          {activeMainTab === 'facturas-emitidas' && <FacturasEmitidas />}
          {activeMainTab === 'recibos-emitidos' && <RecibosEmitidos />}
          {activeMainTab === 'auditoria' && <AuditoriaFacturacion />}
          {activeMainTab === 'diseno' && <Diseno />}
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

export default function FacturaArea() {
  return (
    <AppProvider>
      <FacturacionContent />
    </AppProvider>
  );
}