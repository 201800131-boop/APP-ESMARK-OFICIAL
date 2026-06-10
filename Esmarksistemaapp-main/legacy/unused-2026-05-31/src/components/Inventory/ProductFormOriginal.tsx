import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Save, X, Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface ProductFormOriginalProps {
  product?: any;
  onSave: (product: any) => void;
  onCancel: () => void;
}

export default function ProductFormOriginal({
  product,
  onSave,
  onCancel,
}: ProductFormOriginalProps) {
  // Información básica
  const [code, setCode] = useState(product?.code || "");
  const [name, setName] = useState(product?.name || "");
  const [category, setCategory] = useState(product?.category || "");
  const [style, setStyle] = useState(product?.style || "");
  const [color, setColor] = useState(product?.color || "");
  
  // Tipo de producto
  const [productType, setProductType] = useState<'banner' | 'clothing' | 'other'>('other');
  
  // Stock
  const [stock, setStock] = useState(product?.stock?.toString() || "0");
  const [minStock, setMinStock] = useState(product?.min_stock?.toString() || "0");
  
  // Imagen
  const [image, setImage] = useState(product?.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(product?.image || "");
  
  // Precio calculado (para tipo clothing)
  const [basePrice, setBasePrice] = useState("0");
  const [applicationPrice, setApplicationPrice] = useState("0");
  const [designPrice, setDesignPrice] = useState("0");
  
  // Precio fijo
  const [price, setPrice] = useState(product?.price?.toString() || "0");
  
  // Tallas
  const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    product?.sizes || []
  );
  const [customSizes, setCustomSizes] = useState<string[]>([]);

  // Manejar subida de imagen
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("❌ La imagen debe ser menor a 2MB");
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error("❌ Por favor selecciona una imagen válida (JPG, PNG)");
      return;
    }

    setImageFile(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImage(result);
    };
    reader.readAsDataURL(file);
    
    toast.success("✅ Imagen cargada correctamente");
  };

  // Seleccionar/deseleccionar talla
  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  // Agregar talla personalizada
  const handleAddCustomSize = () => {
    const customSize = prompt("Ingresa el nombre de la talla personalizada:");
    if (!customSize?.trim()) return;
    
    const newSize = customSize.trim().toUpperCase();
    
    if (selectedSizes.includes(newSize) || customSizes.includes(newSize)) {
      toast.error("❌ Esta talla ya existe");
      return;
    }
    
    setCustomSizes([...customSizes, newSize]);
    setSelectedSizes([...selectedSizes, newSize]);
    toast.success(`✅ Talla "${newSize}" agregada`);
  };

  // Calcular precio para tipo clothing
  const calculatePrice = () => {
    return Number(basePrice) + Number(applicationPrice) + Number(designPrice);
  };

  // Validar formulario
  const validateForm = (): boolean => {
    if (!code.trim()) {
      toast.error("❌ El código es requerido");
      return false;
    }
    
    if (!name.trim()) {
      toast.error("❌ El nombre del producto es requerido");
      return false;
    }
    
    if (!category.trim()) {
      toast.error("❌ La categoría es requerida");
      return false;
    }
    
    return true;
  };

  // Guardar producto
  const handleSave = () => {
    if (!validateForm()) return;

    const finalPrice = productType === 'clothing' ? calculatePrice() : Number(price);

    const productData = {
      id: product?.id || `prod_${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category: category.trim(),
      style: style.trim(),
      color: color.trim(),
      stock: Number(stock),
      min_stock: Number(minStock),
      price: finalPrice,
      image: image,
      product_type: productType,
      sizes: selectedSizes,
      unit: "unidad",
      active: true,
      created_at: product?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSave(productData);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 via-blue-600 to-cyan-500 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-600 to-blue-600 rounded-t-2xl p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">✨ Nuevo Producto al Inventario</h2>
              <p className="text-white/90 text-sm">Registra un nuevo producto con toda su información</p>
            </div>
          </div>
          <div className="text-sm bg-white/20 px-4 py-2 rounded-lg backdrop-blur-sm">
            EsMark System
          </div>
        </div>

        {/* Información Principal */}
        <div className="bg-orange-50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-red-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Información Principal del Producto</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="code" className="text-gray-700 font-medium">Código *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SKU-001"
                className="mt-1 border-2 border-pink-300 focus:border-pink-500"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-gray-700 font-medium">Nombre del Producto *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre descriptivo"
                className="mt-1 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-gray-700 font-medium">Categoría *</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="stickers, banner, camisa..."
                className="mt-1 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="style" className="text-gray-700 font-medium">Estilo</Label>
              <Input
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Opcional"
                className="mt-1 border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="color" className="text-gray-700 font-medium">Color</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Opcional"
              className="mt-1 border-2 border-gray-300 focus:border-blue-500 max-w-xs"
            />
          </div>

          {/* Tipo de producto */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setProductType('banner')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${ productType === 'banner' ? 'bg-purple-100 border-purple-500 shadow-md' : 'bg-purple-50 border-purple-300 hover:border-purple-400' }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                <div>
                  <div className="font-semibold text-purple-700">Banner/Stickers/PVC:</div>
                  <div className="text-xs text-purple-600">Precio por medidas</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProductType('clothing')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${ productType === 'clothing' ? 'bg-pink-100 border-pink-500 shadow-md' : 'bg-pink-50 border-pink-300 hover:border-pink-400' }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">👕</span>
                <div>
                  <div className="font-semibold text-pink-700">Camisa/Mameluco:</div>
                  <div className="text-xs text-pink-600">Tallas + precio calculado</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setProductType('other')}
              className={`p-3 rounded-lg border-2 text-left transition-all ${ productType === 'other' ? 'bg-green-100 border-green-500 shadow-md' : 'bg-green-50 border-green-300 hover:border-green-400' }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <div className="font-semibold text-green-700">Otros:</div>
                  <div className="text-xs text-green-600">Precio fijo unitario</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Control de Stock y Foto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Control de Stock */}
          <div className="bg-yellow-50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-yellow-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Control de Stock</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stock" className="text-gray-700 font-medium">Stock Actual *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 border-2 border-yellow-400 focus:border-yellow-600 text-center text-2xl font-bold"
                />
              </div>

              <div>
                <Label htmlFor="minStock" className="text-gray-700 font-medium">Stock Mínimo *</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="mt-1 border-2 border-yellow-400 focus:border-yellow-600 text-center text-2xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Foto del Producto */}
          <div className="bg-purple-50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-purple-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Foto del Producto</h3>
            </div>

            <div className="flex flex-col items-center justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-lg border-4 border-purple-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview("");
                      setImage("");
                      setImageFile(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                    aria-label="Eliminar imagen"
                    title="Eliminar imagen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 bg-purple-100 rounded-2xl border-2 border-dashed border-purple-400 flex items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload-input"
              />
              <label htmlFor="image-upload-input">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer border-2 border-purple-400 hover:bg-purple-100"
                  onClick={() => document.getElementById('image-upload-input')?.click()}
                >
                  Seleccionar archivo
                </Button>
              </label>
              <p className="text-sm text-gray-600 mt-2">
                {imageFile ? imageFile.name : "Ningún archivo seleccionado"}
              </p>
              <p className="text-xs text-purple-600 mt-1">📎 Máx 2MB (JPG, PNG)</p>
            </div>
          </div>
        </div>

        {/* Precio Calculado (solo para tipo clothing) */}
        {productType === 'clothing' && (
          <div className="bg-cyan-50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-cyan-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                💰
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Precio Calculado</h3>
            </div>

            <div className="bg-cyan-100 border-2 border-cyan-400 rounded-lg p-4 mb-4">
              <p className="text-cyan-800 font-medium text-center">
                💰 Precio = Base + Aplicación + Diseño
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-700 font-medium">Base (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="mt-1 border-2 border-cyan-400 focus:border-cyan-600"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Aplicación (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={applicationPrice}
                  onChange={(e) => setApplicationPrice(e.target.value)}
                  className="mt-1 border-2 border-cyan-400 focus:border-cyan-600"
                />
              </div>
              <div>
                <Label className="text-gray-700 font-medium">Diseño (L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={designPrice}
                  onChange={(e) => setDesignPrice(e.target.value)}
                  className="mt-1 border-2 border-cyan-400 focus:border-cyan-600"
                />
              </div>
            </div>

            <div className="mt-4 bg-green-100 border-2 border-green-500 rounded-lg p-4">
              <p className="text-green-800 font-bold text-center text-xl">
                Precio Total: L {calculatePrice().toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Precio fijo (para otros tipos) */}
        {productType !== 'clothing' && (
          <div className="bg-green-50 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-green-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                💰
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Precio del Producto</h3>
            </div>

            <div className="max-w-xs">
              <Label className="text-gray-700 font-medium">Precio Unitario (L)</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 border-2 border-green-400 focus:border-green-600 text-2xl font-bold text-center"
              />
            </div>
          </div>
        )}

        {/* Gestión de Inventario por Tallas */}
        {productType === 'clothing' && (
          <div className="rounded-2xl p-6 shadow-sm border-2 border-purple-200 bg-purple-50">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-950">Gestión de Inventario por Tallas</h3>
                <p className="text-purple-800 text-sm font-medium">Sistema inteligente de control de stock</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-purple-950 text-lg">Selecciona Tallas Estándar</h4>
                <span className="text-purple-700 text-sm font-medium">
                  {selectedSizes.length} de {standardSizes.length + customSizes.length} agregadas
                </span>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-7 gap-3 mb-4">
                {standardSizes.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`py-3 px-4 rounded-xl font-bold text-lg transition-all border-2 ${ selectedSizes.includes(size) ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-105' : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-300' }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {customSizes.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-purple-900 font-medium mb-2">Tallas Personalizadas:</h5>
                  <div className="flex flex-wrap gap-2">
                    {customSizes.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`py-2 px-4 rounded-lg font-bold transition-all border-2 ${ selectedSizes.includes(size) ? 'bg-purple-600 text-white border-purple-700 shadow-md' : 'bg-white text-purple-700 hover:bg-purple-50 border-purple-300' }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddCustomSize}
                className="w-full py-3 bg-white hover:bg-purple-50 border-2 border-dashed border-purple-300 rounded-xl text-purple-800 font-medium transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Talla Personalizada
              </button>
            </div>
          </div>
        )}

        {/* Footer con botones */}
        <div className="bg-white rounded-b-2xl p-6 flex items-center justify-between shadow-lg">
          <p className="text-sm text-gray-600">EsmarkSystem • Gestión de Inventario</p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-2 border-gray-300 hover:bg-gray-100 px-6"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-none bg-emerald-600 hover:bg-emerald-700 text-white px-8 shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              ✅ Guardar Producto
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
