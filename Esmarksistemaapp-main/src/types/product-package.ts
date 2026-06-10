export interface PackageRow {
  id: string;
  quantityLabel: string;
  quantity: number;
  prices: Record<string, number>;
}

export interface ProductPackage {
  id: string;
  name: string;
  productType: string;
  shapes: string[];
  sizeHeaders: string[];
  rows: PackageRow[];
  description?: string;
  activo?: boolean;
}
