import React, { useState, useEffect, useMemo } from 'react';
import { safeParse } from '../../utils/safe-parse';
import { api } from '../../utils/api';
import { createTrelloOrder, isTrelloConfigured } from '../../utils/trello-orders';
import { getAndReserveNextOrderNumber } from '../../utils/order-number-generator';
import { loadOrderFormBootstrap } from '../../utils/order-form-data';
import { useDay } from '../../contexts/DayContext'; // 📅 Hook del día operativo
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Progress } from '../ui/progress';
import { 
  ArrowLeft, Calendar as CalendarIcon, Plus, Trash2, Check, X,
  AlertTriangle, AlertCircle, Package, DollarSign, Calculator, Search,
  ShoppingCart, FileText, CreditCard, Receipt, Upload, Image as ImageIcon, Star, Lock, Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculatePVCPrice, calculatePVCWithStickerPrice, PVC_THICKNESS_PRICES, PVC_BASE_PRICES } from '../../utils/pvcPricing'; // ✨ NUEVO: Sistema de PVC + Sticker
import { calculateStickerPrice, calculateBannerPrice } from '../../utils/stickerBannerPricing'; // ✨ NUEVO: Sistema de Stickers y Banners
import { convertToInches, validatePVCDimensions, convertAndFormatToInches } from '../../utils/unit-conversion'; // ✨ NUEVO: Conversión de medidas
import ProductSearchDialog from './ProductSearchDialog';
import SpecialOrderDialog from './SpecialOrderDialog';
import TrelloCardConfigDialog from './TrelloCardConfigDialog';
import CustomerSelector from '../Customers/CustomerSelector';
import PaymentSection from './PaymentSection';
import type { Customer } from '../../types/customer';
import type { ProductPackage, PackageRow } from '../../types/product-package';
import { toast } from 'sonner';
import { isNotificationEnabled } from '../../utils/notification-settings';
import { getCurrentUser } from '../../utils/auth';
import { buildBillingProductsFromOrderItems, createBillingDocumentFromOrder } from '../../utils/billing-documents';

interface OrderFormViewProps {
  orderId?: string;
  fromQuote?: any;
  onBack: () => void;
  onNavigate: (view: any, data?: any) => void;
}

type OrigenProducto = 'catalogo' | 'paquete' | 'inventario' | 'externo';
type UnidadMedida = 'cm' | 'pulgadas' | 'metros' | 'pies';

const PACKAGES_STORAGE_KEY = 'esmark_product_packages';
const ORDER_DRAFTS_SETTING_KEY = 'order_drafts';

function getOrderDraftScope() {
  const user = getCurrentUser();
  return user?.username || user?.id || 'default';
}

function normalizeProductPackages(value: any): ProductPackage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((pkg) => pkg && typeof pkg === 'object')
    .map((pkg, index) => ({
      id: String(pkg.id || `pkg-${index}`),
      name: String(pkg.name || 'Paquete sin nombre'),
      productType: String(pkg.productType || 'Producto'),
      description: pkg.description || undefined,
      activo: pkg.activo !== false,
      shapes: Array.isArray(pkg.shapes) && pkg.shapes.length > 0 ? pkg.shapes : ['General'],
      sizeHeaders: Array.isArray(pkg.sizeHeaders) ? pkg.sizeHeaders.map(String) : [],
      rows: Array.isArray(pkg.rows) ? pkg.rows : [],
    }))
    .filter((pkg) => pkg.sizeHeaders.length > 0 && pkg.rows.length > 0);
}

function loadStoredProductPackages(): ProductPackage[] {
  try {
    return normalizeProductPackages(safeParse(localStorage.getItem(PACKAGES_STORAGE_KEY), []));
  } catch {
    return [];
  }
}

interface OrderItem {
  id?: string;
  origen: OrigenProducto;
  
  // Para origen inventario
  product_id?: string;
  sku?: string;
  product_name?: string;
  
  // Campos comunes
  descripcion: string;
  
  // Para catálogo/medidas
  tipo?: string; // Sticker, Banner, PVC, Tarjeta, Termo, Yeti, Carnet
  material?: string;
  ancho?: number;
  alto?: number;
  unidad?: UnidadMedida;
  precio_m2?: number;
  
  // Para externo
  proveedor?: string;
  costo_estimado?: number;
  
  // ✨ NUEVO: Para camisas y prendas
  tipo_impresion?: 'sublimada' | 'vinil';
  numero_lados?: 1 | 2;
  nivel_diseno_lado1?: 'basico' | 'intermedio' | 'avanzado';
  nivel_diseno_lado2?: 'basico' | 'intermedio' | 'avanzado';
  costo_diseno?: number; // Costo adicional por diseño
  talla?: string;
  color?: string;
  
  // Comunes
  unidades: number;
  precio_unitario: number;
  subtotal: number;
  descontar_stock: boolean;
  notas?: string;
  
  // Extra info para display
  stock_disponible?: number;
  categoria?: string;
}

