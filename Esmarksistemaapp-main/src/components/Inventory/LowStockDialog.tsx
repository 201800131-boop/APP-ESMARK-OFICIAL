import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  X,
  ExternalLink,
} from 'lucide-react';

export interface LowStockProduct {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  min_stock: number;
  unit?: string;
  category?: string;
  supplier?: string;
}

interface LowStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: LowStockProduct[];
  onViewProduct?: (product: LowStockProduct) => void;
  onNavigateToInventory?: () => void;
}

export default function LowStockDialog({
  open,
  onOpenChange,
  products,
  onViewProduct,
  onNavigateToInventory,
}: LowStockDialogProps) {
  // Validar que products sea un array
  const validProducts = Array.isArray(products) ? products : [];
  
  const outOfStock = validProducts.filter(p => p.stock === 0);
  const lowStock = validProducts.filter(p => p.stock > 0);

  const getStockStatus = (product: LowStockProduct) => {
    if (product.stock === 0) return 'out';
    if (product.stock <= product.min_stock / 2) return 'critical';
    return 'low';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'critical':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'out':
        return 'AGOTADO';
      case 'critical':
        return 'CRÍTICO';
      default:
        return 'BAJO';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="low-stock-dialog max-w-4xl w-[min(92vw,860px)] max-h-[84vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="low-stock-title-icon w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl text-gray-900">
                Stock Bajo - Alerta de Inventario
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                {validProducts.length} producto{validProducts.length !== 1 ? 's' : ''} requieren atención inmediata
              </DialogDescription>
            </div>
          </div>

          {/* Resumen de estado */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-red-100 border-2 border-red-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">AGOTADOS</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{outOfStock.length}</p>
            </div>
            
            <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold text-orange-700">STOCK BAJO</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{lowStock.length}</p>
            </div>
            
            <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">TOTAL</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">{validProducts.length}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto mt-4 pr-2">
          <div className="space-y-3">
            {validProducts.map((product: LowStockProduct) => {
              const status = getStockStatus(product);
              const stockPercent = (product.stock / product.min_stock) * 100;
              
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* Icono de estado */}
                    <div className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${ status === 'out' ? 'bg-red-100' : status === 'critical' ? 'bg-orange-100' : 'bg-yellow-100' }`}>
                      <Package className={`w-6 h-6 ${ status === 'out' ? 'text-red-600' : status === 'critical' ? 'text-orange-600' : 'text-yellow-600' }`} />
                    </div>

                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-sm text-gray-600">
                              SKU: <span className="font-mono font-medium">{product.sku}</span>
                            </p>
                          )}
                        </div>
                        <Badge className={`${getStatusColor(status)} border-2`}>
                          {getStatusText(status)}
                        </Badge>
                      </div>

                      {/* Categoría y Proveedor */}
                      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                        {product.category && (
                          <span>📦 {product.category}</span>
                        )}
                        {product.supplier && (
                          <span>🏭 {product.supplier}</span>
                        )}
                      </div>

                      {/* Barra de stock */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            Stock actual: {product.stock} {product.unit || 'unidades'}
                          </span>
                          <span className="text-sm text-gray-600">
                            Mínimo: {product.min_stock} {product.unit || 'unidades'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full transition-all ${ status === 'out' ? 'bg-red-500' : status === 'critical' ? 'bg-orange-500' : 'bg-yellow-500' }`}
                            style={{ width: `${Math.min(stockPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Botón de acción */}
                      {onViewProduct && (
                        <Button
                          onClick={() => {
                            onViewProduct(product);
                            onOpenChange(false);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-2 border-orange-300 hover:bg-orange-50 hover:border-orange-400 text-orange-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver detalles del producto
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="shrink-0 border-t-2 border-gray-200 pt-4 mt-4">
          <div className="flex gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="low-stock-button low-stock-button--close flex-1"
            >
              Cerrar
            </Button>
            {onNavigateToInventory && (
              <Button
                onClick={onNavigateToInventory}
                variant="default"
                className="low-stock-button low-stock-button--inventory flex-1"
              >
                <Package className="w-4 h-4 mr-2" />
                Ir al inventario completo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
