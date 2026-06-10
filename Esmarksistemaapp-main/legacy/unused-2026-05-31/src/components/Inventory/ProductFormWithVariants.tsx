import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Plus, Trash2, Save, X, Package, Layers, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "../ui/switch";

interface ProductFormProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}

interface Variant {
  color: string;
  size: string;
  stock: number;
  min_stock: number;
  sku: string;
}

export default function ProductFormWithVariants({
  product,
  onSave,
  onCancel,
}: ProductFormProps) {
  // Determinar si es producto con variantes
  const isVariantProduct = product?.has_variants === true;

  // Estado del formulario básico
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [neckline, setNeckline] = useState(product?.neckline || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "0");
  const [cost, setCost] = useState(product?.cost?.toString() || "0");
  const [sku, setSku] = useState(product?.sku || "");
  
  // Estado de producto simple
  const [simpleStock, setSimpleStock] = useState(product?.stock?.toString() || "0");
  const [simpleMinStock, setSimpleMinStock] = useState(product?.min_stock?.toString() || "5");
  
  // Control de tipo de producto
  const [useVariants, setUseVariants] = useState(isVariantProduct);
  
  // NUEVO: Estado de imágenes por color
  const [colorImages, setColorImages] = useState<{ [color: string]: string }>(
    product?.color_images || {}
  );
  
  // Estado de variantes
  const [variants, setVariants] = useState<Variant[]>(() => {
    if (product?.variants) {
      return product.variants.map((v: any) => ({
        color: v.color,
        size: v.size,
        stock: v.stock,
        min_stock: v.min_stock,
        sku: v.sku,
      }));
    }
    return [{ color: "", size: "", stock: 0, min_stock: 5, sku: "" }];
  });

  // Agrupar variantes por color
  const getColorGroups = () => {
    const groups: { [key: string]: Variant[] } = {};
    variants.forEach((v) => {
      if (!groups[v.color]) {
        groups[v.color] = [];
      }
      groups[v.color].push(v);
    });
    return groups;
  };

  const colorGroups = getColorGroups();
  const colors = Object.keys(colorGroups).filter((c) => c !== "");

  // Agregar nueva variante
  const handleAddVariant = (color?: string) => {
    setVariants([
      ...variants,
      { 
        color: color || "", 
        size: "", 
        stock: 0, 
        min_stock: 5, 
        sku: "" 
      },
    ]);
  };

  // Eliminar variante
  const handleRemoveVariant = (index: number) => {
    if (variants.length === 1) {
      toast.error("Debe haber al menos una variante");
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Actualizar variante
  const handleVariantChange = (
    index: number,
    field: keyof Variant,
    value: string | number
  ) => {
    const newVariants = [...variants];
    if (field === 'color') newVariants[index].color = String(value);
    if (field === 'size') newVariants[index].size = String(value);
    if (field === 'stock') newVariants[index].stock = Number(value);
    if (field === 'min_stock') newVariants[index].min_stock = Number(value);
    if (field === 'sku') newVariants[index].sku = String(value);
    setVariants(newVariants);
  };

  // Generar SKU automático
  const generateSKU = (color: string, size: string): string => {
    const brandCode = brand.substring(0, 2).toUpperCase() || "XX";
    const colorCode = color.substring(0, 2).toUpperCase() || "XX";
    const sizeCode = size.toUpperCase() || "X";
    const neckCode = neckline.charAt(0).toUpperCase() || "R";
    return `${brandCode}${colorCode}${neckCode}${sizeCode}`;
  };

  // Auto-generar todos los SKUs
  const handleAutoGenerateSKUs = () => {
    const newVariants = variants.map((v) => ({
      ...v,
      sku: v.sku || generateSKU(v.color, v.size),
    }));
    setVariants(newVariants);
    toast.success("SKUs generados automáticamente");
  };

  // NUEVO: Manejar cambio de imagen por color
  const handleColorImageChange = (color: string, imageUrl: string) => {
    setColorImages({
      ...colorImages,
      [color]: imageUrl,
    });
  };

  // NUEVO: Eliminar imagen de color
  const handleRemoveColorImage = (color: string) => {
    const newImages = { ...colorImages };
    delete newImages[color];
    setColorImages(newImages);
  };

  // Validar formulario
  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error("El nombre del producto es requerido");
      return false;
    }

    if (!category.trim()) {
      toast.error("La categoría es requerida");
      return false;
    }

    if (useVariants) {
      // Validar variantes
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.color.trim()) {
          toast.error(`Variante ${i + 1}: Falta el color`);
          return false;
        }
        if (!v.size.trim()) {
          toast.error(`Variante ${i + 1}: Falta la talla`);
          return false;
        }
        if (!v.sku.trim()) {
          toast.error(`Variante ${i + 1}: Falta el SKU`);
          return false;
        }
      }
    } else {
      // Validar producto simple
      if (!sku.trim()) {
        toast.error("El SKU es requerido");
        return false;
      }
    }

    return true;
  };

  // Guardar producto
  const handleSave = () => {
    if (!validateForm()) return;

    const productData: any = {
      id: product?.id || `prod_${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      neckline: neckline.trim(),
      description: description.trim(),
      price: Number(price),
      cost: Number(cost),
      unit: "unidad",
      active: true,
      has_variants: useVariants,
      created_at: product?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (useVariants) {
      // Producto con variantes
      productData.variants = variants.map((v, i) => ({
        id: product?.variants?.[i]?.id || `variant_${Date.now()}_${i}`,
        color: v.color,
        size: v.size,
        stock: Number(v.stock),
        min_stock: Number(v.min_stock),
        sku: v.sku,
      }));
    } else {
      // Producto simple
      productData.sku = sku;
      productData.stock = Number(simpleStock);
      productData.min_stock = Number(simpleMinStock);
    }

    // NUEVO: Agregar imágenes por color
    productData.color_images = colorImages;

    onSave(productData);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      {/* Información básica */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Información del Producto
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Nombre del Producto *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Kiana Cuello Redondo"
            />
          </div>

          <div>
            <Label>Categoría *</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Camisetas"
            />
          </div>

          <div>
            <Label>Marca</Label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Kiana"
            />
          </div>

          <div>
            <Label>Tipo de Cuello</Label>
            <Input
              value={neckline}
              onChange={(e) => setNeckline(e.target.value)}
              placeholder="Ej: Redondo, V, Polo"
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción adicional..."
            />
          </div>

          <div>
            <Label>Precio de Venta (L)</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Costo (L)</Label>
            <Input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </Card>

      {/* Selección de tipo de producto */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5" />
              <span className="font-semibold">Producto con Variantes</span>
            </div>
            <p className="text-sm text-gray-600">
              Activa si el producto tiene múltiples colores y/o tallas
            </p>
          </div>
          <Switch
            checked={useVariants}
            onCheckedChange={setUseVariants}
          />
        </div>
      </Card>

      {/* Producto SIMPLE */}
      {!useVariants && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Inventario</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>SKU *</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SKU001"
              />
            </div>
            <div>
              <Label>Stock Actual</Label>
              <Input
                type="number"
                value={simpleStock}
                onChange={(e) => setSimpleStock(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={simpleMinStock}
                onChange={(e) => setSimpleMinStock(e.target.value)}
                placeholder="5"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Producto CON VARIANTES */}
      {useVariants && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Variantes (Colores y Tallas)</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAutoGenerateSKUs}
              >
                Generar SKUs
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleAddVariant()}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Mostrar por colores */}
          {colors.length > 0 ? (
            <div className="space-y-6">
              {colors.map((color) => (
                <div key={color} className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    🎨 Color: {color}
                  </h4>
                  
                  {/* NUEVO: Sección de imagen para el color */}
                  <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <Label className="text-sm font-medium mb-2 block">
                      📸 Imagen del Color {color}
                    </Label>
                    <div className="flex items-center gap-3">
                      {colorImages[color] ? (
                        <div className="relative">
                          <img
                            src={colorImages[color]}
                            alt={`${color}`}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => handleRemoveColorImage(color)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="URL de la imagen del color"
                          value={colorImages[color] || ""}
                          onChange={(e) => handleColorImageChange(color, e.target.value)}
                          className="text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Pega la URL de la imagen para este color
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {colorGroups[color].map((variant, idx) => {
                      const globalIndex = variants.findIndex(
                        (v) => v === variant
                      );
                      return (
                        <div
                          key={globalIndex}
                          className="grid grid-cols-12 gap-2 items-end"
                        >
                          <div className="col-span-2">
                            <Label className="text-xs">Talla</Label>
                            <Input
                              value={variant.size}
                              onChange={(e) =>
                                handleVariantChange(
                                  globalIndex,
                                  "size",
                                  e.target.value
                                )
                              }
                              placeholder="S"
                              className="text-center"
                            />
                          </div>

                          <div className="col-span-3">
                            <Label className="text-xs">SKU</Label>
                            <Input
                              value={variant.sku}
                              onChange={(e) =>
                                handleVariantChange(
                                  globalIndex,
                                  "sku",
                                  e.target.value
                                )
                              }
                              placeholder="AUTO"
                            />
                          </div>

                          <div className="col-span-3">
                            <Label className="text-xs">Stock</Label>
                            <Input
                              type="number"
                              value={variant.stock}
                              onChange={(e) =>
                                handleVariantChange(
                                  globalIndex,
                                  "stock",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                            />
                          </div>

                          <div className="col-span-3">
                            <Label className="text-xs">Stock Min</Label>
                            <Input
                              type="number"
                              value={variant.min_stock}
                              onChange={(e) =>
                                handleVariantChange(
                                  globalIndex,
                                  "min_stock",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="5"
                            />
                          </div>

                          <div className="col-span-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleRemoveVariant(globalIndex)
                              }
                              className="w-full p-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddVariant(color)}
                    className="mt-2 w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Talla a {color}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded"
                >
                  <div className="col-span-2">
                    <Label className="text-xs">Color</Label>
                    <Input
                      value={variant.color}
                      onChange={(e) =>
                        handleVariantChange(index, "color", e.target.value)
                      }
                      placeholder="Blanco"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Talla</Label>
                    <Input
                      value={variant.size}
                      onChange={(e) =>
                        handleVariantChange(index, "size", e.target.value)
                      }
                      placeholder="S"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      value={variant.sku}
                      onChange={(e) =>
                        handleVariantChange(index, "sku", e.target.value)
                      }
                      placeholder="AUTO"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs">Stock</Label>
                    <Input
                      type="number"
                      value={variant.stock}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          "stock",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="col-span-3">
                    <Label className="text-xs">Stock Mínimo</Label>
                    <Input
                      type="number"
                      value={variant.min_stock}
                      onChange={(e) =>
                        handleVariantChange(
                          index,
                          "min_stock",
                          parseInt(e.target.value) || 0
                        )
                      }
                      placeholder="5"
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveVariant(index)}
                      className="w-full p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Producto
        </Button>
      </div>
    </div>
  );
}
