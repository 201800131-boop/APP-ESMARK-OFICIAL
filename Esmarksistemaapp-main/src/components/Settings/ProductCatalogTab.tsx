import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Plus, Edit, Trash2, Check, AlertTriangle, Package } from 'lucide-react';
import { api } from '../../utils/api';
import { safeParse } from '../../utils/safe-parse';

interface CatalogProduct {
  id: string;
  legacy_id?: string;
  nombre: string;
  categoria: string;
  activo: boolean;
  manual?: boolean;
  sort_order?: number;
  created_at?: string;
}

const DEFAULT_PRODUCTS: CatalogProduct[] = [
  { id: 'banner', legacy_id: 'banner', nombre: 'Banner', categoria: 'Impresion', activo: true, sort_order: 10 },
  { id: 'sticker', legacy_id: 'sticker', nombre: 'Sticker', categoria: 'Impresion', activo: true, sort_order: 20 },
  { id: 'pvc', legacy_id: 'pvc', nombre: 'PVC', categoria: 'Impresion', activo: true, sort_order: 30 },
  { id: 'carnet', legacy_id: 'carnet', nombre: 'Carnet', categoria: 'Identificacion', activo: true, sort_order: 40 },
  { id: 'reconocimiento', legacy_id: 'reconocimiento', nombre: 'Reconocimiento', categoria: 'Premios', activo: true, sort_order: 50 },
  { id: 'rotulacion', legacy_id: 'rotulacion', nombre: 'Rotulacion', categoria: 'Servicios', activo: true, manual: true, sort_order: 60 },
];

function normalizeProduct(product: any, index: number): CatalogProduct | null {
  const nombre = String(product?.nombre || product?.name || '').trim();
  if (!nombre) return null;

  return {
    ...product,
    id: String(product?.id || product?.legacy_id || `catalog-${index}`),
    legacy_id: product?.legacy_id || product?.id || undefined,
    nombre,
    categoria: String(product?.categoria || product?.category || 'General'),
    activo: product?.activo !== false && product?.active !== false,
    manual: Boolean(product?.manual),
    sort_order: Number(product?.sort_order || product?.sortOrder || index + 1),
  };
}

function readLocalCatalog() {
  const local = safeParse<any[]>(localStorage.getItem('esmark_catalog_products'), []);
  return local.map(normalizeProduct).filter(Boolean) as CatalogProduct[];
}

function cacheCatalog(products: CatalogProduct[]) {
  localStorage.setItem('esmark_catalog_products', JSON.stringify(products));
  window.dispatchEvent(new CustomEvent('esmark-catalog-products-changed', { detail: products }));
}

export default function ProductCatalogTab() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');

  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const remote = await api.getCatalogProducts();
      let list = (remote.products || []).map(normalizeProduct).filter(Boolean) as CatalogProduct[];

      if (list.length === 0) {
        const local = readLocalCatalog();
        list = local.length ? local : DEFAULT_PRODUCTS;
        const seeded = await api.upsertCatalogProducts(list);
        list = (seeded.products || list).map(normalizeProduct).filter(Boolean) as CatalogProduct[];
      }

      setProducts(list);
      cacheCatalog(list);
    } catch (loadError) {
      console.error('Error cargando catalogo:', loadError);
      const local = readLocalCatalog();
      const fallback = local.length ? local : DEFAULT_PRODUCTS;
      setProducts(fallback);
      cacheCatalog(fallback);
      setError('No se pudo cargar el catalogo desde Supabase. Se muestra el respaldo local.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNombre('');
    setCategoria('');
    setEditingProduct(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    try {
      if (editingProduct) {
        const updated = await api.updateCatalogProduct(editingProduct.id, {
          ...editingProduct,
          nombre: nombre.trim(),
          categoria: categoria.trim() || 'General',
        });
        const next = products.map((product) =>
          product.id === editingProduct.id ? normalizeProduct(updated.product, 0)! : product
        );
        setProducts(next);
        cacheCatalog(next);
        setSuccess('Producto actualizado correctamente');
      } else {
        const created = await api.createCatalogProduct({
          legacy_id: `catalog-${Date.now()}`,
          nombre: nombre.trim(),
          categoria: categoria.trim() || 'General',
          activo: true,
          sort_order: products.length + 1,
        });
        const next = [...products, normalizeProduct(created.product, products.length)!];
        setProducts(next);
        cacheCatalog(next);
        setSuccess('Producto agregado correctamente');
      }

      setShowAddDialog(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (saveError) {
      console.error('Error guardando producto:', saveError);
      setError('Error al guardar el producto en Supabase');
    }
  };

  const handleEdit = (product: CatalogProduct) => {
    setEditingProduct(product);
    setNombre(product.nombre);
    setCategoria(product.categoria);
    setShowAddDialog(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Seguro que deseas ocultar este producto del catalogo?')) return;

    try {
      await api.deleteCatalogProduct(productId);
      const next = products.map((product) =>
        product.id === productId ? { ...product, activo: false } : product
      );
      setProducts(next);
      cacheCatalog(next);
      setSuccess('Producto ocultado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (deleteError) {
      console.error('Error eliminando producto:', deleteError);
      setError('Error al ocultar el producto');
    }
  };

  const toggleActive = async (product: CatalogProduct) => {
    try {
      const updated = await api.updateCatalogProduct(product.id, {
        ...product,
        activo: !product.activo,
      });
      const next = products.map((item) =>
        item.id === product.id ? normalizeProduct(updated.product, 0)! : item
      );
      setProducts(next);
      cacheCatalog(next);
    } catch (toggleError) {
      console.error('Error cambiando estado:', toggleError);
      setError('Error al actualizar el estado del producto');
    }
  };

  return (
    <div className="settings-panel-clean space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-200 bg-blue-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Catalogo de productos por medidas</h4>
              <p className="text-sm text-blue-800 mb-3">
                Estos productos se usan en pedidos, cotizaciones y calculadora. Ahora se guardan en Supabase para todos los usuarios.
              </p>
              <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-1 text-xs text-blue-900">
                <div><strong>Agregar:</strong> crea nuevos productos de medidas o servicios.</div>
                <div><strong>Editar:</strong> cambia nombre o categoria sin romper registros anteriores.</div>
                <div><strong>Ocultar:</strong> desactiva productos que ya no uses.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar producto
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-auto sm:max-w-xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar producto' : 'Agregar nuevo producto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del producto *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Ej. Banner, Lona, Vinil"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={categoria}
                  onChange={(event) => setCategoria(event.target.value)}
                  placeholder="Ej. Impresion, Identificacion, Servicios"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="success">
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos del catalogo ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando catalogo...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay productos en el catalogo</p>
              <p className="text-sm">Agrega tu primer producto para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.nombre}</TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{product.categoria}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(product)}
                        className={product.activo ? 'text-green-600' : 'text-gray-400'}
                      >
                        {product.activo ? 'Activo' : 'Inactivo'}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
