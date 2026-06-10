import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { api, logActivity } from '../../../utils/api';
import { getCurrentUser } from '../../../utils/auth';

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
  colorFondoPagina?: string;
  encabezadoModo?: 'solido' | 'degradado';
  colorEncabezadoFinal?: string;
  colorTextoEncabezado?: string;
  radioBloques?: number;
  altoEncabezado?: number;
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
  convertProformaToFactura: (id: string, fechaEmision?: string) => void;
  addRecibo: (recibo: Omit<Recibo, 'id' | 'numeroRecibo' | 'fechaCreacion'>) => void;
  deleteRecibo: (id: string) => void;
  addCliente: (cliente: Cliente) => void;
  deleteCliente: (nombre: string) => void;
  addAuditoriaEvento: (evento: Omit<AuditoriaEvento, 'id' | 'fechaHora' | 'usuario' | 'ip'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const STORAGE_KEY = 'esmark_facturacion_state_v2';
const SUPABASE_SETTING_KEY = 'facturacion_state';
const SUPABASE_SETTING_DESCRIPTION = 'Estado completo del modulo de facturacion: empresa, logo, firma, datos fiscales, diseno, facturas y recibos';

function mergeFacturacionState(fallback: AppState, source: Partial<AppState>): AppState {
  return {
    ...fallback,
    ...source,
    empresaInfo: { ...fallback.empresaInfo, ...source.empresaInfo },
    datosFiscales: { ...fallback.datosFiscales, ...source.datosFiscales },
    disenoConfig: { ...fallback.disenoConfig, ...source.disenoConfig },
    facturas: Array.isArray(source.facturas) ? source.facturas : fallback.facturas,
    recibos: Array.isArray(source.recibos) ? source.recibos : fallback.recibos,
    clientesGuardados: Array.isArray(source.clientesGuardados) ? source.clientesGuardados : fallback.clientesGuardados,
    auditoria: Array.isArray(source.auditoria) ? source.auditoria : fallback.auditoria,
    nextInvoiceNumber: Number(source.nextInvoiceNumber || fallback.nextInvoiceNumber),
    nextReciboNumber: Number(source.nextReciboNumber || fallback.nextReciboNumber),
  };
}

function loadStoredState(fallback: AppState): AppState {
  if (typeof window === 'undefined') return fallback;

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) return fallback;

    const parsed = JSON.parse(rawState) as Partial<AppState>;
    return mergeFacturacionState(fallback, parsed);
  } catch (error) {
    console.warn('No se pudo cargar el estado de facturacion.', error);
    return fallback;
  }
}

