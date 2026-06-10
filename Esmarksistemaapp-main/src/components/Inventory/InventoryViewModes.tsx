import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card } from '../ui/card';
import { Edit, Image as ImageIcon, Trash2, Package } from 'lucide-react';
import { normalizeAppText } from '../../utils/text-normalizer';

interface ColorVariant {
  color: string;
  stock: number;
  image?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  price: number;
  color?: string;
  colors?: string[];
  colorVariants?: ColorVariant[];
  image?: string;
  sizes?: string[];
  size_inventories?: { size: string; stock: number; minStock: number }[];
  groupedCount?: number;
  groupedIds?: string[];
}

// Mapeo de nombres de colores (español) a CSS
const COLOR_MAP: Record<string, string> = {
  blanco: '#ffffff', negro: '#1a1a1a', rojo: '#ef4444', azul: '#3b82f6',
  verde: '#22c55e', amarillo: '#eab308', rosa: '#ec4899', morado: '#a855f7',
  naranja: '#f97316', gris: '#6b7280', celeste: '#38bdf8', café: '#92400e',
  cafe: '#92400e', beige: '#d4b896', turquesa: '#14b8a6', fucsia: '#d946ef',
  violeta: '#8b5cf6', lila: '#c084fc', salmon: '#fb923c', dorado: '#f59e0b',
  plateado: '#94a3b8', coral: '#fb7185', menta: '#6ee7b7', arena: '#fde68a',
  bordo: '#9f1239', vino: '#881337', oliva: '#65a30d', cyan: '#06b6d4',
  magenta: '#e879f9', lima: '#a3e635', aqua: '#22d3ee', chocolate: '#78350f',
  crema: '#fef3c7', lavanda: '#e9d5ff', perla: '#f1f5f9',
};

function getColorCss(name: string): string {
  return COLOR_MAP[name.toLowerCase().trim()] ?? '#94a3b8';
}

function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function cleanText(value?: string) {
  return normalizeAppText(value || '');
}

function DeleteProductButton({
  product,
  onDelete,
  compact = false,
}: {
  product: Product;
  onDelete: (product: Product) => void;
  compact?: boolean;
}) {
  const size = compact ? 36 : 40;

  return (
    <button
      type="button"
      title={`Eliminar ${cleanText(product.name)}`}
      aria-label={`Eliminar ${cleanText(product.name)}`}
      onClick={(event) => {
        event.stopPropagation();
        onDelete(product);
      }}
      className="inline-flex aspect-square shrink-0 items-center justify-center rounded-full border-2 border-red-200 bg-red-50 text-red-600 shadow-sm transition-all duration-200 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 active:scale-95"
      style={{ width: size, height: size, minWidth: size, padding: 0, borderRadius: '9999px' }}
    >
      <Trash2 className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={2.25} />
    </button>
  );
}

function ColorDots({ product, compact = false }: { product: Product; compact?: boolean }) {
  const variants = product.colorVariants && product.colorVariants.length > 0
    ? product.colorVariants
    : (product.colors || []).map((color) => ({ color, stock: product.stock }));

  if (variants.length === 0 && product.color) {
    variants.push({ color: product.color, stock: product.stock });
  }

  if (variants.length === 0) {
    return <span className="text-xs text-slate-400">Sin color</span>;
  }

  const visible = compact ? variants.slice(0, 3) : variants.slice(0, 5);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ color, stock }) => {
        const css = getColorCss(color);
        const needsRing = !isDarkColor(css) || cleanText(color).toLowerCase() === 'blanco';
        return (
          <span
            key={color}
            title={`${cleanText(color)}: ${stock} uds`}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm"
          >
            <span
              className={`h-3.5 w-3.5 rounded-full ${needsRing ? 'ring-1 ring-slate-300' : ''}`}
              style={{ backgroundColor: css }}
            />
            {!compact && <span className="capitalize">{cleanText(color)}</span>}
            <span>{stock}</span>
          </span>
        );
      })}
      {variants.length > visible.length && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          +{variants.length - visible.length}
        </span>
      )}
    </div>
  );
}

interface ViewModesProps {
  products: Product[];
  viewMode: 'list' | 'grid' | 'cards' | 'compact';
  onSelectProduct: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  getStockStatus: (product: Product) => { label: string; color: string };
}

