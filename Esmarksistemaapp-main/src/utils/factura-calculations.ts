/**
 * Cálculos fiscales de factura (usados por facturaCartaPdf y tests).
 */

export interface FacturaProducto {
  cantidad: number;
  precio: number;
  descuento?: number;
  impuesto: number;
}

export interface FacturaLike {
  productos: FacturaProducto[];
  impuestos?: number;
}

export function subtotalByTax(factura: FacturaLike, rate: number): number {
  return factura.productos.reduce((sum, producto) => {
    const subtotal = producto.cantidad * producto.precio;
    const descuento = subtotal * ((producto.descuento || 0) / 100);
    return producto.impuesto === rate ? sum + subtotal - descuento : sum;
  }, 0);
}

export function taxByRate(factura: FacturaLike, rate: number): number {
  return factura.productos.reduce((sum, producto) => {
    const subtotal = producto.cantidad * producto.precio;
    const descuento = subtotal * ((producto.descuento || 0) / 100);
    const base = subtotal - descuento;
    return producto.impuesto === rate ? sum + base * (rate / 100) : sum;
  }, 0);
}

export function calculateFacturaTotals(factura: FacturaLike) {
  const gravado15 = subtotalByTax(factura, 15);
  const gravado18 = subtotalByTax(factura, 18);
  const isv15 = taxByRate(factura, 15);
  const isv18 = taxByRate(factura, 18);
  const subtotal = gravado15 + gravado18;
  const impuestos = isv15 + isv18;
  return { gravado15, gravado18, isv15, isv18, subtotal, impuestos, total: subtotal + impuestos };
}
