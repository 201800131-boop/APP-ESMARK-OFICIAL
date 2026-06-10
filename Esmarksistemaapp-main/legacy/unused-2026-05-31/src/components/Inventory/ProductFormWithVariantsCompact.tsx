import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Trash2, Save, X, ImageIcon, Wand2 } from "lucide-react";
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

export default function ProductFormWithVariantsCompact({
  product,
  onSave,
  onCancel,
}: ProductFormProps) {
  const isVariantProduct = product?.has_variants === true;

  // Estados básicos
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [neckline, setNeckline] = useState(product?.neckline || "");
  const [price, setPrice] = useState(product?.price?.toString() || "0");
  const [cost, setCost] = useState(product?.cost?.toString() || "0");
  const [sku, setSku] = useState(product?.sku || "");
  
  // Producto simple
  const [simpleStock, setSimpleStock] = useState(product?.stock?.toString() || "0");
  const [simpleMinStock, setSimpleMinStock] = useState(product?.min_stock?.toString() || "5");
  
  // Control de variantes
  const [useVariants, setUseVariants] = useState(isVariantProduct);
  
  // Imágenes por color
  const [colorImages, setColorImages] = useState<{ [color: string]: string }>(
    product?.color_images || {}
  );
  
  // Variantes
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

  // Obtener colores únicos
  const getUniqueColors = () => {
    const colors = new Set(variants.map(v => v.color).filter(c => c.trim() !== ""));
    return Array.from(colors);
  };

  const uniqueColors = getUniqueColors();

  // Agregar variante
  const handleAddVariant = () => {
    setVariants([...variants, { color: "", size: "", stock: 0, min_stock: 5, sku: "" }]);
  };

  // Eliminar variante
  const handleRemoveVariant = (index: number) => {
    if (variants.length === 1) {
      toast.error("Debe haber al menos una variante");
      return;
    }
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    
    // Limpiar imagen si ya no existe ese color
    const remainingColors = new Set(newVariants.map(v => v.color));
    const newColorImages = { ...colorImages };
    Object.keys(newColorImages).forEach(color => {
      if (!remainingColors.has(color)) {
        delete newColorImages[color];
      }
    });
    setColorImages(newColorImages);
  };

  // Actualizar variante
  const handleVariantChange = (index: number, field: keyof Variant, value: string | number) => {
    const newVariants = [...variants];
    if (field === 'color') newVariants[index].color = String(value);
    if (field === 'size') newVariants[index].size = String(value);
    if (field === 'stock') newVariants[index].stock = Number(value);
    if (field === 'min_stock') newVariants[index].min_stock = Number(value);
    if (field === 'sku') newVariants[index].sku = String(value);
    setVariants(newVariants);
  };

  // Generar SKU
  const generateSKU = (color: string, size: string): string => {
    const brandCode = brand.substring(0, 2).toUpperCase() || "XX";
    const colorCode = color.substring(0, 2).toUpperCase() || "XX";
    const sizeCode = size.toUpperCase() || "X";
    const neckCode = neckline.charAt(0).toUpperCase() || "R";
    return `${brandCode}${colorCode}${neckCode}${sizeCode}`;
  };

  // Auto-generar SKUs
  const handleAutoGenerateSKUs = () => {
    const newVariants = variants.map((v) => ({
      ...v,
      sku: v.sku || generateSKU(v.color, v.size),
    }));
    setVariants(newVariants);
    toast.success("SKUs generados");
  };

  // Manejar imagen de color
  const handleColorImageChange = (color: string, imageUrl: string) => {
    setColorImages({ ...colorImages, [color]: imageUrl });
  };

  // Validar
  const validateForm = (): boolean => {
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return false;
    }
    if (!category.trim()) {
      toast.error("La categoría es requerida");
      return false;
    }
    if (useVariants) {
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
          toast.error(`Variante ${i + 1}: Falta el SKU. Usa "Generar SKUs"`);
          return false;
        }
      }
    } else {
      if (!sku.trim()) {
        toast.error("El SKU es requerido");
        return false;
      }
    }
    return true;
  };

  // Guardar
  const handleSave = () => {
    if (!validateForm()) return;

    const productData: any = {
      id: product?.id || `prod_${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      neckline: neckline.trim(),
      price: Number(price),
      cost: Number(cost),
      unit: "unidad",
      active: true,
      has_variants: useVariants,
      created_at: product?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (useVariants) {
      productData.variants = variants.map((v, i) => ({
        id: product?.variants?.[i]?.id || `variant_${Date.now()}_${i}`,
        color: v.color,
        size: v.size,
        stock: Number(v.stock),
        min_stock: Number(v.min_stock),
        sku: v.sku,
      }));
      productData.color_images = colorImages;
    } else {
      productData.sku = sku;
      productData.stock = Number(simpleStock);
      productData.min_stock = Number(simpleMinStock);
    }

    onSave(productData);
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER COMPACTO */}
      <div className="bg-linear-to-r from-purple-50 to-pink-50 p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={useVariants} onCheckedChange={setUseVariants} />
          <span className="font-semibold">
            {useVariants ? "🎨 Con Variantes (Colores/Tallas)" : "📦 Producto Simple"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>

      {/* CONTENIDO - 2 COLUMNAS */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: Información Básica */}
        <div className="space-y-3 overflow-y-auto pr-2">
          <div className="bg-white rounded-lg border p-3">
            <h3 className="font-semibold mb-3 text-sm">📦 Información Básica</h3>
            
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Kiana Cuello Redondo"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Categoría *</Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Camisetas"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Marca</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Kiana"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tipo Cuello</Label>
                  <Input
                    value={neckline}
                    onChange={(e) => setNeckline(e.target.value)}
                    placeholder="Redondo"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Precio (L)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="250"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Costo (L)</Label>
                <Input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="120"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* PRODUCTO SIMPLE */}
          {!useVariants && (
            <div className="bg-white rounded-lg border p-3">
              <h3 className="font-semibold mb-3 text-sm">📊 Inventario</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">SKU *</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Stock</Label>
                    <Input type="number" value={simpleStock} onChange={(e) => setSimpleStock(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Stock Mín</Label>
                    <Input type="number" value={simpleMinStock} onChange={(e) => setSimpleMinStock(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* IMÁGENES POR COLOR */}
          {useVariants && uniqueColors.length > 0 && (
            <div className="bg-white rounded-lg border p-3">
              <h3 className="font-semibold mb-3 text-sm">📸 Imágenes por Color</h3>
              <div className="space-y-2">
                {uniqueColors.map((color) => (
                  <div key={color} className="border rounded p-2">
                    <Label className="text-xs font-medium block mb-1">🎨 {color}</Label>
                    <div className="flex items-center gap-2">
                      {colorImages[color] ? (
                        <img src={colorImages[color]} alt={color} className="w-12 h-12 object-cover rounded border" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <Input
                        type="text"
                        placeholder="URL imagen"
                        value={colorImages[color] || ""}
                        onChange={(e) => handleColorImageChange(color, e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Variantes */}
        {useVariants && (
          <div className="bg-white rounded-lg border p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">🎨 Variantes</h3>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={handleAutoGenerateSKUs} className="h-7 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" /> SKUs
                </Button>
                <Button type="button" size="sm" onClick={handleAddVariant} className="h-7 text-xs">
                  <Plus className="w-3 h-3 mr-1" /> Agregar
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {variants.map((variant, index) => (
                <div key={index} className="border rounded p-2 bg-gray-50">
                  <div className="grid grid-cols-12 gap-1 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">Color *</Label>
                      <Input
                        value={variant.color}
                        onChange={(e) => handleVariantChange(index, "color", e.target.value)}
                        placeholder="Blanco"
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Talla *</Label>
                      <Input
                        value={variant.size}
                        onChange={(e) => handleVariantChange(index, "size", e.target.value)}
                        placeholder="S"
                        className="h-7 text-xs text-center"
                      />
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">SKU *</Label>
                      <Input
                        value={variant.sku}
                        onChange={(e) => handleVariantChange(index, "sku", e.target.value)}
                        placeholder="AUTO"
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs">Stock</Label>
                      <Input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(index, "stock", parseInt(e.target.value) || 0)}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="col-span-1">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={variant.min_stock}
                        onChange={(e) => handleVariantChange(index, "min_stock", parseInt(e.target.value) || 0)}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveVariant(index)}
                        className="h-7 w-7 p-0 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 text-xs text-gray-500 text-center">
              💡 Tip: Escribe el color, luego haz clic en "SKUs" para auto-generar
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
