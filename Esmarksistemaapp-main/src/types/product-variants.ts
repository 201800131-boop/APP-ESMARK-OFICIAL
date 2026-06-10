/**
 * Sistema de variantes para productos
 * Permite manejar un producto con múltiples colores y tallas
 */

export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
  min_stock: number;
  sku: string; // SKU específico para esta variante
  barcode?: string;
}

export interface ProductWithVariants {
  id: string;
  name: string; // Nombre base (ej: "Kiana Cuello Redondo")
  category: string;
  brand: string;
  neckline?: string; // Tipo de cuello
  description?: string;
  price: number; // Precio base
  cost: number; // Costo base
  unit: string;
  active: boolean;
  has_variants: boolean; // TRUE si usa sistema de variantes
  variants: ProductVariant[]; // Array de variantes (color + talla)
  color_images?: { [color: string]: string }; // NUEVO: Imagen por cada color
  image?: string; // Imagen por defecto
  created_at: string;
  updated_at: string;
}

// Para productos simples sin variantes (retrocompatibilidad)
export interface SimpleProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  color?: string;
  size?: string;
  neckline?: string;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  unit: string;
  description?: string;
  active: boolean;
  has_variants: false;
  created_at: string;
  updated_at: string;
}

export type Product = ProductWithVariants | SimpleProduct;

// Helper para verificar si un producto tiene variantes
export function hasVariants(product: Product): product is ProductWithVariants {
  return product.has_variants === true;
}

// Helper para obtener el stock total de un producto
export function getTotalStock(product: Product): number {
  if (hasVariants(product)) {
    return product.variants.reduce((total, variant) => total + variant.stock, 0);
  }
  return product.stock;
}

// Helper para obtener todos los colores disponibles
export function getAvailableColors(product: Product): string[] {
  if (hasVariants(product)) {
    const colors = new Set(product.variants.map(v => v.color));
    return Array.from(colors);
  }
  return product.color ? [product.color] : [];
}

// Helper para obtener todas las tallas de un color específico
export function getSizesForColor(product: ProductWithVariants, color: string): ProductVariant[] {
  return product.variants.filter(v => v.color === color);
}

// Helper para encontrar una variante específica
export function findVariant(
  product: ProductWithVariants,
  color: string,
  size: string
): ProductVariant | undefined {
  return product.variants.find(v => v.color === color && v.size === size);
}

// Helper para verificar si hay stock bajo en alguna variante
export function hasLowStock(product: Product): boolean {
  if (hasVariants(product)) {
    return product.variants.some(v => v.stock <= v.min_stock);
  }
  return product.stock <= product.min_stock;
}

// Helper para obtener variantes con stock bajo
export function getLowStockVariants(product: ProductWithVariants): ProductVariant[] {
  return product.variants.filter(v => v.stock <= v.min_stock);
}