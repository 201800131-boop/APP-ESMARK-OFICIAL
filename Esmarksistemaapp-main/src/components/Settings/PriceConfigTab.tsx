import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Save, Check, Plus, Trash2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { extractPriceConfig, getUsablePriceConfig, writeStoredPriceConfig } from '../../utils/price-config';

export default function PriceConfigTab() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Precios de Banner
  const [bannerPricePerCm, setBannerPricePerCm] = useState(0);
  const [bannerPricePerIn, setBannerPricePerIn] = useState(0);
  const [bannerPricePerM, setBannerPricePerM] = useState(0);
  const [bannerPricePerFt, setBannerPricePerFt] = useState(0);
  
  // Precios de Stickers
  const [stickersPricePerCm, setStickersPricePerCm] = useState(0);
  const [stickersPricePerIn, setStickersPricePerIn] = useState(0);
  const [stickersPricePerM, setStickersPricePerM] = useState(0);
  const [stickersPricePerFt, setStickersPricePerFt] = useState(0);
  
  // Precios de Camisas
  const [shirtBasePrice, setShirtBasePrice] = useState(0);
  const [shirtVinilPrice, setShirtVinilPrice] = useState(0);
  const [shirtSublimationPrice, setShirtSublimationPrice] = useState(0);
  const [shirtDesignNormal, setShirtDesignNormal] = useState(0);
  const [shirtDesignMedio, setShirtDesignMedio] = useState(0);
  const [shirtDesignAvanzado, setShirtDesignAvanzado] = useState(0);
  
  // ✨ NUEVO: Precios de PVC eliminados (ahora es automático por rangos)
  // El precio se calcula automáticamente según el área:
  // - Menos de 2m²: L.0.30/pulg²
  // - 2m² a 5m²: L.0.25/pulg²
  // - 5m² en adelante: L.0.20/pulg²
  
  // Materiales configurables
  const [materials, setMaterials] = useState<string[]>([]);

  useEffect(() => {
    loadPriceConfig();
  }, []);

  const applyPriceConfigToForm = (config: Record<string, any>) => {
    setBannerPricePerCm(config.banner_price_per_cm || 0);
    setBannerPricePerIn(config.banner_price_per_in || 0);
    setBannerPricePerM(config.banner_price_per_m || 0);
    setBannerPricePerFt(config.banner_price_per_ft || 0);

    setStickersPricePerCm(config.stickers_price_per_cm || 0);
    setStickersPricePerIn(config.stickers_price_per_in || 0);
    setStickersPricePerM(config.stickers_price_per_m || 0);
    setStickersPricePerFt(config.stickers_price_per_ft || 0);

    setShirtBasePrice(config.shirt_base_price || 0);
    setShirtVinilPrice(config.shirt_vinil_price || 0);
    setShirtSublimationPrice(config.shirt_sublimation_price || 0);
    setShirtDesignNormal(config.shirt_design_prices?.normal || 0);
    setShirtDesignMedio(config.shirt_design_prices?.medio || 0);
    setShirtDesignAvanzado(config.shirt_design_prices?.avanzado || 0);

    if (config.materials && Array.isArray(config.materials)) {
      setMaterials(config.materials);
    } else {
      setMaterials(['Vinil', 'Lona', 'Tela', 'Microperforado']);
    }
  };

  const loadPriceConfig = async () => {
    try {
      const data = await api.getPriceConfig();
      const remoteConfig = extractPriceConfig(data);
      const config = getUsablePriceConfig(remoteConfig);
      writeStoredPriceConfig(config);
      if (!Object.keys(remoteConfig).length && Object.keys(config).length) {
        api.savePriceConfig(config).catch((error) => {
          console.warn('No se pudo sincronizar la configuración local de precios:', error);
        });
      }
      applyPriceConfigToForm(config);
    } catch (error) {
      console.error('Error loading price config:', error);
      const fallbackConfig = getUsablePriceConfig();
      applyPriceConfigToForm(fallbackConfig);
      writeStoredPriceConfig(fallbackConfig);
      setError('No se pudo conectar con Supabase para precios. Se muestran datos locales/por defecto y puedes guardarlos para sincronizar.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const config = {
        // Banner
        banner_price_per_cm: bannerPricePerCm,
        banner_price_per_in: bannerPricePerIn,
        banner_price_per_m: bannerPricePerM,
        banner_price_per_ft: bannerPricePerFt,
        
        // Stickers
        stickers_price_per_cm: stickersPricePerCm,
        stickers_price_per_in: stickersPricePerIn,
        stickers_price_per_m: stickersPricePerM,
        stickers_price_per_ft: stickersPricePerFt,
        
        // Camisas
        shirt_base_price: shirtBasePrice,
        shirt_vinil_price: shirtVinilPrice,
        shirt_sublimation_price: shirtSublimationPrice,
        shirt_design_prices: {
          normal: shirtDesignNormal,
          medio: shirtDesignMedio,
          avanzado: shirtDesignAvanzado
        },
        
        // Materiales
        materials: materials
      };

      await api.savePriceConfig(config);
      writeStoredPriceConfig(config);
      setSuccess('Configuración de precios guardada correctamente');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error saving price config:', error);
      setError(error.message || 'Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="settings-panel-clean space-y-6">
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Información sobre configuración de precios */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-200 bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-xl">💡</span>
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Cómo funcionan los precios por unidad</h4>
              <p className="text-sm text-blue-800 mb-3">
                Configura el precio por área según la unidad que uses más frecuentemente. 
                El sistema convertirá automáticamente las medidas a metros cuadrados para el cálculo final.
              </p>
              <div className="bg-white p-3 rounded-lg border border-blue-200 space-y-1 text-xs text-blue-900">
                <div><strong>📏 CM:</strong> Precio por centímetro cuadrado (cm²)</div>
                <div><strong>📐 Pulgadas:</strong> Precio por pulgada cuadrada (in²)</div>
                <div><strong>📐 Metros:</strong> Precio por metro cuadrado (m²)</div>
                <div><strong>👣 Pies:</strong> Precio por pie cuadrado (ft²)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banner Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Precios de Banner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Precio por cm² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={bannerPricePerCm}
                onChange={(e) => setBannerPricePerCm(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por pulgada² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={bannerPricePerIn}
                onChange={(e) => setBannerPricePerIn(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por m² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={bannerPricePerM}
                onChange={(e) => setBannerPricePerM(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por pie² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={bannerPricePerFt}
                onChange={(e) => setBannerPricePerFt(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stickers Prices */}
      <Card>
        <CardHeader>
          <CardTitle>Precios de Stickers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Precio por cm² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={stickersPricePerCm}
                onChange={(e) => setStickersPricePerCm(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por pulgada² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={stickersPricePerIn}
                onChange={(e) => setStickersPricePerIn(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por m² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={stickersPricePerM}
                onChange={(e) => setStickersPricePerM(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por pie² (L.)</Label>
              <Input
                type="number"
                step="0.01"
                value={stickersPricePerFt}
                onChange={(e) => setStickersPricePerFt(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shirt Prices */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            👕 Precios de Camisas (Vinil/Sublimación)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <h4 className="mb-3 text-blue-800">Precio Base de la Camisa</h4>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-blue-900">💵 Precio Base de la Camisa (L.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtBasePrice}
                  onChange={(e) => setShirtBasePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-blue-300 text-lg"
                />
                <p className="text-xs text-blue-600">
                  Este es el costo de la camisa sin ninguna personalización (camisa en blanco)
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-blue-200" />

          <div className="bg-linear-to-r from-green-50 to-purple-50 p-4 rounded-lg border-2 border-green-200">
            <h4 className="mb-4 text-green-800">🎨 Precios de Aplicación (por lado)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-white p-4 rounded-lg border-2 border-green-300">
                <Label className="text-green-900 flex items-center gap-2">
                  <span className="text-2xl">🟢</span> Camisa con Vinil (L.)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtVinilPrice}
                  onChange={(e) => setShirtVinilPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-green-400 text-xl h-12"
                />
                <p className="text-xs text-green-700">
                  <strong>Costo por lado</strong> de aplicación con vinil textil
                </p>
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                  💡 Si es 2 lados, este precio se multiplica × 2
                </div>
              </div>
              
              <div className="space-y-2 bg-white p-4 rounded-lg border-2 border-purple-300">
                <Label className="text-purple-900 flex items-center gap-2">
                  <span className="text-2xl">🟣</span> Camisa Sublimada (L.)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtSublimationPrice}
                  onChange={(e) => setShirtSublimationPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-purple-400 text-xl h-12"
                />
                <p className="text-xs text-purple-700">
                  <strong>Costo por lado</strong> de aplicación con sublimación
                </p>
                <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded mt-2">
                  💡 Si es 2 lados, este precio se multiplica × 2
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="mb-3">Precios por Nivel de Diseño</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Diseño Normal (L.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtDesignNormal}
                  onChange={(e) => setShirtDesignNormal(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Diseño simple, texto básico</p>
              </div>
              <div className="space-y-2">
                <Label>Diseño Medio (L.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtDesignMedio}
                  onChange={(e) => setShirtDesignMedio(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Diseño con logotipo y elementos</p>
              </div>
              <div className="space-y-2">
                <Label>Diseño Avanzado (L.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={shirtDesignAvanzado}
                  onChange={(e) => setShirtDesignAvanzado(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">Diseño complejo, multicolor</p>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-300">
            <p className="text-sm text-blue-900 mb-3">
              <strong>📊 Fórmula de Cálculo Automático:</strong>
            </p>
            <div className="bg-white p-3 rounded border border-blue-200 mb-3">
              <code className="text-sm text-blue-800">
                Precio Final = (Precio Base + Precio Diseño + (Precio Aplicación × Lados)) × Cantidad
              </code>
            </div>
            <p className="text-xs text-blue-700 mb-2">
              <strong>🔹 Ejemplo con Vinil:</strong><br />
              Camisa base L. 150 + Diseño normal L. 30 + Vinil L. 50 × 2 lados = <strong>L. 280</strong> por camisa
            </p>
            <p className="text-xs text-indigo-700">
              <strong>🔹 Ejemplo con Sublimación:</strong><br />
              Camisa base L. 150 + Diseño medio L. 50 + Sublimación L. 80 × 1 lado = <strong>L. 280</strong> por camisa
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Materiales Configurables */}
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            📋 Materiales Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-orange-700">
            Lista de materiales que aparecerán en el selector al crear pedidos/cotizaciones
          </p>
          
          <div className="space-y-3">
            {materials.map((material, index) => (
              <div key={index} className="bg-white p-3 rounded-lg border-2 border-orange-300 flex items-center gap-4">
                <Input
                  type="text"
                  value={material}
                  onChange={(e) => {
                    const updated = [...materials];
                    updated[index] = e.target.value;
                    setMaterials(updated);
                  }}
                  placeholder="Nombre del material"
                  className="flex-1 border-orange-300"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const updated = materials.filter((_, i) => i !== index);
                    setMaterials(updated);
                  }}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="border-orange-300 text-orange-700"
            onClick={() => {
              setMaterials([...materials, '']);
            }}
          >
            + Agregar Material
          </Button>
          
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mt-4">
            <p className="text-xs text-yellow-800">
              💡 <strong>Ejemplos:</strong> Vinil, Lona, Tela, Microperforado, Canvas, Mesh, etc.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PVC Pricing Info - Automático por Rangos */}
      <Card className="border-2 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            🟪 Precios de PVC - Sistema Automático por Rangos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg border-2 border-purple-300 p-5">
            <h4 className="font-bold text-purple-900 mb-3">📊 Cómo se Calcula el Precio del PVC</h4>
            <p className="text-sm text-purple-800 mb-4">
              El sistema calcula automáticamente el precio según el <strong>área total en metros cuadrados</strong> usando <strong>precio por pulgada cuadrada</strong>:
            </p>
            
            <div className="space-y-3 mb-4">
              <div className="bg-linear-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-900">Menos de 2 m²</span>
                  <span className="font-bold text-red-900 text-xl">L.0.30 / pulg²</span>
                </div>
              </div>
              
              <div className="bg-linear-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-orange-900">De 2 m² a 5 m²</span>
                  <span className="font-bold text-orange-900 text-xl">L.0.25 / pulg²</span>
                </div>
              </div>
              
              <div className="bg-linear-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-900">5 m² en adelante</span>
                  <span className="font-bold text-green-900 text-xl">L.0.20 / pulg²</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-300">
              <p className="text-sm text-blue-900 font-bold mb-2">
                📐 Fórmula de Cálculo:
              </p>
              <div className="bg-white p-3 rounded border border-blue-300 mb-3">
                <code className="text-xs text-blue-800">
                  1. Área m² = Ancho (m) × Alto (m)<br />
                  2. Área pulg² = Área m² × 1,550<br />
                  3. Precio Total = Área pulg² × Precio por pulg² (según rango)
                </code>
              </div>
              
              <div className="space-y-2 text-xs text-blue-800">
                <p><strong>🔹 Ejemplo 1: PVC de 0.5m × 0.5m</strong></p>
                <p>• Área: 0.25 m² → Menos de 2m² → L.0.30/pulg²</p>
                <p>• Conversión: 0.25 m² × 1,550 = 387.5 pulg²</p>
                <p>• Precio: 387.5 × L.0.30 = <strong className="text-blue-900">L.116.25</strong></p>
                
                <p className="mt-3"><strong>🔹 Ejemplo 2: PVC de 2m × 1.5m</strong></p>
                <p>• Área: 3 m² → Entre 2-5m² → L.0.25/pulg²</p>
                <p>• Conversión: 3 m² × 1,550 = 4,650 pulg²</p>
                <p>• Precio: 4,650 × L.0.25 = <strong className="text-blue-900">L.1,162.50</strong></p>
              </div>
            </div>
          </div>

          <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
            <p className="text-xs text-purple-900">
              ⚡ <strong>Ventaja:</strong> No requiere configuración manual. El sistema ajusta automáticamente el precio según el tamaño del pedido.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card for Fixed Price Products */}
      <Card className="border-2 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-900 flex items-center gap-2">
            💡 Productos con Precio Fijo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-yellow-800">
            Los siguientes productos <strong>NO requieren configuración de precios aquí</strong>:
          </p>
          <div className="bg-white rounded-lg border border-yellow-300 p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-yellow-700">•</span>
              <div>
                <strong className="text-yellow-900">Taza, Termo, Yeti:</strong>
                <p className="text-sm text-yellow-700 mt-1">
                  Se registra el precio unitario directamente en el inventario al crear el producto.
                  Este precio se usa automáticamente en pedidos y cotizaciones.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-700">•</span>
              <div>
                <strong className="text-yellow-900">Carnet, Reconocimiento:</strong>
                <p className="text-sm text-yellow-700 mt-1">
                  El precio se ingresa manualmente en cada pedido/cotización según medidas específicas.
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-yellow-700 mt-3">
            ✅ <strong>Ventaja:</strong> Mayor flexibilidad y control sobre los precios de productos sin cálculos complejos.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>
    </form>
  );
}