export function ListView({ products, onSelectProduct, onEdit, onDelete, getStockStatus }: Omit<ViewModesProps, 'viewMode'>) {
  return (
    <Table className="border border-slate-300 rounded-lg overflow-hidden">
      <TableHeader>
        <TableRow className="bg-slate-800 hover:bg-slate-800 border-b border-slate-700">
          <TableHead className="text-slate-100 font-semibold">Imagen</TableHead>
          <TableHead className="text-slate-100 font-semibold">Código</TableHead>
          <TableHead className="text-slate-100 font-semibold">Categoría</TableHead>
          <TableHead className="text-slate-100 font-semibold">Nombre</TableHead>
          <TableHead className="text-slate-100 font-semibold">Colores</TableHead>
          <TableHead className="text-slate-100 font-semibold">Tallas</TableHead>
          <TableHead className="text-slate-100 font-semibold">Precio</TableHead>
          <TableHead className="text-slate-100 font-semibold">Stock</TableHead>
          <TableHead className="text-slate-100 font-semibold">Estado</TableHead>
          <TableHead className="text-slate-100 font-semibold">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const status = getStockStatus(product);
          return (
            <TableRow 
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
            >
              <TableCell>
                <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={cleanText(product.name)} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
              </TableCell>
              <TableCell className="font-medium">{product.code}</TableCell>
              <TableCell>
                <Badge variant="outline">{cleanText(product.category)}</Badge>
              </TableCell>
              <TableCell>{cleanText(product.name)}</TableCell>
              <TableCell>
                <ColorDots product={product} compact />
              </TableCell>
              <TableCell>
                {product.sizes && product.sizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {product.sizes.slice(0, 3).map((size: string) => (
                      <Badge key={size} variant="secondary" className="text-xs">
                        {size}
                      </Badge>
                    ))}
                    {product.sizes.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{product.sizes.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {product.price > 0 ? (
                  <span className="text-green-700 font-medium">
                    L. {product.price.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-500 text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                <span className="font-medium">{product.stock}</span>
                <span className="text-gray-500 text-sm"> / {product.min_stock}</span>
              </TableCell>
              <TableCell>
                <Badge className={status.color}>{status.label}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title={`Editar ${cleanText(product.name)}`}
                    aria-label={`Editar ${cleanText(product.name)}`}
                    className="size-9 rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                    style={{ borderRadius: '9999px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(product);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <DeleteProductButton product={product} onDelete={onDelete} compact />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function GridView({ products, onSelectProduct, onEdit, onDelete, getStockStatus }: Omit<ViewModesProps, 'viewMode'>) {
  const handleCardClick = (product: Product) => {
    onSelectProduct(product);
  };

  return (
    <>
      <div
        className="grid items-stretch gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}
      >
        {products.map((product) => {
          const status = getStockStatus(product);

          const stockBarPct = product.min_stock > 0
            ? Math.min(100, Math.round((product.stock / (product.min_stock * 3)) * 100))
            : product.stock > 0 ? 100 : 0;
          const stockBarColor = product.stock === 0 ? 'bg-red-500' : product.stock <= product.min_stock ? 'bg-amber-400' : 'bg-emerald-500';

          return (
            <div
              key={product.id}
              onClick={() => handleCardClick(product)}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
              style={{ height: 318 }}
            >
              {/* Imagen */}
              <div
                className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 via-white to-blue-50"
                style={{ height: 112 }}
              >
                {product.image ? (
                  <img src={product.image} alt={cleanText(product.name)} className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    <Package className="w-8 h-8 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-400">{cleanText(product.category)}</span>
                  </div>
                )}
                {(product.stock === 0 || product.stock <= product.min_stock) && (
                  <div className={`absolute top-3 right-3 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white ${
                    product.stock === 0 ? 'bg-red-600' : 'bg-amber-500'
                  }`}>
                    {product.stock === 0 ? 'Sin stock' : 'Bajo'}
                  </div>
                )}
                {/* Badge variantes agrupadas */}
                {product.groupedCount && product.groupedCount > 1 && (
                  <div className="absolute top-3 left-3 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                    {product.groupedCount} colores
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex min-h-0 flex-1 flex-col p-3">
                {/* Nombre y código */}
                <div style={{ minHeight: 42 }}>
                  <p className="line-clamp-2 text-sm font-black leading-tight text-slate-900">{cleanText(product.name)}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{product.code}</p>
                </div>

                {/* Precio y stock */}
                <div className="mt-2 flex items-end justify-between gap-2">
                  {product.price > 0 ? (
                    <span className="text-[15px] font-black text-emerald-700">L. {product.price.toFixed(2)}</span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Sin precio</span>
                  )}
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{product.stock} uds</span>
                </div>

                {/* Barra de stock */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full transition-all ${stockBarColor}`} style={{ width: `${stockBarPct}%` }} />
                </div>

                {/* Puntos de color */}
                <div className="mt-2" style={{ minHeight: 24 }}>
                  <ColorDots product={product} />
                </div>

                {/* Tallas */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1" style={{ minHeight: 22 }}>
                    {product.sizes.slice(0, 5).map(size => (
                      <span key={size} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{size}</span>
                    ))}
                    {product.sizes.length > 5 && <span className="text-[10px] text-slate-400">+{product.sizes.length - 5}</span>}
                  </div>
                )}

                {/* Botones acción */}
                <div className="mt-auto flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                    className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-black text-blue-700 shadow-sm transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                    style={{ height: 36, minHeight: 36, borderRadius: '10px' }}
                  >
                    <Edit className="h-3.5 w-3.5" /> Editar
                  </button>
                  <DeleteProductButton product={product} onDelete={onDelete} compact />
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
}

export function CardsView({ products, onSelectProduct, onEdit, onDelete, getStockStatus }: Omit<ViewModesProps, 'viewMode'>) {
  return (
    <div className="space-y-2">
      {products.map((product) => {
        const status = getStockStatus(product);
        return (
          <Card 
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="cursor-pointer overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
          >
            <div className="p-3">
              <div className="flex gap-3" style={{ minHeight: 112 }}>
                <div
                  className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-blue-50"
                  style={{ width: 96, height: 96 }}
                >
                  {product.image ? (
                    <img src={product.image} alt={cleanText(product.name)} className="h-full w-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h4 className="line-clamp-1 font-semibold text-slate-900">{cleanText(product.name)}</h4>
                      <p className="text-sm text-gray-500">Código: {product.code}</p>
                      {product.groupedCount && product.groupedCount > 1 && (
                        <p className="text-xs text-blue-700 font-medium mt-1">
                          {product.groupedCount} variantes consolidadas
                        </p>
                      )}
                    </div>
                    <Badge className={status.color}>{status.label}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{cleanText(product.category)}</Badge>
                    <ColorDots product={product} />
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.map((size: string) => (
                          <Badge key={size} variant="secondary" className="text-xs">
                            {size}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-5">
                      {product.price > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">Precio</p>
                          <p className="text-green-700 font-medium">L. {product.price.toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className="font-medium">{product.stock} <span className="text-gray-500 text-sm">/ {product.min_stock}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 rounded-lg border-blue-200 bg-blue-50 px-3 text-blue-700 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                        style={{ height: 36, minHeight: 36, borderRadius: '10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(product);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <DeleteProductButton product={product} onDelete={onDelete} compact />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function CompactView({ products, onSelectProduct, onEdit, onDelete, getStockStatus }: Omit<ViewModesProps, 'viewMode'>) {
  return (
    <div className="space-y-1">
      {products.map((product) => {
        const status = getStockStatus(product);
        return (
          <div 
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 border-l-4 border-l-transparent"
          >
            <div className="w-10 h-10 shrink-0 bg-gray-100 rounded overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={cleanText(product.name)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-gray-500 w-20 shrink-0">{product.code}</span>
              <span className="font-medium flex-1 truncate">{cleanText(product.name)}</span>
              <Badge variant="outline" className="text-xs shrink-0">{cleanText(product.category)}</Badge>
              {product.colors && product.colors.length > 0 && (
                <div className="shrink-0">
                  <ColorDots product={product} compact />
                </div>
              )}
              {product.sizes && product.sizes.length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {product.sizes.slice(0, 2).map((size: string) => (
                    <Badge key={size} variant="secondary" className="text-xs">
                      {size}
                    </Badge>
                  ))}
                  {product.sizes.length > 2 && <span className="text-xs text-gray-500">+{product.sizes.length - 2}</span>}
                </div>
              )}
              {product.price > 0 && (
                <span className="text-green-700 font-medium text-sm shrink-0">L. {product.price.toFixed(2)}</span>
              )}
              <span className="text-sm shrink-0">
                <span className="font-medium">{product.stock}</span>
                <span className="text-gray-500 text-xs"> / {product.min_stock}</span>
              </span>
              <Badge className={status.color + ' text-xs shrink-0'}>{status.label}</Badge>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={`Editar ${cleanText(product.name)}`}
                aria-label={`Editar ${cleanText(product.name)}`}
                className="size-9 rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                style={{ borderRadius: '9999px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(product);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DeleteProductButton product={product} onDelete={onDelete} compact />
            </div>
          </div>
        );
      })}
    </div>
  );
}
