import React, { useState, useEffect, useMemo } from 'react';
import { safeParse } from '../../utils/safe-parse';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { 
  ArrowLeft, Plus, Trash2, FileText, Check, Calculator, Package, 
  ShoppingCart, AlertCircle, DollarSign
} from 'lucide-react';
import { calculatePVCPrice, calculatePVCWithStickerPrice, PVC_THICKNESS_PRICES, PVC_BASE_PRICES } from '../../utils/pvcPricing';
import { calculateStickerPrice, calculateBannerPrice } from '../../utils/stickerBannerPricing';
import { extractPriceConfig, getUsablePriceConfig, writeStoredPriceConfig } from '../../utils/price-config';
import type { ProductPackage, PackageRow } from '../../types/product-package';
import ProductSearchDialog from '../Orders/ProductSearchDialog';

interface QuoteFormViewProps {
  quoteId?: string;
  onBack: () => void;
  onNavigate: (view: any, data?: any) => void;
}

type OrigenProducto = 'catalogo' | 'paquete' | 'inventario' | 'externo';
type UnidadMedida = 'cm' | 'pulgadas' | 'metros' | 'pies';

const PACKAGES_STORAGE_KEY = 'esmark_product_packages';

function normalizeProductPackages(value: any): ProductPackage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((pkg) => pkg && typeof pkg === 'object')
    .map((pkg, index) => ({
      id: String(pkg.id || `pkg-${index}`),
      name: String(pkg.name || 'Paquete sin nombre'),
      productType: String(pkg.productType || 'Servicio'),
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

interface QuoteItem {
  id?: string;
  origen: OrigenProducto;
  
  // Para origen inventario
  product_id?: string;
  sku?: string;
  product_name?: string;
  
  // Campos comunes
  descripcion: string;
  
  // Para catálogo/medidas
  tipo?: string;
  material?: string;
  ancho?: number;
  alto?: number;
  unidad?: UnidadMedida;
  precio_m2?: number;
  
  // Para externo
  proveedor?: string;
  costo_estimado?: number;
  
  // Comunes
  unidades: number;
  precio_unitario: number;
  subtotal: number;
  descontar_stock: boolean;
  notas?: string;
  
  // Extra info
  stock_disponible?: number;
  categoria?: string;
}

export default function QuoteFormView({ quoteId, onBack, onNavigate }: QuoteFormViewProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Datos
  const [settings, setSettings] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [productPackages, setProductPackages] = useState<ProductPackage[]>([]);
  const [priceConfig, setPriceConfig] = useState<any>({});

  // Cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Productos
  const [addMode, setAddMode] = useState<OrigenProducto>('catalogo');
  const [items, setItems] = useState<QuoteItem[]>([]);
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
    pvc_grosor: '',
    pvc_con_base: false,
    pvc_mano_obra_mode: 'sin-base' as 'sin-base' | 'con-base' | 'manual',
    pvc_mano_obra_manual: 0,
    banner_con_ojetes: false,
    banner_cantidad_ojetes: 0,
    banner_posiciones_ojetes: '',
    banner_ojetes_grid: [] as number[]
  });

  // Form temporal para productos de inventario
  const [tempInventario, setTempInventario] = useState({
    product_id: '',
    unidades: 1,
    descripcion: ''
  });

  const [tempPaquete, setTempPaquete] = useState({
    packageId: '',
    sizeHeader: '',
    rowId: '',
    packageCount: 1,
    notes: ''
  });

  // Form temporal para productos externos
  const [tempExterno, setTempExterno] = useState({
    descripcion: '',
    proveedor: '',
    unidades: 1,
    costo_estimado: 0
  });

  // Precio calculado
  const [precioCalculado, setPrecioCalculado] = useState<any>(null);

  const incluirISV = true; // Siempre incluye ISV en cotizaciones

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, productsData, priceConfigData, catalogProductsData, packagesData] = await Promise.all([
        api.getSettings(),
        api.getProducts(),
        api.getPriceConfig(),
        api.getCatalogProducts(),
        api.getProductPackages()
      ]);
      
      setSettings(settingsData.settings || {});
      setProducts(productsData.products || []);
      const resolvedPriceConfig = getUsablePriceConfig(extractPriceConfig(priceConfigData));
      writeStoredPriceConfig(resolvedPriceConfig);
      setPriceConfig(resolvedPriceConfig);
      const loadedPackages = normalizeProductPackages(packagesData.packages || (settingsData.settings as any)?.product_packages);
      const fallbackPackages = loadStoredProductPackages();
      setProductPackages(loadedPackages.length > 0 ? loadedPackages : fallbackPackages);
      const catalogData = (catalogProductsData.products || []).filter((p: any) => p.activo !== false && p.active !== false);
      if (catalogData.length > 0) {
        localStorage.setItem('esmark_catalog_products', JSON.stringify(catalogData));
      }
      const localCatalog = JSON.parse(localStorage.getItem('esmark_catalog_products') || '[]');
      const activeCatalog = catalogData.length > 0
        ? catalogData
        : (Array.isArray(localCatalog) ? localCatalog : []).filter((p: any) => p.activo !== false);
      setCatalogProducts(activeCatalog);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // ========== CÁLCULO DE PRECIO CATÁLOGO ==========
  
  const calcularPrecioCatalogo = () => {
    if (!tempCatalogo.tipo) {
      setError('Selecciona un tipo de producto');
      return;
    }

    if (!tempCatalogo.ancho || !tempCatalogo.alto) {
      setError('Ingresa ancho y alto');
      return;
    }

    // Convertir medidas a metros
    let anchoM = 0;
    let altoM = 0;
    
    if (tempCatalogo.unidad === 'cm') {
      anchoM = tempCatalogo.ancho / 100;
      altoM = tempCatalogo.alto / 100;
    } else if (tempCatalogo.unidad === 'pulgadas') {
      anchoM = tempCatalogo.ancho * 0.0254;
      altoM = tempCatalogo.alto * 0.0254;
    } else if (tempCatalogo.unidad === 'metros') {
      anchoM = tempCatalogo.ancho;
      altoM = tempCatalogo.alto;
    } else if (tempCatalogo.unidad === 'pies') {
      anchoM = tempCatalogo.ancho * 0.3048;
      altoM = tempCatalogo.alto * 0.3048;
    }

    let resultado: any = null;

    // Determinar tipo de producto y calcular
    const tipoLower = tempCatalogo.tipo.toLowerCase();

    if (tipoLower.includes('pvc')) {
      // PVC con Sticker
      if (!tempCatalogo.pvc_grosor) {
        setError('Selecciona el grosor del PVC');
        return;
      }
      
      console.log('🔍 QuoteForm PVC Calculation - Input:', {
        ancho: tempCatalogo.ancho,
        alto: tempCatalogo.alto,
        unidad: tempCatalogo.unidad,
        anchoM,
        altoM,
        grosor: tempCatalogo.pvc_grosor,
        unidades: tempCatalogo.unidades
      });
      
      const pvcCalc = calculatePVCWithStickerPrice(anchoM, altoM, tempCatalogo.unidades, parseFloat(tempCatalogo.pvc_grosor));
      
      // Agregar precio de mano de obra según modo seleccionado
      let precioManoObra = 0;
      if (tempCatalogo.pvc_mano_obra_mode === 'sin-base') {
        precioManoObra = PVC_BASE_PRICES.WITHOUT_BASE;
      } else if (tempCatalogo.pvc_mano_obra_mode === 'con-base') {
        precioManoObra = PVC_BASE_PRICES.WITH_BASE;
      } else if (tempCatalogo.pvc_mano_obra_mode === 'manual') {
        precioManoObra = tempCatalogo.pvc_mano_obra_manual || 0;
      }
      
      const precioTotalConManoObra = pvcCalc.totalPrice + (precioManoObra * tempCatalogo.unidades);
      
      resultado = {
        ...pvcCalc,
        totalPrice: precioTotalConManoObra,
        pricePerUnit: pvcCalc.pricePerUnit + precioManoObra,
        precioManoObra: precioManoObra,
        manoObraMode: tempCatalogo.pvc_mano_obra_mode,
        conBase: tempCatalogo.pvc_mano_obra_mode === 'con-base'
      };
      
      console.log('✅ QuoteForm PVC Calculation Result:', resultado);
    } else if (tipoLower.includes('sticker') || tipoLower.includes('calcoman')) {
      // Sticker
      resultado = calculateStickerPrice(anchoM, altoM, tempCatalogo.unidades);
    } else if (tipoLower.includes('banner') || tipoLower.includes('lona')) {
      // Banner con ojetes opcionales
      const ojetesPorUnidad = (tempCatalogo.banner_ojetes_grid?.length || 0) * 10;
      const bannerCalc = calculateBannerPrice(anchoM, altoM, tempCatalogo.unidades);
      const costoOjetesTotal = ojetesPorUnidad * tempCatalogo.unidades;
      resultado = {
        ...bannerCalc,
        totalPrice: bannerCalc.totalPrice + costoOjetesTotal,
        pricePerUnit: bannerCalc.pricePerUnit + ojetesPorUnidad,
        costoOjetes: costoOjetesTotal,
        conOjetes: ojetesPorUnidad > 0,
        cantidadOjetes: tempCatalogo.banner_ojetes_grid?.length || 0,
        posicionesOjetes: tempCatalogo.banner_posiciones_ojetes || ''
      };
    } else {
      setError('Tipo de producto no reconocido para cálculo automático');
      return;
    }

    setPrecioCalculado(resultado);
    setError('');
    setSuccess(`✅ Precio calculado: L.${resultado.totalPrice.toFixed(2)}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // ========== AGREGAR PRODUCTO ==========
  
  const agregarProductoCatalogo = () => {
    if (!tempCatalogo.tipo || !tempCatalogo.ancho || !tempCatalogo.alto || !tempCatalogo.unidades) {
      setError('Completa todos los campos requeridos');
      return;
    }

    if (!precioCalculado) {
      setError('Primero calcula el precio');
      return;
    }

    const newItem: QuoteItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      origen: 'catalogo',
      tipo: tempCatalogo.tipo,
      ancho: tempCatalogo.ancho,
      alto: tempCatalogo.alto,
      unidad: tempCatalogo.unidad,
      descripcion: tempCatalogo.descripcion || `${tempCatalogo.tipo} ${tempCatalogo.ancho}×${tempCatalogo.alto} ${tempCatalogo.unidad}`,
      unidades: tempCatalogo.unidades,
      precio_unitario: precioCalculado.pricePerUnit || 0,
      subtotal: precioCalculado.totalPrice || 0,
      descontar_stock: tempCatalogo.descontar_stock,
      sku: tempCatalogo.sku_vinculado,
      notas: tempCatalogo.banner_con_ojetes ? `Con ${tempCatalogo.banner_ojetes_grid?.length || 0} ojetes` : ''
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
      banner_ojetes_grid: []
    });
    setPrecioCalculado(null);
    setSuccess('✅ Producto agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoInventario = () => {
    if (!tempInventario.product_id || !tempInventario.unidades) {
      setError('Selecciona un producto y cantidad');
      return;
    }

    const product = products.find(p => p.id === tempInventario.product_id);
    if (!product) {
      setError('Producto no encontrado');
      return;
    }

    const newItem: QuoteItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      origen: 'inventario',
      product_id: product.id,
      sku: product.code,
      product_name: product.name,
      descripcion: tempInventario.descripcion || product.name,
      categoria: product.category,
      unidades: tempInventario.unidades,
      precio_unitario: product.price || 0,
      subtotal: (product.price || 0) * tempInventario.unidades,
      descontar_stock: true,
      stock_disponible: product.stock
    };

    setItems([...items, newItem]);
    
    // Reset form
    setTempInventario({
      product_id: '',
      unidades: 1,
      descripcion: ''
    });
    setSuccess('✅ Producto agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoExterno = () => {
    if (!tempExterno.descripcion || !tempExterno.unidades || !tempExterno.costo_estimado) {
      setError('Completa todos los campos');
      return;
    }

    const newItem: QuoteItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      origen: 'externo',
      descripcion: tempExterno.descripcion,
      proveedor: tempExterno.proveedor,
      unidades: tempExterno.unidades,
      precio_unitario: tempExterno.costo_estimado,
      subtotal: tempExterno.costo_estimado * tempExterno.unidades,
      descontar_stock: false
    };

    setItems([...items, newItem]);
    
    // Reset form
    setTempExterno({
      descripcion: '',
      proveedor: '',
      unidades: 1,
      costo_estimado: 0
    });
    setSuccess('✅ Producto agregado');
    setTimeout(() => setSuccess(''), 2000);
  };

  const agregarProductoPaquete = () => {
    if (!selectedPackage) {
      setError('Selecciona un paquete');
      return;
    }

    if (!tempPaquete.sizeHeader) {
      setError('Selecciona la medida del paquete');
      return;
    }

    if (!selectedPackageRow) {
      setError('Selecciona la cantidad incluida del paquete');
      return;
    }

    if (selectedPackagePrice <= 0) {
      setError('Este paquete no tiene precio configurado para esa medida');
      return;
    }

    const packageCount = tempPaquete.packageCount || 1;
    const descripcion = `${selectedPackage.name} - ${selectedPackageRow.quantityLabel} - ${tempPaquete.sizeHeader}`;
    const newItem: QuoteItem = {
      id: `item_${Date.now()}_${Math.random()}`,
      origen: 'paquete',
      tipo: selectedPackage.productType,
      descripcion,
      unidades: packageCount,
      precio_unitario: selectedPackagePrice,
      subtotal: selectedPackagePrice * packageCount,
      descontar_stock: false,
      notas: [
        `Paquete: ${selectedPackage.name}`,
        `Tipo: ${selectedPackage.productType}`,
        `Cantidad incluida: ${selectedPackageRow.quantity}`,
        tempPaquete.notes,
        selectedPackage.shapes?.length ? `Formas: ${selectedPackage.shapes.join(', ')}` : '',
      ].filter(Boolean).join(' | ')
    };

    setItems([...items, newItem]);
    setTempPaquete({
      packageId: '',
      sizeHeader: '',
      rowId: '',
      packageCount: 1,
      notes: ''
    });
    setError('');
    setSuccess('Paquete agregado a la cotizacion');
    setTimeout(() => setSuccess(''), 2000);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotals = () => {
    const totalConISV = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    
    // Desglosar el ISV que está incluido en el total
    const tasa_isv = (settings.isv_percent || 15) / 100;
    const subtotal_sin_isv = totalConISV / (1 + tasa_isv);
    const impuesto_incluido = totalConISV - subtotal_sin_isv;
    
    return { 
      subtotal: subtotal_sin_isv,
      impuesto: impuesto_incluido,
      total: totalConISV
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!customerName || !customerPhone) {
      setError('Por favor completa los datos del cliente');
      return;
    }

    if (items.length === 0) {
      setError('Por favor agrega al menos un producto');
      return;
    }

    setLoading(true);

    try {
      const { subtotal, impuesto, total } = calculateTotals();

      // Calcular fecha de validez (15 días)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 15);

      const quoteData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        items: items,
        subtotal,
        impuesto,
        total,
        incluir_isv: incluirISV,
        valid_until: validUntil.toISOString(),
        estado: 'PENDIENTE'
      };

      await api.createQuote(quoteData);
      setSuccess('✅ Cotización creada exitosamente. Válida por 15 días.');
      
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (error: any) {
      console.error('Error:', error);
      setError(error.message || 'Error al guardar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, impuesto, total } = calculateTotals();

  return (
    <div className="app-page quotes-page quotes-form-page min-h-screen">
      <div className="quotes-form-shell max-w-6xl mx-auto space-y-4">
        <div className="quotes-form-hero flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onBack} className="quotes-back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-950">Nueva Cotización</h1>
              <p className="text-sm text-slate-600">Propuesta compacta con productos, medidas y totales claros.</p>
            </div>
          </div>
          <Badge className="quotes-status-pill">ISV incluido</Badge>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="quotes-form-grid">
          {/* Datos del Cliente */}
          <Card className="quotes-form-card quotes-customer-card">
            <CardHeader>
              <CardTitle>Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0000-0000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos */}
          <Card className="quotes-form-card quotes-product-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-500" />
                Productos de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selector de modo */}
              <div>
                <Label className="mb-2 block text-sm font-medium">Forma de agregar producto:</Label>
                <RadioGroup value={addMode} onValueChange={(value) => setAddMode(value as OrigenProducto)} className="quotes-service-tabs grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="selection-card quotes-option-card flex items-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all">
                    <RadioGroupItem value="catalogo" id="mode-catalogo" />
                    <Label htmlFor="mode-catalogo" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium text-sm">Calculadora de medidas</div>
                        <div className="text-xs text-gray-700">Por área (Banner, Sticker...)</div>
                      </div>
                    </Label>
                  </div>

                  <div className="selection-card quotes-option-card flex items-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all">
                    <RadioGroupItem value="paquete" id="mode-paquete" />
                    <Label htmlFor="mode-paquete" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium text-sm">Paquetes / Servicios</div>
                        <div className="text-xs text-gray-700">Precios fijos de Ajustes</div>
                      </div>
                    </Label>
                  </div>

                  <div className="selection-card quotes-option-card flex items-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all">
                    <RadioGroupItem value="inventario" id="mode-inventario" />
                    <Label htmlFor="mode-inventario" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium text-sm">Desde Inventario</div>
                        <div className="text-xs text-gray-700">Productos en stock</div>
                      </div>
                    </Label>
                  </div>

                  <div className="selection-card quotes-option-card flex items-center space-x-2 border rounded-xl p-3 cursor-pointer transition-all">
                    <RadioGroupItem value="externo" id="mode-externo" />
                    <Label htmlFor="mode-externo" className="cursor-pointer flex-1">
                      <div>
                        <div className="font-medium text-sm">Externo</div>
                        <div className="text-xs text-gray-700">Se comprará (estimado)</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Formulario según modo - CATÁLOGO */}
              {addMode === 'catalogo' && (
                <div className="quotes-mode-panel quotes-mode-panel--catalog p-4 rounded-lg border space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">Agregar Producto de Catálogo</h4>
                      <p className="text-sm text-gray-800 mt-1">
                        Los precios se calculan automáticamente según la configuración en Ajustes
                      </p>
                    </div>
                    <Badge variant="default">Por Medidas</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2 md:col-span-3">
                      <Label>Tipo de Producto *</Label>
                      <Select 
                        value={(() => {
                          const matchingProduct = catalogProducts.find((p: any) => p.nombre === tempCatalogo.tipo);
                          return matchingProduct ? `${matchingProduct.nombre}-${matchingProduct.id || catalogProducts.indexOf(matchingProduct)}` : tempCatalogo.tipo;
                        })()} 
                        onValueChange={(value) => {
                          const productName = value.includes('-') ? value.substring(0, value.lastIndexOf('-')) : value;
                          setTempCatalogo({...tempCatalogo, tipo: productName});
                        }}
                      >
                    <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Seleccionar tipo de producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {catalogProducts.length === 0 ? (
                            <SelectItem value="_default" disabled>No hay productos en el catálogo</SelectItem>
                          ) : (
                            catalogProducts.map((product: any, index: number) => (
                              <SelectItem key={`catalog-product-${index}`} value={`${product.nombre}-${product.id || index}`}>
                                📦 {product.nombre}
                                {product.categoria && <span className="text-xs text-gray-700 ml-2">({product.categoria})</span>}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-purple-700">
                        💡 Puedes agregar o editar productos en <strong>Ajustes → Catálogo</strong>
                      </p>
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
                        <SelectTrigger>
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
                      <div className="space-y-2 md:col-span-3">
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
                      <div className="space-y-2 md:col-span-3">
                        <div className="bg-linear-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg p-4 space-y-3">
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
                              className={`selection-card flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${ tempCatalogo.pvc_mano_obra_mode === 'sin-base' ? 'bg-green-100 border-green-500 shadow-md' : 'bg-white border-gray-200 hover:border-green-300' }`}
                            >
                              <RadioGroupItem value="sin-base" id="quote-r1" />
                              <Label htmlFor="quote-r1" className="flex-1 cursor-pointer flex items-center justify-between">
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
                              className={`selection-card flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${ tempCatalogo.pvc_mano_obra_mode === 'con-base' ? 'bg-purple-100 border-purple-500 shadow-md' : 'bg-white border-gray-200 hover:border-purple-300' }`}
                            >
                              <RadioGroupItem value="con-base" id="quote-r2" />
                              <Label htmlFor="quote-r2" className="flex-1 cursor-pointer flex items-center justify-between">
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
                              className={`selection-card flex flex-col space-y-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${ tempCatalogo.pvc_mano_obra_mode === 'manual' ? 'bg-blue-100 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-blue-300' }`}
                            >
                              <div className="flex items-center space-x-3">
                                <RadioGroupItem value="manual" id="quote-r3" />
                                <Label htmlFor="quote-r3" className="flex-1 cursor-pointer font-medium">
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
                        <div className="space-y-2 md:col-span-3">
                          <Label className="text-orange-900 font-semibold flex items-center gap-2">
                            <span className="text-lg">⭕</span>
                            ¿Desea ojetes en el banner?
                          </Label>
                          <div className="flex items-center gap-4 bg-linear-to-r from-orange-50 to-orange-100 border-2 border-orange-400 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
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
                                  setPrecioCalculado(null);
                                }}
                                className="data-state=checked:bg-orange-500 data-state=unchecked:bg-gray-300 scale-125"
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

                        {/* Sistema de Cuadrícula 4x4 para Ojetes */}
                        {tempCatalogo.banner_con_ojetes && (
                          <div className="md:col-span-3">
                            <div className="bg-linear-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-lg p-3 shadow-sm">
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
                                          newGrid = currentGrid.filter(n => n !== cellNumber);
                                        } else {
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
                                      className={`aspect-square rounded-lg border-2 font-bold text-sm transition-all duration-150 ${isSelected ? 'bg-green-500 border-green-600 text-white shadow-md hover:bg-green-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-orange-100 hover:border-orange-400 hover:text-orange-700' } active:scale-95`}
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

                              {/* Botón limpiar */}
                              {tempCatalogo.banner_ojetes_grid && tempCatalogo.banner_ojetes_grid.length > 0 && (
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
                                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold py-1.5 px-2 rounded border border-red-300 transition-colors"
                                >
                                  🗑️ Limpiar Selección
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="space-y-2 md:col-span-3">
                      <Label>Descripción personalizada (opcional)</Label>
                      <Textarea
                        value={tempCatalogo.descripcion}
                        onChange={(e) => setTempCatalogo({...tempCatalogo, descripcion: e.target.value})}
                        placeholder="Descripción adicional del producto..."
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-2 md:col-span-3">
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
                      <div className="space-y-2 md:col-span-3">
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
                    onClick={calcularPrecioCatalogo}
                    className="quotes-calculate-button quotes-action-button quotes-action-button--blue w-full h-11"
                    style={{ backgroundColor: '#2563eb', borderColor: '#1d4ed8', color: '#ffffff' }}
                  >
                    <Calculator className="w-5 h-5 mr-3" style={{ color: '#ffffff' }} />
                    <span className="font-semibold" style={{ color: '#ffffff' }}>Calcular Precio</span>
                  </Button>

                  {/* Panel de Precio Calculado */}
                  {precioCalculado && (
                    <div className="quotes-calculated-panel bg-linear-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-green-900 text-base">💰 Precio Calculado</h4>
                          <p className="text-sm text-green-700">Desglose completo</p>
                        </div>
                      </div>

                      {/* Mostrar desglose si existe */}
                      {precioCalculado.desglose && (
                        <div className="bg-white/60 rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">📐 Área:</span>
                            <span className="font-semibold">{precioCalculado.desglose.areaPulg2?.toFixed(2) || 'N/A'} pulg²</span>
                          </div>
                          {precioCalculado.desglose.precioPVC && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-purple-700">🟪 PVC ({precioCalculado.desglose.grosorMM}mm):</span>
                                <span className="font-bold text-purple-900">L.{precioCalculado.desglose.precioPVC.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-blue-700">🎨 Sticker:</span>
                                <span className="font-bold text-blue-900">L.{precioCalculado.desglose.precioSticker.toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t-2 border-green-300">
                        <span className="text-green-900 font-bold text-lg">TOTAL:</span>
                        <span className="text-2xl font-bold text-green-900">L.{precioCalculado.totalPrice?.toFixed(2) || '0.00'}</span>
                      </div>

                      <Button
                        type="button"
                        onClick={agregarProductoCatalogo}
                        className="quotes-action-button quotes-action-button--green w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar a Cotización
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {addMode === 'paquete' && (
                <div className="quotes-mode-panel quotes-mode-panel--packages p-4 rounded-lg border space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-blue-950">Agregar paquete o servicio</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Usa los paquetes configurados en Ajustes para cotizar servicios con precio fijo.
                      </p>
                    </div>
                    <Badge className="bg-blue-600 text-white">Servicios</Badge>
                  </div>

                  {productPackages.length === 0 ? (
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      <AlertDescription className="text-amber-900">
                        No hay paquetes configurados. Crea tus paquetes en Ajustes para usarlos aqui.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Paquete o servicio *</Label>
                          <Select
                            value={tempPaquete.packageId}
                            onValueChange={(value) => {
                              const pkg = productPackages.find((item) => item.id === value);
                              setTempPaquete({
                                packageId: value,
                                sizeHeader: pkg?.sizeHeaders?.[0] || '',
                                rowId: '',
                                packageCount: 1,
                                notes: ''
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar paquete o servicio" />
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
                            onValueChange={(value) => setTempPaquete({ ...tempPaquete, sizeHeader: value, rowId: '' })}
                            disabled={!selectedPackage}
                          >
                            <SelectTrigger>
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
                          <Label>Cantidad incluida *</Label>
                          <Select
                            value={tempPaquete.rowId}
                            onValueChange={(value) => setTempPaquete({ ...tempPaquete, rowId: value })}
                            disabled={!selectedPackage}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Ej: Pack de 50" />
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
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Total fijo</Label>
                          <div className="quotes-package-total">
                            <span>L {(selectedPackagePrice * (tempPaquete.packageCount || 1)).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Notas opcionales</Label>
                          <Textarea
                            value={tempPaquete.notes}
                            onChange={(e) => setTempPaquete({ ...tempPaquete, notes: e.target.value })}
                            placeholder="Ej: acabado mate, entrega por lote, empaque especial..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {selectedPackage && selectedPackageRow && tempPaquete.sizeHeader && (
                        <div className="quotes-package-preview">
                          <strong>{selectedPackage.name}</strong>
                          <span>{selectedPackageRow.quantityLabel} - {tempPaquete.sizeHeader}</span>
                          <small>Precio por paquete: L {selectedPackagePrice.toFixed(2)}</small>
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={agregarProductoPaquete}
                        className="quotes-action-button quotes-action-button--blue w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar paquete a Cotizacion
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Formulario según modo - INVENTARIO */}
              {addMode === 'inventario' && (
                <div className="quotes-mode-panel quotes-mode-panel--inventory p-4 rounded-lg border space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900">Agregar Producto de Inventario</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        Selecciona un producto existente con precio predefinido
                      </p>
                    </div>
                    <Badge className="bg-blue-500">En Stock</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Producto *</Label>
                      <Select 
                        value={tempInventario.product_id}
                        onValueChange={(value) => setTempInventario({...tempInventario, product_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - L.{product.price?.toFixed(2) || '0.00'}
                              <span className="text-xs text-gray-600 ml-2">(Stock: {product.stock})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cantidad *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tempInventario.unidades}
                        onChange={(e) => setTempInventario({...tempInventario, unidades: parseInt(e.target.value) || 1})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripción adicional (opcional)</Label>
                      <Textarea
                        value={tempInventario.descripcion}
                        onChange={(e) => setTempInventario({...tempInventario, descripcion: e.target.value})}
                        placeholder="Notas adicionales..."
                        rows={2}
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={agregarProductoInventario}
                      className="quotes-action-button quotes-action-button--blue w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar a Cotización
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulario según modo - EXTERNO */}
              {addMode === 'externo' && (
                <div className="quotes-mode-panel quotes-mode-panel--external p-4 rounded-lg border space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-amber-900">Agregar Producto Externo</h4>
                      <p className="text-sm text-amber-800 mt-1">
                        Producto que se comprará o subcontratará
                      </p>
                    </div>
                    <Badge className="bg-amber-500">Externo</Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Descripción *</Label>
                      <Textarea
                        value={tempExterno.descripcion}
                        onChange={(e) => setTempExterno({...tempExterno, descripcion: e.target.value})}
                        placeholder="Describe el producto o servicio..."
                        rows={2}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cantidad *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={tempExterno.unidades}
                          onChange={(e) => setTempExterno({...tempExterno, unidades: parseInt(e.target.value) || 1})}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Costo Estimado (c/u) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tempExterno.costo_estimado}
                          onChange={(e) => setTempExterno({...tempExterno, costo_estimado: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={agregarProductoExterno}
                      className="quotes-action-button quotes-action-button--amber w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar a Cotización
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de items agregados */}
              {items.length > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Productos Agregados ({items.length})
                  </h4>
                  {items.map((item) => (
                    <div key={item.id} className="quotes-item-row bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={item.origen === 'catalogo' ? 'default' : item.origen === 'inventario' ? 'secondary' : 'outline'}>
                              {item.origen === 'catalogo' ? '📐 Calculado' : item.origen === 'inventario' ? '📦 Inventario' : '🔗 Externo'}
                            </Badge>
                            <span className="font-medium">{item.descripcion}</span>
                          </div>
                          {item.tipo && (
                            <p className="text-sm text-gray-600">
                              {item.tipo} - {item.ancho}×{item.alto} {item.unidad}
                            </p>
                          )}
                          {item.notas && (
                            <p className="text-xs text-gray-500 mt-1">{item.notas}</p>
                          )}
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>Cantidad: <strong>{item.unidades}</strong></span>
                            <span>Precio Unit: <strong>L.{item.precio_unitario.toFixed(2)}</strong></span>
                            <span className="text-green-700 font-bold">Subtotal: L.{item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="quotes-danger-button"
                          onClick={() => item.id && removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totales */}
          <Card className="quotes-form-card quotes-total-card">
            <CardContent>
              <div className="quotes-total-panel bg-linear-to-br from-blue-50 to-blue-100 p-4 rounded-lg space-y-2 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">💡 ISV incluido en precios</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-900">Subtotal (sin ISV):</span>
                  <span className="text-blue-900 font-semibold">L. {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-900">ISV ({settings.isv_percent || 15}%) incluido:</span>
                  <span className="text-blue-900 font-semibold">+ L. {impuesto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-300 pt-3">
                  <span className="text-blue-950 font-semibold text-base">TOTAL:</span>
                  <span className="text-2xl text-blue-950 font-bold">L. {total.toFixed(2)}</span>
                </div>
                <div className="text-center text-xs text-blue-700 mt-2 font-medium">
                  ✓ Cotización válida por 15 días
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <Button type="button" variant="outline" onClick={onBack} className="quotes-secondary-button">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || items.length === 0} 
                  className="quotes-action-button quotes-action-button--green gap-2"
                  title={items.length === 0 ? 'Agrega al menos un producto para guardar la cotizacion' : 'Guardar cotizacion'}
                >
                  <FileText className="w-4 h-4" />
                  {loading ? 'Guardando...' : items.length === 0 ? 'Agrega un producto' : 'Guardar Cotizacion'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* Dialog de búsqueda de productos */}
      <ProductSearchDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        products={products}
        onSelectProduct={(product: any) => {
          setTempInventario({ ...tempInventario, product_id: product.id });
          setShowProductSearch(false);
        }}
      />
    </div>
  );
}

