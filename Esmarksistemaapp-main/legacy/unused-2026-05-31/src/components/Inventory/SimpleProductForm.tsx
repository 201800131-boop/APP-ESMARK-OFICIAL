import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card } from "../ui/card";
import { Save, X } from "lucide-react";
import { toast } from "sonner";

interface SimpleProductFormProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}

export default function SimpleProductForm({
  product,
  onSave,
  onCancel,
}: SimpleProductFormProps) {
  const [code, setCode] = useState(product?.code || "");
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [style, setStyle] = useState(product?.style || "");
  const [color, setColor] = useState(product?.color || "");
  const [size, setSize] = useState(product?.size || "");
  const [stock, setStock] = useState(product?.stock?.toString() || "0");
  const [minStock, setMinStock] = useState(product?.min_stock?.toString() || "5");
  const [price, setPrice] = useState(product?.price?.toString() || "0");
  const [image, setImage] = useState(product?.image || "");

  const validateForm = (): boolean => {
    if (!code.trim()) {
      toast.error("El código es requerido");
      return false;
    }
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return false;
    }
    if (!category.trim()) {
      toast.error("La categoría es requerida");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const productData = {
      id: product?.id || `prod_${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category: category.trim(),
      style: style.trim(),
      color: color.trim(),
      size: size.trim(),
      stock: Number(stock),
      min_stock: Number(minStock),
      price: Number(price),
      image: image.trim(),
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

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="code">Código *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: PROD-001"
            />
          </div>

          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Camiseta básica"
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
            <Label htmlFor="style">Estilo</Label>
            <Input
              id="style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Ej: Casual"
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Ej: Blanco"
            />
          </div>

          <div>
            <Label htmlFor="size">Talla</Label>
            <Input
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="Ej: M"
            />
          </div>

          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="minStock">Stock Mínimo</Label>
            <Input
              id="minStock"
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
            />
          </div>

          <div>
            <Label htmlFor="price">Precio (L)</Label>
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
            <Label htmlFor="image">URL de Imagen</Label>
            <Input
              id="image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Guardar
        </Button>
      </div>
    </div>
  );
}
