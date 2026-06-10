/**
 * SISTEMA DE CONVERSIÓN DE MEDIDAS
 * 
 * Todo el sistema internamente trabaja en PULGADAS
 * El usuario puede ingresar en cm, metros o pulgadas
 * 
 * Conversiones:
 * - 1 pulgada = 2.54 cm
 * - 1 metro = 100 cm = 39.3701 pulgadas
 */

export type UnidadMedida = 'pulgadas' | 'cm' | 'm';

/**
 * Convierte cualquier medida a pulgadas
 */
export function convertirAPulgadas(valor: number, unidad: UnidadMedida): number {
  if (!valor || valor <= 0) return 0;
  
  switch (unidad) {
    case 'pulgadas':
      return valor;
    case 'cm':
      return valor / 2.54;
    case 'm':
      return (valor * 100) / 2.54;
    default:
      return valor;
  }
}

/**
 * Convierte pulgadas a la unidad especificada
 */
export function convertirDesdePulgadas(pulgadas: number, unidad: UnidadMedida): number {
  if (!pulgadas || pulgadas <= 0) return 0;
  
  switch (unidad) {
    case 'pulgadas':
      return pulgadas;
    case 'cm':
      return pulgadas * 2.54;
    case 'm':
      return (pulgadas * 2.54) / 100;
    default:
      return pulgadas;
  }
}

/**
 * Calcula el área en pulgadas cuadradas
 */
export function calcularAreaPulgadas(
  ancho: number,
  alto: number,
  unidadAncho: UnidadMedida,
  unidadAlto: UnidadMedida
): number {
  const anchoPulgadas = convertirAPulgadas(ancho, unidadAncho);
  const altoPulgadas = convertirAPulgadas(alto, unidadAlto);
  return anchoPulgadas * altoPulgadas;
}

/**
 * Formatea una medida para mostrar al usuario
 */
export function formatearMedida(valor: number, unidad: UnidadMedida, decimales: number = 2): string {
  if (!valor) return '0';
  
  const simbolo = unidad === 'pulgadas' ? '"' : unidad;
  return `${valor.toFixed(decimales)} ${simbolo}`;
}

/**
 * Obtiene el símbolo de la unidad
 */
export function obtenerSimbolo(unidad: UnidadMedida): string {
  switch (unidad) {
    case 'pulgadas':
      return '"';
    case 'cm':
      return 'cm';
    case 'm':
      return 'm';
    default:
      return '';
  }
}

/**
 * Valida que una medida sea válida
 */
export function validarMedida(valor: number): boolean {
  return valor !== null && valor !== undefined && valor > 0 && !isNaN(valor);
}

/**
 * Calcula precio por pulgada cuadrada
 */
export function calcularPrecioPorPulgada(
  ancho: number,
  alto: number,
  unidadAncho: UnidadMedida,
  unidadAlto: UnidadMedida,
  precioPorPulgada: number
): number {
  const areaPulgadas = calcularAreaPulgadas(ancho, alto, unidadAncho, unidadAlto);
  return areaPulgadas * precioPorPulgada;
}

/**
 * Obtiene el multiplicador de grosor para PVC
 */
export function obtenerMultiplicadorGrosor(grosor: string): number {
  const multiplicadores: Record<string, number> = {
    '1mm': 1.0,
    '2mm': 1.2,
    '3mm': 1.4,
    '5mm': 1.8,
    '10mm': 2.5
  };
  
  return multiplicadores[grosor] || 1.0;
}

/**
 * Calcula precio de PVC con grosor
 */
export function calcularPrecioPVC(
  ancho: number,
  alto: number,
  unidadAncho: UnidadMedida,
  unidadAlto: UnidadMedida,
  precioPorPulgada: number,
  grosor: string
): number {
  const precioBase = calcularPrecioPorPulgada(ancho, alto, unidadAncho, unidadAlto, precioPorPulgada);
  const multiplicador = obtenerMultiplicadorGrosor(grosor);
  return precioBase * multiplicador;
}

/**
 * Obtiene precio de nivel de diseño para camisas
 */
export function obtenerPrecioNivelDiseño(nivel: 'basico' | 'intermedio' | 'premium'): number {
  const precios = {
    'basico': 50,
    'intermedio': 100,
    'premium': 200
  };
  
  return precios[nivel] || 50;
}

/**
 * Calcula precio total de camisas
 */
export function calcularPrecioCamisas(
  cantidad: number,
  nivel: 'basico' | 'intermedio' | 'premium',
  dosLados: boolean,
  clienteTrajo: boolean,
  precioCamisaInventario: number = 0
): number {
  let total = 0;
  
  // Costo de camisas si el cliente NO las trajo
  if (!clienteTrajo) {
    total += cantidad * precioCamisaInventario;
  }
  
  // Costo de diseño
  const precioDiseño = obtenerPrecioNivelDiseño(nivel);
  const lados = dosLados ? 2 : 1;
  total += cantidad * precioDiseño * lados;
  
  return total;
}

/**
 * Obtiene las opciones de grosor de PVC
 */
export function obtenerOpcionesGrosorPVC(): Array<{ value: string; label: string; multiplicador: number }> {
  return [
    { value: '1mm', label: '1mm (Estándar)', multiplicador: 1.0 },
    { value: '2mm', label: '2mm', multiplicador: 1.2 },
    { value: '3mm', label: '3mm', multiplicador: 1.4 },
    { value: '5mm', label: '5mm (Premium)', multiplicador: 1.8 },
    { value: '10mm', label: '10mm (Ultra Premium)', multiplicador: 2.5 }
  ];
}

/**
 * Obtiene las cantidades predefinidas de camisas
 */
export function obtenerCantidadesCamisas(): Array<{ value: number; label: string }> {
  return [
    { value: 6, label: '6 (Media Docena)' },
    { value: 12, label: '12 (Docena)' },
    { value: 24, label: '24 (2 Docenas)' }
  ];
}
