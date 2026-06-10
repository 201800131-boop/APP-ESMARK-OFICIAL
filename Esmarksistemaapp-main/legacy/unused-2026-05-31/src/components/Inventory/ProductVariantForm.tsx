import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Plus, Trash2, Save, X, Package } from "lucide-react";
import { ProductWithVariants, ProductVariant } from "../../types/product-variants";
import { toast } from "sonner";

interface ProductVariantFormProps {
  product?: ProductWithVariants;
  onSave: (product: ProductWithVariants) => void;
  onCancel: () => void;
}

interface ColorGroup {
  color: string;
  sizes: {
    size: string;
    stock: number;
    min_stock: number;
    sku: string;
  }[];
}

export default function ProductVariantForm({
  product,
  onSave,
  onCancel,
}: ProductVariantFormProps) {
  // Estado del producto
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [neckline, setNeckline] = useState(product?.neckline || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price.toString() || "0");
  const [cost, setCost] = useState(product?.cost.toString() || "0");

  // Estado de colores y tallas
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>(() => {
    if (product?.variants && product.variants.length > 0) {
      // Agrupar variantes existentes por color
      const groups: { [key: string]: ColorGroup } = {};
      
      product.variants.forEach((variant) => {
        if (!groups[variant.color]) {
          groups[variant.color] = {
            color: variant.color,
            sizes: [],
          };
        }
        groups[variant.color].sizes.push({
          size: variant.size,
          stock: variant.stock,
          min_stock: variant.min_stock,
          sku: variant.sku,
        });
      });
      
      return Object.values(groups);
    }
    
    // Por defecto, iniciar con un color vacío
    return [{
      color: "",
      sizes: [{ size: "", stock: 0, min_stock: 5, sku: "" }],
    }];
  });

  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // Agregar nuevo color
  const handleAddColor = () => {
    setColorGroups([...colorGroups, {
      color: "",
      sizes: [{ size: "", stock: 0, min_stock: 5, sku: "" }],
    }]);
    setSelectedColorIndex(colorGroups.length);
  };

  // Eliminar color
  const handleRemoveColor = (index: number) => {
    if (colorGroups.length === 1) {
      toast.error("Debe haber al menos un color");
      return;
    }
    
    const newGroups = colorGroups.filter((_, i) => i !== index);
    setColorGroups(newGroups);
    
    if (selectedColorIndex >= newGroups.length) {
      setSelectedColorIndex(newGroups.length - 1);
    }
  };

  // Actualizar nombre del color
  const handleColorChange = (index: number, newColor: string) => {
    const newGroups = [...colorGroups];
    newGroups[index].color = newColor;
    setColorGroups(newGroups);
  };

  // Agregar nueva talla al color actual
  const handleAddSize = () => {
    const newGroups = [...colorGroups];
    newGroups[selectedColorIndex].sizes.push({
      size: "",
      stock: 0,
      min_stock: 5,
      sku: "",
    });
    setColorGroups(newGroups);
  };

  // Eliminar talla
  const handleRemoveSize = (sizeIndex: number) => {
    const newGroups = [...colorGroups];
    if (newGroups[selectedColorIndex].sizes.length === 1) {
      toast.error("Debe haber al menos una talla por color");
      return;
    }
    newGroups[selectedColorIndex].sizes = newGroups[selectedColorIndex].sizes.filter(
      (_, i) => i !== sizeIndex
    );
    setColorGroups(newGroups);
  };

  // Actualizar talla
  const handleSizeChange = (
    sizeIndex: number,
    field: "size" | "stock" | "min_stock" | "sku",
    value: string | number
  ) => {
    const newGroups = [...colorGroups];
    if (field === 'size') newGroups[selectedColorIndex].sizes[sizeIndex].size = String(value);
    if (field === 'stock') newGroups[selectedColorIndex].sizes[sizeIndex].stock = Number(value);
    if (field === 'min_stock') newGroups[selectedColorIndex].sizes[sizeIndex].min_stock = Number(value);
    if (field === 'sku') newGroups[selectedColorIndex].sizes[sizeIndex].sku = String(value);
    setColorGroups(newGroups);
  };

  // Generar SKU automático
  const generateSKU = (color: string, size: string): string => {
    const brandCode = brand.substring(0, 2).toUpperCase();
    const colorCode = color.substring(0, 2).toUpperCase();
    const sizeCode = size.toUpperCase();
    return `${brandCode}${colorCode}${sizeCode}`;
  };

  // Auto-generar SKUs para todas las variantes
  const handleAutoGenerateSKUs = () => {
    const newGroups = colorGroups.map((group) => ({
      ...group,
      sizes: group.sizes.map((size) => ({
        ...size,
        sku: size.sku || generateSKU(group.color, size.size),
      })),
    }));
    setColorGroups(newGroups);
    toast.success("SKUs generados automáticamente");
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

    // Validar que todos los colores tengan nombre
    for (let i = 0; i < colorGroups.length; i++) {
      if (!colorGroups[i].color.trim()) {
        toast.error(`El color ${i + 1} necesita un nombre`);
        return false;
      }

      // Validar que todas las tallas tengan datos
      for (let j = 0; j < colorGroups[i].sizes.length; j++) {
        const size = colorGroups[i].sizes[j];
        if (!size.size.trim()) {
          toast.error(`Falta la talla en el color ${colorGroups[i].color}`);
          return false;
        }
        if (!size.sku.trim()) {
          toast.error(`Falta el SKU para ${colorGroups[i].color} - ${size.size}`);
          return false;
        }
      }
    }

    return true;
  };

  // Guardar producto
  const handleSave = () => {
    if (!validateForm()) return;

    // Convertir colorGroups a variantes
    const variants: ProductVariant[] = [];
    
    colorGroups.forEach((group) => {
      group.sizes.forEach((size) => {
        variants.push({
          id: `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          color: group.color,
          size: size.size,
          stock: Number(size.stock),
          min_stock: Number(size.min_stock),
          sku: size.sku,
        });
      });
    });

    const newProduct: ProductWithVariants = {
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
      has_variants: true,
      variants,
      created_at: product?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(newProduct);
  };

  const currentColorGroup = colorGroups[selectedColorIndex];

  return (
    <div className="space-y-6">
      {/* Información básica del producto */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Información del Producto
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
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

          <div className="md:col-span-2">
            <Label>Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción adicional..."
            />
          </div>
        </div>
      </Card>

      {/* Selección de colores */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Colores y Tallas</h3>
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
              onClick={handleAddColor}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Color
            </Button>
          </div>
        </div>

        {/* Pestañas de colores */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {colorGroups.map((group, index) => (
            <div key={index} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedColorIndex(index)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedColorIndex === index
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {group.color || `Color ${index + 1}`}
                <span className="ml-2 text-xs opacity-70">
                  ({group.sizes.length})
                </span>
              </button>
              {colorGroups.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveColor(index)}
                  className="p-1 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Formulario del color seleccionado */}
        {currentColorGroup && (
          <div className="space-y-4">
            {/* Nombre del color */}
            <div>
              <Label>Nombre del Color *</Label>
              <Input
                value={currentColorGroup.color}
                onChange={(e) =>
                  handleColorChange(selectedColorIndex, e.target.value)
                }
                placeholder="Ej: Blanco, Negro, Azul Marino"
              />
            </div>

            {/* Tallas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Tallas y Stock</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSize}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Talla
                </Button>
              </div>

              <div className="space-y-3">
                {currentColorGroup.sizes.map((size, sizeIndex) => (
                  <div
                    key={sizeIndex}
                    className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="col-span-2">
                      <Label className="text-xs">Talla</Label>
                      <Input
                        value={size.size}
                        onChange={(e) =>
                          handleSizeChange(sizeIndex, "size", e.target.value)
                        }
                        placeholder="XS"
                        className="text-center"
                      />
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={size.sku}
                        onChange={(e) =>
                          handleSizeChange(sizeIndex, "sku", e.target.value)
                        }
                        placeholder="AUTO"
                      />
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">Stock</Label>
                      <Input
                        type="number"
                        value={size.stock}
                        onChange={(e) =>
                          handleSizeChange(
                            sizeIndex,
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
                        value={size.min_stock}
                        onChange={(e) =>
                          handleSizeChange(
                            sizeIndex,
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
                        onClick={() => handleRemoveSize(sizeIndex)}
                        className="w-full p-0"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
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
