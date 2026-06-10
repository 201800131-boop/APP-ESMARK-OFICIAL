/**
 * Sistema de precios de PVC por grosor + Sticker
 * 
 * El cálculo se realiza por pulgada cuadrada según:
 * 1. Precio del PVC según su grosor
 * 2. Precio del Sticker según área total (rangos)
 * 3. Precio de Base (si aplica): L. 150 con base, L. 100 sin base
 * 4. Mano de obra manual (opcional)
 * 5. Precio Total = PVC + Sticker + Base + Mano de Obra
 */

const M2_TO_INCH2 = 1550; // 1 metro cuadrado = 1,550 pulgadas cuadradas

// ✨ NUEVO: Precios de base para PVC
export const PVC_BASE_PRICES = {
  WITH_BASE: 150,    // L. 150 con base
  WITHOUT_BASE: 100  // L. 100 sin base
};

interface PVCThickness {
  mm: number;
  pricePerInch2: number; // Precio por pulgada cuadrada del PVC
  label: string;
}

// 🔧 Precios de PVC por grosor (precio por pulgada cuadrada)
export const PVC_THICKNESS_PRICES: PVCThickness[] = [
  { mm: 25, pricePerInch2: 1.04, label: '25mm (1.04/pulg²)' },
  { mm: 10, pricePerInch2: 0.40, label: '10mm (0.40/pulg²)' },
  { mm: 9, pricePerInch2: 0.35, label: '9mm (0.35/pulg²)' },
  { mm: 8, pricePerInch2: 0.33, label: '8mm (0.33/pulg²)' },
  { mm: 7, pricePerInch2: 0.30, label: '7mm (0.30/pulg²)' },
  { mm: 6, pricePerInch2: 0.28, label: '6mm (0.28/pulg²)' },
  { mm: 5, pricePerInch2: 0.26, label: '5mm (0.26/pulg²)' },
  { mm: 4, pricePerInch2: 0.24, label: '4mm (0.24/pulg²)' },
  { mm: 3, pricePerInch2: 0.23, label: '3mm (0.23/pulg²)' },
  { mm: 2, pricePerInch2: 0.22, label: '2mm (0.22/pulg²)' },
  { mm: 1, pricePerInch2: 0.20, label: '1mm (0.20/pulg²)' },
];

interface StickerPriceRange {
  minArea: number;
  maxArea: number | null;
  pricePerInch2: number;
}

// 🎨 Precios del Sticker por rangos de área (igual que PVC anterior)
const STICKER_PRICE_RANGES: StickerPriceRange[] = [
  { minArea: 0, maxArea: 2, pricePerInch2: 0.30 },
  { minArea: 2, maxArea: 5, pricePerInch2: 0.25 },
  { minArea: 5, maxArea: null, pricePerInch2: 0.20 },
];

/**
 * Obtiene el precio del PVC por pulgada cuadrada según grosor
 */
export function getPVCPriceByThickness(thicknessMM: number): number {
  const thickness = PVC_THICKNESS_PRICES.find(t => t.mm === thicknessMM);
  return thickness ? thickness.pricePerInch2 : 0.30; // Default 7mm
}

/**
 * Obtiene el precio del sticker por pulgada cuadrada según área total
 */
export function getStickerPricePerInch2(areaM2: number): number {
  const range = STICKER_PRICE_RANGES.find(r => {
    const aboveMin = areaM2 >= r.minArea;
    const belowMax = r.maxArea === null || areaM2 < r.maxArea;
    return aboveMin && belowMax;
  });

  return range ? range.pricePerInch2 : 0.30; // Default al más caro
}

/**
 * Calcula el precio total de PVC + Sticker
 * @param widthM - Ancho en metros
 * @param heightM - Alto en metros
 * @param quantity - Cantidad de unidades
 * @param thicknessMM - Grosor del PVC en milímetros
 * @returns Objeto con detalles del cálculo completo
 */
export function calculatePVCWithStickerPrice(
  widthM: number, 
  heightM: number, 
  quantity: number = 1,
  thicknessMM: number = 5
) {
  // Calcular área por unidad y total
  const areaPerUnitM2 = widthM * heightM;
  const totalAreaM2 = areaPerUnitM2 * quantity;
  
  // Convertir a pulgadas cuadradas
  const areaPerUnitInch2 = areaPerUnitM2 * M2_TO_INCH2;
  const totalAreaInch2 = totalAreaM2 * M2_TO_INCH2;
  
  // Obtener precios
  const pvcPricePerInch2 = getPVCPriceByThickness(thicknessMM);
  const stickerPricePerInch2 = getStickerPricePerInch2(totalAreaM2);
  
  // Calcular precios individuales
  const pvcPrice = totalAreaInch2 * pvcPricePerInch2;
  const stickerPrice = totalAreaInch2 * stickerPricePerInch2;
  
  // Precio total
  const totalPrice = pvcPrice + stickerPrice;
  const pricePerUnit = totalPrice / quantity;
  
  return {
    areaPerUnitM2,
    totalAreaM2,
    areaPerUnitInch2,
    totalAreaInch2,
    
    // PVC
    pvcThicknessMM: thicknessMM,
    pvcPricePerInch2,
    pvcTotalPrice: pvcPrice,
    
    // Sticker
    stickerPricePerInch2,
    stickerTotalPrice: stickerPrice,
    stickerRangeApplied: getStickerRangeDescription(totalAreaM2),
    
    // Total
    totalPrice,
    pricePerUnit,
  };
}

