/**
 * Convierte un número a palabras en español (Honduras)
 * Ejemplo: 1500.50 -> "MIL QUINIENTOS LEMPIRAS CON 50/100"
 */

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS_Y = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirUnidades(num: number): string {
  return UNIDADES[num] || '';
}

function convertirDecenas(num: number): string {
  if (num < 10) {
    return convertirUnidades(num);
  } else if (num >= 10 && num < 20) {
    return DECENAS[num - 10];
  } else {
    const unidad = num % 10;
    const decena = Math.floor(num / 10);
    if (unidad === 0) {
      return DECENAS_Y[decena];
    } else {
      return `${DECENAS_Y[decena]} Y ${UNIDADES[unidad]}`;
    }
  }
}

function convertirCentenas(num: number): string {
  if (num === 100) {
    return 'CIEN';
  } else if (num < 100) {
    return convertirDecenas(num);
  } else {
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    if (resto === 0) {
      return CENTENAS[centena];
    } else {
      return `${CENTENAS[centena]} ${convertirDecenas(resto)}`;
    }
  }
}

function convertirMiles(num: number): string {
  if (num < 1000) {
    return convertirCentenas(num);
  } else if (num === 1000) {
    return 'MIL';
  } else {
    const miles = Math.floor(num / 1000);
    const resto = num % 1000;
    
    let textoMiles = '';
    if (miles === 1) {
      textoMiles = 'MIL';
    } else {
      textoMiles = `${convertirCentenas(miles)} MIL`;
    }
    
    if (resto === 0) {
      return textoMiles;
    } else {
      return `${textoMiles} ${convertirCentenas(resto)}`;
    }
  }
}

function convertirMillones(num: number): string {
  if (num < 1000000) {
    return convertirMiles(num);
  } else {
    const millones = Math.floor(num / 1000000);
    const resto = num % 1000000;
    
    let textoMillones = '';
    if (millones === 1) {
      textoMillones = 'UN MILLÓN';
    } else {
      textoMillones = `${convertirMiles(millones)} MILLONES`;
    }
    
    if (resto === 0) {
      return textoMillones;
    } else {
      return `${textoMillones} ${convertirMiles(resto)}`;
    }
  }
}

/**
 * Convierte un monto a letras en formato hondureño
 * @param amount - Monto numérico (ej: 1500.50)
 * @param currency - Moneda (por defecto "LEMPIRAS")
 * @returns String con el monto en letras (ej: "MIL QUINIENTOS LEMPIRAS CON 50/100")
 */
export function amountToWords(amount: number, currency: string = 'LEMPIRAS'): string {
  if (amount === 0) {
    return `CERO ${currency}`;
  }

  // Separar parte entera y decimal
  const parteEntera = Math.floor(amount);
  const parteDecimal = Math.round((amount - parteEntera) * 100);

  // Convertir parte entera
  let palabras = convertirMillones(parteEntera);
  
  // Limpiar espacios extras
  palabras = palabras.trim().replace(/\s+/g, ' ');

  // Agregar moneda
  if (parteEntera === 1) {
    palabras = `${palabras} ${currency.replace('ES', '')}`;  // "UN LEMPIRA" en vez de "UN LEMPIRAS"
  } else {
    palabras = `${palabras} ${currency}`;
  }

  // Agregar centavos
  if (parteDecimal > 0) {
    palabras = `${palabras} CON ${parteDecimal.toString().padStart(2, '0')}/100`;
  } else {
    palabras = `${palabras} EXACTOS`;
  }

  return palabras;
}

/**
 * Formatea un monto a letras de forma más corta
 * @param amount - Monto numérico
 * @returns String formateado
 */
export function formatAmountToWords(amount: number): string {
  return amountToWords(amount, 'LEMPIRAS');
}

// Ejemplos de uso:
// amountToWords(1500.50) -> "MIL QUINIENTOS LEMPIRAS CON 50/100"
// amountToWords(100) -> "CIEN LEMPIRAS EXACTOS"
// amountToWords(1) -> "UN LEMPIRA EXACTOS"
// amountToWords(25000.75) -> "VEINTICINCO MIL LEMPIRAS CON 75/100"
