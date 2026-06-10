import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, Edit, Package, Ruler, Tag, X } from 'lucide-react';
import { normalizeAppText } from '../../utils/text-normalizer';
import './ProductPreviewModal.css';

export interface ProductPreviewSize {
  size: string;
  stock: number;
  minStock: number;
}

export interface ProductPreviewColor {
  color: string;
  stock: number;
  image?: string;
  sizes?: ProductPreviewSize[];
}

export interface ProductPreviewProduct {
  id: string;
  code: string;
  category: string;
  name: string;
  style?: string;
  color?: string;
  stock: number;
  min_stock: number;
  price: number;
  image?: string;
  sizes?: string[];
  size_inventories?: ProductPreviewSize[];
  groupedCount?: number;
  colors?: string[];
  colorVariants?: ProductPreviewColor[];
}

interface ProductPreviewModalProps {
  product: ProductPreviewProduct | null;
  onClose: () => void;
  onEdit: (product: ProductPreviewProduct) => void;
}

const COLOR_MAP: Record<string, string> = {
  blanco: '#ffffff', negro: '#111827', rojo: '#ef4444', azul: '#3b82f6',
  verde: '#22c55e', amarillo: '#eab308', rosa: '#ec4899', morado: '#a855f7',
  naranja: '#f97316', gris: '#6b7280', celeste: '#38bdf8', cafe: '#92400e',
  'café': '#92400e', beige: '#d4b896', turquesa: '#14b8a6', fucsia: '#d946ef',
  violeta: '#8b5cf6', lila: '#c084fc', dorado: '#f59e0b', plateado: '#94a3b8',
};

const cleanText = (value?: string) => normalizeAppText(value || '');
const colorCss = (name?: string) => COLOR_MAP[cleanText(name).toLowerCase().trim()] || '#94a3b8';

function getVariants(product: ProductPreviewProduct): ProductPreviewColor[] {
  if (product.colorVariants?.length) return product.colorVariants;

  const colors = product.colors?.length ? product.colors : product.color ? [product.color] : [];
  return colors.map((color) => ({
    color,
    stock: product.stock,
    image: product.image,
    sizes: product.size_inventories,
  }));
}

export default function ProductPreviewModal({ product, onClose, onEdit }: ProductPreviewModalProps) {
  const variants = useMemo(() => product ? getVariants(product) : [], [product]);
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    setSelectedColor(variants[0]?.color || '');
  }, [product?.id, variants]);

  useEffect(() => {
    if (!product) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const activeVariant = variants.find((variant) => variant.color === selectedColor) || variants[0];
  const activeStock = activeVariant?.stock ?? product.stock;
  const activeSizes = activeVariant?.sizes?.length
    ? activeVariant.sizes
    : product.size_inventories?.length
      ? product.size_inventories
      : (product.sizes || []).map((size) => ({ size, stock: activeStock, minStock: 0 }));
  const activeImage = activeVariant?.image || product.image;
  const totalStock = variants.length
    ? variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
    : product.stock;
  const status = activeStock === 0 ? 'Sin stock' : activeStock <= product.min_stock ? 'Stock bajo' : 'Disponible';
  const statusTone = activeStock === 0 ? 'danger' : activeStock <= product.min_stock ? 'warning' : 'success';

  return createPortal(
    <div className="product-preview-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <article className="product-preview-modal" role="dialog" aria-modal="true" aria-label={`Vista de ${product.name}`}>
        <header className="product-preview-header">
          <button className="product-preview-icon-button" onClick={onClose} type="button" aria-label="Regresar">
            <ArrowLeft />
          </button>
          <div className="product-preview-heading">
            <h2>Vista de producto</h2>
            <p>{product.code || 'Sin código'} · {cleanText(product.category) || 'Sin categoría'}</p>
          </div>
          <button className="product-preview-close-button" onClick={onClose} type="button" aria-label="Cerrar">
            <X />
          </button>
        </header>

        <div className="product-preview-body">
          <section className="product-preview-visual-column">
            <div className="product-preview-image-card">
              <span className="product-preview-category">{cleanText(product.category) || 'Inventario'}</span>
              {activeImage ? (
                <img src={activeImage} alt={product.name} />
              ) : (
                <div className="product-preview-placeholder" style={{ backgroundColor: colorCss(activeVariant?.color) }}>
                  <Package />
                  <span>Sin imagen</span>
                </div>
              )}
              <p>{product.name}</p>
            </div>

            <div className="product-preview-colors">
              <div className="product-preview-section-row">
                <span>Color</span>
                <strong>{activeStock} uds disponibles</strong>
              </div>
              {variants.length ? (
                <div className="product-preview-swatches">
                  {variants.map((variant) => (
                    <button
                      key={variant.color}
                      type="button"
                      className={variant.color === activeVariant?.color ? 'is-active' : ''}
                      onClick={() => setSelectedColor(variant.color)}
                      title={`${cleanText(variant.color)}: ${variant.stock} unidades`}
                      aria-label={`Seleccionar color ${cleanText(variant.color)}`}
                    >
                      <span style={{ backgroundColor: colorCss(variant.color) }} />
                      <small>{cleanText(variant.color)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="product-preview-empty">Este producto no tiene colores registrados.</p>
              )}
            </div>
          </section>

          <section className="product-preview-info-column">
            <div className="product-preview-title-row">
              <div>
                <h1>{product.name}</h1>
                <p>{product.code || 'Sin código'}</p>
              </div>
              <span className={`product-preview-status ${statusTone}`}>
                <Check /> {status}
              </span>
            </div>

            {activeVariant && (
              <div className="product-preview-selected-color">
                <span style={{ backgroundColor: colorCss(activeVariant.color) }} />
                <b>{cleanText(activeVariant.color)}</b>
                <strong>{activeStock} uds</strong>
              </div>
            )}

            <div className="product-preview-summary">
              <div className="price"><Tag /><span>Precio<strong>{product.price > 0 ? `L. ${product.price.toFixed(2)}` : '-'}</strong></span></div>
              <div className="stock"><Package /><span>Stock color<strong>{activeStock}</strong></span></div>
              <div><Ruler /><span>Mínimo<strong>{product.min_stock}</strong></span></div>
            </div>

            <div className="product-preview-details">
              <div><span>Código</span><strong>{product.code || '-'}</strong></div>
              <div><span>Categoría</span><strong>{cleanText(product.category) || '-'}</strong></div>
              <div><span>Variantes</span><strong>{product.groupedCount && product.groupedCount > 1 ? `${product.groupedCount} agrupadas` : 'Producto individual'}</strong></div>
              <div><span>Stock total</span><strong>{totalStock} uds</strong></div>
            </div>

            <div className="product-preview-sizes">
              <h3><Ruler /> Tallas disponibles{activeVariant ? ` en ${cleanText(activeVariant.color)}` : ''}</h3>
              {activeSizes.length ? (
                <div>
                  {activeSizes.map((item) => (
                    <article key={item.size} className={item.stock === 0 ? 'is-empty' : ''}>
                      <strong>{item.size}</strong>
                      <span>{item.stock} uds</span>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="product-preview-empty">No hay tallas registradas para este color.</p>
              )}
            </div>

            <button className="product-preview-edit-button" type="button" onClick={() => onEdit(product)}>
              <Edit /> Editar producto
            </button>
          </section>
        </div>
      </article>
    </div>,
    document.body
  );
}
