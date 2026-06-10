import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Save, X, Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ProductFormWithMatrixProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}

interface MatrixCell {
  color: string;
  size: string;
  stock: number;
  min_stock: number;
  sku: string;
}

export default function ProductFormWithMatrix({
  product,
  onSave,
  onCancel,
}: ProductFormWithMatrixProps) {
  // Información básica
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [price, setPrice] = useState(product?.price?.toString() || "0");
  const [cost, setCost] = useState(product?.cost?.toString() || "0");
  const [description, setDescription] = useState(product?.description || "");
  
  // Imagen principal
  const [mainImage, setMainImage] = useState(product?.image || "");
  const [imagePreview, setImagePreview] = useState(product?.image || "");

  // Colores y tallas
  const [colors, setColors] = useState<string[]>(
    product?.variants 
      ? Array.from(new Set(product.variants.map((v: any) => v.color)))
      : ["Blanco", "Negro"]
  );
  
  const [sizes, setSizes] = useState<string[]>(
    product?.variants
      ? Array.from(new Set(product.variants.map((v: any) => v.size)))
      : ["XS", "S", "M", "L", "XL"]
  );

  // Matriz de stock
  const [matrix, setMatrix] = useState<{ [key: string]: MatrixCell }>(() => {
    const initial: { [key: string]: MatrixCell } = {};
    
    if (product?.variants) {
      product.variants.forEach((v: any) => {
        const key = `${v.color}-${v.size}`;
        initial[key] = {
          color: v.color,
          size: v.size,
          stock: v.stock || 0,
          min_stock: v.min_stock || 5,
          sku: v.sku || "",
        };
      });
    } else {
      colors.forEach(color => {
        sizes.forEach(size => {
          const key = `${color}-${size}`;
          initial[key] = {
            color,
            size,
            stock: 0,
            min_stock: 5,
            sku: "",
          };
        });
      });
    }
    
    return initial;
  });

  // Agregar color
  const handleAddColor = () => {
    const newColor = prompt("Nombre del nuevo color:");
    if (!newColor?.trim()) return;
    
    if (colors.includes(newColor.trim())) {
      toast.error("Este color ya existe");
      return;
    }
    
    const newColors = [...colors, newColor.trim()];
    setColors(newColors);
    
    // Crear celdas para el nuevo color
    const newMatrix = { ...matrix };
    sizes.forEach(size => {
      const key = `${newColor.trim()}-${size}`;
      newMatrix[key] = {
        color: newColor.trim(),
        size,
        stock: 0,
        min_stock: 5,
        sku: "",
      };
    });
    setMatrix(newMatrix);
  };

  // Agregar talla
  const handleAddSize = () => {
    const newSize = prompt("Nueva talla:");
    if (!newSize?.trim()) return;
    
    if (sizes.includes(newSize.trim())) {
      toast.error("Esta talla ya existe");
      return;
    }
    
    const newSizes = [...sizes, newSize.trim()];
    setSizes(newSizes);
    
    // Crear celdas para la nueva talla
    const newMatrix = { ...matrix };
    colors.forEach(color => {
      const key = `${color}-${newSize.trim()}`;
      newMatrix[key] = {
        color,
        size: newSize.trim(),
        stock: 0,
        min_stock: 5,
        sku: "",
      };
    });
    setMatrix(newMatrix);
  };

  // Eliminar color
  const handleRemoveColor = (colorToRemove: string) => {
    if (colors.length === 1) {
      toast.error("Debe haber al menos un color");
      return;
    }
    
    const newColors = colors.filter(c => c !== colorToRemove);
    setColors(newColors);
    
    // Eliminar celdas del color
    const newMatrix = { ...matrix };
    sizes.forEach(size => {
      delete newMatrix[`${colorToRemove}-${size}`];
    });
    setMatrix(newMatrix);
  };

  // Eliminar talla
  const handleRemoveSize = (sizeToRemove: string) => {
    if (sizes.length === 1) {
      toast.error("Debe haber al menos una talla");
      return;
    }
    
    const newSizes = sizes.filter(s => s !== sizeToRemove);
    setSizes(newSizes);
    
    // Eliminar celdas de la talla
    const newMatrix = { ...matrix };
    colors.forEach(color => {
      delete newMatrix[`${color}-${sizeToRemove}`];
    });
    setMatrix(newMatrix);
  };

  // Actualizar celda
  const updateCell = (color: string, size: string, field: keyof MatrixCell, value: any) => {
    const key = `${color}-${size}`;
    setMatrix({
      ...matrix,
      [key]: {
        ...matrix[key],
        [field]: value,
      },
    });
  };

  // Generar SKUs automáticamente
  const handleAutoGenerateSKUs = () => {
    const newMatrix = { ...matrix };
    
    Object.keys(newMatrix).forEach(key => {
      const cell = newMatrix[key];
      const brandCode = brand.substring(0, 2).toUpperCase() || "XX";
      const colorCode = cell.color.substring(0, 2).toUpperCase() || "XX";
      const sizeCode = cell.size.toUpperCase() || "X";
      newMatrix[key].sku = `${brandCode}${colorCode}${sizeCode}`;
    });
    
    setMatrix(newMatrix);
    toast.success("✅ SKUs generados automáticamente");
  };

  // Manejar subida de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setMainImage(result);
    };
    reader.readAsDataURL(file);
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
    
    // Validar SKUs
    const cells = Object.values(matrix);
    for (const cell of cells) {
      if (!cell.sku.trim()) {
        toast.error(`Falta SKU para ${cell.color} - ${cell.size}`);
        return false;
      }
    }
    
    return true;
  };

  // Guardar producto
  const handleSave = () => {
    if (!validateForm()) return;

    const variants = Object.values(matrix).map((cell, index) => ({
      id: product?.variants?.[index]?.id || `variant_${Date.now()}_${index}`,
      color: cell.color,
      size: cell.size,
      stock: Number(cell.stock),
      min_stock: Number(cell.min_stock),
      sku: cell.sku,
    }));

    const productData = {
      id: product?.id || `prod_${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      description: description.trim(),
      price: Number(price),
      cost: Number(cost),
      image: mainImage,
      unit: "unidad",
      active: true,
      has_variants: true,
      variants,
      created_at: product?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(productData);
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">
        {product ? "Editar Producto" : "Agregar Producto"}
      </h2>

      {/* Información básica */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Información General</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Imagen del producto */}
          <div className="md:col-span-2">
            <Label>Imagen del Producto</Label>
            <div className="flex items-center gap-4 mt-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => {
                      setImagePreview("");
                      setMainImage("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Subir Imagen
                  </Button>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  O pega una URL de imagen:
                </p>
                <Input
                  type="text"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={mainImage}
                  onChange={(e) => {
                    setMainImage(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nombre del Producto *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Camiseta Kiana"
            />
          </div>

          <div>
            <Label htmlFor="category">Categoría *</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Camisetas"
            />
          </div>

          <div>
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Kiana"
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del producto"
            />
          </div>

          <div>
            <Label htmlFor="price">Precio de Venta (L)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="cost">Costo (L)</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
      </Card>

      {/* Matriz de colores y tallas */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Matriz de Colores y Tallas</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAutoGenerateSKUs}
          >
            Generar SKUs
          </Button>
        </div>

        {/* Gestión de colores y tallas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Colores</Label>
              <Button type="button" size="sm" onClick={handleAddColor}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map(color => (
                <div key={color} className="flex items-center gap-1 bg-blue-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="text-red-600 hover:text-red-800"
                    aria-label={`Eliminar color ${color}`}
                    title={`Eliminar color ${color}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Tallas</Label>
              <Button type="button" size="sm" onClick={handleAddSize}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <div key={size} className="flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full">
                  <span className="text-sm">{size}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(size)}
                    className="text-red-600 hover:text-red-800"
                    aria-label={`Eliminar talla ${size}`}
                    title={`Eliminar talla ${size}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla matriz */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 font-semibold">Color / Talla</th>
                {sizes.map(size => (
                  <th key={size} className="border p-2 bg-gray-100 font-semibold text-center">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map(color => (
                <tr key={color}>
                  <td className="border p-2 bg-gray-50 font-medium">{color}</td>
                  {sizes.map(size => {
                    const key = `${color}-${size}`;
                    const cell = matrix[key];
                    return (
                      <td key={key} className="border p-2">
                        <div className="space-y-1">
                          <Input
                            type="text"
                            placeholder="SKU"
                            value={cell?.sku || ""}
                            onChange={(e) => updateCell(color, size, "sku", e.target.value)}
                            className="text-xs h-8"
                          />
                          <Input
                            type="number"
                            placeholder="Stock"
                            value={cell?.stock || 0}
                            onChange={(e) => updateCell(color, size, "stock", parseInt(e.target.value) || 0)}
                            className="text-xs h-8"
                          />
                          <Input
                            type="number"
                            placeholder="Min"
                            value={cell?.min_stock || 5}
                            onChange={(e) => updateCell(color, size, "min_stock", parseInt(e.target.value) || 5)}
                            className="text-xs h-8"
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Producto
        </Button>
      </div>
    </div>
  );
}
