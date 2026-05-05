import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
export interface Producto {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  descuento: number;
  impuesto: number;
}

export interface Cliente {
  tipo: 'consumidor-final' | 'empresa';
  nombre: string;
  rtn: string;
  email: string;
  telefono: string;
  direccion: string;
}

export interface Factura {
  id: string;
  tipo: 'proforma' | 'emitida';
  numeroFactura?: string;
  cliente: Cliente;
  productos: Producto[];
  nota: string;
  fechaCreacion: string;
  fechaEmision?: string;
  estado?: 'Emitida' | 'Pendiente';
  subtotal: number;
  descuento: number;
  impuestos: number;
  envio: number;
  total: number;
}

export interface Recibo {
  id: string;
  numeroRecibo: string;
  cliente: Cliente;
  productos: Producto[];
  nota: string;
  fechaCreacion: string;
  fechaEmision: string;
  metodoPago: string;
  subtotal: number;
  descuento: number;
  total: number;
}

export interface EmpresaInfo {
  nombreComercial: string;
  razonSocial: string;
  rtn: string;
  direccion: string;
  telefono: string;
  email: string;
  logo?: string;
  firma?: string;
}

export interface DatosFiscales {
  cai: string;
  prefijo: string;
  primerNumero: string;
  ultimoNumero: string;
  siguienteFactura: string;
  fechaExpiracion: string;
  lugarEmision: string;
}

export interface AuditoriaEvento {
  id: string;
  fechaHora: string;
  usuario: string;
  accion: 'Creación' | 'Edición' | 'Eliminación' | 'Conversión';
  historialDe: 'Facturas' | 'Proformas' | 'Rangos' | 'Configuración' | 'Empresa';
  resumenCambios: string;
  numeroFactura?: string;
  ip: string;
}

export interface DisenoConfig {
  colorEtiquetas: string;
  colorEncabezadoTabla: string;
  colorTotales: string;
  tamanoLogo: number;
  fuenteTitulo: number;
  fuenteTexto: number;
  espaciado: number;
}

interface AppState {
  empresaInfo: EmpresaInfo;
  datosFiscales: DatosFiscales;
  facturas: Factura[];
  recibos: Recibo[];
  clientesGuardados: Cliente[];
  disenoConfig: DisenoConfig;
  nextInvoiceNumber: number;
  nextReciboNumber: number;
  auditoria: AuditoriaEvento[];
}