/**
 * Obtiene la descripción del rango de sticker aplicado
 */
function getStickerRangeDescription(areaM2: number): string {
  if (areaM2 < 2) return 'Menos de 2m² (L.0.30/pulg²)';
  if (areaM2 < 5) return '2m² a 5m² (L.0.25/pulg²)';
  return '5m² en adelante (L.0.20/pulg²)';
}

/**
 * Calcula el precio de PVC + Sticker desde medidas en centímetros
 */
export function calculatePVCWithStickerFromCM(
  widthCM: number, 
  heightCM: number, 
  quantity: number = 1,
  thicknessMM: number = 5
) {
  const widthM = widthCM / 100;
  const heightM = heightCM / 100;
  return calculatePVCWithStickerPrice(widthM, heightM, quantity, thicknessMM);
}

/** ✨ NUEVO: Calcula el precio completo de PVC incluyendo base y mano de obra
 * @param widthInches - Ancho en pulgadas
 * @param heightInches - Alto en pulgadas
 * @param quantity - Cantidad de unidades
 * @param thicknessMM - Grosor del PVC en mm
 * @param withBase - Si incluye base (true = L.150, false = L.100)
 * @param laborCost - Costo manual de mano de obra (opcional)
 * @returns Objeto con desglose completo del precio
 */
export function calculateCompletePVCPrice(
  widthInches: number,
  heightInches: number,
  quantity: number = 1,
  thicknessMM: number = 5,
  withBase: boolean = false,
  laborCost: number = 0
) {
  // Convertir pulgadas a metros para usar la función existente
  const widthM = widthInches * 0.0254;
  const heightM = heightInches * 0.0254;
  
  // Calcular precio PVC + Sticker
  const pvcCalc = calculatePVCWithStickerPrice(widthM, heightM, quantity, thicknessMM);
  
  // Precio de base
  const basePrice = withBase ? PVC_BASE_PRICES.WITH_BASE : PVC_BASE_PRICES.WITHOUT_BASE;
  const totalBasePrice = basePrice * quantity;
  
  // Precio total
  const totalPrice = pvcCalc.totalPrice + totalBasePrice + laborCost;
  const pricePerUnit = totalPrice / quantity;
  
  return {
    ...pvcCalc,
    
    // Base
    withBase,
    basePricePerUnit: basePrice,
    totalBasePrice,
    
    // Mano de obra
    laborCost,
    
    // Total actualizado
    totalPrice,
    pricePerUnit,
    
    // Desglose detallado
    breakdown: {
      pvcPrice: pvcCalc.pvcTotalPrice,
      stickerPrice: pvcCalc.stickerTotalPrice,
      basePrice: totalBasePrice,
      laborCost: laborCost,
      total: totalPrice
    }
  };
}

// ========== LEGACY: Sistema antiguo de rangos automáticos (por compatibilidad) ==========
interface PVCPriceRange {
  minArea: number;
  maxArea: number | null;
  pricePerInch2: number;
}

const PVC_PRICE_RANGES: PVCPriceRange[] = [
  { minArea: 0, maxArea: 2, pricePerInch2: 0.30 },
  { minArea: 2, maxArea: 5, pricePerInch2: 0.25 },
  { minArea: 5, maxArea: null, pricePerInch2: 0.20 },
];

export function getPricePerInch2(areaM2: number): number {
  const range = PVC_PRICE_RANGES.find(r => {
    const aboveMin = areaM2 >= r.minArea;
    const belowMax = r.maxArea === null || areaM2 < r.maxArea;
    return aboveMin && belowMax;
  });

  return range ? range.pricePerInch2 : 0.30;
}

export function calculatePVCPrice(widthM: number, heightM: number, quantity: number = 1) {
  const areaPerUnitM2 = widthM * heightM;
  const totalAreaM2 = areaPerUnitM2 * quantity;
  const areaPerUnitInch2 = areaPerUnitM2 * M2_TO_INCH2;
  const totalAreaInch2 = totalAreaM2 * M2_TO_INCH2;
  const pricePerInch2 = getPricePerInch2(totalAreaM2);
  const totalPrice = totalAreaInch2 * pricePerInch2;
  const pricePerUnit = totalPrice / quantity;
  
  return {
    areaPerUnitM2,
    totalAreaM2,
    areaPerUnitInch2,
    totalAreaInch2,
    pricePerInch2,
    totalPrice,
    pricePerUnit,
    rangeApplied: getRangeDescription(totalAreaM2),
  };
}

function getRangeDescription(areaM2: number): string {
  if (areaM2 < 2) return 'Menos de 2m²';
  if (areaM2 < 5) return '2m² a 5m²';
  return '5m² en adelante';
}

export function calculatePVCPriceFromCM(widthCM: number, heightCM: number, quantity: number = 1) {
  const widthM = widthCM / 100;
  const heightM = heightCM / 100;
  return calculatePVCPrice(widthM, heightM, quantity);
}