export default function OrderFormView({ orderId, fromQuote, onBack, onNavigate }: OrderFormViewProps) {
  // 📅 Día operativo actual
  const { currentDay } = useDay();
  const hasDayOpen = currentDay?.status === 'open';
  
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // ✨ NUEVO: Estado de auto-guardado
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [productPackages, setProductPackages] = useState<ProductPackage[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [priceConfig, setPriceConfig] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);

  // 1. CLIENTE Y ENTREGA
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerRtn, setCustomerRtn] = useState('');
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [dueTime, setDueTime] = useState<string>('12:00');
  
  // ADJUNTOS (antes: attachedPhotos + attachedDocuments)
  const [attachedFiles, setAttachedFiles] = useState<Array<{
    name: string;
    data: string; // base64
    type: string; // MIME type
    size: number;
  }>>([]);

  // 2. PRODUCTOS DEL PEDIDO
  const [addMode, setAddMode] = useState<OrigenProducto>('catalogo');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  
  // Form temporal para agregar productos de catálogo
  const [tempCatalogo, setTempCatalogo] = useState({
    tipo: '',
    material: '',
    ancho: 0,
    alto: 0,
    unidad: 'cm' as UnidadMedida,
    unidades: 1,
    descripcion: '',
    descontar_stock: false,
    sku_vinculado: '',
    // Campos específicos para PVC
    pvc_grosor: '',
    pvc_con_base: false,
    pvc_mano_obra_mode: 'sin-base' as 'sin-base' | 'con-base' | 'manual',
    pvc_mano_obra_manual: 0,
    // Campos específicos para Banner
    banner_con_ojetes: false,
    banner_cantidad_ojetes: 0,
    banner_posiciones_ojetes: '',
    banner_ojetes_grid: [] as number[], // Array con los números de celda seleccionados (1-16)
    // ✨ NUEVO: Campos para Rotulación (descripción y precio manual)
    manual_descripcion: '',
    manual_precio: 0
  });

  const [tempPaquete, setTempPaquete] = useState({
    packageId: '',
    sizeHeader: '',
    rowId: '',
    packageCount: 1,
    notes: '',
  });
  
  // Estado para mostrar el cálculo del precio antes de agregar
  const [precioCalculado, setPrecioCalculado] = useState<{
    precioUnidad: number;
    precioTotal: number;
    precioM2: number;
    desglose?: {
      areaPulg2: number;
      // Para PVC
      precioPVC?: number;
      precioSticker?: number;
      precioManoObra?: number;
      manoObraMode?: 'sin-base' | 'con-base' | 'manual';
      conBase?: boolean;
      grosorMM?: number;
      rangoSticker?: string;
      // Para Sticker/Banner
      precioPorPulg2?: number;
      rangoBanner?: string;
      // Para ojetes de Banner
      conOjetes?: boolean;
      cantidadOjetes?: number;
      posicionesOjetes?: string;
      costoOjetes?: number;
    };
  } | null>(null);
  
  // Form temporal para productos externos
  const [tempExterno, setTempExterno] = useState({
    descripcion: '',
    proveedor: '',
    costo_estimado: 0,
    precio_cliente: 0,
    unidades: 1
  });

  // 3. DOCUMENTOS FISCALES (OBLIGATORIO)
  const [docType, setDocType] = useState<'FACTURA' | 'PROFORMA' | 'DESPUES' | 'RECIBO' | ''>('');
  const [fiscalDocumentType, setFiscalDocumentType] = useState<'FACTURA' | 'RECIBO' | ''>('');
  
  // ✨ NUEVO: Estado para el próximo correlativo de recibos (desde backend)
  const [nextReceiptCorrelative, setNextReceiptCorrelative] = useState<{
    ultimo_numero: number;
    prefijo: string;
    formato: string;
  } | null>(null);
  
  // ESTADO DEL PEDIDO
  const [orderStatus, setOrderStatus] = useState<string>('PENDIENTE DE INFORMACIÓN');

  // 4. PAGO Y CAJA DE CAMBIO
  const [paymentMethod, setPaymentMethod] = useState<string>('EFECTIVO');
  const [abono, setAbono] = useState<number>(0);
  const [recibido, setRecibido] = useState<number>(0);
  const incluirISV = true; // SIEMPRE incluye ISV - No es configurable
  const [descuentoTransferido, setDescuentoTransferido] = useState<number>(0); // NUEVO: Descuento del pedido especial
  const [paymentStatus, setPaymentStatus] = useState<'PENDIENTE' | 'PARCIAL' | 'PAGADO'>('PENDIENTE'); // ⭐ NUEVO: Estado del pago
  const [paymentReference, setPaymentReference] = useState<string>(''); // Para transferencias
  const [paymentBank, setPaymentBank] = useState<string>(''); // Para transferencias
  const [paymentAuthCode, setPaymentAuthCode] = useState<string>(''); // Para tarjetas
  const [paymentProof, setPaymentProof] = useState<string>(''); // 📎 NUEVO: Comprobante de pago (base64)
  const [paymentProofName, setPaymentProofName] = useState<string>('');
  const [docAttachment, setDocAttachment] = useState<string>(''); // 📄 NUEVO: Factura/recibo adjunto (base64)
  const [docAttachmentName, setDocAttachmentName] = useState<string>(''); // 📄 NUEVO: Nombre del documento fiscal adjunto
  const [linkedBillingDocument, setLinkedBillingDocument] = useState<any>(null);
  const [showBillingPreview, setShowBillingPreview] = useState(false);
  const [pendingBillingKind, setPendingBillingKind] = useState<'emitida' | 'proforma' | 'recibo' | null>(null);

  // 5. PEDIDO ESPECIAL (con autorización)
  const [showSpecialOrderDialog, setShowSpecialOrderDialog] = useState(false);

  // 6. CONFIGURACIÓN DE TRELLO
  const [showTrelloConfig, setShowTrelloConfig] = useState(false);
  const [trelloConfig, setTrelloConfig] = useState<{
    listId: string;
    listName: string;
    labelIds: string[];
    memberIds: string[];
  } | null>(null);

  // PROGRESO DEL FORMULARIO
  const [formProgress, setFormProgress] = useState(0);

  // Sincronizar datos cuando se selecciona un cliente
  useEffect(() => {
    if (selectedCustomer) {
      setCustomerName(selectedCustomer.name);
      setCustomerPhone(selectedCustomer.phone || '');
      setCustomerRtn(selectedCustomer.rtn || '');
    }
  }, [selectedCustomer]);

  useEffect(() => {
    loadData();
    void loadDraft();
    loadFromCalculator();
  }, []);

  // Calcular progreso del formulario
  useEffect(() => {
    let completed = 0;
    let total = 0;

    // DATOS DEL CLIENTE (4 campos = 25%)
    total += 4;
    if (customerName.trim()) completed++;
    if (customerPhone.trim()) completed++;
    if (dueDate) completed++;
    if (attachedFiles.length > 0 || trelloConfig) completed++; // Al menos archivo adjunto o Trello configurado

    // DATOS PEDIDO (3 campos = 18.75%)
    total += 3;
    if (docType) completed++;
    if (docType === 'FACTURA' || docType === 'PROFORMA' || docType === 'RECIBO' || docType === 'DESPUES') completed++;
    if (trelloConfig?.listId) completed++;

    // PRODUCTO (1 campo = 6.25%)
    total += 1;
    if (items.length > 0) completed++;

    // PROCESO DE PAGO (2 campos = 12.5%)
    total += 2;
    if (paymentMethod) completed++;
    if (abono > 0 || recibido > 0) completed++;

    const progress = Math.round((completed / total) * 100);
    setFormProgress(progress);
  }, [customerName, customerPhone, dueDate, attachedFiles, trelloConfig, docType, items, paymentMethod, abono, recibido]);

  // Resetear precio calculado cuando cambien los valores del formulario de catálogo
  useEffect(() => {
    setPrecioCalculado(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempCatalogo.tipo, tempCatalogo.ancho, tempCatalogo.alto, tempCatalogo.unidad, tempCatalogo.unidades, tempCatalogo.pvc_grosor, tempCatalogo.pvc_mano_obra_mode, tempCatalogo.pvc_mano_obra_manual, tempCatalogo.banner_con_ojetes, tempCatalogo.banner_cantidad_ojetes, tempCatalogo.banner_posiciones_ojetes]);

  const selectedPackage = useMemo(
    () => productPackages.find((pkg) => pkg.id === tempPaquete.packageId),
    [productPackages, tempPaquete.packageId]
  );

  const selectedPackageRow = useMemo<PackageRow | undefined>(
    () => selectedPackage?.rows.find((row) => row.id === tempPaquete.rowId),
    [selectedPackage, tempPaquete.rowId]
  );

  const selectedPackagePrice = selectedPackageRow && tempPaquete.sizeHeader
    ? Number(selectedPackageRow.prices?.[tempPaquete.sizeHeader]) || 0
    : 0;

  // ========== SISTEMA DE BORRADORES ==========
  
  const saveDraft = async () => {
    const draft = {
      customerName,
      customerPhone,
      customerRtn,
      saveCustomer,
      dueDate: dueDate?.toISOString(),
      dueTime,
      attachedFiles,
      items,
      addMode,
      tempCatalogo,
      tempPaquete,
      tempExterno,
      docType,
      fiscalDocumentType,
      paymentMethod,
      abono,
      recibido,
      incluirISV,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('esmark_order_draft', JSON.stringify(draft));
    try {
      const scope = getOrderDraftScope();
      const currentDrafts = await api.getAppSetting<Record<string, any>>(ORDER_DRAFTS_SETTING_KEY, {});
      await api.saveAppSetting(
        ORDER_DRAFTS_SETTING_KEY,
        { ...(currentDrafts || {}), [scope]: draft },
        'Borradores temporales de pedidos por usuario'
      );
    } catch (error) {
      console.warn('No se pudo sincronizar el borrador en Supabase:', error);
    }
    console.log('Borrador de pedido guardado automaticamente');
    // ✨ Actualizar estado visual de guardado
    setAutoSaveStatus('saved');
    
    // Volver a idle después de 2 segundos
    setTimeout(() => {
      setAutoSaveStatus('idle');
    }, 2000);
  };

  const loadDraft = async () => {
    let draft: any = null;
    try {
      const scope = getOrderDraftScope();
      const remoteDrafts = await api.getAppSetting<Record<string, any>>(ORDER_DRAFTS_SETTING_KEY, {});
      draft = remoteDrafts?.[scope] || null;
      if (draft) {
        localStorage.setItem('esmark_order_draft', JSON.stringify(draft));
      }
    } catch (error) {
      console.warn('No se pudo cargar borrador remoto:', error);
    }

    if (!draft) {
      const stored = localStorage.getItem('esmark_order_draft');
      draft = stored ? safeParse(stored, {}) : null;
    }

    if (draft) {
      try {
        setCustomerName(draft.customerName || '');
        setCustomerPhone(draft.customerPhone || '');
        setCustomerRtn(draft.customerRtn || '');
        setSaveCustomer(draft.saveCustomer || false);
        setDueDate(draft.dueDate ? new Date(draft.dueDate) : undefined);
        setDueTime(draft.dueTime || '12:00');
        
        // Migración de borradores antiguos: combinar attachedPhotos y attachedDocuments
        if (draft.attachedFiles) {
          setAttachedFiles(draft.attachedFiles);
        } else {
          const migratedFiles: Array<{
            name: string;
            data: string;
            type: string;
            size: number;
          }> = [];
          // Convertir fotos antiguas
          if (draft.attachedPhotos && Array.isArray(draft.attachedPhotos)) {
            draft.attachedPhotos.forEach((photo: string, index: number) => {
              migratedFiles.push({
                name: `foto-${index + 1}.jpg`,
                data: photo,
                type: 'image/jpeg',
                size: 0
              });
            });
          }
          // Convertir documentos antiguos
          if (draft.attachedDocuments && Array.isArray(draft.attachedDocuments)) {
            draft.attachedDocuments.forEach((doc: any) => {
              migratedFiles.push({
                name: doc.name,
                data: doc.data,
                type: doc.type,
                size: doc.size || 0
              });
            });
          }
          setAttachedFiles(migratedFiles);
        }
        
        setItems(draft.items || []);
        setAddMode(draft.addMode || 'catalogo');
        setTempCatalogo(draft.tempCatalogo || {
          tipo: '',
          material: '',
          ancho: 0,
          alto: 0,
          unidad: 'cm' as UnidadMedida,
          unidades: 1,
          descripcion: '',
          descontar_stock: false,
          sku_vinculado: '',
          pvc_grosor: '',
          pvc_con_base: false,
          pvc_mano_obra_mode: 'sin-base' as 'sin-base' | 'con-base' | 'manual',
          pvc_mano_obra_manual: 0,
          banner_con_ojetes: false,
          banner_cantidad_ojetes: 0,
          banner_posiciones_ojetes: '',
          banner_ojetes_grid: [] as number[],
          manual_descripcion: '',
          manual_precio: 0
        });
        setTempExterno(draft.tempExterno || {
          descripcion: '',
          proveedor: '',
          costo_estimado: 0,
          precio_cliente: 0,
          unidades: 1
        });
        setTempPaquete(draft.tempPaquete || {
          packageId: '',
          sizeHeader: '',
          rowId: '',
          packageCount: 1,
          notes: ''
        });
        const restoredDocType = draft.docType || '';
        setDocType(restoredDocType);
        setFiscalDocumentType(
          draft.fiscalDocumentType ||
          (restoredDocType === 'RECIBO' ? 'RECIBO' : restoredDocType ? 'FACTURA' : '')
        );
        setPaymentMethod(draft.paymentMethod || 'EFECTIVO');
        setAbono(draft.abono || 0);
        setRecibido(draft.recibido || 0);
        // incluirISV ahora siempre es true (constante), no necesita ser restaurado
        console.log('Borrador de pedido restaurado');
        toast.success('Borrador restaurado', {
          description: 'Se ha recuperado tu pedido en proceso',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error al cargar borrador:', error);
      }
    }
  };

  const clearDraft = async () => {
    localStorage.removeItem('esmark_order_draft');
    try {
      const scope = getOrderDraftScope();
      const currentDrafts = await api.getAppSetting<Record<string, any>>(ORDER_DRAFTS_SETTING_KEY, {});
      if (currentDrafts && Object.prototype.hasOwnProperty.call(currentDrafts, scope)) {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[scope];
        await api.saveAppSetting(ORDER_DRAFTS_SETTING_KEY, nextDrafts, 'Borradores temporales de pedidos por usuario');
      }
    } catch (error) {
      console.warn('No se pudo limpiar el borrador remoto:', error);
    }
    console.log('Borrador eliminado');
  };

  // ✨ NUEVO: Cargar datos desde la calculadora
  const loadFromCalculator = () => {
    const stored = localStorage.getItem('pending_order_from_calculator');
    if (stored) {
      try {
  const data = safeParse(stored, {});
        console.log('📊 Cargando datos desde calculadora:', data);
        
        // Pre-llenar el formulario temporal de catálogo
        setAddMode('catalogo');
        setTempCatalogo({
          tipo: data.tipo || '',
          material: data.material || '',
          ancho: data.ancho || 0,
          alto: data.alto || 0,
          unidad: data.unidad || 'pulgadas',
          unidades: data.unidades || 1,
          descripcion: data.descripcion || '',
          descontar_stock: false,
          sku_vinculado: '',
          pvc_grosor: data.pvcGrosor || '',
          pvc_con_base: data.pvcConBase || false,
          pvc_mano_obra_mode: data.pvcManoObraMode || 'sin-base',
          pvc_mano_obra_manual: data.pvcManoObraManual || 0,
          banner_con_ojetes: data.bannerConOjetes || false,
          banner_cantidad_ojetes: data.bannerCantidadOjetes || 0,
          banner_posiciones_ojetes: data.bannerPosicionesOjetes || '',
          banner_ojetes_grid: [],
          manual_descripcion: data.manualDescripcion || '',
          manual_precio: data.manualPrecio || 0
        });

        // Pre-cargar el precio calculado si existe
        if (data.precioCalculado) {
          setPrecioCalculado({
            precioUnidad: data.precioCalculado.precioUnidad,
            precioTotal: data.precioCalculado.precioTotal,
            precioM2: data.precioCalculado.precioM2,
            desglose: data.precioCalculado.desglose
          });
        }

        // Limpiar el storage después de cargar
        localStorage.removeItem('pending_order_from_calculator');
        
        toast.success('✅ Datos cargados desde calculadora', {
          description: 'Revisa los datos y completa el pedido',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error al cargar datos desde calculadora:', error);
      }
    }
  };

  // ✨ MEJORADO: Guardar borrador con debounce cada vez que cambie algo importante
  useEffect(() => {
    if (customerName || items.length > 0) {
      // Limpiar timeout anterior si existe
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      // Marcar como "guardando"
      setAutoSaveStatus('saving');
      
      // Crear nuevo timeout para guardar después de 1 segundo
      const timeout = setTimeout(() => {
        saveDraft();
      }, 1000);
      
      setAutoSaveTimeout(timeout);
    }
    
    // Cleanup: limpiar timeout al desmontar
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [customerName, customerPhone, customerRtn, dueDate, dueTime, items, paymentMethod, abono, recibido, attachedFiles]);

  useEffect(() => {
    const loadReceiptCorrelative = async () => {
      if (docType === 'RECIBO') {
        try {
          const response = await api.getCorrelativeStatus('recibo');
          if (response.success && response.status) {
            setNextReceiptCorrelative(response.status);
            console.log('✅ Próximo correlativo de recibo cargado desde backend:', response.status);
          } else {
            // Si no existe, inicializar con valores por defecto
            setNextReceiptCorrelative({
              ultimo_numero: 0,
              prefijo: 'RECIBO - ',
              formato: 'RECIBO - {numero}'
            });
          }
        } catch (error) {
          console.error('❌ Error cargando correlativo de recibo:', error);
          setNextReceiptCorrelative({
            ultimo_numero: 0,
            prefijo: 'RECIBO - ',
            formato: 'RECIBO - {numero}'
          });
        }
      } else {
        setNextReceiptCorrelative(null);
      }
    };

    loadReceiptCorrelative();
  }, [docType]);

  const loadData = async () => {
    setDataLoading(true);
    setError('');
    try {
      const data = await loadOrderFormBootstrap();

      setCustomers(data.customers);
      setProducts(data.products);
      setSettings(data.settings);
      setPriceConfig(data.priceConfig);
      setUsers(data.users);
      setCatalogProducts(data.catalogProducts);
      const loadedPackages = normalizeProductPackages((data.settings as any)?.product_packages);
      const fallbackPackages = loadStoredProductPackages();
      setProductPackages(loadedPackages.length > 0 ? loadedPackages : fallbackPackages);
      setLoadWarnings(data.warnings);

      if (data.warnings.length > 0) {
        toast.warning('Algunos datos se cargaron en modo local', {
          description: data.warnings[0],
          duration: 6000,
        });
      }

      if (fromQuote) {
        setCustomerName(fromQuote.customer_name || '');
        setCustomerPhone(fromQuote.customer_phone || '');
        setCustomerRtn(fromQuote.customer_rtn || '');
      }

      console.log(
        `Pedido listo: ${data.customers.length} clientes, ${data.products.length} productos`
      );
    } catch (err) {
      console.error('Error loading order form data:', err);
      setError(
        'No se pudo preparar el formulario. Verifica .env.local (Supabase), tu sesión y la conexión a internet.'
      );
    } finally {
      setDataLoading(false);
    }
  };

  const applyInventoryDiscounts = async () => {
    const discountableItems = items.filter(item => item.descontar_stock && item.product_id);

    if (discountableItems.length === 0) {
      return;
    }

    for (const item of discountableItems) {
      const product = products.find((p: any) => p.id === item.product_id);
      if (!product) continue;

      const currentStock = Number(product.stock) || 0;
      const newStock = Math.max(0, currentStock - item.unidades);
      await api.updateProduct(item.product_id!, { stock: newStock });
    }

    const refreshedProducts = await api.getProducts();
    const validProducts = (refreshedProducts.products || []).filter((p: any) => p && p.name).map((p: any) => ({
      ...p,
      code: p.code || 'S/C',
      category: p.category || 'General',
      stock: typeof p.stock === 'number' ? p.stock : Number(p.stock) || 0,
      min_stock: typeof p.min_stock === 'number' ? p.min_stock : Number(p.min_stock) || 0,
      price: typeof p.price === 'number' ? p.price : Number(p.price) || 0
    }));
    setProducts(validProducts);
  };

  // ========== MANEJO DE COMPROBANTE DE PAGO ==========
  const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo (solo imágenes y PDFs)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Tipo de archivo no permitido', {
        description: 'Solo se permiten imágenes (JPG, PNG, WEBP) o PDF',
      });
      return;
    }

    // Validar tamaño (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('❌ Archivo demasiado grande', {
        description: 'El archivo no debe superar los 5MB',
      });
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPaymentProof(base64);
      setPaymentProofName(file.name);
      
      toast.success('✅ Comprobante adjuntado', {
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    };
    reader.onerror = () => {
      toast.error('❌ Error al cargar el archivo', {
        description: 'Por favor, intenta de nuevo',
      });
    };
    reader.readAsDataURL(file);
  };

  const removePaymentProof = () => {
    setPaymentProof('');
    setPaymentProofName('');
    toast.info('🗑️ Comprobante eliminado');
  };

  // ========== DOCUMENTO FISCAL (FACTURA/RECIBO) ==========
  const handleDocAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('❌ Tipo de archivo no permitido', {
        description: 'Solo se permiten imágenes (JPG, PNG, WEBP) o PDF',
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('❌ Archivo demasiado grande', {
        description: 'El archivo no debe superar los 5MB',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setDocAttachment(base64);
      setDocAttachmentName(file.name);

      toast.success('✅ Documento fiscal adjuntado', {
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    };
    reader.onerror = () => {
      toast.error('❌ Error al cargar el archivo', {
        description: 'Por favor, intenta de nuevo',
      });
    };
    reader.readAsDataURL(file);
  };

  const removeDocAttachment = () => {
    setDocAttachment('');
    setDocAttachmentName('');
    toast.info('🗑️ Documento fiscal eliminado');
  };

  // ========== PEDIDO ESPECIAL ==========
  

  const handleSaveSpecialOrder = async (orderData: any) => {
    console.log('🟡 [OrderFormView] handleSaveSpecialOrder INICIADO');
    try {
      setLoading(true);
      console.log('🟡 [OrderFormView] Loading activado');
      
      // 1. Guardar en Supabase (fuente de verdad en linea)
      await api.createOrder(orderData);

      console.log('[OrderFormView] Pedido Especial guardado en Supabase:', orderData);

      toast.success('✅ Pedido Especial guardado', {
        description: `Pedido #${orderData.order_number} creado exitosamente`,
        duration: 4000,
      });

      // 2. Limpiar formulario y borrador
      console.log('🟡 [OrderFormView] Limpiando draft...');
      clearDraft();
      
      // 3. El descuento ya fue transferido, mostrar mensaje y mantener en el formulario
      setLoading(false);
      console.log('🟡 [OrderFormView] Loading desactivado');
      
      // 4. Cerrar el diálogo de pedido especial
      setShowSpecialOrderDialog(false);
      console.log('🟢 [OrderFormView] Diálogo cerrado');
      
      toast.info('💡 Descuento aplicado', {
        description: 'El descuento del pedido especial se ha aplicado al resumen del pedido actual',
        duration: 5000,
      });
      console.log('🟢 [OrderFormView] handleSaveSpecialOrder COMPLETADO');
    } catch (error) {
      console.error('🔴 [OrderFormView] Error guardando pedido especial:', error);
      setLoading(false);
      toast.error('❌ Error', {
        description: 'No se pudo guardar el pedido especial',
        duration: 4000,
      });
    }
  };

  // ========== FUNCIONES DE CONVERSIÓN ==========
  
  /**
   * Convierte medidas a metros cuadrados
   */
  const convertirAMetrosCuadrados = (ancho: number, alto: number, unidad: UnidadMedida): number => {
    let anchoM = 0;
    let altoM = 0;
    
    switch(unidad) {
      case 'cm':
        anchoM = ancho / 100;
        altoM = alto / 100;
        break;
      case 'pulgadas':
        anchoM = ancho * 0.0254; // 1 pulgada = 2.54 cm = 0.0254 m
        altoM = alto * 0.0254;
        break;
      case 'metros':
        anchoM = ancho;
        altoM = alto;
        break;
      case 'pies':
        anchoM = ancho * 0.3048; // 1 pie = 30.48 cm = 0.3048 m
        altoM = alto * 0.3048;
        break;
      default:
        anchoM = ancho / 100; // default cm
        altoM = alto / 100;
    }
    
    return anchoM * altoM;
  };

  /**
   * Convierte una medida individual a metros
   */
  const convertirAMetros = (medida: number, unidad: UnidadMedida): number => {
    switch(unidad) {
      case 'cm':
        return medida / 100;
      case 'pulgadas':
        return medida * 0.0254;
      case 'metros':
        return medida;
      case 'pies':
        return medida * 0.3048;
      default:
        return medida / 100; // default cm
    }
  };
  
  /**
   * Obtiene el precio por área según el tipo de producto y unidad configurada
   * Retorna el precio equivalente por m² para hacer los cálculos
   * 
   * ⚠️ NOTA: Esta función es legacy y solo se usa para productos genéricos.
   * Los productos especializados usan funciones dedicadas:
   * - PVC: calculatePVCWithStickerPrice()
   * - Sticker: calculateStickerPrice()
   * - Banner: calculateBannerPrice()
   */
  const obtenerPrecioPorArea = (tipo: string, unidad: UnidadMedida): number => {
    const tipoLower = tipo.toLowerCase();
    let precio = 0;
    
    // Mapeo de tipos a configuración
    // Banner, Lona, Vinil -> usan precios de banner
    // Sticker -> usa precios de stickers
    // PVC -> usa precios de pvc
    const tipoClave = 
      (tipoLower.includes('banner') || tipoLower.includes('lona') || tipoLower.includes('vinil')) ? 'banner' :
      tipoLower.includes('sticker') ? 'stickers' :
      tipoLower.includes('pvc') ? 'pvc' : 
      '';
    
    if (!tipoClave) {
      console.warn(`⚠️ Tipo de producto "${tipo}" no tiene configuración de precios. Configura en Ajustes.`);
      return 0;
    }
    
    // Obtener precio según unidad - SIEMPRE retornar precio equivalente por m²
    switch(unidad) {
      case 'cm':
        precio = priceConfig[`${tipoClave}_price_per_cm`] || 0;
        // Convertir de precio/cm² a precio/m²
        precio = precio * 10000; // 1 m² = 10,000 cm²
        break;
      case 'pulgadas':
        precio = priceConfig[`${tipoClave}_price_per_in`] || 0;
        // Convertir de precio/pulgada² a precio/m²
        precio = precio * 1550.0031; // 1 m² = 1550.0031 pulgadas²
        break;
      case 'metros':
        precio = priceConfig[`${tipoClave}_price_per_m`] || 0;
        break;
      case 'pies':
        precio = priceConfig[`${tipoClave}_price_per_ft`] || 0;
        // Convertir de precio/pie² a precio/m²
        precio = precio * 10.7639; // 1 m² = 10.7639 pies²
        break;
      default:
        precio = priceConfig[`${tipoClave}_price_per_m`] || 0;
    }
    
    return precio;
  };

  // ========== AGREGAR PRODUCTOS ==========
  
  // Función para calcular el precio antes de agregar
  const calcularPrecioCatalogo = () => {
    // Validar campos obligatorios
    if (!tempCatalogo.tipo) {
      setError('⚠️ Debes seleccionar un tipo de producto');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // ✨ NUEVO: Para Rotulación, validar campos manuales y saltar cálculos por área
    const esRotulacion = tempCatalogo.tipo.toLowerCase().includes('rotulación');
    if (esRotulacion) {
      if (!tempCatalogo.manual_descripcion.trim()) {
        setError('⚠️ Ingresa una descripción para la rotulación');
        setTimeout(() => setError(''), 3000);
        return;
      }
      if (tempCatalogo.manual_precio <= 0) {
        setError('⚠️ Ingresa un precio mayor a 0');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Para rotulación, el precio es directo (no se calcula por área)
      const precioTotal = tempCatalogo.manual_precio * tempCatalogo.unidades;
      setPrecioCalculado({
        precioUnidad: tempCatalogo.manual_precio,
        precioTotal: precioTotal,
        precioM2: 0,
        desglose: undefined
      });
      setSuccess('✅ Precio calculado correctamente');
      setTimeout(() => setSuccess(''), 2000);
      return;
    }

    if (tempCatalogo.ancho <= 0 || tempCatalogo.alto <= 0) {
      setError('⚠️ Debes especificar el ancho y alto del producto');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (tempCatalogo.unidades <= 0) {
      setError('⚠️ La cantidad debe ser mayor a 0');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Para PVC, validar grosor
    const esPVC = tempCatalogo.tipo.toLowerCase().includes('pvc');
    if (esPVC && !tempCatalogo.pvc_grosor) {
      setError('⚠️ Selecciona el grosor del PVC');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Para Banner con ojetes, validar cantidad y posiciones
    const esBannerConOjetes = tempCatalogo.tipo.toLowerCase().includes('banner') && tempCatalogo.banner_con_ojetes;
    if (esBannerConOjetes && tempCatalogo.banner_cantidad_ojetes <= 0) {
      setError('⚠️ Ingresa la cantidad de ojetes para el banner');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (esBannerConOjetes && !tempCatalogo.banner_posiciones_ojetes.trim()) {
      setError('⚠️ Especifica las posiciones de los ojetes (ej: 4 esquinas)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Calcular área en metros cuadrados
    const areaUnidadM2 = convertirAMetrosCuadrados(tempCatalogo.ancho, tempCatalogo.alto, tempCatalogo.unidad);
    
    let precioUnidad = 0;
    let precioM2 = 0;
    let desglose = undefined;
    
    // Calcular precio según el tipo de producto
    const tipoLower = tempCatalogo.tipo.toLowerCase();
    const esSticker = tipoLower.includes('sticker') && !tipoLower.includes('pvc');
    const esBanner = tipoLower.includes('banner');
    
    // Convertir medidas a metros (para usar en los cálculos)
    const anchoM = convertirAMetros(tempCatalogo.ancho, tempCatalogo.unidad);
    const altoM = convertirAMetros(tempCatalogo.alto, tempCatalogo.unidad);
    
    if (esPVC) {
      // ✨ VALIDAR LÍMITE DE PVC (48 x 96 pulgadas)
      const anchoInches = convertToInches(tempCatalogo.ancho, tempCatalogo.unidad);
      const altoInches = convertToInches(tempCatalogo.alto, tempCatalogo.unidad);
      
      console.log('🔍 PVC Calculation - Input:', {
        ancho: tempCatalogo.ancho,
        alto: tempCatalogo.alto,
        unidad: tempCatalogo.unidad,
        anchoInches,
        altoInches,
        grosor: tempCatalogo.pvc_grosor
      });
      
      const validation = validatePVCDimensions(anchoInches, altoInches);
      
      console.log('🔍 PVC Validation:', validation);
      
      if (!validation.isValid) {
        console.error('❌ PVC Validation Failed:', validation.message);
        setError(validation.message || '');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // PVC: Calcular precio usando el sistema de PVC + Sticker
      const pvcCalc = calculatePVCWithStickerPrice(
        anchoM, 
        altoM, 
        1, 
        parseInt(tempCatalogo.pvc_grosor)
      );
      
      console.log('✅ PVC Calculation Result:', pvcCalc);
      
      // Agregar precio de mano de obra según modo seleccionado
      let precioManoObra = 0;
      if (tempCatalogo.pvc_mano_obra_mode === 'sin-base') {
        precioManoObra = PVC_BASE_PRICES.WITHOUT_BASE;
      } else if (tempCatalogo.pvc_mano_obra_mode === 'con-base') {
        precioManoObra = PVC_BASE_PRICES.WITH_BASE;
      } else if (tempCatalogo.pvc_mano_obra_mode === 'manual') {
        precioManoObra = tempCatalogo.pvc_mano_obra_manual || 0;
      }
      
      precioUnidad = pvcCalc.pricePerUnit + precioManoObra;
      precioM2 = pvcCalc.totalPrice / pvcCalc.totalAreaM2;
      
      // Guardar desglose para mostrar
      desglose = {
        areaPulg2: pvcCalc.totalAreaInch2,
        precioPVC: pvcCalc.pvcTotalPrice,
        precioSticker: pvcCalc.stickerTotalPrice,
        precioManoObra: precioManoObra,
        manoObraMode: tempCatalogo.pvc_mano_obra_mode,
        conBase: tempCatalogo.pvc_mano_obra_mode === 'con-base',
        grosorMM: pvcCalc.pvcThicknessMM,
        rangoSticker: pvcCalc.stickerRangeApplied
      };
      
      console.log('✅ PVC Desglose:', desglose);
    } else if (esSticker) {
      // STICKER: Usar la misma fórmula que los stickers de PVC
      const stickerCalc = calculateStickerPrice(anchoM, altoM, 1);
      
      precioUnidad = stickerCalc.pricePerUnit;
      precioM2 = stickerCalc.pricePerInch2;
      
      // Guardar desglose
      desglose = {
        areaPulg2: stickerCalc.totalAreaInch2,
        precioPorPulg2: stickerCalc.pricePerInch2,
        rangoSticker: stickerCalc.rangeApplied
      };
    } else if (esBanner) {
      // BANNER: Usar la fórmula específica de banners
      const bannerCalc = calculateBannerPrice(anchoM, altoM, 1);
      
      precioUnidad = bannerCalc.pricePerUnit;
      precioM2 = bannerCalc.pricePerInch2;
      
      // Agregar costo de ojetes si aplica
      let costoOjetes = 0;
      if (tempCatalogo.banner_con_ojetes && tempCatalogo.banner_cantidad_ojetes > 0) {
        costoOjetes = tempCatalogo.banner_cantidad_ojetes * 10; // L.10 por ojete
        precioUnidad += costoOjetes; // Se agrega al precio por unidad
      }
      
      // Guardar desglose
      desglose = {
        areaPulg2: bannerCalc.totalAreaInch2,
        precioPorPulg2: bannerCalc.pricePerInch2,
        rangoBanner: bannerCalc.rangeApplied,
        conOjetes: tempCatalogo.banner_con_ojetes,
        cantidadOjetes: tempCatalogo.banner_cantidad_ojetes,
        posicionesOjetes: tempCatalogo.banner_posiciones_ojetes,
        costoOjetes: costoOjetes
      };
    } else {
      // Para otros productos, usar el sistema normal
      precioM2 = obtenerPrecioPorArea(tempCatalogo.tipo, tempCatalogo.unidad);
      precioUnidad = areaUnidadM2 * precioM2;
    }
    
    const precioTotal = precioUnidad * tempCatalogo.unidades;
    
    // Guardar el cálculo
    setPrecioCalculado({
      precioUnidad,
      precioTotal,
      precioM2,
      desglose
    });
    
    setSuccess('✅ Precio calculado correctamente');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoCatalogo = () => {
    // Validar que se haya calculado el precio primero
    if (!precioCalculado) {
      setError('⚠️ Primero debes calcular el precio del producto');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Usar los valores ya calculados
    const precioUnidad = precioCalculado.precioUnidad;
    const precioM2 = precioCalculado.precioM2;
    const subtotal = precioCalculado.precioTotal;
    const esPVC = tempCatalogo.tipo.toLowerCase().includes('pvc');

    // Generar descripción con grosor si es PVC o con ojetes si es Banner
    let descripcionProducto = tempCatalogo.descripcion;
    const esBanner = tempCatalogo.tipo.toLowerCase().includes('banner');
    const esRotulacion = tempCatalogo.tipo.toLowerCase().includes('rotulación');
    
    // ✨ NUEVO: Para Rotulación, usar descripción manual
    if (esRotulacion) {
      descripcionProducto = tempCatalogo.manual_descripcion;
    } else if (!descripcionProducto) {
      if (esPVC && tempCatalogo.pvc_grosor) {
        descripcionProducto = `${tempCatalogo.tipo} ${tempCatalogo.pvc_grosor}mm + Sticker - ${tempCatalogo.ancho}×${tempCatalogo.alto} ${tempCatalogo.unidad}`;
      } else if (esBanner && tempCatalogo.banner_con_ojetes) {
        descripcionProducto = `${tempCatalogo.tipo} ${tempCatalogo.material} ${tempCatalogo.ancho}×${tempCatalogo.alto} ${tempCatalogo.unidad} - ${tempCatalogo.banner_cantidad_ojetes} ojetes (${tempCatalogo.banner_posiciones_ojetes})`;
      } else {
        descripcionProducto = `${tempCatalogo.tipo} ${tempCatalogo.material} ${tempCatalogo.ancho}×${tempCatalogo.alto} ${tempCatalogo.unidad}`;
      }
    }

    const newItem: OrderItem = {
      origen: 'catalogo',
      tipo: tempCatalogo.tipo,
      material: tempCatalogo.material,
      ancho: tempCatalogo.ancho,
      alto: tempCatalogo.alto,
      unidad: tempCatalogo.unidad,
      precio_m2: precioM2,
      descripcion: descripcionProducto,
      unidades: tempCatalogo.unidades,
      precio_unitario: precioUnidad,
      subtotal: subtotal,
      descontar_stock: tempCatalogo.descontar_stock,
      sku: tempCatalogo.sku_vinculado || undefined
    };

    setItems([...items, newItem]);
    
    // Reset form
    setTempCatalogo({
      tipo: '',
      material: '',
      ancho: 0,
      alto: 0,
      unidad: 'cm',
      unidades: 1,
      descripcion: '',
      descontar_stock: false,
      sku_vinculado: '',
      pvc_grosor: '',
      pvc_con_base: false,
      pvc_mano_obra_mode: 'sin-base',
      pvc_mano_obra_manual: 0,
      banner_con_ojetes: false,
      banner_cantidad_ojetes: 0,
      banner_posiciones_ojetes: '',
      banner_ojetes_grid: [],
      manual_descripcion: '',
      manual_precio: 0
    });
    
    // Reset precio calculado
    setPrecioCalculado(null);
    
    setSuccess('✅ Producto de catálogo agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoPaquete = () => {
    if (!selectedPackage) {
      setError('Selecciona un paquete');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!tempPaquete.sizeHeader) {
      setError('Selecciona la medida del paquete');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!selectedPackageRow) {
      setError('Selecciona la cantidad del paquete');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (selectedPackagePrice <= 0) {
      setError('Este paquete no tiene precio configurado para esa medida');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const packageCount = Math.max(1, tempPaquete.packageCount || 1);
    const descripcion = `${selectedPackage.name} - ${selectedPackageRow.quantityLabel} - ${tempPaquete.sizeHeader}`;
    const newItem: OrderItem = {
      origen: 'paquete',
      tipo: selectedPackage.productType,
      material: tempPaquete.sizeHeader,
      descripcion,
      unidades: packageCount,
      precio_unitario: selectedPackagePrice,
      subtotal: selectedPackagePrice * packageCount,
      descontar_stock: false,
      notas: [
        `Paquete: ${selectedPackage.name}`,
        `Tipo: ${selectedPackage.productType}`,
        `Cantidad incluida: ${selectedPackageRow.quantity}`,
        `Medida: ${tempPaquete.sizeHeader}`,
        selectedPackage.shapes?.length ? `Formas: ${selectedPackage.shapes.join(', ')}` : '',
        tempPaquete.notes ? `Notas: ${tempPaquete.notes}` : '',
      ].filter(Boolean).join(' | ')
    };

    setItems([...items, newItem]);
    setTempPaquete({
      packageId: '',
      sizeHeader: '',
      rowId: '',
      packageCount: 1,
      notes: '',
    });
    setSuccess('Paquete agregado al pedido');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoInventario = (product: any) => {
    if (!product) return;

    if (product.stock <= 0) {
      setError(`⚠️ El producto "${product.name}" no tiene stock disponible`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    // ✨ Detectar si es una camisa/prenda para agregar opciones de diseño
    const esCamisa = product.category?.toLowerCase().includes('camisa') || 
                     product.category?.toLowerCase().includes('playera') ||
                     product.category?.toLowerCase().includes('polo') ||
                     product.name?.toLowerCase().includes('camisa') ||
                     product.name?.toLowerCase().includes('playera') ||
                     product.name?.toLowerCase().includes('polo');

    const newItem: OrderItem = {
      origen: 'inventario',
      product_id: product.id,
      sku: product.code,
      product_name: product.name,
      descripcion: product.name,
      categoria: product.category,
      unidades: 1,
      precio_unitario: product.price || 0,
      subtotal: product.price || 0,
      descontar_stock: true, // Por defecto SÍ descuenta
      stock_disponible: product.stock,
      // ✨ NUEVO: Opciones por defecto para camisas
      ...(esCamisa && {
        tipo_impresion: 'sublimada' as const,
        numero_lados: 1 as const,
        nivel_diseno_lado1: 'basico' as const,
        costo_diseno: 50, // Costo básico inicial
        talla: '',
        color: ''
      })
    };

    setItems([...items, newItem]);
    setSuccess(esCamisa ? '✨ Camisa agregada - Configura talla, color y diseño' : '✅ Producto del inventario agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoExterno = () => {
    if (!tempExterno.descripcion || tempExterno.unidades <= 0) {
      setError('Completa la descripción y unidades del producto externo');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const newItem: OrderItem = {
      origen: 'externo',
      descripcion: tempExterno.descripcion,
      proveedor: tempExterno.proveedor,
      costo_estimado: tempExterno.costo_estimado,
      unidades: tempExterno.unidades,
      precio_unitario: tempExterno.precio_cliente,
      subtotal: tempExterno.precio_cliente * tempExterno.unidades,
      descontar_stock: false // NUNCA descuenta stock
    };

    setItems([...items, newItem]);
    
    // Reset form
    setTempExterno({
      descripcion: '',
      proveedor: '',
      costo_estimado: 0,
      precio_cliente: 0,
      unidades: 1
    });
    
    setSuccess('✅ Producto externo agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const updated = [...items];
    const item = updated[index];
    
    // Validar stock si es de inventario
    if (item.origen === 'inventario' && item.product_id) {
      const product = products.find(p => p.id === item.product_id);
      if (product && qty > product.stock) {
        setError(`⚠️ Stock insuficiente. Disponible: ${product.stock}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
    }
    
    item.unidades = qty;
    item.subtotal = item.precio_unitario * qty;
    setItems(updated);
  };

  // ✨ NUEVO: Actualizar opciones de camisas
  const updateItemShirtOptions = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = updated[index];
    
    // Actualizar el campo específico
    (item as any)[field] = value;
    
    // Recalcular costo de diseño basado en las opciones
    if (field === 'tipo_impresion' || field === 'numero_lados' || field === 'nivel_diseno_lado1' || field === 'nivel_diseno_lado2') {
      const costos_diseno = {
        basico: 50,
        intermedio: 100,
        avanzado: 200
      };
      
      let costo = 0;
      if (item.nivel_diseno_lado1) {
        costo += costos_diseno[item.nivel_diseno_lado1] || 0;
      }
      if (item.numero_lados === 2 && item.nivel_diseno_lado2) {
        costo += costos_diseno[item.nivel_diseno_lado2] || 0;
      }
      
      // Si es vinil, agregar costo adicional
      if (item.tipo_impresion === 'vinil') {
        costo += 30; // Costo adicional por vinil
      }
      
      item.costo_diseno = costo;
      // Actualizar subtotal
      item.subtotal = (item.precio_unitario + costo) * item.unidades;
    }
    
    setItems(updated);
  };

  // ========== MANEJO DE ARCHIVOS ADJUNTOS (FOTOS, DOCUMENTOS, ETC.) ==========
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let errorCount = 0;
    
    // Procesar todos los archivos seleccionados
    Array.from(files).forEach((file, index) => {
      // Validar tamaño (máximo 10MB por archivo)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`❌ ${file.name} es muy grande`, {
          description: 'Máximo 10MB por archivo',
          duration: 3000,
        });
        errorCount++;
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          data: base64,
          type: file.type,
          size: file.size
        }]);
        
        successCount++;
        
        // Mostrar mensaje de éxito solo después del último archivo
        if (index === files.length - 1) {
          if (successCount > 0) {
            toast.success(`✅ ${successCount} archivo${successCount > 1 ? 's' : ''} agregado${successCount > 1 ? 's' : ''}`, {
              description: 'Los archivos se adjuntarán al pedido en Trello',
              duration: 2000,
            });
          }
        }
      };
      
      reader.onerror = () => {
        errorCount++;
        toast.error(`❌ Error al cargar ${file.name}`);
      };
      
      reader.readAsDataURL(file);
    });
    
    // Reset input para permitir seleccionar los mismos archivos de nuevo si se necesita
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const removedFile = attachedFiles[index];
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
    toast.success(`🗑️ ${removedFile.name} eliminado`);
  };
  
  // Función auxiliar para obtener el icono según el tipo de archivo
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('text')) return '📃';
    return '📎';
  };

  // ========== CÁLCULOS FINALES ==========
  const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  
  // ✅ OPTIMIZADO: Usar useMemo para evitar bucle infinito de re-renderizado
  const totales = useMemo(() => {
    // IMPORTANTE: El ISV SIEMPRE está INCLUIDO en los precios
    // La suma de subtotales ya incluye el ISV
    const totalConISV = items.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Aplicar descuento especial si existe
    const totalConDescuento = totalConISV - descuentoTransferido;
    
    // Desglosar el ISV que está incluido en el total
    const tasa_isv = (settings.isv_percent || 15) / 100;
    const subtotal_sin_isv = totalConDescuento / (1 + tasa_isv);
    const isv_incluido = totalConDescuento - subtotal_sin_isv;
    
    // ✅ CALCULADORA DE CAMBIO:
    // - Si hay abono: cambio = efectivo_recibido - abono (cliente solo paga el abono)
    // - Si NO hay abono: cambio = efectivo_recibido - total (cliente paga todo)
    // Ejemplo: Total 185, Abono 50, Recibido 100 → Cambio = 100 - 50 = 50
    const montoAPagar = abono > 0 ? abono : totalConDescuento;
    const cambio = paymentMethod === 'EFECTIVO' && recibido > 0 
      ? Math.max(0, recibido - montoAPagar) 
      : 0;
    
    return {
      subtotal: round2(subtotal_sin_isv),  // Subtotal sin ISV (para desglose fiscal)
      isv: round2(isv_incluido),           // ISV incluido (para desglose fiscal)
      total: round2(totalConDescuento),    // Total final con ISV incluido
      pendiente: round2(Math.max(totalConDescuento - abono, 0)),
      cambio: round2(cambio),
      discount: round2(descuentoTransferido)
    };
  }, [items, descuentoTransferido, abono, recibido, paymentMethod, settings.isv_percent]);

  // ⭐ ELIMINADO: El estado de pago ahora se controla manualmente con botones visuales
  // El usuario selecciona directamente si el pedido está PENDIENTE, ABONO o PAGADO

  // ========== CREAR TARJETA TRELLO (INDEPENDIENTE) ==========
  
  const handleCreateTrelloCard = () => {
    // Validaciones básicas
    if (!customerName || !customerPhone) {
      toast.error('⚠️ Completa los datos del cliente', {
        description: 'Necesitas ingresar nombre y teléfono del cliente',
        duration: 3000,
      });
      return;
    }

    if (!dueDate || !dueTime) {
      toast.error('⚠️ Selecciona fecha de entrega', {
        description: 'Necesitas seleccionar fecha y hora de entrega',
        duration: 3000,
      });
      return;
    }

    if (items.length === 0) {
      toast.error('⚠️ Agrega productos', {
        description: 'Debes agregar al menos un producto al pedido',
        duration: 3000,
      });
      return;
    }

    // Abrir diálogo de configuración de Trello
    setShowTrelloConfig(true);
  };

  // Guardar pedido sin Trello en Supabase
  const handleSaveWithoutTrello = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔵 Guardando pedido SIN Trello (solo local)...');
      
      const orderId = `order:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderNumber = await getAndReserveNextOrderNumber();
      const docNumber = linkedBillingDocument?.numeroFactura || linkedBillingDocument?.id || (docType === 'DESPUES' ? 'GENERAR-DESPUES' : 'SIN-VINCULO');
      const finalSeriesId = linkedBillingDocument?.id || 'facturacion';
      const generatedDocumentId = linkedBillingDocument?.id || null;

      console.log('Documento fiscal del pedido:', docType, docNumber);
      const mappedPaymentStatus = paymentStatus === "PAGADO" ? "paid" : paymentStatus === "PARCIAL" ? "partial" : "pending";
      const paidAmount = paymentStatus === "PAGADO" ? round2(totales.total) : round2(abono);
      const orderCustomer = (await ensureCustomerRecord()) || selectedCustomer;

      // Preparar datos del pedido COMPLETO
      const orderData = {
        // Identificadores
        id: orderId,
        order_number: orderNumber.toString(),
        number: orderNumber.toString(),
        
        // 📅 Día operativo
        work_day_id: currentDay?.id || null,
        
        // Cliente
        customer_id: orderCustomer?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: orderCustomer?.email || '',
        customer_address: orderCustomer?.address || '',
        customer_rtn: orderCustomer?.rtn || customerRtn.trim() || '',
        
        // Fechas
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd', { locale: es }) : undefined,
        due_time: dueTime,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Archivos adjuntos
        attached_files: attachedFiles,
        attached_photos: attachedFiles.filter(f => f.type.startsWith('image/')).map(f => f.data),
        attached_documents: attachedFiles.filter(f => !f.type.startsWith('image/')).map(f => ({
          name: f.name,
          data: f.data,
          type: f.type
        })),
        
        // Items del pedido
        items: items.map(item => ({
          ...item,
          category: item.categoria || item.tipo || 'general',
          qty: item.unidades,
          description: item.descripcion
        })),
        
        // Estado y notas
        notes: '',
        status: orderStatus,
        is_special_order: false,
        
        // Documento fiscal ✅
        doc_type: docType,
        doc_number: docNumber,
        doc_cai: null,
        doc_expires_at: null,
        
        // Totales
        total: totales.total,
        subtotal: totales.subtotal,
        isv: totales.isv,
        isv_amount: totales.isv,
        isv_percent: 15,
        discount: totales.discount,
        
        // Pagos
        paid_amount: paidAmount,
        amount_paid: paidAmount,
        payment_type: paymentMethod,
        payment_method: paymentMethod,
        payment_status: mappedPaymentStatus,
        payment_status_label: paymentStatus,
        payment_reference: paymentReference || null,
        payment_bank: paymentBank || null,
        payment_auth_code: paymentAuthCode || null,
        payment_proof: paymentProof || null, // 📎 Comprobante de pago
        payment_proof_name: paymentProofName || null, // 📎 Nombre del comprobante
        fiscal_attachment: null,
        fiscal_attachment_name: null,
        linked_billing_document_id: linkedBillingDocument?.id || null,
        linked_billing_document_type: linkedBillingDocument?.tipo || docType,
        
        // SIN configuración de Trello
        trello_card_id: null,
        trello_url: null,
        trello_synced: false
      };
      
      console.log('Guardando pedido en Supabase...');
      
      // Guardar en Supabase
      await api.createOrder(orderData);
      
      console.log('Pedido guardado en Supabase');
      console.log('📄 Documento:', orderData.doc_type, orderData.doc_number);

      await applyInventoryDiscounts();

      console.log('Documento fiscal vinculado:', generatedDocumentId || 'generar despues');
      // Toast de éxito con ADVERTENCIA sobre Trello
      if (isNotificationEnabled('new_orders')) {
      toast.success('Pedido guardado en linea', {
        description: `Pedido #${orderNumber} - ${docNumber}`,
        duration: 6000,
      });
      }
      
      // ⚠️ NOTIFICACIÓN IMPORTANTE: Trello no sincronizado
      setTimeout(() => {
        toast.warning('⚠️ Trello no está sincronizado', {
          description: 'Este pedido NO se creó en Trello. Ve a Ajustes → Integración Trello para configurarlo y sincronizar.',
          duration: 10000,
          action: {
            label: 'Configurar Trello',
            onClick: () => {
              // Navegar a ajustes
              onNavigate('settings', { defaultTab: 'integracion' });
            }
          }
        });
      }, 1000);

      // Limpiar formulario
      setCustomerName('');
      setCustomerPhone('');
      setCustomerRtn('');
      setDueDate(undefined);
      setDueTime('');
      setItems([]);
      setAbono(0);
      setPaymentMethod('EFECTIVO');
      setAttachedFiles([]);
      setPaymentProof('');
      setPaymentProofName('');
      setDocAttachment('');
      setDocAttachmentName('');
      setPaymentReference('');
      setPaymentBank('');
      setPaymentAuthCode('');
      setPaymentStatus('PENDIENTE');
      setRecibido(0);
      
      // Volver a la lista de pedidos
      setTimeout(() => {
        onBack();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error al guardar pedido:', error);
      setError(error.message || 'Error al guardar el pedido');
      toast.error('❌ Error al guardar pedido', {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTrelloConfigConfirm = async (config: {
    listId: string;
    listName: string;
    labelIds: string[];
    memberIds: string[];
  }) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔵 Guardando pedido con configuración de Trello:', config);
      
      const orderId = `order:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const orderNumber = await getAndReserveNextOrderNumber();
      const docNumber = linkedBillingDocument?.numeroFactura || linkedBillingDocument?.id || (docType === 'DESPUES' ? 'GENERAR-DESPUES' : 'SIN-VINCULO');
      const finalSeriesId = linkedBillingDocument?.id || 'facturacion';
      const generatedDocumentId = linkedBillingDocument?.id || null;

      console.log('Documento fiscal del pedido:', docType, docNumber);
      const mappedPaymentStatus = paymentStatus === "PAGADO" ? "paid" : paymentStatus === "PARCIAL" ? "partial" : "pending";
      const paidAmount = paymentStatus === "PAGADO" ? round2(totales.total) : round2(abono);
      const orderCustomer = (await ensureCustomerRecord()) || selectedCustomer;

      // Preparar datos del pedido COMPLETO
      const orderData = {
        // Identificadores
        id: orderId,
        order_number: orderNumber.toString(),
        number: orderNumber.toString(),
        
        // 📅 Día operativo
        work_day_id: currentDay?.id || null,
        
        // Cliente
        customer_id: orderCustomer?.id || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: orderCustomer?.email || '',
        customer_address: orderCustomer?.address || '',
        customer_rtn: orderCustomer?.rtn || customerRtn.trim() || '',
        
        // Fechas
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd', { locale: es }) : undefined,
        due_time: dueTime,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // Archivos adjuntos
        attached_files: attachedFiles,
        attached_photos: attachedFiles.filter(f => f.type.startsWith('image/')).map(f => f.data),
        attached_documents: attachedFiles.filter(f => !f.type.startsWith('image/')).map(f => ({
          name: f.name,
          data: f.data,
          type: f.type
        })),
        
        // Items del pedido
        items: items.map(item => ({
          ...item,
          category: item.categoria || item.tipo || 'general',
          qty: item.unidades,
          description: item.descripcion
        })),
        
        // Estado y notas
        notes: '',
        status: orderStatus,
        is_special_order: false,
        
        // Documento fiscal ✅
        doc_type: docType,
        doc_number: docNumber,
        doc_cai: null,
        doc_expires_at: null,
        
        // Totales
        total: totales.total,
        subtotal: totales.subtotal,
        isv: totales.isv,
        isv_amount: totales.isv,
        isv_percent: 15,
        discount: totales.discount,
        
        // Pagos
        paid_amount: paidAmount,
        amount_paid: paidAmount,
        payment_type: paymentMethod,
        payment_method: paymentMethod,
        payment_status: mappedPaymentStatus,
        payment_status_label: paymentStatus,
        payment_reference: paymentReference || null,
        payment_bank: paymentBank || null,
        payment_auth_code: paymentAuthCode || null,
        payment_proof: paymentProof || null, // 📎 Comprobante de pago
        payment_proof_name: paymentProofName || null, // 📎 Nombre del comprobante
        fiscal_attachment: null,
        fiscal_attachment_name: null,
        linked_billing_document_id: linkedBillingDocument?.id || null,
        linked_billing_document_type: linkedBillingDocument?.tipo || docType,
        
        // Configuración de Trello personalizada ✨
        trello_list_id: config.listId,
        trello_label_ids: config.labelIds,
        trello_member_ids: config.memberIds
      };
      
      console.log(`🔵 Guardando pedido en Trello (lista: ${config.listName})...`);
      
      toast.info('📤 Creando tarjeta en Trello...', {
        description: `Lista: ${config.listName}`,
        duration: 2000,
      });
      
      // Guardar pedido COMPLETO en Trello
      const result = await createTrelloOrder(orderData);
      
      if (!result.success) {
        throw new Error(result.error || 'Error al guardar el pedido en Trello');
      }
      
      console.log('✅ Pedido guardado en Trello:', result.cardId);

      // Guardar en Supabase para Caja Chica y Cierre de Dia
      const completeOrderData = {
        ...orderData,
        trello_card_id: result.cardId,
        trello_url: result.order?.trello_url || null,
      };
      
      await api.createOrder(completeOrderData);
      
      console.log('Pedido guardado en Supabase');
      console.log('📄 Documento:', completeOrderData.doc_type, completeOrderData.doc_number);

      await applyInventoryDiscounts();

      console.log('Documento fiscal vinculado:', generatedDocumentId || 'generar despues');
      // Toast de éxito
      toast.success('✅ Pedido guardado exitosamente', {
        description: `Pedido #${orderNumber} - ${docNumber}`,
        duration: 4000,
        action: {
          label: 'Ver en Trello',
          onClick: () => result.order?.trello_url && window.open(result.order.trello_url, '_blank')
        }
      });
      // Guardar configuración, limpiar y navegar
      setTrelloConfig(config);
      clearDraft();
      setShowTrelloConfig(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerRtn('');
      setDueDate(undefined);
      setDueTime('');
      setItems([]);
      setAbono(0);
      setRecibido(0);
      setPaymentMethod('EFECTIVO');
      setPaymentStatus('PENDIENTE');
      setAttachedFiles([]);
      setPaymentProof('');
      setPaymentProofName('');
      setDocAttachment('');
      setDocAttachmentName('');
      setPaymentReference('');
      setPaymentBank('');
      setPaymentAuthCode('');
      
      setTimeout(() => {
        onNavigate('home');
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Error al guardar pedido:', error);
      setError(error.message || 'Error al guardar el pedido');
      toast.error('❌ Error al guardar pedido', {
        description: error.message || 'Verifica tu configuración de Trello',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // ========== GUARDAR PEDIDO ==========
  
  // CODIGO VIEJO - BORRAR TODO HASTA LINEA 1611
  const handleSubmit_OLD_BORRAR = async () => {
    const config: any = { listName: '', listId: '', labelIds: [], memberIds: [] };
    const cardName = '';
    try {
    let cardDesc = `📦 Productos:\n`;
      
      items.forEach(item => {
        cardDesc += `\n• ${item.descripcion}\n`;
        // NO incluir tipo de material
        if (item.ancho && item.alto && item.unidad) {
          const unidadDisplay = {
            'cm': 'cm',
            'pulgadas': 'in',
            'metros': 'm',
            'pies': 'ft'
          }[item.unidad] || item.unidad;
          cardDesc += `  - Medidas: ${item.ancho} × ${item.alto} ${unidadDisplay}\n`;
        }

        // ✨ INFO DE CAMISAS
        if (item.talla) cardDesc += `  - Talla: ${item.talla}\n`;
        if (item.color) cardDesc += `  - Color: ${item.color}\n`;
        if (item.tipo_impresion) {
           cardDesc += `  - Impresión: ${item.tipo_impresion}\n`;
           cardDesc += `  - Lados: ${item.numero_lados}\n`;
           cardDesc += `  - Diseño Lado 1: ${item.nivel_diseno_lado1}\n`;
           if (item.numero_lados === 2) {
             cardDesc += `  - Diseño Lado 2: ${item.nivel_diseno_lado2}\n`;
           }
        }

        cardDesc += `  - Cantidad: ${item.unidades} unidad(es)\n`;
      });
      
      // Fecha de entrega en el campo correcto de Trello (no en descripción)
      const dueDatetime = new Date(dueDate!);
      const [hours, minutes] = dueTime.split(':');
      dueDatetime.setHours(parseInt(hours), parseInt(minutes));
      
      console.log(`🔵 Creando tarjeta en Trello (lista: ${config.listName})...`);
      
      toast.info('📤 Creando tarjeta...', {
        description: `Creando en lista: ${config.listName}`,
        duration: 2000,
      });

      const result = await api.createTrelloCard({
        name: cardName,
        desc: cardDesc,
        due: dueDatetime.toISOString(),
        listId: config.listId,
        labelIds: config.labelIds,
        memberIds: config.memberIds,
        attachments: attachedFiles
      });
      
      if (result.card) {
        console.log('✅ Tarjeta creada:', result.card.id);
        toast.success('✅ Tarjeta de Trello creada', {
          description: `"${cardName}" creada exitosamente`,
          duration: 4000,
          action: {
            label: 'Ver en Trello',
            onClick: () => window.open(result.card.url, '_blank')
          }
        });

        // Guardar configuración para uso futuro (opcional)
        setTrelloConfig(config);
        
        // 🎯 NUEVO: Limpiar borrador y navegar después de crear la tarjeta
        clearDraft();
        setShowTrelloConfig(false);
        
        setTimeout(() => {
          onNavigate('home');
        }, 1500);
      }
      
    } catch (error: any) {
      console.error('❌ Error al guardar pedido:', error);
      setError(error.message || 'Error al guardar el pedido');
      toast.error('❌ Error al guardar pedido', {
        description: error.message || 'Verifica tu configuración de Trello en Ajustes → Integraciones',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };
  // FIN CODIGO VIEJO - BORRAR
  
  // ========== GUARDAR PEDIDO ==========
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔵 Iniciando guardado de pedido...');
    
    // Validaciones con notificaciones flotantes
    if (!customerName || !customerPhone) {
      const missingField = !customerName ? 'nombre del cliente' : 'teléfono del cliente';
      setError(`⚠️ Debes ingresar ${missingField}`);
      toast.error('⚠️ Información del cliente incompleta', {
        description: `Falta el ${missingField}. Por favor complétalo en la pestaña "Información del Cliente".`,
        duration: 5000,
      });
      console.log('❌ Falta cliente');
      return;
    }

    if (!dueDate || !dueTime) {
      const missingField = !dueDate ? 'fecha de entrega' : 'hora de entrega';
      setError(`⚠️ Debes seleccionar ${missingField}`);
      toast.error('⚠️ Fecha de entrega incompleta', {
        description: `Falta la ${missingField}. Por favor complétala en la pestaña "Información del Cliente".`,
        duration: 5000,
      });
      console.log('❌ Falta fecha/hora');
      return;
    }

    if (items.length === 0) {
      setError('⚠️ Debes agregar al menos un producto al pedido');
      toast.error('⚠️ No hay productos en el pedido', {
        description: 'Agrega al menos un producto en la pestaña "Productos del Pedido".',
        duration: 5000,
      });
      console.log('❌ Sin productos');
      return;
    }

    // Documento fiscal: ahora se genera o se vincula desde el modulo de Facturacion
    if (!fiscalDocumentType || !docType) {
      setError('Debes elegir qué hacer con el documento fiscal');
      toast.error('Documento fiscal no definido', {
        description: 'Selecciona factura o recibo y luego elige si se genera ahora o después.',
        duration: 5000,
      });
      return;
    }

    // Validar stock antes de guardar
    for (const item of items) {
      if (item.origen === 'inventario' && item.descontar_stock && item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        if (!product || product.stock < item.unidades) {
          const productName = item.product_name || item.descripcion;
          setError(`⚠️ Stock insuficiente para ${productName}`);
          toast.error('⚠️ Stock insuficiente', {
            description: `No hay suficiente stock de "${productName}". Disponible: ${product?.stock || 0}, Solicitado: ${item.unidades}`,
            duration: 6000,
          });
          console.log('❌ Stock insuficiente');
          return;
        }
      }
    }

    console.log('✅ Todas las validaciones pasadas');
    
    // 🎯 VERIFICAR SI TRELLO ESTÁ CONFIGURADO
    if (!isTrelloConfigured()) {
      console.log('⚠️ Trello no configurado - guardando solo local');
      // Guardar en linea sin Trello
      await handleSaveWithoutTrello();
      return;
    }
    
    // 🎯 Abrir diálogo de configuración de Trello para seleccionar lista/etiquetas/miembros
    console.log('🔵 Abriendo diálogo de configuración de Trello...');
    setShowTrelloConfig(true);
  };
  
  // 🔵 handleTrelloConfigConfirm ya existe en línea 1344 y maneja todo el guardado

  const isCustomerRegistered = customers.some(c => c.name === customerName);

  const ensureCustomerRecord = async () => {
    if (selectedCustomer) return selectedCustomer;
    if (!saveCustomer || !customerName.trim()) return null;

    try {
      const created = await api.createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        rtn: customerRtn.trim() || undefined,
      });
      const customer = created.customer || created;
      setCustomers((prev) => [customer, ...prev.filter((item: any) => item.id !== customer.id)]);
      setSelectedCustomer(customer);
      toast.success('Cliente guardado', {
        description: customerRtn.trim() ? 'Se guardo con RTN.' : 'Se guardo sin RTN.',
      });
      return customer;
    } catch (error: any) {
      toast.warning('No se pudo guardar el cliente', {
        description: error?.message || 'El pedido continuara con los datos escritos.',
      });
      return null;
    }
  };

  const openBillingPreview = (kind: 'emitida' | 'proforma' | 'recibo') => {
    if (items.length === 0) {
      toast.error('Agrega productos antes de generar el documento');
      return;
    }
    setPendingBillingKind(kind);
    setShowBillingPreview(true);
  };

  const confirmBillingDocument = async () => {
    if (!pendingBillingKind) return;

    try {
      const linked = await createBillingDocumentFromOrder({
        kind: pendingBillingKind,
        customerName,
        customerPhone,
        customerRtn,
        items,
        note: `Documento generado desde pedido en ingreso. Metodo de pago: ${paymentMethod}.`,
      });

      setLinkedBillingDocument(linked);
      setDocType(pendingBillingKind === 'emitida' ? 'FACTURA' : pendingBillingKind === 'recibo' ? 'RECIBO' : 'PROFORMA');
      setFiscalDocumentType(pendingBillingKind === 'recibo' ? 'RECIBO' : 'FACTURA');
      setDocAttachment('');
      setDocAttachmentName('');
      setShowBillingPreview(false);
      setPendingBillingKind(null);
      toast.success(
        pendingBillingKind === 'emitida' ? 'Factura vinculada' : pendingBillingKind === 'recibo' ? 'Recibo vinculado' : 'Factura proforma vinculada',
        {
          description: `${linked.numeroFactura || linked.numeroRecibo || 'Proforma'} creada en el modulo de Facturacion.`,
        }
      );
    } catch (error: any) {
      toast.error('No se pudo crear el documento fiscal', {
        description: error?.message || 'Revisa la conexion con Supabase.',
      });
    }
  };

  return (
    <div className="app-page order-form-page space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="order-form-hero flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="order-form-title-block">
            <h1 className="text-gray-900">Ingreso de Pedido</h1>
            <p className="text-gray-800">Completa todos los bloques para crear el pedido</p>
          </div>
        </div>
        
        {/* Botón Pedido Especial */}
        <Button
          onClick={() => setShowSpecialOrderDialog(true)}
          className="order-form-special-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
        >
          <Star className="w-4 h-4 mr-2" />
          {getCurrentUser()?.role === 'admin' ? 'Pedido Especial' : 'Solicitar descuento'}
        </Button>
      </div>

      {/* Dialog de Pedido Especial */}
      <SpecialOrderDialog
        open={showSpecialOrderDialog}
        onOpenChange={setShowSpecialOrderDialog}
        customers={customers}
        settings={settings}
        onSaveOrder={handleSaveSpecialOrder}
        onTransferDiscount={(discountAmount) => {
          setDescuentoTransferido(discountAmount);
          toast.success('✅ Descuento transferido', {
            description: `Se aplicó un descuento de L. ${discountAmount.toFixed(2)} al pedido`,
            duration: 4000,
          });
        }}
        initialItems={items.map(item => ({
          descripcion: item.descripcion,
          cantidad: item.unidades,
          precio_original: item.precio_unitario,
          descuento_porcentaje: 0,
          precio_con_descuento: item.precio_unitario,
          descuento_lempiras: 0,
          subtotal: item.subtotal
        }))
        }
        initialCustomerName={customerName}
        initialCustomerPhone={customerPhone}
        initialDueDate={dueDate}
        initialDueTime={dueTime}
        currentUser={getCurrentUser()}
      />

      <AlertDialog open={showBillingPreview} onOpenChange={setShowBillingPreview}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBillingKind === 'emitida' ? 'Generar factura' : pendingBillingKind === 'recibo' ? 'Generar recibo' : 'Generar factura proforma'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se creara en el modulo Facturacion con los datos del pedido actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{customerName || 'Consumidor final'}</p>
              <p className="text-sm text-slate-700">{customerPhone || 'Sin telefono'}</p>
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border">
              {buildBillingProductsFromOrderItems(items).map((product) => (
                <div key={product.id} className="grid grid-cols-[1fr_80px_110px] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                  <span className="font-medium text-slate-900">{product.nombre}</span>
                  <span className="text-right text-slate-700">{product.cantidad}</span>
                  <span className="text-right font-semibold text-slate-900">L {(product.cantidad * product.precio).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBillingDocument}>
              Crear y vincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {success && (
        <Alert className="bg-green-50 border-green-500">
          <Check className="w-5 h-5 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {dataLoading && (
        <Alert className="bg-slate-900/80 border-slate-600 text-slate-100">
          <AlertDescription>Cargando datos del pedido…</AlertDescription>
        </Alert>
      )}

      {!dataLoading && loadWarnings.length > 0 && !error && (
        <Alert className="bg-amber-50 border-amber-500">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <AlertDescription className="text-amber-900 text-sm">
            <ul className="list-disc pl-4 space-y-1">
              {loadWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-500">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* CONFIG DIALOG DE TRELLO */}
      <TrelloCardConfigDialog
        open={showTrelloConfig}
        onOpenChange={setShowTrelloConfig}
        onConfirm={handleTrelloConfigConfirm}
      />

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BARRA DE PROGRESO MINIMALISTA */}
        <div className="order-progress-shell sticky top-0 z-50 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-700">Progreso</span>
                
                {/* ✨ INDICADOR DE AUTO-GUARDADO */}
                {autoSaveStatus !== 'idle' && (
                  <div className="flex items-center gap-1.5">
                    {autoSaveStatus === 'saving' && (
                      <>
                        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-blue-600 font-medium">Guardando...</span>
                      </>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <>
                        <Check className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Guardado</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-900">{formProgress}%</span>
            </div>
            <progress
              className="order-progress"
              value={formProgress}
              max={100}
              aria-label="Progreso del formulario"
            />
          </div>
        </div>

        {/* TABS DE NAVEGACIÓN MINIMALISTAS */}
        <Tabs defaultValue="cliente" className="w-full">
          <TabsList className="order-form-tabs grid w-full grid-cols-3 gap-2 bg-gray-50 p-1 rounded-lg h-auto">
            <TabsTrigger 
              value="cliente" 
              className="order-step-tab flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all"
            >
              <Package className="w-4 h-4" />
              <span className="text-xs font-medium">Cliente</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="pedido" 
              className="order-step-tab flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-medium">Pedido</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="pago" 
              className="order-step-tab flex items-center justify-center gap-2 py-3 px-4 rounded-md transition-all"
            >
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Pago</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: DATOS DEL CLIENTE */}
          <TabsContent value="cliente" className="mt-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                  <Package className="w-5 h-5 text-cyan-500" />
                  Datos del Cliente y Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
            {/* SELECTOR DE CLIENTE */}
            <CustomerSelector
              selectedCustomer={selectedCustomer}
              onSelect={(customer) => {
                setSelectedCustomer(customer);
                if (!customer) {
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerRtn('');
                }
              }}
            />

            {/* Campos de cliente (readonly si hay cliente seleccionado) */}
            {!selectedCustomer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre del Cliente *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ingresa el nombre del cliente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono (formato HN) *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="9999-9999"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customerRtn">RTN (opcional)</Label>
                  <Input
                    id="customerRtn"
                    value={customerRtn}
                    onChange={(e) => setCustomerRtn(e.target.value)}
                    placeholder="0801-1999-123456"
                    maxLength={20}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label>Fecha de Entrega *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueTime">Hora de Entrega *</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveCustomer"
                checked={saveCustomer}
                onCheckedChange={(checked) => setSaveCustomer(checked as boolean)}
              />
              <label htmlFor="saveCustomer" className="cursor-pointer text-sm">
                Guardar cliente en la base de datos
              </label>
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: DATOS PEDIDO (Productos) */}
          <TabsContent value="pedido" className="mt-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                  <ShoppingCart className="w-5 h-5 text-cyan-500" />
                  Productos del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
            {/* Selector de modo */}
            <div>
              <Label className="mb-3 block text-sm font-medium">Forma de agregar producto:</Label>
              <RadioGroup value={addMode} onValueChange={(value) => setAddMode(value as OrigenProducto)} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="selection-card flex items-center space-x-2 border-2 border-purple-300 rounded-xl p-4 bg-gradient-to-br from-purple-50 via-white to-pink-50 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:border-purple-400">
                  <RadioGroupItem value="catalogo" id="mode-catalogo" />
                  <Label htmlFor="mode-catalogo" className="cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-sm">Calculadora de medidas</div>
                      <div className="text-xs text-gray-700">Por área (Banner, Sticker...)</div>
                    </div>
                  </Label>
                </div>

                <div className="selection-card flex items-center space-x-2 border border-blue-200 rounded-lg p-4 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors">
                  <RadioGroupItem value="paquete" id="mode-paquete" />
                  <Label htmlFor="mode-paquete" className="cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-sm">Paquetes</div>
                      <div className="text-xs text-gray-700">Precios fijos de Ajustes</div>
                    </div>
                  </Label>
                </div>

                <div className="selection-card flex items-center space-x-2 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="inventario" id="mode-inventario" />
                  <Label htmlFor="mode-inventario" className="cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-sm">Desde Inventario</div>
                      <div className="text-xs text-gray-700">Productos en stock</div>
                    </div>
                  </Label>
                </div>

                <div className="selection-card flex items-center space-x-2 border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="externo" id="mode-externo" />
                  <Label htmlFor="mode-externo" className="cursor-pointer flex-1">
                    <div>
                      <div className="font-medium text-sm">Externo</div>
                      <div className="text-xs text-gray-700">Se comprará (no afecta stock)</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Formulario según modo */}
            {addMode === 'catalogo' && (
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Agregar Producto de Catálogo</h4>
                    <p className="text-sm text-gray-800 mt-1">
                      Los precios se calculan automáticamente según la configuración en Ajustes
                    </p>
                    {items.length > 0 && (
                      <p className="text-xs text-cyan-600 mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Ya tienes {items.length} producto(s) agregado(s)
                      </p>
                    )}
                  </div>
                  <Badge variant="default">Por Medidas</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Producto *</Label>
                    <Select 
                      value={(() => {
                        // Encontrar el valor completo (nombre-id) a partir del nombre almacenado
                        const matchingProduct = catalogProducts.find((p: any) => p.nombre === tempCatalogo.tipo);
                        return matchingProduct ? `${matchingProduct.nombre}-${matchingProduct.id || catalogProducts.indexOf(matchingProduct)}` : tempCatalogo.tipo;
                      })()} 
                      onValueChange={(value) => {
                        // Extraer solo el nombre del producto (antes del último guión)
                        const productName = value.includes('-') ? value.substring(0, value.lastIndexOf('-')) : value;
                        setTempCatalogo({...tempCatalogo, tipo: productName});
                      }}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Seleccionar tipo de producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalogProducts.length === 0 ? (
                          <SelectItem value="_default" disabled>No hay productos en el catálogo</SelectItem>
                        ) : (
                          catalogProducts.map((product: any, index: number) => (
                            <SelectItem key={`catalog-product-${index}`} value={`${product.nombre}-${product.id || index}`}>
                              <span className="flex w-full items-center justify-between gap-2">
                                <span className="truncate">📦 {product.nombre}</span>
                                {product.categoria && (
                                  <span className="shrink-0 text-xs font-medium text-slate-500">({product.categoria})</span>
                                )}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ancho *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempCatalogo.ancho || ''}
                      onChange={(e) => setTempCatalogo({...tempCatalogo, ancho: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Alto *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempCatalogo.alto || ''}
                      onChange={(e) => setTempCatalogo({...tempCatalogo, alto: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Unidad de Medida *</Label>
                    <Select 
                      value={tempCatalogo.unidad} 
                      onValueChange={(value) => setTempCatalogo({...tempCatalogo, unidad: value as UnidadMedida})}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">📏 Centímetros (cm)</SelectItem>
                        <SelectItem value="pulgadas">📐 Pulgadas (in)</SelectItem>
                        <SelectItem value="metros">📏 Metros (m)</SelectItem>
                        <SelectItem value="pies">📐 Pies (ft)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mostrar conversión automática a pulgadas */}
                  {tempCatalogo.ancho > 0 && tempCatalogo.alto > 0 && tempCatalogo.unidad !== 'pulgadas' && (
                    <div className="space-y-2 lg:col-span-4">
                      <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                        📐 <strong>En pulgadas:</strong> {convertAndFormatToInches(tempCatalogo.ancho, tempCatalogo.alto, tempCatalogo.unidad)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={tempCatalogo.unidades || ''}
                      onChange={(e) => setTempCatalogo({...tempCatalogo, unidades: parseInt(e.target.value) || 1})}
                      placeholder="1"
                    />
                  </div>

                  {/* Selector de Grosor PVC */}
                  {tempCatalogo.tipo.toLowerCase().includes('pvc') && (
                    <div className="space-y-2 md:col-span-2 lg:col-span-4">
                      <Label className="text-purple-900 font-semibold flex items-center gap-2">
                        <span className="text-lg">🔧</span>
                        Grosor del PVC *
                      </Label>
                      <Select 
                        value={tempCatalogo.pvc_grosor} 
                        onValueChange={(value) => setTempCatalogo({...tempCatalogo, pvc_grosor: value})}
                      >
                        <SelectTrigger className="border-2 border-purple-400 bg-purple-50 h-12 text-base font-medium">
                          <SelectValue placeholder="🔽 Selecciona el grosor del PVC" />
                        </SelectTrigger>
                        <SelectContent>
                          {PVC_THICKNESS_PRICES.map((thickness) => (
                            <SelectItem 
                              key={thickness.mm} 
                              value={thickness.mm.toString()}
                              className="cursor-pointer"
                            >
                              <span className="font-medium">{thickness.mm}mm</span>
                              <span className="text-gray-600 ml-2">- L.{thickness.pricePerInch2.toFixed(2)}/pulg²</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-100 p-2 rounded">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>
                          <strong>Importante:</strong> El precio incluye el PVC del grosor seleccionado + el sticker que va pegado
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Panel de Mano de Obra para PVC */}
                  {tempCatalogo.tipo.toLowerCase().includes('pvc') && (
                    <div className="space-y-2 md:col-span-2 lg:col-span-4">
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4 space-y-3">
                        <Label className="font-semibold text-purple-900 flex items-center gap-2">
                          <span className="text-lg">💼</span>
                          Precio de Mano de Obra *
                        </Label>
                        
                        <RadioGroup 
                          value={tempCatalogo.pvc_mano_obra_mode} 
                          onValueChange={(v: any) => {
                            setTempCatalogo({...tempCatalogo, pvc_mano_obra_mode: v});
                            setPrecioCalculado(null);
                          }}
                        >
                          {/* Opción 1: Sin Base */}
                          <div 
                            onClick={() => {
                              setTempCatalogo({...tempCatalogo, pvc_mano_obra_mode: 'sin-base'});
                              setPrecioCalculado(null);
                            }}
                            className={`selection-card flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              tempCatalogo.pvc_mano_obra_mode === 'sin-base' 
                                ? 'bg-green-100 border-green-500 shadow-md' 
                                : 'bg-white border-gray-200 hover:border-green-300'
                            }`}
                          >
                            <RadioGroupItem value="sin-base" id="order-r1" />
                            <Label htmlFor="order-r1" className="flex-1 cursor-pointer flex items-center justify-between">
                              <span className="font-medium">✅ Sin Base</span>
                              <span className={`font-bold ${tempCatalogo.pvc_mano_obra_mode === 'sin-base' ? 'text-green-700' : 'text-gray-600'}`}>
                                L. {PVC_BASE_PRICES.WITHOUT_BASE.toFixed(2)}
                              </span>
                            </Label>
                          </div>

                          {/* Opción 2: Con Base */}
                          <div 
                            onClick={() => {
                              setTempCatalogo({...tempCatalogo, pvc_mano_obra_mode: 'con-base'});
                              setPrecioCalculado(null);
                            }}
                            className={`selection-card flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              tempCatalogo.pvc_mano_obra_mode === 'con-base' 
                                ? 'bg-purple-100 border-purple-500 shadow-md' 
                                : 'bg-white border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <RadioGroupItem value="con-base" id="order-r2" />
                            <Label htmlFor="order-r2" className="flex-1 cursor-pointer flex items-center justify-between">
                              <span className="font-medium">✅ Con Base</span>
                              <span className={`font-bold ${tempCatalogo.pvc_mano_obra_mode === 'con-base' ? 'text-purple-700' : 'text-gray-600'}`}>
                                L. {PVC_BASE_PRICES.WITH_BASE.toFixed(2)}
                              </span>
                            </Label>
                          </div>

                          {/* Opción 3: Manual */}
                          <div 
                            onClick={() => {
                              setTempCatalogo({...tempCatalogo, pvc_mano_obra_mode: 'manual'});
                              setPrecioCalculado(null);
                            }}
                            className={`selection-card flex flex-col space-y-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              tempCatalogo.pvc_mano_obra_mode === 'manual' 
                                ? 'bg-blue-100 border-blue-500 shadow-md' 
                                : 'bg-white border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="manual" id="order-r3" />
                              <Label htmlFor="order-r3" className="flex-1 cursor-pointer font-medium">
                                ✍️ Precio Manual
                              </Label>
                            </div>
                            {tempCatalogo.pvc_mano_obra_mode === 'manual' && (
                              <Input
                                type="number"
                                value={tempCatalogo.pvc_mano_obra_manual}
                                onChange={(e) => {
                                  setTempCatalogo({...tempCatalogo, pvc_mano_obra_manual: parseFloat(e.target.value) || 0});
                                  setPrecioCalculado(null);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Ingresa el precio"
                                min="0"
                                step="0.01"
                                className="mt-2"
                              />
                            )}
                          </div>
                        </RadioGroup>

                        <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>💡 El precio de mano de obra se agrega por unidad al total</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Opciones de Ojetes para Banner */}
                  {tempCatalogo.tipo.toLowerCase().includes('banner') && (
                    <>
                      <div className="space-y-2 md:col-span-2 lg:col-span-4">
                        <Label className="text-orange-900 font-semibold flex items-center gap-2">
                          <span className="text-lg">⭕</span>
                          ¿Desea ojetes en el banner?
                        </Label>
                        <div className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="shrink-0">
                            <Switch
                              checked={tempCatalogo.banner_con_ojetes}
                              onCheckedChange={(checked) => {
                                setTempCatalogo({
                                  ...tempCatalogo, 
                                  banner_con_ojetes: checked,
                                  banner_cantidad_ojetes: checked ? tempCatalogo.banner_cantidad_ojetes : 0,
                                  banner_ojetes_grid: checked ? tempCatalogo.banner_ojetes_grid : [],
                                  banner_posiciones_ojetes: checked ? tempCatalogo.banner_posiciones_ojetes : ''
                                });
                                // Resetear precio calculado
                                setPrecioCalculado(null);
                              }}
                              className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-gray-300 scale-125"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-orange-900 text-base">
                              {tempCatalogo.banner_con_ojetes ? '✅ Con Ojetes' : '⭕ Sin Ojetes'}
                            </p>
                            <p className="text-sm text-orange-700 mt-0.5">
                              Cada ojete cuesta L 10.00
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sistema de Cuadrícula 4x4 para Ojetes - VERSIÓN COMPACTA */}
                      {tempCatalogo.banner_con_ojetes && (
                        <div className="md:col-span-2 lg:col-span-4">
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-lg p-3 shadow-sm">
                            {/* Header Compacto */}
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-orange-900 font-semibold text-sm flex items-center gap-1.5">
                                <span className="text-lg">📍</span>
                                Marcado de Ojetes 4×4
                              </Label>
                              <div className="bg-orange-600 text-white px-2.5 py-1 rounded font-bold text-sm">
                                {tempCatalogo.banner_ojetes_grid?.length || 0} Ojetes
                              </div>
                            </div>

                            {/* Cuadrícula 4x4 Compacta */}
                            <div className="grid grid-cols-4 gap-2 mb-2 max-w-xs mx-auto">
                              {Array.from({ length: 16 }, (_, index) => {
                                const cellNumber = index + 1;
                                const isSelected = tempCatalogo.banner_ojetes_grid?.includes(cellNumber);
                                
                                return (
                                  <button
                                    key={cellNumber}
                                    type="button"
                                    onClick={() => {
                                      const currentGrid = tempCatalogo.banner_ojetes_grid || [];
                                      let newGrid: number[];
                                      
                                      if (isSelected) {
                                        // Quitar ojete
                                        newGrid = currentGrid.filter(n => n !== cellNumber);
                                      } else {
                                        // Agregar ojete
                                        newGrid = [...currentGrid, cellNumber].sort((a, b) => a - b);
                                      }
                                      
                                      setTempCatalogo({
                                        ...tempCatalogo,
                                        banner_ojetes_grid: newGrid,
                                        banner_cantidad_ojetes: newGrid.length,
                                        banner_posiciones_ojetes: `Celdas: ${newGrid.join(', ')}`
                                      });
                                      setPrecioCalculado(null);
                                    }}
                                    className={`
                                      aspect-square rounded-lg border-2 font-bold text-sm transition-all duration-150
                                      ${isSelected 
                                        ? 'bg-green-500 border-green-600 text-white shadow-md hover:bg-green-600' 
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-700'
                                      }
                                      active:scale-95
                                    `}
                                  >
                                    {isSelected ? '✓' : cellNumber}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Información Compacta */}
                            <div className="grid grid-cols-3 gap-2 text-center mb-2">
                              <div className="bg-white border border-orange-300 rounded p-1.5">
                                <div className="text-orange-900 font-bold text-base">
                                  {tempCatalogo.banner_ojetes_grid?.length || 0}
                                </div>
                                <div className="text-orange-700 text-[10px]">Ojetes</div>
                              </div>
                              <div className="bg-white border border-orange-300 rounded p-1.5">
                                <div className="text-green-700 font-bold text-base">
                                  L {((tempCatalogo.banner_ojetes_grid?.length || 0) * 10).toFixed(2)}
                                </div>
                                <div className="text-orange-700 text-[10px]">Costo</div>
                              </div>
                              <div className="bg-white border border-orange-300 rounded p-1.5">
                                <div className="text-blue-700 font-bold text-base">
                                  L 10
                                </div>
                                <div className="text-orange-700 text-[10px]">c/u</div>
                              </div>
                            </div>

                            {/* Posiciones compactas */}
                            {tempCatalogo.banner_ojetes_grid && tempCatalogo.banner_ojetes_grid.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-orange-700 font-semibold">Posiciones:</span>
                                {tempCatalogo.banner_ojetes_grid.map(num => (
                                  <span key={num} className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-green-300">
                                    #{num}
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempCatalogo({
                                      ...tempCatalogo,
                                      banner_ojetes_grid: [],
                                      banner_cantidad_ojetes: 0,
                                      banner_posiciones_ojetes: ''
                                    });
                                    setPrecioCalculado(null);
                                  }}
                                  className="ml-auto bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-semibold py-1 px-2 rounded border border-red-300 transition-colors"
                                >
                                  🗑️ Limpiar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Info para PVC - Cálculo Automático con Sticker */}
                  {tempCatalogo.tipo.toLowerCase().includes('pvc') && (
                    <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-lg">🧮</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-purple-900 mb-2">
                            💰 Cálculo Automático: PVC + Sticker
                          </p>
                          <div className="space-y-1 text-xs text-purple-800">
                            <p>✅ <strong>Precio del PVC:</strong> Área en pulgadas² × Precio según grosor</p>
                            <p>✅ <strong>Precio del Sticker:</strong> Área en pulgadas² × Precio según área total</p>
                            <p className="text-purple-900 font-semibold mt-2">
                              📊 Precio Final = PVC + Sticker pegado
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ✨ NUEVO: Campos para Rotulación (descripción y precio manual) */}
                  {tempCatalogo.tipo.toLowerCase().includes('rotulación') && (
                    <>
                      <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-lg">✏️</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-900 mb-1">
                              📝 Rotulación - Ingreso Manual
                            </p>
                            <p className="text-xs text-yellow-800">
                              Para rotulación, ingresa descripción y precio manualmente
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2 lg:col-span-4">
                        <Label className="text-yellow-900 font-semibold">Descripción del Servicio *</Label>
                        <Textarea
                          value={tempCatalogo.manual_descripcion}
                          onChange={(e) => setTempCatalogo({...tempCatalogo, manual_descripcion: e.target.value})}
                          placeholder="Ej: Rotulación de vehículo completo con diseño personalizado..."
                          rows={3}
                          className="border-2 border-yellow-300 focus:border-yellow-500"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2 lg:col-span-4">
                        <Label className="text-yellow-900 font-semibold">Precio Total *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tempCatalogo.manual_precio || ''}
                          onChange={(e) => setTempCatalogo({...tempCatalogo, manual_precio: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                          className="h-12 text-lg border-2 border-yellow-300 focus:border-yellow-500"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2 lg:col-span-4">
                    <Label>Descripción personalizada (opcional)</Label>
                    <Textarea
                      value={tempCatalogo.descripcion}
                      onChange={(e) => setTempCatalogo({...tempCatalogo, descripcion: e.target.value})}
                      placeholder="Descripción adicional del producto..."
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2 md:col-span-2 lg:col-span-4">
                    <Checkbox
                      id="descontar-stock-catalogo"
                      checked={tempCatalogo.descontar_stock}
                      onCheckedChange={(checked) => setTempCatalogo({...tempCatalogo, descontar_stock: checked as boolean})}
                    />
                    <label htmlFor="descontar-stock-catalogo" className="cursor-pointer text-sm">
                      Descontar stock de inventario (vincular con SKU)
                    </label>
                  </div>

                  {tempCatalogo.descontar_stock && (
                    <div className="space-y-2 md:col-span-2 lg:col-span-4">
                      <Label>SKU del Producto en Inventario</Label>
                      <Select 
                        value={tempCatalogo.sku_vinculado}
                        onValueChange={(value) => setTempCatalogo({...tempCatalogo, sku_vinculado: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto del inventario" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: any) => (
                            <SelectItem key={product.id} value={product.code}>
                              {product.code} - {product.name} (Stock: {product.stock})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Botón Calcular Precio */}
                <Button
                  type="button"
                  onClick={() => {
                    calcularPrecioCatalogo();
                  }}
                  className="w-full h-14 bg-gradient-to-r from-blue-500/90 to-blue-600/90 hover:from-blue-600/90 hover:to-blue-700/90 backdrop-blur-sm text-white shadow-lg shadow-blue-500/20 rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/20"
                >
                  <Calculator className="w-5 h-5 mr-3" />
                  <span className="font-semibold">Calcular Precio</span>
                </Button>

                {/* Panel de Precio Calculado - COMPACTO */}
                {precioCalculado && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-3 space-y-2 animate-in fade-in-50 slide-in-from-top-5 duration-300">
                    <div className="flex items-center gap-2 pb-2 border-b border-green-300">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-green-900">💰 Precio Calculado</h4>
                        <p className="text-xs text-green-700">Desglose completo</p>
                      </div>
                    </div>

                    {/* Desglose para PVC - COMPACTO */}
                    {precioCalculado.desglose && precioCalculado.desglose.precioPVC && (
                      <div className="space-y-1.5">
                        <div className="bg-white/60 rounded p-2 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">📐 Área:</span>
                            <span className="font-semibold text-gray-900">
                              {precioCalculado.desglose.areaPulg2.toFixed(2)} pulg²
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">🔧 Grosor PVC:</span>
                            <span className="font-semibold text-purple-700">
                              {precioCalculado.desglose.grosorMM}mm
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="bg-purple-100 rounded p-2">
                            <div className="text-xs text-purple-700 mb-0.5">🟪 PVC</div>
                            <div className="font-bold text-purple-900 text-sm">
                              L.{precioCalculado.desglose.precioPVC.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-blue-100 rounded p-2">
                            <div className="text-xs text-blue-700 mb-0.5">🎨 Sticker</div>
                            <div className="font-bold text-blue-900 text-sm">
                              L.{(precioCalculado.desglose.precioSticker || 0).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Mano de Obra */}
                        {precioCalculado.desglose.precioManoObra !== undefined && precioCalculado.desglose.precioManoObra > 0 && (
                          <div className={`rounded p-2 ${
                            precioCalculado.desglose.manoObraMode === 'con-base' 
                              ? 'bg-purple-100' 
                              : precioCalculado.desglose.manoObraMode === 'manual' 
                                ? 'bg-blue-100' 
                                : 'bg-green-100'
                          }`}>
                            <div className={`text-xs mb-0.5 ${
                              precioCalculado.desglose.manoObraMode === 'con-base' 
                                ? 'text-purple-700' 
                                : precioCalculado.desglose.manoObraMode === 'manual' 
                                  ? 'text-blue-700' 
                                  : 'text-green-700'
                            }`}>
                              💼 Mano de obra {
                                precioCalculado.desglose.manoObraMode === 'con-base' 
                                  ? 'con base' 
                                  : precioCalculado.desglose.manoObraMode === 'manual' 
                                    ? 'manual' 
                                    : 'sin base'
                              }
                            </div>
                            <div className={`font-bold text-sm ${
                              precioCalculado.desglose.manoObraMode === 'con-base' 
                                ? 'text-purple-900' 
                                : precioCalculado.desglose.manoObraMode === 'manual' 
                                  ? 'text-blue-900' 
                                  : 'text-green-900'
                            }`}>
                              L.{precioCalculado.desglose.precioManoObra.toFixed(2)}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-[10px] text-blue-600 text-center">
                          {precioCalculado.desglose.rangoSticker}
                        </div>
                      </div>
                    )}

                    {/* Desglose para STICKER - COMPACTO */}
                    {precioCalculado.desglose && precioCalculado.desglose.rangoSticker && !precioCalculado.desglose.precioPVC && (
                      <div className="space-y-1.5">
                        <div className="bg-white/60 rounded p-2 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">📐 Área:</span>
                            <span className="font-semibold text-gray-900">
                              {precioCalculado.desglose.areaPulg2.toFixed(2)} pulg²
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">💵 Precio/pulg²:</span>
                            <span className="font-semibold text-blue-700">
                              L.{(precioCalculado.desglose.precioPorPulg2 || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-blue-100 rounded p-2 text-center">
                          <div className="text-xs text-blue-700">🎨 Rango</div>
                          <div className="font-bold text-blue-900 text-xs">
                            {precioCalculado.desglose.rangoSticker}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Desglose para BANNER - COMPACTO */}
                    {precioCalculado.desglose && precioCalculado.desglose.rangoBanner && (
                      <div className="space-y-1.5">
                        <div className="bg-white/60 rounded p-2 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">📐 Área:</span>
                            <span className="font-semibold text-gray-900">
                              {precioCalculado.desglose.areaPulg2.toFixed(2)} pulg²
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-700">💵 Precio/pulg²:</span>
                            <span className="font-semibold text-orange-700">
                              L.{(precioCalculado.desglose.precioPorPulg2 || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-orange-100 rounded p-2 text-center">
                          <div className="text-xs text-orange-700">🎯 Rango</div>
                          <div className="font-bold text-orange-900 text-xs">
                            {precioCalculado.desglose.rangoBanner}
                          </div>
                        </div>

                        {/* Desglose de Ojetes - COMPACTO */}
                        {precioCalculado.desglose.conOjetes && (precioCalculado.desglose.cantidadOjetes || 0) > 0 && (
                          <div className="bg-yellow-100 border border-yellow-400 rounded p-2 space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-yellow-900">⭕ Ojetes:</span>
                              <span className="font-bold text-yellow-900 text-xs">
                                {precioCalculado.desglose.cantidadOjetes || 0} × L.10
                              </span>
                            </div>
                            <div className="pt-1 border-t border-yellow-300 text-[10px] text-yellow-800 wrap-break-word">
                              📍 {precioCalculado.desglose.posicionesOjetes}
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-yellow-300">
                              <span className="text-xs text-yellow-900">💰 Total:</span>
                              <span className="font-bold text-yellow-900 text-sm">
                                L.{(precioCalculado.desglose.costoOjetes || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Precio por unidad - COMPACTO */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-400 rounded p-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-amber-900 text-xs">💵 Precio/unidad</span>
                          <div className="text-[10px] text-amber-700">
                            {tempCatalogo.ancho}×{tempCatalogo.alto} {tempCatalogo.unidad}
                          </div>
                        </div>
                        <span className="text-xl font-bold text-amber-900">
                          L.{precioCalculado.precioUnidad.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Precio total - COMPACTO */}
                    <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500 rounded p-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-green-900">📦 TOTAL</span>
                          <div className="text-xs text-green-700">
                            {tempCatalogo.unidades} unid{tempCatalogo.unidades > 1 ? 's' : ''}
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-green-900">
                          L.{precioCalculado.precioTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón Agregar al Pedido */}
                <Button
                  type="button"
                  onClick={agregarProductoCatalogo}
                  disabled={!precioCalculado}
                  className={`w-full h-14 ${
                    precioCalculado
                      ? 'bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600/90 hover:to-red-700/90'
                      : 'bg-gray-400 cursor-not-allowed'
                  } backdrop-blur-sm text-white shadow-lg shadow-red-500/20 rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/20`}
                >
                  <Plus className="w-5 h-5 mr-3" />
                  <span className="font-semibold">
                    {precioCalculado ? 'Agregar al Pedido' : 'Primero Calcula el Precio'}
                  </span>
                </Button>
              </div>
            )}

            {addMode === 'paquete' && (
              <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-300 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-blue-900">Agregar paquete predefinido</h4>
                    <p className="text-sm text-blue-700 mt-1">Usa los packs y precios creados en Ajustes - Paquetes.</p>
                  </div>
                  <Badge className="bg-blue-600 text-white">Paquetes</Badge>
                </div>

                {productPackages.length === 0 ? (
                  <Alert className="bg-amber-50 border-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <AlertDescription className="text-amber-900">
                      No hay paquetes configurados. Crea tus packs en Ajustes - Paquetes para usarlos aqui.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Paquete *</Label>
                        <Select
                          value={tempPaquete.packageId}
                          onValueChange={(value) => {
                            const pkg = productPackages.find((item) => item.id === value);
                            setTempPaquete({
                              packageId: value,
                              sizeHeader: pkg?.sizeHeaders?.[0] || '',
                              rowId: '',
                              packageCount: 1,
                              notes: '',
                            });
                          }}
                        >
                          <SelectTrigger className="h-12 bg-white">
                            <SelectValue placeholder="Seleccionar paquete" />
                          </SelectTrigger>
                          <SelectContent>
                            {productPackages.filter((pkg) => pkg.activo !== false).map((pkg) => (
                              <SelectItem key={pkg.id} value={pkg.id}>
                                {pkg.name} ({pkg.productType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Medida *</Label>
                        <Select
                          value={tempPaquete.sizeHeader}
                          onValueChange={(value) => setTempPaquete({ ...tempPaquete, sizeHeader: value })}
                          disabled={!selectedPackage}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Seleccionar medida" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPackage?.sizeHeaders.map((header) => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cantidad del paquete *</Label>
                        <Select
                          value={tempPaquete.rowId}
                          onValueChange={(value) => setTempPaquete({ ...tempPaquete, rowId: value })}
                          disabled={!selectedPackage}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Ej: Pack de 50 stickers" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedPackage?.rows.map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.quantityLabel} - {tempPaquete.sizeHeader ? `L ${Number(row.prices?.[tempPaquete.sizeHeader] || 0).toFixed(2)}` : 'elige medida'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cantidad de paquetes</Label>
                        <Input
                          type="number"
                          min="1"
                          value={tempPaquete.packageCount || ''}
                          onChange={(e) => setTempPaquete({ ...tempPaquete, packageCount: parseInt(e.target.value) || 1 })}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Precio fijo</Label>
                        <div className="h-11 rounded-lg border border-blue-200 bg-white px-3 flex items-center justify-between font-bold text-blue-900">
                          <span>Total</span>
                          <span>L {(selectedPackagePrice * (tempPaquete.packageCount || 1)).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Notas opcionales</Label>
                        <Textarea
                          value={tempPaquete.notes}
                          onChange={(e) => setTempPaquete({ ...tempPaquete, notes: e.target.value })}
                          placeholder="Ej: sticker redondo, acabado mate, entrega por lote..."
                          rows={2}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {selectedPackage && selectedPackageRow && tempPaquete.sizeHeader && (
                      <div className="rounded-lg border border-blue-300 bg-white p-3 text-sm text-blue-900">
                        <strong>{selectedPackage.name}</strong> - {selectedPackageRow.quantityLabel} - {tempPaquete.sizeHeader}
                        <div className="text-xs text-blue-700 mt-1">
                          Precio por paquete: L {selectedPackagePrice.toFixed(2)} | Total: L {(selectedPackagePrice * (tempPaquete.packageCount || 1)).toFixed(2)}
                        </div>
                      </div>
                    )}

                    <Button
                      type="button"
                      onClick={agregarProductoPaquete}
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full shadow-lg"
                    >
                      <Plus className="w-5 h-5 mr-3" />
                      <span className="font-semibold">Agregar paquete al pedido</span>
                    </Button>
                  </>
                )}
              </div>
            )}

            {addMode === 'inventario' && (
              <div className="bg-green-50 p-6 rounded-xl border-2 border-green-300 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-green-900">Agregar Producto desde Inventario</h4>
                    <p className="text-sm text-green-700 mt-1">Selecciona productos ya creados en tu inventario</p>
                  </div>
                  <Badge className="bg-green-600">📦 Stock</Badge>
                </div>

                <Button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="w-full h-14 bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600/90 hover:to-red-700/90 backdrop-blur-sm text-white shadow-lg shadow-red-500/20 rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/20"
                >
                  <Search className="w-5 h-5 mr-3" />
                  <span className="font-semibold">Buscar Producto en Inventario</span>
                </Button>
              </div>
            )}

            {addMode === 'externo' && (
              <div className="bg-orange-50 p-6 rounded-xl border-2 border-orange-300 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-orange-900">Agregar Producto Externo</h4>
                    <p className="text-sm text-orange-700 mt-1">Para productos que se comprarán a proveedores externos</p>
                  </div>
                  <Badge className="bg-orange-600">🛒 Externo</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descripción del Producto *</Label>
                    <Textarea
                      value={tempExterno.descripcion}
                      onChange={(e) => setTempExterno({...tempExterno, descripcion: e.target.value})}
                      placeholder="Descripción detallada del producto externo"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Input
                      value={tempExterno.proveedor}
                      onChange={(e) => setTempExterno({...tempExterno, proveedor: e.target.value})}
                      placeholder="Nombre del proveedor"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Costo Estimado</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempExterno.costo_estimado || ''}
                      onChange={(e) => setTempExterno({...tempExterno, costo_estimado: parseFloat(e.target.value) || 0})}
                      placeholder="L. 0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Precio al Cliente *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={tempExterno.precio_cliente || ''}
                      onChange={(e) => setTempExterno({...tempExterno, precio_cliente: parseFloat(e.target.value) || 0})}
                      placeholder="L. 0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={tempExterno.unidades || ''}
                      onChange={(e) => setTempExterno({...tempExterno, unidades: parseInt(e.target.value) || 1})}
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={agregarProductoExterno}
                  className="w-full h-14 bg-gradient-to-r from-red-500/90 to-red-600/90 hover:from-red-600/90 hover:to-red-700/90 backdrop-blur-sm text-white shadow-lg shadow-red-500/20 rounded-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-white/20"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  <span className="font-semibold">Agregar al Pedido</span>
                </Button>
              </div>
            )}

            {/* Tabla de productos agregados (CARRITO) */}
            <div className="mt-8">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Productos del Pedido ({items.length})
              </h4>
              
              {items.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-700">No hay productos agregados al pedido</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className={`border-2 rounded-lg p-4 ${
                      item.origen === 'catalogo' ? 'border-purple-300 bg-purple-50' :
                      item.origen === 'paquete' ? 'border-blue-300 bg-blue-50' :
                      item.origen === 'inventario' ? 'border-green-300 bg-green-50' :
                      'border-orange-300 bg-orange-50'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={
                              item.origen === 'catalogo' ? 'bg-purple-600' :
                              item.origen === 'paquete' ? 'bg-blue-600' :
                              item.origen === 'inventario' ? 'bg-green-600' :
                              'bg-orange-600'
                            }>
                              {item.origen === 'catalogo' ? 'Catalogo' :
                               item.origen === 'paquete' ? 'Paquete' :
                               item.origen === 'inventario' ? 'Inventario' :
                               'Externo'}
                            </Badge>
                            {item.descontar_stock && (
                              <Badge variant="outline" className="bg-yellow-100 border-yellow-400 text-yellow-900">
                                ⚠️ Descontar Stock
                              </Badge>
                            )}
                          </div>
                          
                          <div className="font-bold text-gray-900">{item.descripcion}</div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-gray-700">
                            {item.tipo && <div>Tipo: <strong>{item.tipo}</strong></div>}
                            {item.material && <div>Material: <strong>{item.material}</strong></div>}
                            {item.ancho && item.alto && item.unidad && (() => {
                              const unidadDisplay = {
                                'cm': 'cm',
                                'pulgadas': 'in',
                                'metros': 'm',
                                'pies': 'ft'
                              }[item.unidad] || item.unidad;
                              
                              return (
                                <div>Medidas: <strong>{item.ancho} × {item.alto} {unidadDisplay}</strong></div>
                              );
                            })()}
                            {item.precio_m2 && item.precio_m2 > 0 && (
                              <div>Precio/m²: <strong>L. {item.precio_m2.toFixed(2)}</strong></div>
                            )}
                            {item.sku && <div>SKU: <strong>{item.sku}</strong></div>}
                            {item.proveedor && <div>Proveedor: <strong>{item.proveedor}</strong></div>}
                            {item.stock_disponible !== undefined && (
                              <div>Stock: <strong className={item.stock_disponible < item.unidades ? 'text-red-600' : 'text-green-600'}>
                                {item.stock_disponible}
                              </strong></div>
                            )}
                          </div>

                          {item.notas && (
                            <div className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs text-gray-700">
                              {item.notas}
                            </div>
                          )}

                          {item.tipo_impresion && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                              <div className="font-semibold text-blue-900 flex items-center gap-2">
                                <Star className="w-4 h-4" />
                                Personalización de Prenda
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Talla */}
                                <div>
                                  <Label className="text-xs text-blue-800">Talla</Label>
                                  <Select 
                                    value={item.talla || ''} 
                                    onValueChange={(value) => updateItemShirtOptions(index, 'talla', value)}
                                  >
                                    <SelectTrigger className="h-9 bg-white">
                                      <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map(t => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Color */}
                                <div>
                                  <Label className="text-xs text-blue-800">Color</Label>
                                  <Input 
                                    value={item.color || ''} 
                                    onChange={(e) => updateItemShirtOptions(index, 'color', e.target.value)}
                                    className="h-9 bg-white"
                                    placeholder="Ej. Azul Marino"
                                  />
                                </div>

                                <div>
                                  <Label className="text-xs text-blue-800">Tipo de impresión</Label>
                                  <Select 
                                    value={item.tipo_impresion} 
                                    onValueChange={(value) => updateItemShirtOptions(index, 'tipo_impresion', value)}
                                  >
                                    <SelectTrigger className="h-9 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="sublimada">🎨 Sublimada</SelectItem>
                                      <SelectItem value="vinil">✂️ Vinil</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs text-blue-800">Lados a imprimir</Label>
                                  <Select 
                                    value={String(item.numero_lados)} 
                                    onValueChange={(value) => updateItemShirtOptions(index, 'numero_lados', Number(value))}
                                  >
                                    <SelectTrigger className="h-9 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1">1 Lado</SelectItem>
                                      <SelectItem value="2">2 Lados</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <Label className="text-xs text-blue-800">
                                    {item.numero_lados === 2 ? 'Diseño Lado 1' : 'Nivel de diseño'}
                                  </Label>
                                  <Select 
                                    value={item.nivel_diseno_lado1} 
                                    onValueChange={(value) => updateItemShirtOptions(index, 'nivel_diseno_lado1', value)}
                                  >
                                    <SelectTrigger className="h-9 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="basico">⭐ Básico (+L.50)</SelectItem>
                                      <SelectItem value="intermedio">⭐⭐ Intermedio (+L.100)</SelectItem>
                                      <SelectItem value="avanzado">⭐⭐⭐ Avanzado (+L.200)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {item.numero_lados === 2 && (
                                  <div>
                                    <Label className="text-xs text-blue-800">Diseño Lado 2</Label>
                                    <Select 
                                      value={item.nivel_diseno_lado2 || 'basico'} 
                                      onValueChange={(value) => updateItemShirtOptions(index, 'nivel_diseno_lado2', value)}
                                    >
                                      <SelectTrigger className="h-9 bg-white">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="basico">⭐ Básico (+L.50)</SelectItem>
                                        <SelectItem value="intermedio">⭐⭐ Intermedio (+L.100)</SelectItem>
                                        <SelectItem value="avanzado">⭐⭐⭐ Avanzado (+L.200)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-blue-200 text-xs text-blue-900">
                                <div className="flex justify-between">
                                  <span>Costo base de la prenda:</span>
                                  <span className="font-semibold">L. {item.precio_unitario.toFixed(2)}</span>
                                </div>
                                {item.costo_diseno && item.costo_diseno > 0 && (
                                  <div className="flex justify-between text-blue-700">
                                    <span>+ Costo de diseño:</span>
                                    <span className="font-semibold">L. {item.costo_diseno.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-blue-300">
                                  <span>Total por unidad:</span>
                                  <span className="text-green-700">L. {(item.precio_unitario + (item.costo_diseno || 0)).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs text-gray-800">Cantidad</div>
                            <Input
                              type="number"
                              min="1"
                              value={item.unidades}
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20 text-center"
                            />
                          </div>
                          
                          <div className="text-right">
                            <div className="text-xs text-gray-800">Precio Unit.</div>
                            <div className="font-bold">L. {item.precio_unitario.toFixed(2)}</div>
                          </div>
                          
                          <div className="text-right min-w-[100px]">
                            <div className="text-xs text-gray-800">Subtotal</div>
                            <div className="text-lg font-bold text-green-600">L. {item.subtotal.toFixed(2)}</div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sección de Archivos Adjuntos */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Paperclip className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Archivos Adjuntos</h4>
                      <p className="text-sm text-gray-800">Fotos, documentos, PDFs, etc. Se enviarán a Trello automáticamente</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-semibold text-purple-700 border-purple-300 bg-white">
                    {attachedFiles.length === 0 ? 'Sin archivos' : attachedFiles.length === 1 ? '1 archivo' : `${attachedFiles.length} archivos`}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer">
                    <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/90 to-indigo-600/90 hover:from-purple-600/90 hover:to-indigo-700/90 backdrop-blur-sm text-white rounded-full shadow-lg shadow-purple-500/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border border-white/20">
                      <Upload className="w-5 h-5" />
                      <span className="font-semibold">Subir Archivos</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  
                  <div className="text-xs text-gray-700 bg-white/50 px-3 py-2 rounded-full border border-gray-300">
                    💡 Puedes seleccionar múltiples archivos a la vez
                  </div>
                </div>
                
                {/* Lista de archivos adjuntos */}
                {attachedFiles.length > 0 ? (
                  <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {attachedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        const fileIcon = getFileIcon(file.type);
                        const fileSizeKB = (file.size / 1024).toFixed(1);
                        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                        const sizeDisplay = file.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
                        
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg group hover:border-purple-300 hover:shadow-md transition-all">
                            {isImage ? (
                              <img 
                                src={file.data} 
                                alt={file.name} 
                                className="w-12 h-12 object-cover rounded border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-2xl shrink-0">
                                {fileIcon}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-700">
                                {file.type || 'Archivo'} • {sizeDisplay}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 p-2 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              aria-label={`Eliminar archivo ${file.name}`}
                              title={`Eliminar archivo ${file.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-md border border-dashed border-purple-300">
                    <Paperclip className="w-12 h-12 text-purple-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 mb-1">No hay archivos adjuntos</p>
                    <p className="text-xs text-gray-600">Haz clic en "Subir Archivos" para agregar fotos, documentos, etc.</p>
                  </div>
                )}
              </div>
            </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: PAGO Y DOCUMENTOS FISCALES */}
          <TabsContent value="pago" className="mt-6">
            {/* Sección de Documentos Fiscales */}
            <Card className="border border-gray-200 shadow-sm mb-6">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  Documentos Fiscales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <Alert className="bg-cyan-50 border-cyan-200">
                  <FileText className="w-4 h-4 text-cyan-700" />
                  <AlertDescription className="text-cyan-900 text-sm">
                    Primero selecciona si el pedido llevará factura o recibo. Luego elige si se genera ahora o después.
                  </AlertDescription>
                </Alert>

                <RadioGroup
                  value={fiscalDocumentType}
                  onValueChange={(value) => {
                    setFiscalDocumentType(value as 'FACTURA' | 'RECIBO');
                    setDocType('');
                    setLinkedBillingDocument(null);
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  {[
                    { value: 'FACTURA', label: 'Factura', desc: 'Documento fiscal o proforma' },
                    { value: 'RECIBO', label: 'Recibo', desc: 'Comprobante de pago' },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className={`selection-card flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer ${
                        fiscalDocumentType === option.value ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={`fiscal-doc-${option.value}`} />
                      <Label htmlFor={`fiscal-doc-${option.value}`} className="cursor-pointer">
                        <span className="block font-semibold text-slate-900">{option.label}</span>
                        <span className="block text-xs text-slate-600">{option.desc}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {fiscalDocumentType && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">
                      {fiscalDocumentType === 'FACTURA' ? 'Opciones para factura' : 'Opciones para recibo'}
                    </p>
                    <RadioGroup
                      value={docType}
                      onValueChange={(value) => {
                        setDocType(value as 'FACTURA' | 'PROFORMA' | 'RECIBO' | 'DESPUES');
                        setLinkedBillingDocument(null);
                      }}
                      className={`grid grid-cols-1 gap-3 ${fiscalDocumentType === 'FACTURA' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
                    >
                      {(fiscalDocumentType === 'FACTURA'
                        ? [
                            { value: 'FACTURA', label: 'Factura', desc: 'Generar factura ahora' },
                            { value: 'PROFORMA', label: 'Factura proforma', desc: 'Generar proforma ahora' },
                            { value: 'DESPUES', label: 'Generar después', desc: 'Sin vincular ahora' },
                          ]
                        : [
                            { value: 'RECIBO', label: 'Generar ahora', desc: 'Crear y vincular recibo' },
                            { value: 'DESPUES', label: 'Generar después', desc: 'Sin vincular ahora' },
                          ]
                      ).map((option) => (
                        <div
                          key={option.value}
                          className={`selection-card flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer ${
                            docType === option.value ? 'border-cyan-500 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <RadioGroupItem value={option.value} id={`doc-option-${fiscalDocumentType}-${option.value}`} />
                          <Label htmlFor={`doc-option-${fiscalDocumentType}-${option.value}`} className="cursor-pointer">
                            <span className="block font-semibold text-slate-900">{option.label}</span>
                            <span className="block text-xs text-slate-600">{option.desc}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {docType && docType !== 'DESPUES' && !linkedBillingDocument && (
                  <Button
                    type="button"
                    onClick={() => openBillingPreview(docType === 'FACTURA' ? 'emitida' : docType === 'RECIBO' ? 'recibo' : 'proforma')}
                    className="h-14 w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {docType === 'FACTURA' ? 'Generar factura' : docType === 'RECIBO' ? 'Generar recibo' : 'Generar factura proforma'}
                  </Button>
                )}

                {linkedBillingDocument ? (
                  <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-green-900">Documento vinculado al pedido</p>
                      <p className="text-sm text-green-800">
                        {linkedBillingDocument.tipo === 'emitida' ? 'Factura' : linkedBillingDocument.tipo === 'recibo' ? 'Recibo' : 'Factura proforma'} {linkedBillingDocument.numeroFactura || linkedBillingDocument.numeroRecibo || linkedBillingDocument.id} - {linkedBillingDocument.clienteNombre}
                      </p>
                    </div>
                    <Badge className="bg-green-700 text-white">L {Number(linkedBillingDocument.total || 0).toFixed(2)}</Badge>
                  </div>
                ) : docType === 'DESPUES' ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
                    El pedido se guardará sin documento vinculado. Podrás emitirlo después desde Facturación.
                  </div>
                ) : fiscalDocumentType ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
                    Selecciona una opción para continuar con el documento fiscal.
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
                    Selecciona factura o recibo para ver sus opciones.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sección de Información de Pago */}
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="bg-white border-b border-gray-100">
                <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                  <DollarSign className="w-5 h-5 text-cyan-500" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
            {/* ⭐ NUEVO: Estado de Pago - Botones Visuales */}
            <div className="space-y-3">
              <Label className="text-xs font-medium flex items-center gap-2">
                <span className="text-base">💰</span>
                ¿El cliente ya pagó?
              </Label>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Botón: PENDIENTE */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PENDIENTE');
                    setAbono(0);
                  }}
                  className={`relative p-2 rounded-xl border-2 transition-all duration-200 ${
                    paymentStatus === 'PENDIENTE'
                      ? 'border-red-500 bg-red-50 shadow-md scale-[1.02]'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      paymentStatus === 'PENDIENTE' ? 'bg-red-500' : 'bg-gray-200'
                    }`}>
                      <span className="text-base">{paymentStatus === 'PENDIENTE' ? '⏳' : '⭕'}</span>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-[10px] uppercase tracking-tight ${
                        paymentStatus === 'PENDIENTE' ? 'text-red-700' : 'text-gray-600'
                      }`}>
                        PENDIENTE
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-none">Sin pago</p>
                    </div>
                  </div>
                  {paymentStatus === 'PENDIENTE' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>

                {/* Botón: PARCIAL */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PARCIAL');
                    if (abono === 0 || abono >= totales.total) {
                      setAbono(round2(totales.total / 2)); // Sugerencia: 50%
                    }
                  }}
                  className={`relative p-2 rounded-xl border-2 transition-all duration-200 ${
                    paymentStatus === 'PARCIAL'
                      ? 'border-yellow-500 bg-yellow-50 shadow-md scale-[1.02]'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      paymentStatus === 'PARCIAL' ? 'bg-yellow-500' : 'bg-gray-200'
                    }`}>
                      <span className="text-base">{paymentStatus === 'PARCIAL' ? '💵' : '⭕'}</span>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-[10px] uppercase tracking-tight ${
                        paymentStatus === 'PARCIAL' ? 'text-yellow-700' : 'text-gray-600'
                      }`}>
                        ABONO
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-none">Pago parcial</p>
                    </div>
                  </div>
                  {paymentStatus === 'PARCIAL' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>

                {/* Botón: PAGADO */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus('PAGADO');
                    setAbono(round2(totales.total));
                  }}
                  className={`relative p-2 rounded-xl border-2 transition-all duration-200 ${
                    paymentStatus === 'PAGADO'
                      ? 'border-green-500 bg-green-50 shadow-md scale-[1.02]'
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      paymentStatus === 'PAGADO' ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      <span className="text-base">{paymentStatus === 'PAGADO' ? '✅' : '⭕'}</span>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-[10px] uppercase tracking-tight ${
                        paymentStatus === 'PAGADO' ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        PAGADO
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5 leading-none">Pago completo</p>
                    </div>
                  </div>
                  {paymentStatus === 'PAGADO' && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                      <span className="text-white text-[10px]">✓</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Indicador de estado actual */}
              <Alert className={`py-1.5 px-3 ${
                paymentStatus === 'PENDIENTE' ? 'bg-red-50 border-red-200' :
                paymentStatus === 'PARCIAL' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              }`}>
                <AlertCircle className={`w-3 h-3 ${
                  paymentStatus === 'PENDIENTE' ? 'text-red-700' :
                  paymentStatus === 'PARCIAL' ? 'text-yellow-700' :
                  'text-green-700'
                }`} />
                <AlertDescription className={`text-[10px] leading-tight ${
                  paymentStatus === 'PENDIENTE' ? 'text-red-800' :
                  paymentStatus === 'PARCIAL' ? 'text-yellow-800' :
                  'text-green-800'
                }`}>
                  {paymentStatus === 'PENDIENTE' && '⏳ Pedido marcado como PENDIENTE DE PAGO'}
                  {paymentStatus === 'PARCIAL' && '💵 El cliente hizo un abono. Ingresa el monto abajo'}
                  {paymentStatus === 'PAGADO' && '✅ El pedido está completamente pagado'}
                </AlertDescription>
              </Alert>
            </div>

            {/* Información sobre ISV */}
            <Alert className="bg-gray-50 border-gray-200">
              <Receipt className="w-4 h-4 text-gray-800" />
              <AlertDescription className="text-gray-900 text-sm">
                ISV ({settings.isv_percent || 15}%) incluido automáticamente en todos los precios
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">💵 Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">🏦 Transferencia</SelectItem>
                    <SelectItem value="TARJETA">💳 Tarjeta</SelectItem>
                    <SelectItem value="MIXTO">🔄 Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {paymentStatus === 'PAGADO' ? 'Monto Pagado (Total)' : 'Abono (si aplica)'}
                  {paymentStatus === 'PAGADO' && (
                    <Badge className="bg-green-500 text-white text-xs">Automático</Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={totales.total}
                  value={abono || ''}
                  onChange={(e) => {
                    const valor = parseFloat(e.target.value) || 0;
                    setAbono(round2(valor));
                    // Actualizar el estado automáticamente
                    if (valor === 0) {
                      setPaymentStatus('PENDIENTE');
                    } else if (valor >= totales.total) {
                      setPaymentStatus('PAGADO');
                    } else {
                      setPaymentStatus('PARCIAL');
                    }
                  }}
                  placeholder="L. 0.00"
                  disabled={paymentStatus === 'PENDIENTE'}
                  className={paymentStatus === 'PENDIENTE' ? 'bg-gray-100' : ''}
                />
              </div>
            </div>

            {/* 📎 CAMPOS ESPECÍFICOS PARA TRANSFERENCIA */}
            {paymentMethod === 'TRANSFERENCIA' && (
              <div className="mt-4 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl space-y-4">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2 text-sm">
                  🏦 Detalles de la Transferencia
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Referencia de Transferencia</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Ej: TRF-123456789"
                      className="h-11 border-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Banco</Label>
                    <Select 
                      value={paymentBank} 
                      onValueChange={setPaymentBank}
                    >
                      <SelectTrigger className="h-11 border-2">
                        <SelectValue placeholder="Seleccionar banco" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bac">BAC Credomatic</SelectItem>
                        <SelectItem value="atlantida">Banco Atlántida</SelectItem>
                        <SelectItem value="occidente">Banco de Occidente</SelectItem>
                        <SelectItem value="ficohsa">Ficohsa</SelectItem>
                        <SelectItem value="banpais">Banpaís</SelectItem>
                        <SelectItem value="davivienda">Davivienda</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 📎 CAMPO DE COMPROBANTE DE PAGO */}
                <div className="space-y-3 pt-2 border-t-2 border-blue-300">
                  <Label className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    📎 Comprobante de Pago
                    <span className="text-xs font-normal text-gray-600">(Obligatorio para cierre de caja)</span>
                  </Label>
                  
                  {!paymentProof ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handlePaymentProofUpload}
                        className="hidden"
                        id="payment-proof-upload"
                      />
                      <label
                        htmlFor="payment-proof-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all border-blue-400 bg-blue-50 hover:bg-blue-100 hover:border-blue-500"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-10 h-10 text-blue-500 mb-2" />
                          <p className="text-sm font-medium text-blue-700">
                            Haz clic para subir comprobante
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            JPG, PNG, WEBP o PDF (máx. 5MB)
                          </p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-400 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-900 text-sm">
                            {paymentProofName}
                          </p>
                          <p className="text-xs text-green-700">
                            Comprobante adjuntado correctamente
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removePaymentProof}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="w-4 h-4 text-yellow-700" />
                    <AlertDescription className="text-xs text-yellow-800">
                      💡 Los comprobantes de pago se guardarán permanentemente y estarán disponibles en el cierre de caja
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-700" />
                <div>
                  <p className="font-semibold text-slate-900">Documento fiscal vinculado</p>
                  <p className="text-xs text-slate-700">Ya no se sube manualmente. Se genera o se vincula desde el modulo Facturacion.</p>
                </div>
              </div>
            </div>

            {/* Resumen de Pago */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-cyan-500" />
                  Resumen de Pago
                </h4>
                <Badge variant="outline" className="text-xs">
                  ISV incluido
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal (sin ISV):</span>
                  <strong>L. {totales.subtotal.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ISV ({settings.isv_percent || 15}%) incluido:</span>
                  <strong>+ L. {totales.isv.toFixed(2)}</strong>
                </div>
                {descuentoTransferido > 0 && (
                  <div className="flex justify-between text-sm bg-amber-50 -mx-2 px-2 py-1 rounded">
                    <span className="text-amber-900 font-medium flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      Descuento Especial:
                    </span>
                    <strong className="text-amber-700">- L. {descuentoTransferido.toFixed(2)}</strong>
                  </div>
                )}
                <div className="h-px bg-green-300"></div>
                <div className="flex justify-between">
                  <span className="font-bold">TOTAL:</span>
                  <strong className="text-xl text-green-700">L. {totales.total.toFixed(2)}</strong>
                </div>
                {abono > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Abono:</span>
                      <strong className="text-blue-600">- L. {abono.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold">Saldo Pendiente:</span>
                      <strong className="text-orange-600">L. {totales.pendiente.toFixed(2)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 5. CALCULADORA DE CAMBIO (EFECTIVO) ========== */}
        {paymentMethod === 'EFECTIVO' && (
          <Card className="border border-gray-200">
            <CardHeader className="bg-white border-b border-gray-100">
              <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                <Calculator className="w-5 h-5 text-cyan-500" />
                Calculadora de Cambio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Resumen siempre visible */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-2 border-blue-200 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total a Pagar:</span>
                  <strong className="text-gray-900">L. {totales.total.toFixed(2)}</strong>
                </div>
                {abono > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Abono del Cliente:</span>
                      <strong className="text-blue-600">- L. {abono.toFixed(2)}</strong>
                    </div>
                    <div className="h-px bg-blue-200"></div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 font-semibold">Saldo Pendiente:</span>
                      <strong className="text-orange-600 text-base">L. {totales.pendiente.toFixed(2)}</strong>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="efectivo-recibido" className="text-sm font-medium">
                  Efectivo Recibido {abono > 0 ? '(para el saldo pendiente)' : ''}
                </Label>
                <Input
                  id="efectivo-recibido"
                  type="number"
                  step="0.01"
                  min="0"
                  value={recibido || ''}
                  onChange={(e) => setRecibido(parseFloat(e.target.value) || 0)}
                  placeholder="L. 0.00"
                  className="text-lg h-12"
                />
              </div>

              {recibido > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">{abono > 0 ? 'Monto del Abono:' : 'Total a Pagar:'}</span>
                    <strong className="text-purple-600 text-base">L. {(abono > 0 ? abono : totales.total).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">Efectivo Recibido:</span>
                    <strong className="text-gray-900">L. {recibido.toFixed(2)}</strong>
                  </div>
                  <div className="h-px bg-gray-200"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">Cambio a devolver:</span>
                    <strong className="text-2xl text-cyan-600">
                      L. {totales.cambio.toFixed(2)}
                    </strong>
                  </div>
                  {recibido < (abono > 0 ? abono : totales.total) && (
                    <Alert className="bg-red-50 border-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 font-bold">
                        ⚠️ El monto recibido es INSUFICIENTE (falta L. {((abono > 0 ? abono : totales.total) - recibido).toFixed(2)})
                      </AlertDescription>
                    </Alert>
                  )}
                  {recibido >= (abono > 0 ? abono : totales.total) && totales.cambio > 0 && (
                    <Alert className="bg-green-50 border-green-300">
                      <Check className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800 font-bold">
                        ✅ Devuelve L. {totales.cambio.toFixed(2)} al cliente
                      </AlertDescription>
                    </Alert>
                  )}
                  {recibido >= (abono > 0 ? abono : totales.total) && totales.cambio === 0 && (
                    <Alert className="bg-blue-50 border-blue-300">
                      <Check className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 font-bold">
                        ✅ Monto exacto - No hay cambio
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* NOTA: Información de Pago Completa */}
        <Alert className="bg-blue-50 border-blue-300">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            💡 <strong>Después de guardar el pedido</strong>, podrás marcarlo como pagado desde la lista de pedidos. Esto generará automáticamente un recibo y registrará el pago completo.
          </AlertDescription>
        </Alert>

        {/* Botones de Acción */}
        <div className="flex flex-col gap-4 pt-6 border-t-2">
          {/* 📅 ALERTA: SIN DÍA OPERATIVO */}
          {!hasDayOpen && (
            <Alert className="bg-red-50 border-red-400 border-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>⚠️ No hay día operativo abierto.</strong> Debes abrir un día para poder guardar pedidos. El botón "Guardar Pedido" está deshabilitado.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Información de integraciones */}
          {settings.trello_enabled && settings.trello_list_production && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-2">
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-blue-900">✅ Trello Conectado</p>
                  <p className="text-sm text-blue-700">Al guardar el pedido se abrirá el configurador para crear la tarjeta automáticamente</p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje si Trello no esta configurado */}
          {!settings.trello_enabled && (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <strong>Trello no configurado.</strong> Ve a <span className="text-blue-600 font-medium">Ajustes - Integracion Trello</span> para crear la tarjeta automaticamente al guardar.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Botones principales */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              type="submit"
              disabled={loading || items.length === 0 || !docType || !hasDayOpen}
              className="px-8 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>Guardando...</>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {settings.trello_enabled && settings.trello_list_production 
                    ? 'Guardar y Crear Tarjeta' 
                    : 'Guardar Pedido'}
                </>
              )}
            </Button>
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </form>

      {/* Modal de búsqueda de productos */}
      <ProductSearchDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        products={products}
        onSelectProduct={(product) => {
          agregarProductoInventario(product);
          setShowProductSearch(false);
        }}
      />

      {/* Modal de configuración de Trello */}
      <TrelloCardConfigDialog
        open={showTrelloConfig}
        onOpenChange={setShowTrelloConfig}
        onConfirm={handleTrelloConfigConfirm}
        defaultListId={settings.trello_list_production}
      />
    </div>
  );
}

