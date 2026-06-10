/**
 * ✨ CONVERSIÓN GLOBAL DE MEDIDAS A PULGADAS
 * 
 * REGLA GLOBAL: Todas las medidas se convierten automáticamente a pulgadas
 * - Centímetros → Pulgadas
 * - Metros → Pulgadas  
 * - Pies → Pulgadas
 * 
 * Aplica para: PVC, Banner, Sticker, cualquier tipo de impresión
 */

export type UnidadMedida = 'cm' | 'pulgadas' | 'metros' | 'pies';

// Constantes de conversión
const CM_TO_INCHES = 0.393701;
const METERS_TO_INCHES = 39.3701;
const FEET_TO_INCHES = 12;

/**
 * Convierte cualquier medida a pulgadas
 * @param value - Valor numérico
 * @param unit - Unidad de medida original
 * @returns Valor convertido a pulgadas
 */
export function convertToInches(value: number, unit: UnidadMedida): number {
  switch (unit) {
    case 'cm':
      return value * CM_TO_INCHES;
    case 'metros':
      return value * METERS_TO_INCHES;
    case 'pies':
      return value * FEET_TO_INCHES;
    case 'pulgadas':
      return value; // Ya está en pulgadas
    default:
      return value;
  }
}

/**
 * Convierte pulgadas a otra unidad (para mostrar)
 * @param inches - Valor en pulgadas
 * @param targetUnit - Unidad destino
 * @returns Valor convertido
 */
export function convertFromInches(inches: number, targetUnit: UnidadMedida): number {
  switch (targetUnit) {
    case 'cm':
      return inches / CM_TO_INCHES;
    case 'metros':
      return inches / METERS_TO_INCHES;
    case 'pies':
      return inches / FEET_TO_INCHES;
    case 'pulgadas':
      return inches;
    default:
      return inches;
  }
}

/**
 * Valida si las dimensiones de PVC exceden el máximo de lámina
 * Tamaño máximo de lámina PVC: 48 x 96 pulgadas
 * @param widthInches - Ancho en pulgadas
 * @param heightInches - Alto en pulgadas
 * @returns true si excede el límite
 */
export function validatePVCDimensions(widthInches: number, heightInches: number): {
  isValid: boolean;
  message?: string;
} {
  const MAX_WIDTH = 48;  // pulgadas
  const MAX_HEIGHT = 96; // pulgadas
  
  if (widthInches > MAX_WIDTH || heightInches > MAX_HEIGHT) {
    return {
      isValid: false,
      message: `⚠️ Las dimensiones exceden el tamaño máximo de lámina PVC (${MAX_WIDTH}" x ${MAX_HEIGHT}"). Ancho: ${widthInches.toFixed(2)}", Alto: ${heightInches.toFixed(2)}"`
    };
  }
  
  // Validar también en orientación inversa
  if (heightInches > MAX_WIDTH || widthInches > MAX_HEIGHT) {
    return {
      isValid: false,
      message: `⚠️ Las dimensiones exceden el tamaño máximo de lámina PVC (${MAX_WIDTH}" x ${MAX_HEIGHT}"). Considera rotar la orientación.`
    };
  }
  
  return { isValid: true };
}

/**
 * Formatea las dimensiones con su unidad
 * @param width - Ancho
 * @param height - Alto
 * @param unit - Unidad de medida
 * @returns String formateado "ancho x alto unidad"
 */
export function formatDimensions(width: number, height: number, unit: UnidadMedida): string {
  const unitLabel = {
    cm: 'cm',
    pulgadas: '"',
    metros: 'm',
    pies: 'ft'
  }[unit];
  
  return `${width.toFixed(2)} x ${height.toFixed(2)} ${unitLabel}`;
}

/**
 * Convierte dimensiones a pulgadas y formatea
 * @param width - Ancho
 * @param height - Alto  
 * @param originalUnit - Unidad original
 * @returns Dimensiones en pulgadas formateadas
 */
export function convertAndFormatToInches(
  width: number, 
  height: number, 
  originalUnit: UnidadMedida
): string {
  const widthInches = convertToInches(width, originalUnit);
  const heightInches = convertToInches(height, originalUnit);
  return formatDimensions(widthInches, heightInches, 'pulgadas');
}
