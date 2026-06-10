/**
 * Sistema de precios de Stickers y Banners por pulgada cuadrada
 * 
 * ⚠️ IMPORTANTE: Los precios son por PULGADA CUADRADA
 * Los rangos se definen por el área total en METROS CUADRADOS
 * Pero el cálculo final multiplica PULGADAS² × Precio
 */

const M2_TO_INCH2 = 1550.0031; // 1 metro cuadrado = 1,550.0031 pulgadas cuadradas

interface PriceRange {
  minAreaM2: number;
  maxAreaM2: number | null;
  pricePerInch2: number;
}

// 🎨 Precios del STICKER por rangos de área total (en m²)
const STICKER_PRICE_RANGES: PriceRange[] = [
  { minAreaM2: 0, maxAreaM2: 2, pricePerInch2: 0.30 },
  { minAreaM2: 2, maxAreaM2: 5, pricePerInch2: 0.25 },
  { minAreaM2: 5, maxAreaM2: null, pricePerInch2: 0.20 },
];

// 🎯 Precios del BANNER por rangos de área total (en m²)
// Según imagen proporcionada:
// - Menor a 1 metro: L 0.38 / pulg²
// - 1-2 metros: L 0.35 / pulg²
// - 3-5 metros: L 0.32 / pulg²
// - 5 metros en adelante: L 0.28 / pulg²
const BANNER_PRICE_RANGES: PriceRange[] = [
  { minAreaM2: 0, maxAreaM2: 1, pricePerInch2: 0.38 },      // Menor a 1m²
  { minAreaM2: 1, maxAreaM2: 3, pricePerInch2: 0.35 },      // De 1 a 3m²
  { minAreaM2: 3, maxAreaM2: 5, pricePerInch2: 0.32 },      // De 3 a 5m²
  { minAreaM2: 5, maxAreaM2: null, pricePerInch2: 0.28 },   // De 5m² en adelante
];

/**
 * Obtiene el precio del sticker por pulgada cuadrada según área total en m²
 */
export function getStickerPricePerInch2(totalAreaM2: number): number {
  const range = STICKER_PRICE_RANGES.find(r => {
    const aboveMin = totalAreaM2 >= r.minAreaM2;
    const belowMax = r.maxAreaM2 === null || totalAreaM2 < r.maxAreaM2;
    return aboveMin && belowMax;
  });

  return range ? range.pricePerInch2 : 0.30; // Default al más caro
}

/**
 * Obtiene el precio del banner por pulgada cuadrada según área total en m²
 */
export function getBannerPricePerInch2(totalAreaM2: number): number {
  const range = BANNER_PRICE_RANGES.find(r => {
    const aboveMin = totalAreaM2 >= r.minAreaM2;
    const belowMax = r.maxAreaM2 === null || totalAreaM2 < r.maxAreaM2;
    return aboveMin && belowMax;
  });

  return range ? range.pricePerInch2 : 0.38; // Default al más caro
}

/**
 * Calcula el precio de un STICKER
 * @param widthM - Ancho en metros
 * @param heightM - Alto en metros
 * @param quantity - Cantidad de unidades
 * @returns Objeto con detalles del cálculo completo
 */
