import React, { useState, createContext, useContext } from 'react';
import { AppProvider } from './context/AppContext';
import { DatosFiscales } from './DatosFiscales';
import { AuditoriaFacturacion } from './AuditoriaFacturacion';
import { PerfilEmpresa } from './PerfilEmpresa';
import { CrearFactura } from './CrearFactura';
import { FacturasProforma } from './FacturasProforma';
import { FacturasEmitidas } from './FacturasEmitidas';
import { RecibosEmitidos } from './RecibosEmitidos';
import './facturacion-contrast.css';

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
    { id: 'perfil-empresa', label: 'Perfil' },
    { id: 'datos-fiscales', label: 'Fiscales' },
    { id: 'facturas-proforma', label: 'Proformas' },
    { id: 'facturas-emitidas', label: 'Emitidas' },
    { id: 'recibos-emitidos', label: 'Recibos' },
    { id: 'auditoria', label: 'Auditoría' },
  ];

  return (
    <NavigationContext.Provider value={{ navigateToTab: setActiveMainTab }}>
      <div className="app-page facturacion-scope min-h-screen flex w-full min-w-0 flex-col overflow-hidden">
        <div className="facturacion-shell min-w-0">
          <div className="facturacion-topbar">
            <div className="facturacion-main-tabs">
              <div>
                {mainTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMainTab(tab.id)}
                    className={`facturacion-main-tab ${activeMainTab === tab.id ? 'is-active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="facturacion-content min-w-0 flex-1">
            {activeMainTab === 'crear-factura' && <CrearFactura />}
            {activeMainTab === 'perfil-empresa' && <PerfilEmpresa />}
            {activeMainTab === 'datos-fiscales' && <DatosFiscales />}
            {activeMainTab === 'facturas-proforma' && <FacturasProforma />}
            {activeMainTab === 'facturas-emitidas' && <FacturasEmitidas />}
            {activeMainTab === 'recibos-emitidos' && <RecibosEmitidos />}
            {activeMainTab === 'auditoria' && <AuditoriaFacturacion />}
          </div>
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