interface AppContextType {
  state: AppState;
  navigateToTab?: (tab: string) => void;
  updateEmpresaInfo: (info: EmpresaInfo) => void;
  updateDatosFiscales: (datos: DatosFiscales) => void;
  updateDisenoConfig: (diseno: DisenoConfig) => void;
  addFactura: (factura: Omit<Factura, 'id' | 'fechaCreacion'>) => void;
  updateFactura: (id: string, factura: Partial<Factura>) => void;
  deleteFactura: (id: string) => void;
  convertProformaToFactura: (id: string) => void;
  addRecibo: (recibo: Omit<Recibo, 'id' | 'numeroRecibo' | 'fechaCreacion'>) => void;
  deleteRecibo: (id: string) => void;
  addCliente: (cliente: Cliente) => void;
  deleteCliente: (nombre: string) => void;
  addAuditoriaEvento: (evento: Omit<AuditoriaEvento, 'id' | 'fechaHora' | 'usuario' | 'ip'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    empresaInfo: {
      nombreComercial: 'Empresa Sociedad Anónima',
      razonSocial: 'Empresa S.A.',
      rtn: '0000-0000-000000',
      direccion: 'Boulevard Principal 123, Ciudad',
      telefono: '+504 9999-0000',
      email: 'facturas@empresa.com',
    },
    datosFiscales: {
      cai: '000000-000000-000000-000000-000000-00',
      prefijo: '000-001-01',
      primerNumero: '00000001',
      ultimoNumero: '00000200',
      siguienteFactura: '00000002',
      fechaExpiracion: '15/07/2026',
      lugarEmision: 'Oficina',
    },
    facturas: [
      {
        id: '1',
        tipo: 'proforma',
        cliente: {
          tipo: 'empresa',
          nombre: 'Cliente (Honduras1)',
          rtn: '0000-0000-000001',
          email: 'cliente@email.com',
          telefono: '+504 9999-0001',
          direccion: 'Dirección del cliente',
        },
        productos: [
          {
            id: '1',
            nombre: 'Producto Demo',
            cantidad: 1,
            precio: 80,
            descuento: 0,
            impuesto: 15,
          },
        ],
        nota: '',
        fechaCreacion: '2026-01-16T11:31:00',
        subtotal: 80,
        descuento: 0,
        impuestos: 12,
        envio: 0,
        total: 92,
      },
      {
        id: '2',
        tipo: 'emitida',
        numeroFactura: '000-001-01-00000001',
        estado: 'Emitida',
        cliente: {
          tipo: 'empresa',
          nombre: 'Cliente',
          rtn: '0000-0000-000002',
          email: 'cliente2@email.com',
          telefono: '+504 9999-0002',
          direccion: 'Dirección del cliente 2',
        },
        productos: [
          {
            id: '1',
            nombre: 'Servicio Consultoría',
            cantidad: 1,
            precio: 100,
            descuento: 0,
            impuesto: 15,
          },
        ],
        nota: '',
        fechaCreacion: '2026-01-16T10:00:00',
        fechaEmision: '2026-01-16',
        subtotal: 100,
        descuento: 0,
        impuestos: 15,
        envio: 0,
        total: 115,
      },
    ],
    nextInvoiceNumber: 2,
    nextReciboNumber: 1,
    recibos: [],
    clientesGuardados: [],
    disenoConfig: {
      colorEtiquetas: '#DC3545',
      colorEncabezadoTabla: '#1F2D3D',
      colorTotales: '#1F2D3D',
      tamanoLogo: 30,
      fuenteTitulo: 10,
      fuenteTexto: 8,
      espaciado: 5,
    },
    auditoria: [
      {
        id: '1',
        fechaHora: '2026-01-16T11:31:00',
        usuario: 'Olga Sarmiento',
        accion: 'Creación',
        historialDe: 'Proformas',
        resumenCambios: 'Creada proforma para Cliente (Honduras1) por L92.00',
        ip: '192.168.1.100',
      },
      {
        id: '2',
        fechaHora: '2026-01-16T10:00:00',
        usuario: 'Olga Sarmiento',
        accion: 'Creación',
        historialDe: 'Facturas',
        resumenCambios: 'Factura 000-001-01-00000001 emitida para Cliente por L115.00',
        numeroFactura: '000-001-01-00000001',
        ip: '192.168.1.100',
      },
    ],
  });

  const addAuditoriaEvento = (evento: Omit<AuditoriaEvento, 'id' | 'fechaHora' | 'usuario' | 'ip'>) => {
    const newEvento: AuditoriaEvento = {
      ...evento,
      id: Date.now().toString(),
      fechaHora: new Date().toISOString(),
      usuario: 'Olga Sarmiento',
      ip: '192.168.1.100',
    };
    setState((prev) => ({
      ...prev,
      auditoria: [newEvento, ...prev.auditoria],
    }));
  };

  const updateEmpresaInfo = (info: EmpresaInfo) => {
    setState((prev) => ({ ...prev, empresaInfo: info }));
    addAuditoriaEvento({
      accion: 'Edición',
      historialDe: 'Empresa',
      resumenCambios: 'Información de empresa actualizada',
    });
  };

  const updateDatosFiscales = (datos: DatosFiscales) => {
    setState((prev) => ({ ...prev, datosFiscales: datos }));
    addAuditoriaEvento({
      accion: 'Edición',
      historialDe: 'Configuración',
      resumenCambios: 'Datos fiscales actualizados',
    });
  };

  const updateDisenoConfig = (diseno: DisenoConfig) => {
    setState((prev) => ({ ...prev, disenoConfig: diseno }));
  };

  const addFactura = (factura: Omit<Factura, 'id' | 'fechaCreacion'>) => {
    const newFactura: Factura = {
      ...factura,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      facturas: [...prev.facturas, newFactura],
    }));

    addAuditoriaEvento({
      accion: 'Creación',
      historialDe: factura.tipo === 'proforma' ? 'Proformas' : 'Facturas',
      resumenCambios: factura.tipo === 'proforma'
        ? `Creada proforma para ${factura.cliente.nombre} por L${factura.total.toFixed(2)}`
        : `Factura ${factura.numeroFactura} emitida para ${factura.cliente.nombre} por L${factura.total.toFixed(2)}`,
      numeroFactura: factura.numeroFactura,
    });
  };

  const updateFactura = (id: string, updates: Partial<Factura>) => {
    setState((prev) => ({
      ...prev,
      facturas: prev.facturas.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }));
  };

  const deleteFactura = (id: string) => {
    setState((prev) => {
      const factura = prev.facturas.find((f) => f.id === id);
      if (factura) {
        addAuditoriaEvento({
          accion: 'Eliminación',
          historialDe: factura.tipo === 'proforma' ? 'Proformas' : 'Facturas',
          resumenCambios: factura.tipo === 'proforma'
            ? `Eliminada proforma de ${factura.cliente.nombre}`
            : `Anulada factura ${factura.numeroFactura}`,
          numeroFactura: factura.numeroFactura,
        });
      }
      return {
        ...prev,
        facturas: prev.facturas.filter((f) => f.id !== id),
      };
    });
  };

  const convertProformaToFactura = (id: string) => {
    setState((prev) => {
      const factura = prev.facturas.find((f) => f.id === id);
      if (!factura || factura.tipo !== 'proforma') return prev;

      const nextNum = prev.nextInvoiceNumber;
      const numeroFactura = `${prev.datosFiscales.prefijo}-${String(nextNum).padStart(8, '0')}`;

      addAuditoriaEvento({
        accion: 'Conversión',
        historialDe: 'Facturas',
        resumenCambios: `Proforma convertida a factura ${numeroFactura} para ${factura.cliente.nombre}`,
        numeroFactura,
      });

      return {
        ...prev,
        nextInvoiceNumber: nextNum + 1,
        datosFiscales: {
          ...prev.datosFiscales,
          siguienteFactura: String(nextNum + 1).padStart(8, '0'),
        },
        facturas: prev.facturas.map((f) =>
          f.id === id
            ? {
                ...f,
                tipo: 'emitida' as const,
                numeroFactura,
                estado: 'Emitida' as const,
                fechaEmision: new Date().toISOString().split('T')[0],
              }
            : f
        ),
      };
    });
  };

  const addRecibo = (reciboData: Omit<Recibo, 'id' | 'numeroRecibo' | 'fechaCreacion'>) => {
    setState((prev) => {
      const numeroRecibo = `REC-${String(prev.nextReciboNumber).padStart(6, '0')}`;
      const newRecibo: Recibo = {
        ...reciboData,
        id: Date.now().toString(),
        numeroRecibo,
        fechaCreacion: new Date().toISOString(),
      };

      addAuditoriaEvento({
        accion: 'Creación',
        historialDe: 'Facturas',
        resumenCambios: `Recibo ${numeroRecibo} emitido para ${reciboData.cliente.nombre} por L${reciboData.total.toFixed(2)}`,
      });

      return {
        ...prev,
        recibos: [...prev.recibos, newRecibo],
        nextReciboNumber: prev.nextReciboNumber + 1,
      };
    });
  };

  const deleteRecibo = (id: string) => {
    setState((prev) => {
      const recibo = prev.recibos.find((r) => r.id === id);
      if (recibo) {
        addAuditoriaEvento({
          accion: 'Eliminación',
          historialDe: 'Facturas',
          resumenCambios: `Recibo ${recibo.numeroRecibo} eliminado`,
        });
      }
      return {
        ...prev,
        recibos: prev.recibos.filter((r) => r.id !== id),
      };
    });
  };

  const addCliente = (cliente: Cliente) => {
    setState((prev) => ({
      ...prev,
      clientesGuardados: [...prev.clientesGuardados, cliente],
    }));
  };

  const deleteCliente = (nombre: string) => {
    setState((prev) => ({
      ...prev,
      clientesGuardados: prev.clientesGuardados.filter((c) => c.nombre !== nombre),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        updateEmpresaInfo,
        updateDatosFiscales,
        updateDisenoConfig,
        addFactura,
        updateFactura,
        deleteFactura,
        convertProformaToFactura,
        addRecibo,
        deleteRecibo,
        addCliente,
        deleteCliente,
        addAuditoriaEvento,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