function persistState(state: AppState) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('No se pudo guardar el estado de facturacion.', error);
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const hydratedFromSupabase = useRef(false);
  const [state, setState] = useState<AppState>(() => loadStoredState({
    empresaInfo: {
      nombreComercial: 'ESMARK',
      razonSocial: 'ESMARK',
      rtn: '',
      direccion: '',
      telefono: '',
      email: '',
    },
    datosFiscales: {
      cai: '000000-000000-000000-000000-000000-00',
      prefijo: '000-001-01',
      primerNumero: '00000001',
      ultimoNumero: '00000200',
      siguienteFactura: '00000001',
      fechaExpiracion: '',
      lugarEmision: '',
    },
    facturas: [],
    nextInvoiceNumber: 1,
    nextReciboNumber: 1,
    recibos: [],
    clientesGuardados: [],
    disenoConfig: {
      colorEtiquetas: '#DC3545',
      colorEncabezadoTabla: '#1F2D3D',
      colorTotales: '#1F2D3D',
      colorFondoPagina: '#FFFFFF',
      encabezadoModo: 'solido',
      colorEncabezadoFinal: '#2563EB',
      colorTextoEncabezado: '#FFFFFF',
      radioBloques: 18,
      altoEncabezado: 190,
      tamanoLogo: 30,
      fuenteTitulo: 10,
      fuenteTexto: 8,
      espaciado: 5,
    },
    auditoria: [],
  }));

  useEffect(() => {
    let cancelled = false;

    const loadSupabaseState = async () => {
      try {
        const remoteState = await api.getAppSetting<Partial<AppState>>(SUPABASE_SETTING_KEY, {});
        if (cancelled) return;

        if (remoteState && Object.keys(remoteState).length > 0) {
          setState((current) => mergeFacturacionState(current, remoteState));
        } else {
          api.saveAppSetting(SUPABASE_SETTING_KEY, state, SUPABASE_SETTING_DESCRIPTION).catch((error) => {
            console.warn('No se pudo crear la configuracion inicial de facturacion en Supabase.', error);
          });
        }
      } catch (error) {
        console.warn('No se pudo cargar facturacion desde Supabase. Se usara la copia local.', error);
      } finally {
        hydratedFromSupabase.current = true;
      }
    };

    loadSupabaseState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    persistState(state);
  }, [state]);

  useEffect(() => {
    if (!hydratedFromSupabase.current) return;

    const timeoutId = window.setTimeout(() => {
      api.saveAppSetting(SUPABASE_SETTING_KEY, state, SUPABASE_SETTING_DESCRIPTION).catch((error) => {
        console.warn('No se pudo guardar facturacion en Supabase. Se conserva copia local.', error);
      });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [state]);

  const addAuditoriaEvento = (evento: Omit<AuditoriaEvento, 'id' | 'fechaHora' | 'usuario' | 'ip'>) => {
    const currentUser = getCurrentUser();
    const newEvento: AuditoriaEvento = {
      ...evento,
      id: Date.now().toString(),
      fechaHora: new Date().toISOString(),
      usuario: currentUser?.name || currentUser?.username || 'Sistema',
      ip: 'online',
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
    const expectedInvoiceNumber = factura.tipo === 'emitida'
      ? (factura.numeroFactura || `${state.datosFiscales.prefijo}-${state.datosFiscales.siguienteFactura}`)
      : factura.numeroFactura;

    const newFactura: Factura = {
      ...factura,
      id: Date.now().toString(),
      fechaCreacion: new Date().toISOString(),
    };
    setState((prev) => {
      if (factura.tipo === 'emitida') {
        const currentNext = Number(prev.datosFiscales.siguienteFactura || prev.nextInvoiceNumber || 1);
        const nextForState = Number.isFinite(currentNext) && currentNext > 0 ? currentNext : 1;

        const invoiceNumber = newFactura.numeroFactura || `${prev.datosFiscales.prefijo}-${String(nextForState).padStart(8, '0')}`;

        return {
          ...prev,
          facturas: [...prev.facturas, { ...newFactura, numeroFactura: invoiceNumber }],
          nextInvoiceNumber: nextForState + 1,
          datosFiscales: {
            ...prev.datosFiscales,
            siguienteFactura: String(nextForState + 1).padStart(8, '0'),
          },
        };
      }

      return {
        ...prev,
        facturas: [...prev.facturas, newFactura],
      };
    });

    addAuditoriaEvento({
      accion: 'Creación',
      historialDe: factura.tipo === 'proforma' ? 'Proformas' : 'Facturas',
      resumenCambios: factura.tipo === 'proforma'
        ? `Creada proforma para ${factura.cliente.nombre} por L${factura.total.toFixed(2)}`
        : `Factura ${expectedInvoiceNumber || 'N/A'} emitida para ${factura.cliente.nombre} por L${factura.total.toFixed(2)}`,
      numeroFactura: expectedInvoiceNumber,
    });

    void logActivity(
      factura.tipo === 'proforma' ? 'proforma_creada' : 'factura_emitida',
      factura.tipo === 'proforma'
        ? `Proforma creada para ${factura.cliente.nombre}`
        : `Factura ${expectedInvoiceNumber || 'N/A'} emitida para ${factura.cliente.nombre}`,
      {
        Documento: factura.tipo === 'proforma' ? 'Proforma' : 'Factura',
        Numero: expectedInvoiceNumber || 'N/A',
        Cliente: factura.cliente.nombre,
        Total: `L ${factura.total.toFixed(2)}`,
      }
    );
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

        void logActivity(
          factura.tipo === 'proforma' ? 'proforma_eliminada' : 'factura_eliminada',
          factura.tipo === 'proforma'
            ? `Proforma eliminada para ${factura.cliente.nombre}`
            : `Factura ${factura.numeroFactura || 'N/A'} anulada/eliminada`,
          {
            Documento: factura.tipo === 'proforma' ? 'Proforma' : 'Factura',
            Numero: factura.numeroFactura || 'N/A',
            Cliente: factura.cliente.nombre,
            Total: `L ${Number(factura.total || 0).toFixed(2)}`,
          }
        );
      }
      return {
        ...prev,
        facturas: prev.facturas.filter((f) => f.id !== id),
      };
    });
  };

  const convertProformaToFactura = (id: string, fechaEmision?: string) => {
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

      void logActivity('proforma_convertida', `Proforma convertida a factura ${numeroFactura}`, {
        Documento: 'Factura',
        Numero: numeroFactura,
        Cliente: factura.cliente.nombre,
        Total: `L ${Number(factura.total || 0).toFixed(2)}`,
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
                fechaEmision: fechaEmision || new Date().toISOString().split('T')[0],
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

      void logActivity('recibo_creado', `Recibo ${numeroRecibo} emitido para ${reciboData.cliente.nombre}`, {
        Documento: 'Recibo',
        Numero: numeroRecibo,
        Cliente: reciboData.cliente.nombre,
        Total: `L ${reciboData.total.toFixed(2)}`,
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

        void logActivity('recibo_eliminado', `Recibo ${recibo.numeroRecibo} eliminado`, {
          Documento: 'Recibo',
          Numero: recibo.numeroRecibo,
          Cliente: recibo.cliente.nombre,
          Total: `L ${Number(recibo.total || 0).toFixed(2)}`,
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
