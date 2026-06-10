import { describe, it, expect } from 'vitest';
import { calculateFacturaTotals } from './factura-calculations';

describe('factura PDF / cálculos fiscales', () => {
  it('calcula ISV 15% y 18% correctamente', () => {
    const factura = {
      productos: [
        { cantidad: 2, precio: 100, descuento: 0, impuesto: 15 },
        { cantidad: 1, precio: 200, descuento: 10, impuesto: 18 },
      ],
    };

    const totals = calculateFacturaTotals(factura);
    expect(totals.gravado15).toBe(200);
    expect(totals.isv15).toBe(30);
    expect(totals.gravado18).toBe(180);
    expect(totals.isv18).toBeCloseTo(32.4);
    expect(totals.total).toBeCloseTo(442.4);
  });
});
