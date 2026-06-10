import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Search, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../ui/card';

const COLOR_DOT_MAP: Record<string, string> = {
  blanco: '#ffffff', negro: '#1a1a1a', rojo: '#ef4444', azul: '#3b82f6',
  verde: '#22c55e', amarillo: '#eab308', rosa: '#ec4899', morado: '#a855f7',
  naranja: '#f97316', gris: '#6b7280', celeste: '#38bdf8', café: '#92400e',
  beige: '#d4c5a9', turquesa: '#2dd4bf', fucsia: '#d946ef',
};

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  price: number;
  image?: string;
  color?: string;
  color_images?: Record<string, string>;
  variants?: Array<{ color: string; size: string; stock: number }>;
}

interface ProductSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: Product) => void;
  products: Product[]; // Recibir productos desde el padre
}

// ─── Subcomponente de tarjeta con selector de color ───────────────────────
function ProductCard({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const colors = useMemo(() => {
    if (product.variants && product.variants.length > 0) {
      return Array.from(new Set(product.variants.map((v) => v.color)));
    }
    if (product.color) {
      return product.color.split(',').map((c) => c.trim()).filter(Boolean);
    }
    return [];
  }, [product]);

  const [activeColor, setActiveColor] = useState<string>(colors[0] || '');

  const displayImage = useMemo(() => {
    if (activeColor && product.color_images?.[activeColor]) {
      return product.color_images[activeColor];
    }
    return product.image || '';
  }, [activeColor, product]);

  const stockForColor = useMemo(() => {
    if (!activeColor || !product.variants) return product.stock;
    return product.variants
      .filter((v) => v.color === activeColor)
      .reduce((sum, v) => sum + v.stock, 0);
  }, [activeColor, product]);

  const totalStock = product.variants
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock;

  const isOutOfStock = totalStock === 0;
  const isLowStock = !isOutOfStock && totalStock <= product.min_stock;

  const stockBadge = isOutOfStock
    ? { cls: 'bg-red-100 text-red-700 border-red-300', icon: <AlertTriangle className="w-3 h-3" />, label: 'SIN STOCK' }
    : isLowStock
    ? { cls: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: <AlertTriangle className="w-3 h-3" />, label: 'STOCK BAJO' }
    : { cls: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="w-3 h-3" />, label: 'DISPONIBLE' };

  return (
    <Card
      className={`overflow-hidden border-2 transition-all duration-200 ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-slate-200'
          : 'cursor-pointer hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5'
      }`}
      onClick={() => !isOutOfStock && onSelect(product)}
    >
      <div className="flex gap-0">
        {/* ── Lado izquierdo: imagen + swatches ── */}
        <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-slate-50 to-slate-100 p-3 w-[120px] shrink-0 border-r border-slate-200">
          {/* Imagen */}
          <div className="w-[96px] h-[96px] rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            {displayImage ? (
              <img src={displayImage} alt={product.name} className="w-full h-full object-cover transition-all duration-300" />
            ) : (
              <Package className="w-10 h-10 text-slate-300" />
            )}
          </div>

          {/* Swatches de color */}
          {colors.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {colors.map((c) => {
                const dot = COLOR_DOT_MAP[c.toLowerCase()] ?? '#94a3b8';
                const isLight = ['blanco', 'beige', 'amarillo'].includes(c.toLowerCase());
                const isActive = activeColor === c;
                return (
                  <button
                    key={c}
                    title={c}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActiveColor(c); }}
                    className={`w-6 h-6 rounded-full transition-all duration-150 ${
                      isActive
                        ? 'ring-2 ring-offset-1 ring-blue-500 scale-110 shadow-md'
                        : isLight
                        ? 'ring-1 ring-gray-300 hover:scale-110'
                        : 'hover:scale-110 hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'
                    }`}
                    style={{ backgroundColor: dot }}
                  />
                );
              })}
            </div>
          )}
          {activeColor && (
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[100px] text-center">{activeColor}</span>
          )}
        </div>

        {/* ── Lado derecho: info ── */}
        <div className="flex-1 p-3 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-2">{product.name}</h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{product.code}</p>
            </div>
            <Badge className={`${stockBadge.cls} border flex items-center gap-1 shrink-0 text-[10px] px-1.5 py-0.5`}>
              {stockBadge.icon}
              {stockBadge.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="bg-slate-50 rounded-lg px-2 py-1.5">
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">Categoría</p>
              <p className="font-semibold text-slate-700 truncate">{product.category}</p>
            </div>
            <div className="bg-blue-50 rounded-lg px-2 py-1.5">
              <p className="text-blue-400 text-[10px] font-semibold uppercase tracking-wide">
                {activeColor ? `Stock (${activeColor})` : 'Stock'}
              </p>
              <p className="font-bold text-blue-700">{activeColor ? stockForColor : totalStock} uds.</p>
            </div>
            {product.price > 0 && (
              <div className="bg-green-50 rounded-lg px-2 py-1.5 col-span-2">
                <p className="text-green-500 text-[10px] font-semibold uppercase tracking-wide">Precio unitario</p>
                <p className="font-bold text-green-700 text-sm">L. {product.price.toFixed(2)}</p>
              </div>
            )}
          </div>

          {!isOutOfStock && (
            <p className="text-[10px] text-blue-500 font-medium text-right">Clic para seleccionar →</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ProductSearchDialog({ open, onOpenChange, onSelectProduct, products: propProducts }: ProductSearchDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cargar productos: Prioridad Props > LocalStorage
  useEffect(() => {
    if (propProducts && propProducts.length > 0) {
      setProducts(propProducts);
    } else {
      setProducts([]);
    }
  }, [propProducts, open]);

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return ['all', ...uniqueCategories];
  }, [products]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.code?.toLowerCase().includes(query) ||
        p.name?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const handleSelect = (product: Product) => {
    if (product.stock === 0) {
      alert('⚠️ Este producto no tiene stock disponible');
      return;
    }
    onSelectProduct(product);
    onOpenChange(false);
    setSearchQuery('');
    setSelectedCategory('all');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-4xl max-h-[88vh] h-auto p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-linear-to-r from-blue-600 to-cyan-600 shrink-0">
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            Buscar Producto del Inventario
          </DialogTitle>
          <DialogDescription className="text-white/80">
            Selecciona un producto del inventario para agregarlo al pedido
          </DialogDescription>
        </DialogHeader>

        {/* Barra de búsqueda y filtros */}
        <div className="px-6 py-4 border-b bg-gray-50 shrink-0">
          <div className="space-y-3">
            {/* Campo de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="🔍 Buscar por código, nombre o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg border-2 border-blue-200 focus:border-blue-500"
                autoFocus
              />
            </div>

            {/* Filtros de categoría */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat ? 'bg-blue-600 hover:bg-blue-700' : ''}
                >
                  {cat === 'all' ? '📦 Todos' : cat.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package className="w-16 h-16 mb-4" />
              <p className="text-lg">No se encontraron productos</p>
              {searchQuery && (
                <p className="text-sm">Intenta con otros términos de búsqueda</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} onSelect={handleSelect} />
              ))}
            </div>
          )}
        </div>

        {/* Footer con información */}
        <div className="px-6 py-3 border-t bg-gray-50 shrink-0 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-bold">{filteredProducts.length}</span> producto(s) encontrado(s)
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