export function calculateStickerPrice(
  widthM: number, 
  heightM: number, 
  quantity: number = 1
) {
  // 1. Calcular área por unidad en metros cuadrados
  const areaPerUnitM2 = widthM * heightM;
  const totalAreaM2 = areaPerUnitM2 * quantity;
  
  // 2. Convertir a pulgadas cuadradas (ESTO ES CRÍTICO)
  const areaPerUnitInch2 = areaPerUnitM2 * M2_TO_INCH2;
  const totalAreaInch2 = totalAreaM2 * M2_TO_INCH2;
  
  // 3. Obtener precio por pulgada² según el área total en m²
  const pricePerInch2 = getStickerPricePerInch2(totalAreaM2);
  
  // 4. Calcular precio total: PULGADAS² × PRECIO_POR_PULGADA²
  const totalPrice = totalAreaInch2 * pricePerInch2;
  const pricePerUnit = totalPrice / quantity;
  
  console.log(`
    📊 CÁLCULO STICKER:
    - Área total: ${totalAreaM2.toFixed(4)} m² = ${totalAreaInch2.toFixed(2)} pulg²
    - Precio: L.${pricePerInch2} por pulg²
    - Total: ${totalAreaInch2.toFixed(2)} pulg² × L.${pricePerInch2} = L.${totalPrice.toFixed(2)}
  `);
  
  return {
    areaPerUnitM2,
    totalAreaM2,
    areaPerUnitInch2,
    totalAreaInch2,
    pricePerInch2,
    totalPrice,
    pricePerUnit,
    rangeApplied: getStickerRangeDescription(totalAreaM2),
  };
}

/**
 * Calcula el precio de un BANNER
 * @param widthM - Ancho en metros
 * @param heightM - Alto en metros
 * @param quantity - Cantidad de unidades
 * @returns Objeto con detalles del cálculo completo
 */
export function calculateBannerPrice(
  widthM: number, 
  heightM: number, 
  quantity: number = 1
) {
  // 1. Calcular área por unidad en metros cuadrados
  const areaPerUnitM2 = widthM * heightM;
  const totalAreaM2 = areaPerUnitM2 * quantity;
  
  // 2. Convertir a pulgadas cuadradas (ESTO ES CRÍTICO)
  const areaPerUnitInch2 = areaPerUnitM2 * M2_TO_INCH2;
  const totalAreaInch2 = totalAreaM2 * M2_TO_INCH2;
  
  // 3. Obtener precio por pulgada² según el área total en m²
  const pricePerInch2 = getBannerPricePerInch2(totalAreaM2);
  
  // 4. Calcular precio total: PULGADAS² × PRECIO_POR_PULGADA²
  const totalPrice = totalAreaInch2 * pricePerInch2;
  const pricePerUnit = totalPrice / quantity;
  
  console.log(`
    📊 CÁLCULO BANNER:
    - Área total: ${totalAreaM2.toFixed(4)} m² = ${totalAreaInch2.toFixed(2)} pulg²
    - Precio: L.${pricePerInch2} por pulg²
    - Total: ${totalAreaInch2.toFixed(2)} pulg² × L.${pricePerInch2} = L.${totalPrice.toFixed(2)}
  `);
  
  return {
    areaPerUnitM2,
    totalAreaM2,
    areaPerUnitInch2,
    totalAreaInch2,
    pricePerInch2,
    totalPrice,
    pricePerUnit,
    rangeApplied: getBannerRangeDescription(totalAreaM2),
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
 * Obtiene la descripción del rango de banner aplicado
 */
function getBannerRangeDescription(areaM2: number): string {
  if (areaM2 < 1) return 'Menos de 1m² (L.0.38/pulg²)';
  if (areaM2 < 3) return '1m² a 3m² (L.0.35/pulg²)';
  if (areaM2 < 5) return '3m² a 5m² (L.0.32/pulg²)';
  return '5m² en adelante (L.0.28/pulg²)';
}

/**
 * Calcula el precio de sticker desde medidas en centímetros
 */
export function calculateStickerPriceFromCM(
  widthCM: number, 
  heightCM: number, 
  quantity: number = 1
) {
  const widthM = widthCM / 100;
  const heightM = heightCM / 100;
  return calculateStickerPrice(widthM, heightM, quantity);
}

/**
 * Calcula el precio de banner desde medidas en centímetros
 */
export function calculateBannerPriceFromCM(
  widthCM: number, 
  heightCM: number, 
  quantity: number = 1
) {
  const widthM = widthCM / 100;
  const heightM = heightCM / 100;
  return calculateBannerPrice(widthM, heightM, quantity);
}
