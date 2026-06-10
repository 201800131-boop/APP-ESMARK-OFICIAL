import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Calculator, DollarSign, Package, Ruler, Palette, Hash, ArrowRight, ShoppingCart, AlertCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../utils/api';
import { extractPriceConfig, getUsablePriceConfig, writeStoredPriceConfig } from '../utils/price-config';
import { calculatePVCPrice, calculatePVCWithStickerPrice, calculateCompletePVCPrice, PVC_THICKNESS_PRICES, PVC_BASE_PRICES } from '../utils/pvcPricing';
import { calculateStickerPrice, calculateBannerPrice } from '../utils/stickerBannerPricing';
import { convertToInches, validatePVCDimensions } from '../utils/unit-conversion';

interface PriceCalculatorProps {
  onNavigate?: (view: string, data?: any) => void;
}

type UnidadMedida = 'cm' | 'pulgadas' | 'metros' | 'pies';

const DEFAULT_CATALOG_PRODUCTS = [
  { id: '1', nombre: 'Banner', categoria: 'Impresion', activo: true },
  { id: '2', nombre: 'Sticker', categoria: 'Impresion', activo: true },
  { id: '3', nombre: 'PVC', categoria: 'Impresion', activo: true },
  { id: '4', nombre: 'Carnet', categoria: 'Identificacion', activo: true },
  { id: '5', nombre: 'Reconocimiento', categoria: 'Premios', activo: true },
];

function normalizeCatalogProduct(product: any, index: number) {
  const nombre = String(product?.nombre || product?.name || product?.label || '').trim();
  if (!nombre) return null;
  return {
    ...product,
    id: String(product?.id || product?.code || `catalog-${index}`),
    nombre,
    categoria: String(product?.categoria || product?.category || 'General'),
    activo: product?.activo !== false && product?.active !== false,
  };
}

function loadCatalogProductsForCalculator() {
  try {
    const storedCatalog = localStorage.getItem('esmark_catalog_products');
    const parsed = storedCatalog ? JSON.parse(storedCatalog) : [];
    const source = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATALOG_PRODUCTS;
    const normalized = source
      .map(normalizeCatalogProduct)
      .filter(Boolean) as Array<{ id: string; nombre: string; categoria: string; activo: boolean }>;
    const activeProducts = normalized.filter((product) => product.activo);

    if (activeProducts.length > 0) {
      localStorage.setItem('esmark_catalog_products', JSON.stringify(normalized));
      return activeProducts;
    }

    localStorage.setItem('esmark_catalog_products', JSON.stringify(DEFAULT_CATALOG_PRODUCTS));
    return DEFAULT_CATALOG_PRODUCTS;
  } catch (error) {
    console.warn('No se pudo cargar el catalogo local para la calculadora:', error);
    localStorage.setItem('esmark_catalog_products', JSON.stringify(DEFAULT_CATALOG_PRODUCTS));
    return DEFAULT_CATALOG_PRODUCTS;
  }
}

async function loadRemoteCatalogProductsForCalculator() {
  const data = await api.getCatalogProducts();
  const normalized = (data.products || [])
    .map(normalizeCatalogProduct)
    .filter(Boolean) as Array<{ id: string; nombre: string; categoria: string; activo: boolean }>;
  const activeProducts = normalized.filter((product) => product.activo);

  if (activeProducts.length > 0) {
    localStorage.setItem('esmark_catalog_products', JSON.stringify(normalized));
    return activeProducts;
  }

  return loadCatalogProductsForCalculator();
}

