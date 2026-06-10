import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Receipt,
  Package,
  User,
  Phone,
  Mail,
  Calculator,
  FileText,
  Sparkles,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

interface QuoteFormImprovedProps {
  quoteId?: string;
  onBack: () => void;
  onNavigate: (view: any, data?: any) => void;
}

export default function QuoteFormImproved({ quoteId, onBack, onNavigate }: QuoteFormImprovedProps) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [products, setProducts] = useState<any[]>([]);
  
  // Datos del cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  
  // Items de la cotización
  const [items, setItems] = useState<any[]>([]);
  
  // Templates rápidos
  const [showTemplates, setShowTemplates] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar configuración
      const { settings: loadedSettings } = await api.getSettings();
      setSettings(loadedSettings || {});
      
      // Cargar productos
      const { products: loadedProducts } = await api.getProducts();
      setProducts(loadedProducts || []);
      
      // Cargar clientes
      const { customers: loadedCustomers } = await api.getCustomers();
      setCustomers(loadedCustomers || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  // Buscar cliente
  const searchCustomers = (query: string) => {
    setCustomerSearch(query);
    setCustomerName(query);
    setShowCustomerSuggestions(true);
  };

  const selectCustomer = (customer: any) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setCustomerSearch(customer.name);
    setShowCustomerSuggestions(false);
  };

  // Agregar producto vacío
  const addProduct = () => {
    setItems([...items, {
      id: Date.now(),
      product_id: '',
      product_name: '',
      description: '',
      category: '',
      qty: 1,
      ancho: 0,
      alto: 0,
      unidad: 'cm',
      precio_unidad: 0,
      descuento: 0,
      subtotal: 0,
      notas: ''
    }]);
    
    toast.success('Producto agregado', {
      description: 'Completa los detalles del producto',
      duration: 2000
    });
  };

  // Copiar producto
  const copyProduct = (index: number) => {
    const itemToCopy = { ...items[index], id: Date.now() };
    setItems([...items, itemToCopy]);
    
    toast.success('Producto duplicado', {
      description: 'Puedes modificar el nuevo producto',
      duration: 2000
    });
  };

  // Eliminar producto
  const removeProduct = (index: number) => {
    if (items.length === 1) {
      toast.error('Debe haber al menos un producto');
      return;
    }
    
    setItems(items.filter((_, i) => i !== index));
    toast.success('Producto eliminado');
  };

  // Actualizar campo de producto
  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calcular precio si se selecciona un producto
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].category = product.category;
        updatedItems[index].precio_unidad = product.price || 0;
        updatedItems[index].description = product.name;
      }
    }
    
    // Recalcular subtotal
    const qty = updatedItems[index].qty || 1;
    const precio = updatedItems[index].precio_unidad || 0;
    const descuento = updatedItems[index].descuento || 0;
    
    let subtotal = qty * precio;
    if (descuento > 0) {
      subtotal = subtotal * (1 - descuento / 100);
    }
    
    updatedItems[index].subtotal = subtotal;
    setItems(updatedItems);
  };

  // Calcular totales
  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const isv = subtotal * 0.15;
    const total = subtotal + isv;
    
    return { subtotal, isv, total };
  };

  // Guardar cotización
  const handleSave = async () => {
    // Validar
    if (!customerName.trim()) {
      toast.error('Debes ingresar el nombre del cliente');
      return;
    }
    
    if (!customerPhone.trim()) {
      toast.error('Debes ingresar el teléfono del cliente');
      return;
    }
    
    if (items.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return;
    }
    
    // Validar que todos los productos tengan datos
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_name) {
        toast.error(`El producto #${i + 1} necesita un nombre`);
        return;
      }
      if (item.qty <= 0) {
        toast.error(`El producto #${i + 1} necesita una cantidad válida`);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const { subtotal, isv, total } = calcularTotales();
      
      const quoteData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        items: items,
        subtotal,
        isv,
        total,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      await api.createQuote(quoteData);
      
      toast.success('✅ Cotización creada exitosamente', {
        description: `Total: L. ${total.toFixed(2)}`,
        duration: 4000
      });
      
      // Volver a la lista
      setTimeout(() => {
        onNavigate({ view: 'quotes-list' });
      }, 1000);
      
    } catch (error: any) {
      console.error('Error guardando cotización:', error);
      toast.error('Error al guardar cotización', {
        description: error.message || 'Intenta nuevamente',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, isv, total } = calcularTotales();
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Colores por categoría
  const getCategoryColor = (category: string) => {
    const colors: any = {
      banner: 'bg-blue-50 border-blue-200 text-blue-900',
      stickers: 'bg-green-50 border-green-200 text-green-900',
      camisa: 'bg-purple-50 border-purple-200 text-purple-900',
      pvc: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      taza: 'bg-orange-50 border-orange-200 text-orange-900',
      termo: 'bg-cyan-50 border-cyan-200 text-cyan-900',
      yeti: 'bg-teal-50 border-teal-200 text-teal-900',
      carnet: 'bg-pink-50 border-pink-200 text-pink-900'
    };
    return colors[category] || 'bg-gray-50 border-gray-200 text-gray-900';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header con gradiente */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl text-white mb-1">
                ✨ Nueva Cotización
              </h1>
              <p className="text-blue-100 text-sm">
                Crea una cotización profesional en segundos
              </p>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3">
            <p className="text-xs text-white/80 mb-1">Total Estimado</p>
            <p className="text-2xl text-white">
              L. {total.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Datos del Cliente */}
      <Card className="mb-6 border-2 border-blue-100 shadow-lg">
        <CardHeader className="bg-linear-to-r from-blue-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <User className="w-5 h-5" />
            Información del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nombre del cliente con autocompletado */}
            <div className="space-y-2 relative">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Nombre del Cliente *
              </Label>
              <Input
                placeholder="Buscar o crear cliente..."
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                onFocus={() => setShowCustomerSuggestions(true)}
                className="border-2 focus:border-blue-500"
              />
              
              {/* Sugerencias de clientes */}
              {showCustomerSuggestions && filteredCustomers.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-white border-2 border-blue-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  {filteredCustomers.slice(0, 5).map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.phone}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-600" />
                Teléfono *
              </Label>
              <Input
                placeholder="+504 0000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="border-2 focus:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Email (Opcional)
              </Label>
              <Input
                type="email"
                placeholder="cliente@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="border-2 focus:border-purple-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl text-gray-900">Productos</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </Badge>
          </div>
          
          <Button 
            onClick={addProduct}
            className="bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </div>

        {/* Lista de productos */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <Card 
              key={item.id} 
              className={`border-2 shadow-lg transition-all hover:shadow-xl ${getCategoryColor(item.category)}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Grip para reordenar */}
                  <div className="pt-2 cursor-move text-gray-400 hover:text-gray-600">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Número del producto y acciones */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        {item.product_name && (
                          <Badge className="bg-white/50">
                            {item.product_name}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyProduct(index)}
                          className="hover:bg-white/50"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeProduct(index)}
                          className="hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Selección de producto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Producto</Label>
                        <Select 
                          value={item.product_id} 
                          onValueChange={(value) => updateItem(index, 'product_id', value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Seleccionar producto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} - L. {product.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Input
                          placeholder="Detalles adicionales..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="bg-white"
                        />
                      </div>
                    </div>

                    {/* Cantidad, Precio, Descuento */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.precio_unidad}
                          onChange={(e) => updateItem(index, 'precio_unidad', parseFloat(e.target.value) || 0)}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Descuento (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.descuento}
                          onChange={(e) => updateItem(index, 'descuento', parseFloat(e.target.value) || 0)}
                          className="bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Subtotal</Label>
                        <div className="h-10 px-3 bg-white rounded-md border-2 border-green-300 flex items-center justify-end">
                          <span className="text-green-700">
                            L. {item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notas internas */}
                    <div className="space-y-2">
                      <Label className="text-xs">Notas Internas (Opcional)</Label>
                      <Input
                        placeholder="Notas para el equipo de producción..."
                        value={item.notas}
                        onChange={(e) => updateItem(index, 'notas', e.target.value)}
                        className="bg-white/50 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Mensaje si no hay productos */}
          {items.length === 0 && (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
              <CardContent className="py-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  No hay productos agregados
                </p>
                <Button 
                  onClick={addProduct}
                  variant="outline"
                  className="border-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Producto
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Resumen de Totales */}
      <Card className="border-2 border-green-200 shadow-xl sticky bottom-4 bg-white/95 backdrop-blur">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-2xl">L. {subtotal.toFixed(2)}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">ISV (15%)</p>
              <p className="text-xl">L. {isv.toFixed(2)}</p>
            </div>

            <div className="text-right bg-linear-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-xl">
              <p className="text-sm text-green-700">Total</p>
              <p className="text-3xl text-green-900">L. {total.toFixed(2)}</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading || items.length === 0}
              className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 text-lg shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Guardar Cotización
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