export default function PriceCalculator({ onNavigate }: PriceCalculatorProps) {
  // Estados principales
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [priceConfig, setPriceConfig] = useState<any>({});
  
  // Formulario
  const [tipo, setTipo] = useState('');
  const [material, setMaterial] = useState('');
  const [ancho, setAncho] = useState<number | ''>('');
  const [alto, setAlto] = useState<number | ''>('');
  const [unidad, setUnidad] = useState<UnidadMedida>('pulgadas');
  const [unidades, setUnidades] = useState(1);
  const [descripcion, setDescripcion] = useState('');
  
  // Estados específicos para PVC
  const [pvcGrosor, setPvcGrosor] = useState('');
  const [pvcManoObraMode, setPvcManoObraMode] = useState<'sin-base' | 'con-base' | 'manual'>('sin-base');
  const [pvcManoObraManual, setPvcManoObraManual] = useState<number>(0);
  
  // Estados específicos para Banner
  const [bannerConOjetes, setBannerConOjetes] = useState(false);
  const [bannerCantidadOjetes, setBannerCantidadOjetes] = useState(0);
  const [bannerPosicionesOjetes, setBannerPosicionesOjetes] = useState('');
  
  // Modal de advertencia de PVC
  const [showPVCLimitDialog, setShowPVCLimitDialog] = useState(false);
  const [pvcLimitMessage, setPvcLimitMessage] = useState('');
  
  // Resultado
  const [precioCalculado, setPrecioCalculado] = useState<{
    precioUnidad: number;
    precioTotal: number;
    precioM2: number;
    desglose?: any;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Resetear precio cuando cambien los valores
    setPrecioCalculado(null);
  }, [tipo, material, ancho, alto, unidad, unidades, pvcGrosor, pvcManoObraMode, pvcManoObraManual, bannerConOjetes, bannerCantidadOjetes, bannerPosicionesOjetes]);

  const loadData = async () => {
    setCatalogProducts(loadCatalogProductsForCalculator());

    try {
      const [productsData, priceConfigData, catalogData] = await Promise.all([
        api.getProducts(),
        api.getPriceConfig(),
        loadRemoteCatalogProductsForCalculator()
      ]);

      const validProducts = (productsData.products || []).filter((p: any) => p && p.name);
      setProducts(validProducts);
      const resolvedPriceConfig = getUsablePriceConfig(extractPriceConfig(priceConfigData));
      writeStoredPriceConfig(resolvedPriceConfig);
      setPriceConfig(resolvedPriceConfig);
      setCatalogProducts(catalogData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      const fallbackConfig = getUsablePriceConfig();
      writeStoredPriceConfig(fallbackConfig);
      setPriceConfig(fallbackConfig);
      setCatalogProducts(loadCatalogProductsForCalculator());
      toast.warning('Se cargaron productos y precios locales para la calculadora');
    }
  };

  const handleCalculatePrice = () => {
    if (!tipo) {
      toast.warning('Selecciona un tipo de producto');
      return;
    }

    if (!ancho || !alto || ancho <= 0 || alto <= 0) {
      toast.warning('Ingresa medidas válidas');
      return;
    }

    if (unidades <= 0) {
      toast.warning('Ingresa una cantidad válida');
      return;
    }

    try {
      let precioUnidad = 0;
      let precioM2 = 0;
      let desglose: any = {};

      // Convertir medidas a metros (igual que en OrderFormView)
      const convertirAMetros = (valor: number, unidadOrigen: UnidadMedida): number => {
        switch (unidadOrigen) {
          case 'cm':
            return valor / 100;
          case 'pulgadas':
            return valor * 0.0254;
          case 'metros':
            return valor;
          case 'pies':
            return valor * 0.3048;
          default:
            return valor;
        }
      };

      const anchoM = convertirAMetros(ancho, unidad);
      const altoM = convertirAMetros(alto, unidad);

      // Detectar tipo de producto (igual que en OrderFormView)
      const tipoLower = tipo.toLowerCase();
      const esPVC = tipoLower.includes('pvc');
      const esSticker = tipoLower.includes('sticker') && !tipoLower.includes('pvc');
      const esBanner = tipoLower.includes('banner');

      // Calcular según tipo de producto (MISMA LÓGICA que OrderFormView líneas 779-840)
      if (esPVC) {
        // Validar grosor
        if (!pvcGrosor) {
          toast.warning('Selecciona un grosor de PVC');
          return;
        }

        // ✨ Validar dimensiones del PVC (48x96 pulgadas máximo)
        const anchoInches = convertToInches(ancho, unidad);
        const altoInches = convertToInches(alto, unidad);
        const validation = validatePVCDimensions(anchoInches, altoInches);
        
        if (!validation.isValid) {
          setPvcLimitMessage(validation.message || 'Las dimensiones exceden el límite de la lámina de PVC (48" x 96")');
          setShowPVCLimitDialog(true);
          return;
        }

        // PVC: Calcular precio usando el sistema de PVC + Sticker
        const pvcCalc = calculatePVCWithStickerPrice(
          anchoM, 
          altoM, 
          1, 
          parseInt(pvcGrosor)
        );
        
        // Agregar precio de mano de obra (base)
        let precioManoObra = 0;
        if (pvcManoObraMode === 'sin-base') {
          precioManoObra = PVC_BASE_PRICES.WITHOUT_BASE;
        } else if (pvcManoObraMode === 'con-base') {
          precioManoObra = PVC_BASE_PRICES.WITH_BASE;
        } else if (pvcManoObraMode === 'manual') {
          precioManoObra = pvcManoObraManual;
        }
        
        precioUnidad = pvcCalc.pricePerUnit + precioManoObra;
        precioM2 = pvcCalc.totalPrice / pvcCalc.totalAreaM2;
        
        // Guardar desglose para mostrar
        desglose = {
          areaPulg2: pvcCalc.totalAreaInch2,
          precioPVC: pvcCalc.pvcTotalPrice,
          precioSticker: pvcCalc.stickerTotalPrice,
          precioManoObra: precioManoObra,
          conBase: pvcManoObraMode === 'con-base',
          grosorMM: pvcCalc.pvcThicknessMM,
          rangoSticker: pvcCalc.stickerRangeApplied
        };
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
        if (bannerConOjetes) {
          if (!bannerCantidadOjetes || bannerCantidadOjetes <= 0) {
            toast.warning('Ingresa la cantidad de ojetes');
            return;
          }
          costoOjetes = bannerCantidadOjetes * 10; // L.10 por ojete (igual que OrderFormView línea 822)
          precioUnidad += costoOjetes; // Se agrega al precio por unidad
        }
        
        // Guardar desglose
        desglose = {
          areaPulg2: bannerCalc.totalAreaInch2,
          precioPorPulg2: bannerCalc.pricePerInch2,
          rangoBanner: bannerCalc.rangeApplied,
          conOjetes: bannerConOjetes,
          cantidadOjetes: bannerCantidadOjetes,
          posicionesOjetes: bannerPosicionesOjetes,
          costoOjetes: costoOjetes
        };
      } else {
        toast.warning('Tipo de producto no soportado para cálculo automático');
        return;
      }

      const precioTotal = precioUnidad * unidades;

      setPrecioCalculado({
        precioUnidad,
        precioTotal,
        precioM2,
        desglose,
      });

      toast.success('✅ Precio calculado', {
        description: `Total: L ${precioTotal.toFixed(2)} (incluye ISV)`,
      });
    } catch (error) {
      console.error('Error calculando precio:', error);
      toast.error('Error al calcular el precio');
    }
  };

  const handleCreateOrder = () => {
    if (!precioCalculado) {
      toast.warning('Primero calcula el precio');
      return;
    }

    // Crear objeto con los datos para pre-llenar el formulario
    const orderData = {
      tipo,
      material,
      ancho,
      alto,
      unidad,
      unidades,
      descripcion,
      pvcGrosor,
      pvcManoObraMode,
      pvcManoObraManual,
      bannerConOjetes,
      bannerCantidadOjetes,
      bannerPosicionesOjetes,
      precioCalculado,
    };

    // Guardar en localStorage temporal
    localStorage.setItem('pending_order_from_calculator', JSON.stringify(orderData));
    
    toast.success('Redirigiendo a crear pedido...');
    
    // Navegar al formulario de pedidos
    if (onNavigate) {
      onNavigate('order-form');
    }
  };

  const handleReset = () => {
    setTipo('');
    setMaterial('');
    setAncho('');
    setAlto('');
    setUnidad('pulgadas');
    setUnidades(1);
    setDescripcion('');
    setPvcGrosor('');
    setPvcManoObraMode('sin-base');
    setPvcManoObraManual(0);
    setBannerConOjetes(false);
    setBannerCantidadOjetes(0);
    setBannerPosicionesOjetes('');
    setPrecioCalculado(null);
    toast.info('Calculadora reiniciada');
  };

  const needsPVCOptions = tipo.toUpperCase() === 'PVC';
  const needsBannerOptions = tipo.toUpperCase() === 'BANNER';
  const hasDimensions = !!tipo && !!ancho && !!alto && unidades > 0;
  const dimensionSummary = hasDimensions ? `${ancho} x ${alto} ${unidad}` : 'Sin medidas';
  const supportedCount = catalogProducts.filter((prod: any) => {
    const name = String(prod.nombre || prod.name || '').toLowerCase();
    return name.includes('pvc') || name.includes('sticker') || name.includes('banner');
  }).length;

  return (
    <div className="app-page price-calculator-page space-y-6">
      {/* Header */}
      <div className="price-calc-hero">
        <div className="price-calc-title-block">
          <div className="price-calc-icon">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <h1>Calculadora de Precios</h1>
            <p>Calcula productos medidos, revisa el desglose y crea el pedido con los datos listos.</p>
          </div>
        </div>
        <div className="price-calc-hero-metrics">
          <div>
            <span>Producto</span>
            <strong>{tipo || 'Pendiente'}</strong>
          </div>
          <div>
            <span>Medidas</span>
            <strong>{dimensionSummary}</strong>
          </div>
          <div>
            <span>Soportados</span>
            <strong>{supportedCount || 3}</strong>
          </div>
        </div>
      </div>

      <div className="price-calc-layout">
        {/* Panel de Configuración */}
        <Card className="price-calc-card price-calc-form-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Configuración del Producto
            </CardTitle>
            <CardDescription>Selecciona las características del producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de Producto */}
            <div className="space-y-2">
              <Label className="price-calc-label">
                <Package className="w-4 h-4" />
                Tipo de Producto *
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {catalogProducts.map((prod, index) => {
                    const productName = String(prod.nombre || prod.name || prod.label || '').trim();
                    if (!productName) return null;
                    return (
                      <SelectItem key={prod.id || productName || index} value={productName}>
                        {productName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Material/Descripción */}
            {tipo && tipo.toUpperCase() === 'STICKER' && (
              <div className="space-y-2">
                <Label className="price-calc-label">
                  Material/Descripción
                </Label>
                <Select value={material} onValueChange={setMaterial}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vinil">Vinil</SelectItem>
                    <SelectItem value="Vinil de Impresión">Vinil de Impresión</SelectItem>
                    <SelectItem value="Vinil Transparente">Vinil Transparente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Medidas */}
            {tipo && (
              <>
                <div className="space-y-2">
                  <Label className="price-calc-label">Unidad de Medida</Label>
                  <Select value={unidad} onValueChange={(v) => setUnidad(v as UnidadMedida)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulgadas">Pulgadas</SelectItem>
                      <SelectItem value="cm">Centímetros</SelectItem>
                      <SelectItem value="metros">Metros</SelectItem>
                      <SelectItem value="pies">Pies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="price-calc-label">
                      <Ruler className="w-4 h-4" />
                      Ancho *
                    </Label>
                    <Input
                      type="number"
                      value={ancho}
                      onChange={(e) => setAncho(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="price-calc-label">
                      <Ruler className="w-4 h-4" />
                      Alto *
                    </Label>
                    <Input
                      type="number"
                      value={alto}
                      onChange={(e) => setAlto(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Opciones específicas para PVC */}
            {needsPVCOptions && (
              <>
                <div className="space-y-2">
                  <Label className="price-calc-label">Grosor del PVC *</Label>
                  <Select value={pvcGrosor} onValueChange={setPvcGrosor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona grosor" />
                    </SelectTrigger>
                    <SelectContent>
                      {PVC_THICKNESS_PRICES && PVC_THICKNESS_PRICES.length > 0 ? (
                        PVC_THICKNESS_PRICES.map((thickness) => (
                          <SelectItem key={thickness.mm} value={String(thickness.mm)}>
                            {String(thickness.label)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="5">5mm</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="price-calc-option-box space-y-3">
                  <Label className="font-semibold text-purple-900 flex items-center gap-2">
                    <span className="text-lg">💼</span>
                    Precio de Mano de Obra *
                  </Label>
                  
                  <RadioGroup value={pvcManoObraMode} onValueChange={(v: any) => setPvcManoObraMode(v)}>
                    {/* Opción 1: Sin Base */}
                    <div 
                      onClick={() => setPvcManoObraMode('sin-base')}
                      className={`price-calc-choice ${ pvcManoObraMode === 'sin-base' ? 'is-selected is-green' : '' }`}
                    >
                      <RadioGroupItem value="sin-base" id="r1" />
                      <Label htmlFor="r1" className="flex-1 cursor-pointer flex items-center justify-between">
                        <span className="font-medium">✅ Sin Base</span>
                        <span className={`font-bold ${pvcManoObraMode === 'sin-base' ? 'text-green-700' : 'text-gray-600'}`}>
                          L. {PVC_BASE_PRICES.WITHOUT_BASE.toFixed(2)}
                        </span>
                      </Label>
                    </div>

                    {/* Opción 2: Con Base */}
                    <div 
                      onClick={() => setPvcManoObraMode('con-base')}
                      className={`price-calc-choice ${ pvcManoObraMode === 'con-base' ? 'is-selected is-purple' : '' }`}
                    >
                      <RadioGroupItem value="con-base" id="r2" />
                      <Label htmlFor="r2" className="flex-1 cursor-pointer flex items-center justify-between">
                        <span className="font-medium">✅ Con Base</span>
                        <span className={`font-bold ${pvcManoObraMode === 'con-base' ? 'text-purple-700' : 'text-gray-600'}`}>
                          L. {PVC_BASE_PRICES.WITH_BASE.toFixed(2)}
                        </span>
                      </Label>
                    </div>

                    {/* Opción 3: Manual */}
                    <div 
                      onClick={() => setPvcManoObraMode('manual')}
                      className={`price-calc-choice flex-col items-stretch ${ pvcManoObraMode === 'manual' ? 'is-selected is-blue' : '' }`}
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="manual" id="r3" />
                        <Label htmlFor="r3" className="flex-1 cursor-pointer font-medium">
                          ✍️ Precio Manual
                        </Label>
                      </div>
                      {pvcManoObraMode === 'manual' && (
                        <Input
                          type="number"
                          value={pvcManoObraManual}
                          onChange={(e) => setPvcManoObraManual(parseFloat(e.target.value) || 0)}
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
              </>
            )}

            {/* Opciones específicas para Banner */}
            {needsBannerOptions && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="banner-con-ojetes"
                    checked={bannerConOjetes}
                    onChange={(e) => setBannerConOjetes(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="banner-con-ojetes" className="cursor-pointer">
                    Incluir ojetes
                  </Label>
                </div>

                {bannerConOjetes && (
                  <>
                    <div className="space-y-2">
                      <Label className="price-calc-label">Cantidad de Ojetes *</Label>
                      <Input
                        type="number"
                        value={bannerCantidadOjetes}
                        onChange={(e) => setBannerCantidadOjetes(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                      />
                      <p className="text-xs text-gray-600">L 10.00 por ojete</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="price-calc-label">Posiciones de Ojetes</Label>
                      <Input
                        value={bannerPosicionesOjetes}
                        onChange={(e) => setBannerPosicionesOjetes(e.target.value)}
                        placeholder="Ej: 4 esquinas"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Cantidad */}
            <div className="space-y-2">
              <Label className="price-calc-label">
                <Hash className="w-4 h-4" />
                Cantidad *
              </Label>
              <Input
                type="number"
                value={unidades}
                onChange={(e) => setUnidades(parseInt(e.target.value) || 1)}
                placeholder="1"
                min="1"
              />
            </div>

            {/* Descripción adicional */}
            <div className="space-y-2">
              <Label className="font-semibold">Descripción adicional</Label>
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Información adicional del producto"
              />
            </div>

            {/* Botones */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="price-calc-secondary-button"
              >
                Limpiar
              </Button>
              <Button
                onClick={handleCalculatePrice}
                className="price-calc-primary-button"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calcular
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Resultados */}
        <Card className="price-calc-card price-calc-result-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Resultado del Cálculo
            </CardTitle>
            <CardDescription>Precio calculado según configuración</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {precioCalculado ? (
              <>
                {/* Desglose */}
                <div className="space-y-3">
                  <div className="price-calc-detail-row">
                    <p className="text-xs text-gray-600 mb-1">Tipo</p>
                    <p className="font-medium text-gray-900">{tipo}</p>
                  </div>

                  {material && (
                    <div className="price-calc-detail-row">
                      <p className="text-xs text-gray-600 mb-1">Material</p>
                      <p className="font-medium text-gray-900">{material}</p>
                    </div>
                  )}

                  <div className="price-calc-detail-row">
                    <p className="text-xs text-gray-600 mb-1">Medidas</p>
                    <p className="font-medium text-gray-900">
                      {ancho} × {alto} {unidad}
                      {precioCalculado.desglose?.areaPulg2 && (
                        <span className="text-xs text-gray-500 block">
                          ({precioCalculado.desglose.areaPulg2.toFixed(2)} pulg²)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Desglose específico según tipo */}
                  {precioCalculado.desglose?.precioPVC && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-2">Desglose PVC</p>
                      <div className="space-y-1 text-sm">
                        <p>• PVC {precioCalculado.desglose.grosorMM}mm: L {precioCalculado.desglose.precioPVC?.toFixed(2)}</p>
                        {precioCalculado.desglose.precioSticker && (
                          <p>• Sticker base: L {precioCalculado.desglose.precioSticker?.toFixed(2)}</p>
                        )}
                        {precioCalculado.desglose.precioManoObra && (
                          <p>• Mano de obra {precioCalculado.desglose.conBase ? 'con' : 'sin'} base: L {precioCalculado.desglose.precioManoObra?.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {precioCalculado.desglose?.conOjetes && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 mb-2">Ojetes</p>
                      <div className="space-y-1 text-sm">
                        <p>• Cantidad: {precioCalculado.desglose.cantidadOjetes}</p>
                        <p>• Costo: L {precioCalculado.desglose.costoOjetes?.toFixed(2)}</p>
                        {precioCalculado.desglose.posicionesOjetes && (
                          <p> Posiciones: {precioCalculado.desglose.posicionesOjetes}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="price-calc-detail-row">
                    <p className="text-xs text-gray-600 mb-1">Cantidad</p>
                    <p className="font-medium text-gray-900">{unidades} unidades</p>
                  </div>

                  <div className="price-calc-detail-row">
                    <p className="text-xs text-gray-600 mb-1">Precio Unitario</p>
                    <p className="font-medium text-gray-900">L {(precioCalculado.precioUnidad || 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Total */}
                <div className="price-calc-total-card">
                  <p className="text-sm text-white/90 mb-1">PRECIO TOTAL</p>
                  <p className="text-3xl font-bold text-white">
                    L {(precioCalculado.precioTotal || 0).toFixed(2)}
                  </p>
                </div>

                {/* Botón para crear pedido */}
                <Button
                  onClick={handleCreateOrder}
                  className="price-calc-order-button"
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Crear Pedido con estos Datos
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-xs text-blue-900">
                    ✅ Este precio YA INCLUYE ISV (15%). Los datos se pre-llenarán en el formulario de pedidos.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <div className="price-calc-empty">
                <div className="price-calc-empty-icon">
                  <Calculator className="w-11 h-11" />
                </div>
                <p className="font-medium">Configura el producto</p>
                <p className="text-sm mt-1">
                  Completa los campos y presiona "Calcular"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <p className="font-semibold mb-2">ℹ️ Productos Soportados:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>PVC:</strong> Calcula por grosor (1-25mm) con base sticker incluida</li>
            <li><strong>Sticker:</strong> Calcula según rangos de tamaño automáticos</li>
            <li><strong>Banner:</strong> Calcula con opción de agregar ojetes (L 10 c/u)</li>
            <li>✅ Los precios YA INCLUYEN ISV (15%)</li>
            <li>Puedes crear un pedido directamente con estos datos</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Modal de advertencia de PVC */}
      <Dialog open={showPVCLimitDialog} onOpenChange={setShowPVCLimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <DialogTitle className="text-center text-xl">⚠️ DIMENSIONES EXCEDIDAS</DialogTitle>
            <DialogDescription className="text-center space-y-3 pt-4">
              <p className="font-semibold text-red-700">{pvcLimitMessage}</p>
              <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                <p className="font-medium text-gray-900">📏 Límite de lámina PVC:</p>
                <p className="text-2xl font-bold text-gray-900">48" × 96"</p>
                <p className="text-sm text-gray-600">(121.92 cm × 243.84 cm)</p>
              </div>
              <p className="text-sm text-gray-700">
                ❌ Es <strong>imposible realizar el cálculo</strong> con estas dimensiones. Por favor, ajusta las medidas para que entren dentro de la lámina de PVC.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white px-8"
              onClick={() => setShowPVCLimitDialog(false)}
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
