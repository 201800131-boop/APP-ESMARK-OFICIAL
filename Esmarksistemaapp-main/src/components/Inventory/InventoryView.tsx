import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Search, Plus, Edit, AlertTriangle, Check, Calculator, Upload, Image as ImageIcon, X, Package, LayoutGrid, List, LayoutList, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { ListView, GridView, CardsView, CompactView } from './InventoryViewModes';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { normalizeAppText } from '../../utils/text-normalizer';
import ProductPreviewModal from './ProductPreviewModal';

interface SizeInventory {
  size: string;
  stock: number;
  minStock: number;
}

interface ColorVariant {
  color: string;
  stock: number;
  image?: string;
  sizes?: SizeInventory[];
}

const cleanText = (value?: string) => normalizeAppText(value || '');

const isSizeInventoryCategory = (value?: string) => {
  const categoryKey = cleanText(value).toLowerCase().trim();
  return ['camisa', 'camisas', 'mameluco', 'mamelucos'].includes(categoryKey);
};

const INVENTORY_COLOR_MAP: Record<string, string> = {
  blanco: '#ffffff',
  negro: '#111827',
  rojo: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308',
  rosa: '#ec4899',
  morado: '#a855f7',
  naranja: '#f97316',
  gris: '#6b7280',
  celeste: '#38bdf8',
  cafe: '#92400e',
  'cafÃ©': '#92400e',
  beige: '#d4b896',
  turquesa: '#14b8a6',
};

const getInventoryColorCss = (name: string) => INVENTORY_COLOR_MAP[cleanText(name).toLowerCase().trim()] || '#94a3b8';

interface DisplayProduct {
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
  size_inventories?: SizeInventory[];
  groupedIds?: string[];
  groupedCount?: number;
  colors?: string[];
  colorVariants?: ColorVariant[];
}

type ViewMode = 'list' | 'grid' | 'cards' | 'compact';

// Colores predefinidos del sistema
const DEFAULT_COLORS = [
  'Blanco', 'Negro', 'Rojo', 'Azul', 'Verde', 
  'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Gris',
  'Celeste', 'CafÃ©', 'Beige', 'Turquesa', 'Fucsia'
];

const COLOR_DOT_MAP: Record<string, string> = {
  blanco: '#ffffff',
  negro: '#1a1a1a',
  rojo: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarillo: '#eab308',
  rosa: '#ec4899',
  morado: '#a855f7',
  naranja: '#f97316',
  gris: '#6b7280',
  celeste: '#38bdf8',
  'cafÃ©': '#92400e',
  beige: '#d4c5a9',
  turquesa: '#2dd4bf',
  fucsia: '#d946ef',
};

// CategorÃ­as predefinidas del sistema
const DEFAULT_CATEGORIES = [
  'Stickers',
  'Banner',
  'Camisa',
  'Mameluco',
  'PVC',
  'Tazas',
  'Gorras',
  'Llaveros',
  'Bolsas',
  'SublimaciÃ³n'
];

export default function InventoryView() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); // Para el guardado
  const [loadingProducts, setLoadingProducts] = useState(true); // Para la carga de productos
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [stickerTotals, setStickerTotals] = useState<any>({});
  const [selectedPreviewProduct, setSelectedPreviewProduct] = useState<DisplayProduct | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [style, setStyle] = useState('');
  const [color, setColor] = useState('');
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [price, setPrice] = useState(0);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [processingImage, setProcessingImage] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState('');
  
  // Inventario por talla
  const [sizeInventories, setSizeInventories] = useState<SizeInventory[]>([]);
  const [colorSizeInventories, setColorSizeInventories] = useState<Record<string, SizeInventory[]>>({});
  const [activeInventoryColor, setActiveInventoryColor] = useState('');
  const previousActiveInventoryColorRef = useRef('');

  // Cargar colores personalizados desde localStorage
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>(DEFAULT_COLORS);

  // Cargar categorÃ­as personalizadas desde localStorage
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    loadProducts();
    loadCustomColors();
    loadCustomCategories();
  }, []);

  const loadCustomColors = () => {
    try {
      const storedColors = localStorage.getItem('esmark_custom_colors');
      if (storedColors) {
        const parsed = JSON.parse(storedColors);
        setCustomColors(parsed);
        // Combinar colores predefinidos con personalizados
        setAvailableColors([...DEFAULT_COLORS, ...parsed]);
      }
    } catch (error) {
      console.error('Error al cargar colores personalizados:', error);
    }
  };

  const loadCustomCategories = () => {
    try {
      const storedCategories = localStorage.getItem('esmark_custom_categories');
      if (storedCategories) {
        const parsed = JSON.parse(storedCategories);
        setCustomCategories(parsed);
        // Combinar categorÃ­as predefinidas con personalizadas
        setAvailableCategories([...DEFAULT_CATEGORIES, ...parsed]);
      }
    } catch (error) {
      console.error('Error al cargar categorÃ­as personalizadas:', error);
    }
  };

  // Generar cÃ³digo automÃ¡ticamente basado en el nombre del producto (sin el color)
  const generateCode = (productName: string, productColor: string) => {
    if (!productName.trim()) {
      return '';
    }

    // Usar solo el nombre para generar el prefijo (ignorar el color)
    const words = productName.trim().split(' ');
    let prefix = '';
    
    if (words.length === 1) {
      // Si es una sola palabra, tomar las primeras 3-6 letras
      prefix = words[0].substring(0, Math.min(6, words[0].length)).toUpperCase();
    } else {
      // Si son mÃºltiples palabras, tomar primeras letras de cada una
      prefix = words
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 6)
        .toUpperCase();
    }

    // Encontrar todos los productos con el mismo nombre (diferentes colores)
    // y buscar el siguiente nÃºmero disponible
    const existingCodes = products
      .filter(p => p.code && p.code.startsWith(prefix))
      .map(p => {
        const match = p.code.match(new RegExp(`${prefix}-(\\d+)`));
        return match ? parseInt(match[1]) : 0;
      });

    const nextNumber = existingCodes.length > 0 
      ? Math.max(...existingCodes) + 1 
      : 1;

    return `${prefix}-${String(nextNumber).padStart(3, '0')}`;
  };

  // Auto-generar cÃ³digo cuando cambia el nombre o el color
  useEffect(() => {
    if (name && !editingProduct) {
      const generatedCode = generateCode(name, color);
      setCode(generatedCode);
    }
  }, [name, color, products]);

  const loadProducts = async () => {
    try {
      console.log('ðŸ”„ Cargando productos...');
      const { products: supabaseProducts } = await api.getProducts();
      const normalizedProducts = Array.isArray(supabaseProducts) ? supabaseProducts : [];
      setProducts(normalizedProducts);
      console.log('âœ… Productos cargados desde Supabase:', normalizedProducts.length);
      setError('');
    } catch (error) {
      console.error('âŒ Error cargando productos desde Supabase:', error);
      setProducts([]);
      setError('No se pudieron cargar los productos desde Supabase.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const addSampleProducts = async () => {
    const sampleProducts = [
      {
        id: `sample-${Date.now()}-1`,
        code: 'LLAV-SUB-001',
        category: 'Llaveros',
        name: 'Llaveros sublimados',
        style: '',
        color: '',
        stock: 50,
        min_stock: 10,
        price: 80,
        image: '',
        created_at: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-2`,
        code: 'LLAV-MET-001',
        category: 'Llaveros',
        name: 'Llaveros metÃ¡licos',
        style: '',
        color: '',
        stock: 40,
        min_stock: 10,
        price: 90,
        image: '',
        created_at: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-3`,
        code: 'BOTE-DEP-001',
        category: 'Botes',
        name: 'Botes deportivos',
        style: '',
        color: '',
        stock: 30,
        min_stock: 5,
        price: 200,
        image: '',
        created_at: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-4`,
        code: 'BOTE-DOB-001',
        category: 'Botes',
        name: 'Botes doble nivel',
        style: '',
        color: '',
        stock: 20,
        min_stock: 5,
        price: 400,
        image: '',
        created_at: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-5`,
        code: 'BOT-LECH-001',
        category: 'Botellas',
        name: 'Botellas lecheras',
        style: '',
        color: '',
        stock: 25,
        min_stock: 8,
        price: 305,
        image: '',
        created_at: new Date().toISOString()
      },
      {
        id: `sample-${Date.now()}-6`,
        code: 'VIN-001',
        category: 'Vineros',
        name: 'Vineros',
        style: '',
        color: '',
        stock: 15,
        min_stock: 5,
        price: 400,
        image: '',
        created_at: new Date().toISOString()
      }
    ];

    try {
      const existingCodes = products.map((p: any) => p.code);
      const newProducts = sampleProducts.filter(p => !existingCodes.includes(p.code));
      
      if (newProducts.length === 0) {
        toast.warning('âš ï¸ Productos ya agregados', {
          description: 'Los productos de muestra ya fueron agregados anteriormente',
          duration: 3000,
        });
        return;
      }

      const createdProducts = await Promise.all(
        newProducts.map(async (product) => {
          const response = await api.createProduct(product);
          return response.product;
        })
      );

      setProducts(prev => [...prev, ...createdProducts]);
      console.log('â˜ï¸ Productos de muestra guardados en Supabase');
      
      toast.success('âœ… Productos agregados', {
        description: `${newProducts.length} productos de muestra agregados al inventario:\nâ€¢ Llaveros sublimados (L. 80)\nâ€¢ Llaveros metÃ¡licos (L. 90)\nâ€¢ Botes deportivos (L. 200)\nâ€¢ Botes doble nivel (L. 400)\n    Botellas lecheras (L. 305)\nâ€¢ Vineros (L. 400)`,
        duration: 6000,
      });
      
      console.log('âœ… Productos de muestra agregados:', newProducts);
    } catch (error) {
      console.error('âŒ Error al agregar productos de muestra:', error);
      toast.error('âŒ Error', {
        description: 'No se pudieron agregar los productos de muestra',
        duration: 3000,
      });
    }
  };

  const resetForm = () => {
    setCode('');
    setCategory('');
    setName('');
    setStyle('');
    setColor('');
    setStock(0);
    setMinStock(0);
    setPrice(0);
    setProductImage(null);
    setImagePreview('');
    setAvailableSizes([]);
    setCustomSize('');
    setSizeInventories([]);
    setColorSizeInventories({});
    setActiveInventoryColor('');
    setEditingProduct(null);
    setError('');
    setSuccess('');
    setLoading(false); // Asegurar que loading estÃ© en false
    setCurrentStep(1);
  };

  const handleAddCustomSize = () => {
    const trimmedSize = customSize.trim().toUpperCase();
    if (trimmedSize && !availableSizes.includes(trimmedSize)) {
      setAvailableSizes([...availableSizes, trimmedSize]);
      
      // Agregar automÃ¡ticamente al inventario de tallas
      setSizeInventories(prev => [...prev, { size: trimmedSize, stock: 0, minStock: 5 }]);
      
      setCustomSize('');
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    setAvailableSizes(availableSizes.filter(size => size !== sizeToRemove));
    // TambiÃ©n remover del inventario de tallas si existe
    setSizeInventories(sizeInventories.filter(inv => inv.size !== sizeToRemove));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaÃ±o (mÃ¡ximo 2MB para evitar congelamiento)
    if (file.size > 2 * 1024 * 1024) {
      setError('âš ï¸ La imagen debe ser menor a 2MB');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('âš ï¸ Solo se permiten archivos de imagen (JPG, PNG, etc.)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setProcessingImage(true);
      setError('');
      setSuccess('');
      setProductImage(file);
      console.log('ðŸ“¸ Procesando imagen:', file.name, '-', (file.size / 1024).toFixed(2), 'KB');
      
      // âš¡ OPTIMIZACIÃ“N CRÃTICA: Usar setTimeout para liberar el hilo principal
      // Esto previene el congelamiento del navegador
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // âœ… OPTIMIZACIÃ“N: Comprimir imagen antes de crear preview
      const compressedDataUrl = await compressImage(file);
      setImagePreview(compressedDataUrl);
      
      console.log('âœ… Imagen procesada correctamente');
      setSuccess('âœ… Imagen cargada correctamente');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('âŒ Error al procesar imagen:', error);
      setError('âš ï¸ Error al procesar la imagen. Intenta con una mÃ¡s pequeÃ±a.');
      setTimeout(() => setError(''), 3000);
      setProductImage(null);
      setImagePreview('');
    } finally {
      setProcessingImage(false);
    }
  };

  // âœ… FUNCIÃ“N OPTIMIZADA: Comprimir imagen SIN congelar el navegador
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = async () => {
          try {
            // âš¡ Liberar el hilo principal antes de procesar
            await new Promise(r => setTimeout(r, 0));
            
            // Crear canvas para comprimir
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { 
              alpha: false, // OptimizaciÃ³n: sin canal alpha
              willReadFrequently: false 
            });
            
            if (!ctx) {
              reject(new Error('No se pudo crear el contexto del canvas'));
              return;
            }
            
            // âš¡ TamaÃ±o mÃ¡ximo reducido para mejor rendimiento (500x500)
            const MAX_SIZE = 500;
            
            let width = img.width;
            let height = img.height;
            
            // Calcular nuevo tamaÃ±o manteniendo aspect ratio
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            
            if (ratio < 1) {
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            
            // Redimensionar canvas
            canvas.width = width;
            canvas.height = height;
            
            // âš¡ OptimizaciÃ³n: Usar filtro de calidad para mejor compresiÃ³n
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // âš¡ Liberar el hilo principal antes de convertir
            await new Promise(r => setTimeout(r, 0));
            
            // Convertir a base64 con compresiÃ³n agresiva (0.6 = 60% calidad)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            
            const originalSizeKB = (file.size / 1024).toFixed(2);
            const compressedSizeKB = (compressedDataUrl.length / 1024).toFixed(2);
            
            console.log('ðŸ–¼ï¸ Imagen comprimida:', 
              `Original: ${originalSizeKB}KB`,
              `â†’ Comprimida: ${compressedSizeKB}KB`,
              `(${width}x${height}px)`
            );
            
            // Limpiar canvas
            canvas.remove();
            
            resolve(compressedDataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Error al cargar la imagen'));
        };
        
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  const updateSizeInventory = (size: string, field: 'stock' | 'minStock', value: number) => {
    setSizeInventories(prev =>
      prev.map(inv =>
        inv.size === size ? { ...inv, [field]: value } : inv
      )
    );
  };

  const getTotalStockFromSizes = () => {
    const selectedColors = getSelectedColors(color);
    if (hasSizesCategory && selectedColors.length > 1) {
      return selectedColors.reduce(
        (sum, colorKey) => sum + (colorSizeInventories[colorKey] || []).reduce((s, inv) => s + inv.stock, 0),
        0
      );
    }
    return sizeInventories.reduce((sum, inv) => sum + inv.stock, 0);
  };

  const normalizeText = (value: string) => value?.trim().toLowerCase();

  const parseColorTokens = (value?: string) =>
    (value || '')
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);

  const getSelectedColors = (value?: string) => uniqueTokens(parseColorTokens(value));

  const uniqueTokens = (values: string[]) => {
    const map = new Map<string, string>();
    values.forEach((token) => {
      const key = token.toLowerCase();
      if (!map.has(key)) {
        map.set(key, token);
      }
    });
    return Array.from(map.values());
  };

  const rowsEqual = (a: SizeInventory[] = [], b: SizeInventory[] = []) => {
    if (a.length !== b.length) return false;
    return a.every((row, idx) => {
      const other = b[idx];
      return !!other && row.size === other.size && row.stock === other.stock && row.minStock === other.minStock;
    });
  };

  const mergeSizeInventoryRows = (rows: Array<{ size: string; stock: number; minStock: number }>) => {
    const merged = new Map<string, { size: string; stock: number; minStock: number }>();
    rows.forEach((row) => {
      const key = row.size.trim().toUpperCase();
      if (!merged.has(key)) {
        merged.set(key, { size: key, stock: Math.max(0, row.stock || 0), minStock: Math.max(0, row.minStock || 0) });
        return;
      }
      const existing = merged.get(key)!;
      existing.stock += Math.max(0, row.stock || 0);
      existing.minStock += Math.max(0, row.minStock || 0);
      merged.set(key, existing);
    });
    return Array.from(merged.values());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevenir mÃºltiples envÃ­os
    if (loading) {
      return;
    }
    
    console.log('ðŸ’¾ Guardando producto...', { category, hasSizes: hasSizesCategory });
    setError('');
    setSuccess('');
    
    // Establecer loading inmediatamente para bloquear futuros clics
    setLoading(true);

    try {
      // Usar la variable memoizada para evitar cÃ¡lculos repetidos
      const hasSizes = hasSizesCategory;
      const selectedColors = getSelectedColors(color);
      const effectiveColorInventories: Record<string, SizeInventory[]> = selectedColors.reduce((acc, colorKey) => {
        const sourceRows = colorKey === activeInventoryColor
          ? sizeInventories
          : colorSizeInventories[colorKey] || [];
        acc[colorKey] = mergeSizeInventoryRows(
          sourceRows.map((row) => ({
            size: row.size,
            stock: Number(row.stock) || 0,
            minStock: Number(row.minStock) || 0,
          }))
        );
        return acc;
      }, {} as Record<string, SizeInventory[]>);

      const fallbackRows = mergeSizeInventoryRows(
        sizeInventories.map((row) => ({
          size: row.size,
          stock: Number(row.stock) || 0,
          minStock: Number(row.minStock) || 0,
        }))
      );

      const singleColorRows = selectedColors.length === 1
        ? (effectiveColorInventories[selectedColors[0]]?.length ? effectiveColorInventories[selectedColors[0]] : fallbackRows)
        : fallbackRows;

      console.log('ðŸ“ Datos del formulario:', { code, name, category, stock, minStock, price, hasSizes });
      
      // Validar inventario de tallas para productos que requieren tallas
      if (hasSizes && selectedColors.length === 0) {
        setLoading(false);
        setError('âš ï¸ Selecciona al menos un color para guardar inventario por tallas.');
        toast.error('âš ï¸ Debes elegir un color', {
          duration: 3500,
          position: 'top-center',
        });
        return;
      }

      if (hasSizes && selectedColors.length > 1) {
        const missingInventoryColor = selectedColors.find((colorKey) => (effectiveColorInventories[colorKey] || []).length === 0);
        if (missingInventoryColor) {
          setLoading(false);
          setError(`âš ï¸ Falta inventario de tallas para el color ${missingInventoryColor}.`);
          toast.error('âš ï¸ Completa inventario por color', {
            duration: 4000,
            position: 'top-center',
            description: `Agrega tallas para ${missingInventoryColor}`,
          });
          return;
        }
      }

      if (hasSizes && selectedColors.length <= 1 && singleColorRows.length === 0) {
        setLoading(false);
        setError('âš ï¸ Este producto requiere tallas. Por favor selecciona o agrega al menos una talla.');
        toast.error('âš ï¸ Debes agregar al menos una talla', {
          duration: 4000,
          position: 'top-center',
          description: 'Usa los botones de tallas estÃ¡ndar o agrega una talla personalizada'
        });
        return;
      }

      // Validar precio para productos que lo requieren (usar variable memoizada)
      if (hasPrice && (!price || price <= 0)) {
        setLoading(false);
        setError(`Este producto requiere un precio unitario. Por favor ingresa el precio de ${category}.`);
        return;
      }

      if (editingProduct && hasSizes) {
        const sourceProducts = resolveProductsForEdit(editingProduct);
        const usedSourceIds = new Set<string>();
        const savedProducts: any[] = [];

        for (const colorKey of selectedColors) {
          const colorKeyNormalized = normalizeText(colorKey);
          const rows = effectiveColorInventories[colorKey] || [];
          const stockByColor = rows.reduce((sum, inv) => sum + inv.stock, 0);
          const capturedMinStock = rows.reduce((sum, inv) => sum + inv.minStock, 0);
          const existingVariant = sourceProducts.find((candidate: any) =>
            !usedSourceIds.has(candidate.id) &&
            parseColorTokens(candidate.color || '').some((candidateColor) => normalizeText(candidateColor) === colorKeyNormalized)
          );
          const minByColor = capturedMinStock > 0
            ? capturedMinStock
            : Number(existingVariant?.min_stock ?? editingProduct.min_stock) || 0;
          const perColorPayload = {
            code,
            category,
            name,
            style,
            color: colorKey,
            stock: stockByColor,
            min_stock: minByColor,
            price: hasPrice
              ? price
              : Number(existingVariant?.price ?? editingProduct.price ?? price) || 0,
            image: imagePreview || existingVariant?.image || editingProduct.image || '',
            sizes: rows.map((inv) => inv.size),
            size_inventories: rows,
          };

          if (existingVariant) {
            usedSourceIds.add(existingVariant.id);
            const response = await api.updateProduct(existingVariant.id, perColorPayload);
            savedProducts.push(response.product || { ...existingVariant, ...perColorPayload });
          } else {
            const response = await api.createProduct(perColorPayload);
            if (response.product) {
              savedProducts.push(response.product);
            }
          }
        }

        if (savedProducts.length === 0) {
          throw new Error('No se pudieron guardar las variantes por color.');
        }

        await loadProducts();
        toast.success('Producto actualizado sin borrar variantes', {
          duration: 4000,
          position: 'top-center',
          description: `Se conservaron las tallas de ${savedProducts.length} color${savedProducts.length !== 1 ? 'es' : ''}.`,
        });
        setLoading(false);
        setShowAddDialog(false);
        return;
      }

      if (!editingProduct && hasSizes && selectedColors.length > 1) {
        const createdProducts: any[] = [];

        for (const colorKey of selectedColors) {
          const rows = effectiveColorInventories[colorKey] || [];
          const stockByColor = rows.reduce((sum, inv) => sum + inv.stock, 0);
          const minByColor = rows.reduce((sum, inv) => sum + inv.minStock, 0);

          const perColorPayload = {
            code,
            category,
            name,
            style,
            color: colorKey,
            stock: stockByColor,
            min_stock: minByColor,
            price: hasPrice ? price : 0,
            image: imagePreview,
            sizes: rows.map((inv) => inv.size),
            size_inventories: rows,
          };

          const createdResponse = await api.createProduct(perColorPayload);
          const createdProduct = createdResponse.product;
          if (createdProduct) {
            createdProducts.push(createdProduct);
          }
        }

        if (createdProducts.length === 0) {
          throw new Error('No se pudieron crear productos por color.');
        }

        setProducts((prev) => [...prev, ...createdProducts]);

        toast.success('âœ… Producto guardado por color', {
          duration: 3500,
          position: 'top-center',
          description: `Se crearon ${createdProducts.length} variantes con tallas independientes`,
        });

        setLoading(false);
        setShowAddDialog(false);
        return;
      }

      const effectiveSizes = hasSizes ? singleColorRows.map((inv) => inv.size) : undefined;
      const effectiveStock = hasSizes ? singleColorRows.reduce((sum, inv) => sum + inv.stock, 0) : stock;
      const effectiveMinStock = hasSizes ? singleColorRows.reduce((sum, inv) => sum + inv.minStock, 0) : minStock;

      const productData = {
        code, 
        category, 
        name, 
        style, 
        color, 
        stock: effectiveStock,
        min_stock: effectiveMinStock, 
        price: hasPrice ? price : (editingProduct ? Number(editingProduct.price) || 0 : 0),
        image: imagePreview,
        sizes: effectiveSizes,
        size_inventories: hasSizes ? singleColorRows : undefined
      };

      console.log('ðŸ’¾ Guardando producto:', productData);

      if (editingProduct) {
        const response = await api.updateProduct(editingProduct.id, productData);
        const updatedProduct = response.product || { ...editingProduct, ...productData };

        setProducts(prev =>
          prev.map((p: any) => (p.id === editingProduct.id ? updatedProduct : p))
        );
        console.log('âœ… Producto actualizado en Supabase');
      } else {
        const response = await api.createProduct(productData);
        const newProduct = response.product;

        if (!newProduct) {
          throw new Error('Supabase no devolvio el producto creado.');
        }

        setProducts(prev => [...prev, newProduct]);
        console.log('âœ… Producto creado en Supabase:', newProduct);

        // Si existe un producto base igual, fusionar variantes en un solo ingreso.
        const existingBase = products.find((p: any) =>
          normalizeText(p.category || '') === normalizeText(category) &&
          normalizeText(p.name || '') === normalizeText(name) &&
          normalizeText(p.style || '') === normalizeText(style || '')
        );

        if (existingBase) {
          const existingColors = parseColorTokens(existingBase.color || '');
          const newColors = parseColorTokens(color || '');
          const mergedColors = uniqueTokens([...existingColors, ...newColors]);

          const existingSizes = Array.isArray(existingBase.sizes) ? existingBase.sizes : [];
          const incomingSizes = hasSizes ? availableSizes : [];
          const mergedSizes = uniqueTokens([
            ...existingSizes.map((s: string) => s.toUpperCase()),
            ...incomingSizes.map((s) => s.toUpperCase()),
          ]);

          const existingSizeInventories = Array.isArray(existingBase.size_inventories)
            ? existingBase.size_inventories
            : [];
          const incomingSizeInventories = hasSizes
            ? sizeInventories
            : [];

          const mergedSizeInventories = mergeSizeInventoryRows([
            ...existingSizeInventories.map((inv: any) => ({
              size: inv.size,
              stock: Number(inv.stock) || 0,
              minStock: Number(inv.minStock) || 0,
            })),
            ...incomingSizeInventories,
          ]);

          const mergedStock = hasSizes
            ? mergedSizeInventories.reduce((sum, inv) => sum + inv.stock, 0)
            : (Number(existingBase.stock) || 0) + (Number(stock) || 0);

          const mergedMinStock = hasSizes
            ? mergedSizeInventories.reduce((sum, inv) => sum + inv.minStock, 0)
            : (Number(existingBase.min_stock) || 0) + (Number(minStock) || 0);

          const mergePayload = {
            ...existingBase,
            category,
            name,
            style,
            color: mergedColors.join(', '),
            stock: mergedStock,
            min_stock: mergedMinStock,
            price: hasPrice ? (price > 0 ? price : existingBase.price || 0) : 0,
            image: imagePreview || existingBase.image || '',
            sizes: hasSizes ? mergedSizes : existingBase.sizes,
            size_inventories: hasSizes ? mergedSizeInventories : existingBase.size_inventories,
          };

          const updatedBaseResponse = await api.updateProduct(existingBase.id, mergePayload);
          const updatedBase = updatedBaseResponse.product || { ...existingBase, ...mergePayload };

          await api.deleteProduct(newProduct.id);

          setProducts((prev) =>
            prev
              .filter((p: any) => p.id !== newProduct.id)
              .map((p: any) => (p.id === existingBase.id ? updatedBase : p))
          );

          toast.success('âœ… Variante integrada al mismo producto', {
            description: 'Se unificaron colores y tallas en un solo ingreso.',
            duration: 3500,
            position: 'top-center',
          });
        }
      }

      // âœ… Mostrar notificaciÃ³n toast
      toast.success(editingProduct ? 'âœ… Producto actualizado exitosamente' : 'âœ… Producto guardado exitosamente', {
        duration: 3000,
        position: 'top-center',
        description: 'â˜ï¸ Sincronizado con Supabase'
      });
      
      // Resetear loading y cerrar diÃ¡logo
      setLoading(false);
      setShowAddDialog(false);
      
    } catch (error: any) {
      console.error('âŒ Error al guardar producto:', error);
      setError(error.message || 'Error al guardar producto');
      setLoading(false);
    }
  };

  const resolveProductForEdit = (product: any) => {
    const candidateIds = [
      ...(Array.isArray(product?.groupedIds) ? product.groupedIds : []),
      product?.id,
    ].filter(Boolean);

    for (const id of candidateIds) {
      const found = products.find((p: any) => p.id === id);
      if (found) return found;
    }

    return null;
  };

  const resolveProductsForEdit = (product: any) => {
    const candidateIds = new Set([
      ...(Array.isArray(product?.groupedIds) ? product.groupedIds : []),
      product?.id,
    ].filter(Boolean));
    const productsById = products.filter((candidate: any) => candidateIds.has(candidate.id));

    if (productsById.length > 0) {
      return productsById;
    }

    return products.filter((candidate: any) =>
      normalizeText(candidate.category || '') === normalizeText(product.category || '') &&
      normalizeText(candidate.name || '') === normalizeText(product.name || '') &&
      normalizeText(candidate.style || '') === normalizeText(product.style || '')
    );
  };

  const handleEdit = (product: any) => {
    const source = resolveProductForEdit(product);
    if (!source) {
      toast.error('No se pudo cargar el producto para ediciÃ³n');
      return;
    }

    const sourceProducts = resolveProductsForEdit(product);
    const displayedVariants: ColorVariant[] = Array.isArray(product.colorVariants) ? product.colorVariants : [];
    const sourceColors = uniqueTokens([
      ...displayedVariants.map((variant) => variant.color),
      ...sourceProducts.flatMap((candidate: any) => parseColorTokens(candidate.color || '')),
      ...getSelectedColors(source.color || ''),
    ]);
    const nextByColor: Record<string, SizeInventory[]> = {};

    sourceColors.forEach((colorKey) => {
      const colorKeyNormalized = normalizeText(colorKey);
      const displayedVariant = displayedVariants.find((variant) => normalizeText(variant.color) === colorKeyNormalized);
      const sourceVariant = sourceProducts.find((candidate: any) =>
        parseColorTokens(candidate.color || '').some((candidateColor) => normalizeText(candidateColor) === colorKeyNormalized)
      );
      const variantRows = Array.isArray(displayedVariant?.sizes) && displayedVariant.sizes.length > 0
        ? displayedVariant.sizes
        : Array.isArray(sourceVariant?.size_inventories)
          ? sourceVariant.size_inventories
          : [];

      nextByColor[colorKey] = mergeSizeInventoryRows(
        variantRows.map((row: any) => ({
          size: row.size,
          stock: Number(row.stock) || 0,
          minStock: Number(row.minStock) || 0,
        }))
      );
    });

    const initialColor = sourceColors[0] || '';
    const initialRows = initialColor ? nextByColor[initialColor] || [] : [];
    const allSizes = uniqueTokens(
      sourceColors.flatMap((colorKey) => (nextByColor[colorKey] || []).map((row) => row.size.toUpperCase()))
    );

    setEditingProduct({
      ...source,
      groupedIds: sourceProducts.map((candidate: any) => candidate.id),
    });
    setCode(source.code || '');
    setCategory(source.category || '');
    setName(source.name || '');
    setStyle(source.style || '');
    setColor(sourceColors.join(', '));
    setStock(Number(product.stock ?? source.stock) || 0);
    setMinStock(Number(product.min_stock ?? source.min_stock) || 0);
    setPrice(Number(product.price ?? source.price) || 0);
    setImagePreview(product.image || source.image || '');
    setAvailableSizes(allSizes.length > 0 ? allSizes : (Array.isArray(source.sizes) ? source.sizes : []));
    setSizeInventories(initialRows);
    if (sourceColors.length > 0) {
      setColorSizeInventories(nextByColor);
      setActiveInventoryColor(initialColor);
      previousActiveInventoryColorRef.current = initialColor;
    } else {
      setColorSizeInventories({});
      setActiveInventoryColor('');
      previousActiveInventoryColorRef.current = '';
    }
    setCurrentStep(1);
    
    setShowAddDialog(true);
  };

  const handleDelete = async (product: any) => {
    const confirmed = window.confirm(`Â¿Eliminar el producto "${product.name}"? Esta acciÃ³n no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await api.deleteProduct(product.id);
      setProducts(prev => prev.filter((p: any) => p.id !== product.id));

      toast.success('Producto eliminado correctamente', { duration: 3000 });
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      toast.error(error.message || 'Error al eliminar el producto');
    }
  };

  const calculateStickerTotals = () => {
    const totals: any = {};
    let grandTotal = 0;

    filteredProducts.forEach(product => {
      if (product.category === 'stickers' && product.stock > 0) {
        totals[product.name] = product.stock;
        grandTotal += product.stock;
      }
    });

    totals['TOTAL_GENERAL'] = grandTotal;
    setStickerTotals(totals);
    setShowCalculateDialog(true);
  };

  const getStockStatus = (product: any) => {
    if (product.stock === 0) {
      return { color: 'bg-red-100 text-red-800', label: 'SIN STOCK' };
    } else if (product.stock <= product.min_stock) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'STOCK BAJO' };
    }
    return { color: 'bg-green-100 text-green-800', label: 'OK' };
  };

  const requiresMeasurements = (categoryName: string) => {
    const cat = categoryName.toLowerCase();
    // Productos que REQUIEREN medidas para calcular precio
    return cat === 'banner' || cat === 'stickers' || cat === 'pvc' || 
           cat === 'carnet' || cat === 'reconocimiento';
  };

  const hasFixedPrice = (categoryName: string) => {
    // Todos los productos que NO requieren medidas deben tener precio fijo
    return !requiresMeasurements(categoryName) && !isSizeInventoryCategory(categoryName);
  };

  const hasSizesCategory = React.useMemo(() => {
    return isSizeInventoryCategory(category);
  }, [category]);
  
  const needsMeasurements = React.useMemo(() => {
    return category ? requiresMeasurements(category) : false;
  }, [category]);
  
  const hasPrice = React.useMemo(() => {
    return category ? hasFixedPrice(category) : false;
  }, [category]);

  useEffect(() => {
    if (!hasSizesCategory) {
      setActiveInventoryColor('');
      setColorSizeInventories({});
      return;
    }

    const selectedColors = getSelectedColors(color);
    if (selectedColors.length === 0) {
      setActiveInventoryColor('');
      setColorSizeInventories({});
      return;
    }

    setColorSizeInventories((prev) => {
      const next: Record<string, SizeInventory[]> = {};
      selectedColors.forEach((colorName) => {
        const existing = prev[colorName];
        if (existing) {
          next[colorName] = existing;
          return;
        }
        if (selectedColors.length === 1 && sizeInventories.length > 0) {
          next[colorName] = sizeInventories;
          return;
        }
        next[colorName] = [];
      });
      return next;
    });

    setActiveInventoryColor((prev) => (selectedColors.includes(prev) ? prev : selectedColors[0]));
  }, [color, hasSizesCategory]);

  useEffect(() => {
    if (!hasSizesCategory || !activeInventoryColor) return;
    const nextRows = colorSizeInventories[activeInventoryColor] || [];
    if (!rowsEqual(sizeInventories, nextRows)) {
      setSizeInventories(nextRows);
    }
  }, [activeInventoryColor, colorSizeInventories, hasSizesCategory]);

  useEffect(() => {
    if (!hasSizesCategory || !activeInventoryColor) return;

    // Al cambiar de color activo, primero dejar que el efecto de carga sincronice sizeInventories.
    if (previousActiveInventoryColorRef.current !== activeInventoryColor) {
      previousActiveInventoryColorRef.current = activeInventoryColor;
      return;
    }

    setColorSizeInventories((prev) => {
      const currentRows = prev[activeInventoryColor] || [];
      if (rowsEqual(currentRows, sizeInventories)) {
        return prev;
      }
      return {
        ...prev,
        [activeInventoryColor]: sizeInventories,
      };
    });
  }, [sizeInventories, activeInventoryColor, hasSizesCategory]);

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product =>
      product.code?.toLowerCase().includes(query) ||
      product.name?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const displayProducts = React.useMemo<DisplayProduct[]>(() => {
    const grouped = new Map<string, DisplayProduct>();

    filteredProducts.forEach((product: any) => {
      const key = [
        normalizeText(product.category || ''),
        normalizeText(product.name || ''),
        normalizeText(product.style || ''),
      ].join('::');

      if (!grouped.has(key)) {
        const initialColors = uniqueTokens(parseColorTokens(product.color || ''));
        const initialColorVariants: ColorVariant[] = initialColors.map(c => ({
          color: c,
          stock: Number(product.stock) || 0,
          image: product.image,
          sizes: Array.isArray(product.size_inventories)
            ? product.size_inventories.map((inv: any) => ({
                size: inv.size,
                stock: Number(inv.stock) || 0,
                minStock: Number(inv.minStock) || 0,
              }))
            : [],
        }));
        grouped.set(key, {
          ...product,
          groupedIds: [product.id],
          groupedCount: 1,
          colors: initialColors,
          colorVariants: initialColorVariants,
          sizes: uniqueTokens(Array.isArray(product.sizes) ? product.sizes.map((s: string) => s.toUpperCase()) : []),
          size_inventories: mergeSizeInventoryRows(
            Array.isArray(product.size_inventories)
              ? product.size_inventories.map((inv: any) => ({
                  size: inv.size,
                  stock: Number(inv.stock) || 0,
                  minStock: Number(inv.minStock) || 0,
                }))
              : []
          ),
        });
        return;
      }

      const base = grouped.get(key)!;
      const incomingColors = parseColorTokens(product.color || '');
      const incomingSizes = Array.isArray(product.sizes) ? product.sizes.map((s: string) => s.toUpperCase()) : [];

      base.groupedIds = [...(base.groupedIds || []), product.id];
      base.groupedCount = (base.groupedCount || 1) + 1;
      base.colors = uniqueTokens([...(base.colors || []), ...incomingColors]);
      // Merge colorVariants: accumulate stock per color
      const cvMap = new Map<string, ColorVariant>();
      (base.colorVariants || []).forEach(cv => cvMap.set(cv.color, { ...cv }));
      incomingColors.forEach(c => {
        const incomingColorSizes = Array.isArray(product.size_inventories)
          ? product.size_inventories.map((inv: any) => ({
              size: inv.size,
              stock: Number(inv.stock) || 0,
              minStock: Number(inv.minStock) || 0,
            }))
          : [];
        if (cvMap.has(c)) {
          const variant = cvMap.get(c)!;
          variant.stock += Number(product.stock) || 0;
          variant.sizes = mergeSizeInventoryRows([...(variant.sizes || []), ...incomingColorSizes]);
        } else {
          cvMap.set(c, { color: c, stock: Number(product.stock) || 0, image: product.image, sizes: incomingColorSizes });
        }
      });
      base.colorVariants = Array.from(cvMap.values());
      base.sizes = uniqueTokens([...(base.sizes || []), ...incomingSizes]);
      base.stock = (Number(base.stock) || 0) + (Number(product.stock) || 0);
      base.min_stock = (Number(base.min_stock) || 0) + (Number(product.min_stock) || 0);

      const priceCandidates = [Number(base.price) || 0, Number(product.price) || 0].filter((p) => p > 0);
      base.price = priceCandidates.length > 0 ? Math.max(...priceCandidates) : 0;

      if (!base.image && product.image) {
        base.image = product.image;
      }

      const mergedInventories = mergeSizeInventoryRows([
        ...(base.size_inventories || []).map((inv) => ({ size: inv.size, stock: inv.stock, minStock: inv.minStock })),
        ...(Array.isArray(product.size_inventories)
          ? product.size_inventories.map((inv: any) => ({
              size: inv.size,
              stock: Number(inv.stock) || 0,
              minStock: Number(inv.minStock) || 0,
            }))
          : []),
      ]);
      base.size_inventories = mergedInventories;

      grouped.set(key, base);
    });

    return Array.from(grouped.values());
  }, [filteredProducts]);

  const handleSelectProduct = (product: DisplayProduct) => {
    setSelectedPreviewProduct(product);
  };

  const stepLabels = ['Datos bÃ¡sicos', 'Precio, stock e imagen'];

  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!name.trim() || !category) {
        setError('Completa nombre y categorÃ­a para continuar.');
        return;
      }
    }

    if (currentStep === 2) {
      if (hasSizesCategory) {
        const selectedColors = getSelectedColors(color);
        if (selectedColors.length === 0) {
          setError('Debes seleccionar al menos un color para continuar.');
          return;
        }
        const missingColor = selectedColors.find((colorKey) => (colorSizeInventories[colorKey] || []).length === 0);
        if (missingColor) {
          setError(`Debes agregar al menos una talla para el color ${missingColor}.`);
          return;
        }
      }
      if (hasPrice && (!price || price <= 0)) {
        setError(`Ingresa un precio vÃ¡lido para ${category}.`);
        return;
      }
    }

    setError('');
    setCurrentStep((prev) => Math.min(prev + 1, 2));
  };

  return (
    <div className="app-page space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Inventario</h1>
          <p className="text-gray-600">GestiÃ³n de productos y stock</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Selector */}
          <div className="flex items-center gap-1 bg-gray-200 border border-gray-300 rounded-lg p-1 shadow-sm">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'h-9 bg-gray-700 text-white hover:bg-gray-800 border border-gray-700 shadow-md' : 'h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100'}
            >
              <List className="w-4 h-4 mr-1" />
              Lista
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'h-9 bg-gray-700 text-white hover:bg-gray-800 border border-gray-700 shadow-md' : 'h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100'}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              CuadrÃ­cula
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className={viewMode === 'cards' ? 'h-9 bg-gray-700 text-white hover:bg-gray-800 border border-gray-700 shadow-md' : 'h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100'}
            >
              <LayoutList className="w-4 h-4 mr-1" />
              Tarjetas
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className={viewMode === 'compact' ? 'h-9 bg-gray-700 text-white hover:bg-gray-800 border border-gray-700 shadow-md' : 'h-9 text-gray-700 hover:text-gray-900 hover:bg-gray-100'}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              Compacto
            </Button>
          </div>

          <Button 
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-900"
            onClick={async () => {
              console.log('ðŸ”„ SincronizaciÃ³n manual solicitada');
              toast.info('ðŸ”„ Recargando inventario desde Supabase...', { duration: 2000 });
              
              try {
                await loadProducts();
                
                toast.success('âœ… Inventario recargado', { 
                  duration: 3000,
                  description: `${products.length} productos en Supabase`
                });
              } catch (error) {
                console.error('âŒ Error en sincronizaciÃ³n:', error);
                toast.error('âŒ Error en sincronizaciÃ³n', { duration: 3000 });
              }
            }}
          >
            <Package className="w-4 h-4 mr-2" />
            â˜ï¸ Sincronizar con Supabase
          </Button>

          <Dialog open={showAddDialog} onOpenChange={(open) => {
            if (!open) {
              // Resetear formulario inmediatamente cuando se cierra
              resetForm();
            } else {
              setCurrentStep(1);
            }
            setShowAddDialog(open);
          }}>
            <DialogTrigger asChild>
              <Button 
                className="bg-green-600 hover:bg-green-700"
                onClick={resetForm}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </Button>
            </DialogTrigger>
            <DialogContent className="!w-[min(98vw,1400px)] !max-w-[1400px] p-0 gap-0 overflow-hidden flex flex-col" style={{ color: '#0f172a', width: 'min(94vw, 800px)', maxWidth: '800px', height: 'min(92vh, calc(100vh - 48px))', maxHeight: 'min(920px, calc(100vh - 48px))' }}>
              <DialogHeader className="px-3 sm:px-6 py-3 border-b shrink-0" style={{ background: 'linear-gradient(to right, #2563eb, #0891b2)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      {editingProduct ? 'âœï¸ Editar Producto' : 'âž• Nuevo Producto al Inventario'}
                    </DialogTitle>
                    <DialogDescription className="text-white/95 text-sm mt-0.5 ml-10">
                      {editingProduct
                        ? 'Actualiza la informaciÃ³n del producto en el sistema'
                        : 'Registra un nuevo producto con toda su informaciÃ³n'}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/20 text-white border-white/30 px-3 py-0.5 text-xs">
                      EsMark System
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)' }}>
                <form id="product-form" onSubmit={handleSubmit} className="space-y-5 w-full h-full" noValidate>
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {stepLabels.map((label, index) => {
                      const stepNumber = index + 1;
                      const isActive = currentStep === stepNumber;
                      const isDone = currentStep > stepNumber;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setCurrentStep(stepNumber)}
                          className={`rounded-lg border px-3 py-2 text-left transition-all ${
                            isActive
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : isDone
                              ? 'border-emerald-300 bg-emerald-50'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-300 text-slate-700'
                              }`}
                            >
                              {isDone ? <Check className="w-3 h-3" /> : stepNumber}
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-slate-800">{label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {success && (
                  <Alert className="bg-linear-to-r from-green-500 to-emerald-600 border-green-600 shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                    <AlertDescription className="text-white font-semibold">{success}</AlertDescription>
                  </Alert>
                )}
                {error && (
                  <Alert className="bg-linear-to-r from-red-500 to-rose-600 border-red-600 shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                    <AlertDescription className="text-white font-semibold">{error}</AlertDescription>
                  </Alert>
                )}

                {/* InformaciÃ³n BÃ¡sica */}
                <>
                  {/* SecciÃ³n: Datos Principales */}
                  {currentStep === 1 && (
                    <Card className="border border-slate-200 bg-white shadow-sm">
                      <CardHeader className="pb-3 bg-linear-to-r from-slate-50 to-blue-50 border-b border-slate-100">
                        <CardTitle className="text-base flex items-center gap-2 text-red-900">
                          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs">ðŸ“</span>
                          </div>
                          InformaciÃ³n Principal del Producto
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-3 pb-4">
                        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
                          Completa primero los datos esenciales del producto, luego define precio, stock e imagen.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="space-y-1 md:col-span-3 lg:col-span-2">
                            <Label htmlFor="code" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                              <span>CÃ³digo *</span>
                              <span className="text-xs font-normal text-green-600">âœ¨ Auto-generado</span>
                            </Label>
                            <Input
                              id="code"
                              value={code}
                              readOnly
                              required
                              className="h-10 border-2 border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                              placeholder="Se genera del nombre..."
                            />
                          </div>
                          <div className="space-y-1 md:col-span-5 lg:col-span-4">
                            <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Nombre del Producto *</Label>
                            <Input
                              id="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              className="h-10 border-2 border-gray-300 focus:border-red-500"
                              placeholder="Nombre descriptivo"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-4 lg:col-span-3">
                            <Label htmlFor="category" className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                              <span>CategorÃ­a *</span>
                              <span className="text-xs font-normal text-blue-600">ðŸ’¡ Agrega mÃ¡s en Ajustes</span>
                            </Label>
                            <Select value={category} onValueChange={setCategory} required>
                              <SelectTrigger className="h-10 border-2 border-gray-300 focus:border-red-500">
                                <SelectValue placeholder="Selecciona una categorÃ­a" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {availableCategories.map((categoryOption) => (
                                  <SelectItem key={categoryOption} value={categoryOption}>
                                    {categoryOption}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1 md:col-span-3 lg:col-span-3">
                            <Label htmlFor="style" className="text-xs font-semibold text-gray-700">Estilo</Label>
                            <Input
                              id="style"
                              value={style}
                              onChange={(e) => setStyle(e.target.value)}
                              className="h-10 border-2 border-gray-300 focus:border-blue-500"
                              placeholder="Opcional"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-4 lg:col-span-3">
                            <Label className="text-xs font-semibold text-gray-700 flex items-center justify-between">
                              <span>
                                Color
                                {(() => {
                                  const selected = getSelectedColors(color);
                                  return selected.length > 0
                                    ? ` (${selected.length} seleccionado${selected.length > 1 ? 's' : ''})`
                                    : '';
                                })()}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-normal text-blue-600">ðŸ’¡ Agrega mÃ¡s en Ajustes</span>
                                {color && (
                                  <button
                                    type="button"
                                    onClick={() => setColor('')}
                                    className="text-[10px] text-red-500 hover:text-red-700 font-normal"
                                  >
                                    âœ• Limpiar
                                  </button>
                                )}
                              </div>
                            </Label>
                            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-inner">
                              <div className="flex flex-wrap gap-3">
                                {availableColors.map((colorOption) => {
                                  const selectedColors = getSelectedColors(color);
                                  const isSelected = selectedColors.includes(colorOption);
                                  const dotColor = COLOR_DOT_MAP[colorOption.toLowerCase()] ?? '#94a3b8';
                                  const isLight = ['blanco', 'beige', 'amarillo'].includes(colorOption.toLowerCase());

                                  return (
                                    <button
                                      key={colorOption}
                                      type="button"
                                      title={colorOption}
                                      onClick={() => {
                                        const next = isSelected
                                          ? selectedColors.filter((c) => c !== colorOption)
                                          : [...selectedColors, colorOption];
                                        setColor(next.join(', '));
                                      }}
                                      className={`group relative flex flex-col items-center gap-1 transition-all duration-150 ${
                                        isSelected ? 'scale-110' : 'hover:scale-105'
                                      }`}
                                    >
                                      {/* Swatch circle */}
                                      <span
                                        className={`flex items-center justify-center w-9 h-9 rounded-full shadow-md transition-all duration-150 ${
                                          isSelected
                                            ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg'
                                            : isLight
                                            ? 'ring-1 ring-gray-300 hover:ring-2 hover:ring-blue-300'
                                            : 'hover:ring-2 hover:ring-blue-300 hover:ring-offset-1'
                                        }`}
                                        style={{ backgroundColor: dotColor }}
                                      >
                                        {isSelected && (
                                          <Check
                                            className={`w-4 h-4 ${isLight ? 'text-gray-700' : 'text-white'}`}
                                            strokeWidth={3}
                                          />
                                        )}
                                      </span>
                                      {/* Label */}
                                      <span className={`text-[10px] font-medium leading-none ${
                                        isSelected ? 'text-blue-700' : 'text-slate-500'
                                      }`}>
                                        {colorOption}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {color && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {getSelectedColors(color).map((c) => {
                                  const dc = COLOR_DOT_MAP[c.toLowerCase()] ?? '#94a3b8';
                                  return (
                                    <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                                      <span className="w-2.5 h-2.5 rounded-full border border-blue-300 shrink-0" style={{ backgroundColor: dc }} />
                                      {c}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* GuÃ­a de categorÃ­as */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
                            <p className="text-blue-800"><strong>ðŸ“ Banner/Stickers/PVC:</strong> Precio por medidas</p>
                          </div>
                          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-center">
                            <p className="text-purple-800"><strong>ðŸ‘• Camisa/Mameluco:</strong> Tallas + precio calculado</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                            <p className="text-green-800"><strong>ðŸ’° Otros:</strong> Precio fijo unitario</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                    
                    {/* SecciÃ³n: Precio, Stock e Imagen en una fila */}
                    {currentStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
                      {/* Precio para productos sin cÃ¡lculo de medidas */}
                      {hasPrice && (
                        <Card className="border border-green-200 bg-white shadow-sm h-full md:col-span-1">
                          <CardHeader className="pb-2 bg-linear-to-r from-green-50 to-emerald-50">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-900">
                              <div className="w-6 h-6 bg-green-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">ðŸ’°</span>
                              </div>
                              Precio del Producto
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 pb-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="price" className="text-xs font-bold text-green-700">
                                Precio Unitario (L.) *
                              </Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={price}
                                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                                className="border-2 border-green-400 text-xl h-14 text-center font-bold focus:border-green-600"
                                placeholder="0.00"
                              />
                              <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                                âœ… Se aplicarÃ¡ automÃ¡ticamente
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Info para productos con cÃ¡lculo */}
                      {(needsMeasurements || hasSizesCategory) && (
                        <Card className="border border-blue-200 bg-white shadow-sm h-full md:col-span-1">
                          <CardHeader className="pb-2 bg-linear-to-r from-blue-50 to-cyan-50">
                            <CardTitle className="text-sm flex items-center gap-2 text-blue-900">
                              <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">â„¹ï¸</span>
                              </div>
                              Precio Calculado
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 pb-3">
                            <div className="bg-linear-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-lg p-3">
                              <p className="text-xs text-blue-900 font-medium">
                                {needsMeasurements && (
                                  <>ðŸ“ El precio se calcula segÃºn medidas en Ajustes</>
                                )}
                                {hasSizesCategory && (
                                  <>ðŸ‘• Precio = Base + AplicaciÃ³n + DiseÃ±o</>
                                )}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Stock solo para productos SIN tallas */}
                      {!hasSizesCategory && (
                        <Card className="border border-yellow-200 bg-white shadow-sm h-full md:col-span-1">
                          <CardHeader className="pb-2 bg-linear-to-r from-yellow-50 to-amber-50">
                            <CardTitle className="text-sm flex items-center gap-2 text-yellow-900">
                              <div className="w-6 h-6 bg-yellow-500 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs">ðŸ“¦</span>
                              </div>
                              Control de Stock
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-3 pb-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label htmlFor="stock" className="text-xs font-semibold text-gray-700">Stock Actual *</Label>
                                <Input
                                  id="stock"
                                  type="number"
                                  value={stock}
                                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                                  required
                                  className="h-12 text-xl text-center font-bold border-2 border-yellow-400 focus:border-yellow-600"
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="minStock" className="text-xs font-semibold text-gray-700">Stock MÃ­nimo *</Label>
                                <Input
                                  id="minStock"
                                  type="number"
                                  value={minStock}
                                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                                  required
                                  className="h-12 text-xl text-center font-bold border-2 border-amber-400 focus:border-amber-600"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      
                      <Card className="border border-indigo-200 bg-white shadow-sm h-full md:col-span-1">
                        <CardHeader className="pb-2 bg-linear-to-r from-indigo-50 to-purple-50">
                          <CardTitle className="text-sm flex items-center gap-2 text-indigo-900">
                            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-white" />
                            </div>
                            Foto del Producto
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 pb-4">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-40 h-40 rounded-xl bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-2 border-indigo-300 shadow-md relative">
                              {processingImage ? (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-white text-xs font-bold">Procesando...</span>
                                  </div>
                                </div>
                              ) : imagePreview ? (
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-14 h-14 text-gray-400" />
                              )}
                            </div>
                            <Input
                              id="productImage"
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              disabled={processingImage}
                              className="cursor-pointer h-10 text-sm border-2 border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-indigo-700 text-center">
                              {processingImage ? 'â³ Procesando imagen...' : 'ðŸ“· MÃ¡x 2MB (JPG, PNG)'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    )}

                    {/* Tallas disponibles - solo para Camisa o Mameluco */}
                    {hasSizesCategory && currentStep === 2 && (
                      <div className="space-y-3">
                        {getSelectedColors(color).length === 0 && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-900">Primero selecciona al menos un color en el Paso 1.</p>
                            <p className="text-xs text-amber-700 mt-1">Luego podrÃ¡s capturar tallas y stock para cada color por separado.</p>
                          </div>
                        )}

                        {/* Header compacto */}
                        <div className="rounded-xl px-4 py-3 border border-indigo-200 bg-indigo-50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                              <Package className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <h4 className="text-indigo-950 text-sm font-bold leading-tight">Inventario por Tallas</h4>
                              <p className="text-indigo-700 text-xs">Control de stock por talla y color</p>
                            </div>
                          </div>
                          {getSelectedColors(color).length > 0 && (
                            <div className="flex items-center gap-3 text-center">
                              <div>
                                <p className="text-indigo-900 font-bold text-base leading-none">{getSelectedColors(color).length}</p>
                                <p className="text-indigo-600 text-xs">colores</p>
                              </div>
                              <div className="w-px h-8 bg-indigo-200" />
                              <div>
                                <p className="text-indigo-900 font-bold text-base leading-none">{getTotalStockFromSizes()}</p>
                                <p className="text-indigo-600 text-xs">unidades</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {getSelectedColors(color).length > 0 && (
                          <div className="bg-white rounded-xl px-4 py-3 border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-sm font-semibold text-blue-900">Color en ediciÃ³n</Label>
                              {activeInventoryColor && (
                                <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                  Editando: {activeInventoryColor}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {getSelectedColors(color).map((colorKey) => {
                                const dotColor = COLOR_DOT_MAP[colorKey.toLowerCase()] ?? '#94a3b8';
                                const isActive = activeInventoryColor === colorKey;
                                const rows = colorSizeInventories[colorKey] || [];
                                const totalColorStock = rows.reduce((sum, inv) => sum + inv.stock, 0);
                                return (
                                  <button
                                    key={colorKey}
                                    type="button"
                                    onClick={() => setActiveInventoryColor(colorKey)}
                                    className={`px-3 h-8 rounded-full border-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                                      isActive
                                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300'
                                    }`}
                                  >
                                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: dotColor }} />
                                    <span>{colorKey}</span>
                                    <span className="text-[10px] opacity-80">({totalColorStock})</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Selector de tallas estÃ¡ndar */}
                        <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold text-gray-800">
                              Tallas EstÃ¡ndar{activeInventoryColor ? ` (${activeInventoryColor})` : ''}
                            </Label>
                            <span className="text-xs text-gray-500">{sizeInventories.length} de 7 agregadas</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1.5">
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => {
                              const alreadyAdded = sizeInventories.some(si => si.size === size);
                              return (
                                <button
                                  key={size}
                                  type="button"
                                  disabled={alreadyAdded || !activeInventoryColor}
                                  onClick={() => {
                                    if (!availableSizes.includes(size)) {
                                      setAvailableSizes([...availableSizes, size]);
                                    }
                                    if (!sizeInventories.some(si => si.size === size)) {
                                      setSizeInventories([...sizeInventories, { size, stock: 0, minStock: 5 }]);
                                    }
                                  }}
                                  className={`h-9 rounded-lg text-xs font-bold border-2 transition-all ${
                                    alreadyAdded
                                      ? 'bg-emerald-600 text-white border-emerald-700 cursor-default'
                                      : !activeInventoryColor
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-700'
                                  }`}
                                >
                                  {alreadyAdded ? 'âœ“ ' : ''}{size}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Talla personalizada */}
                        <div className="bg-white rounded-xl px-4 py-3 border border-violet-200">
                          <Label className="text-sm font-semibold text-violet-900 mb-2 block">+ Talla personalizada</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Ej: 3XL, 4-6 aÃ±osâ€¦"
                              value={customSize}
                              onChange={(e) => setCustomSize(e.target.value)}
                              disabled={!activeInventoryColor}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (customSize.trim()) {
                                    const newSize = customSize.trim().toUpperCase();
                                    if (!availableSizes.includes(newSize)) setAvailableSizes([...availableSizes, newSize]);
                                    if (!sizeInventories.some(si => si.size === newSize)) setSizeInventories([...sizeInventories, { size: newSize, stock: 0, minStock: 5 }]);
                                    setCustomSize('');
                                  }
                                }
                              }}
                              className="h-9 text-sm border-violet-300 focus:border-violet-500"
                            />
                            <button
                              type="button"
                              disabled={!activeInventoryColor}
                              onClick={() => {
                                if (customSize.trim()) {
                                  const newSize = customSize.trim().toUpperCase();
                                  if (!availableSizes.includes(newSize)) setAvailableSizes([...availableSizes, newSize]);
                                  if (!sizeInventories.some(si => si.size === newSize)) setSizeInventories([...sizeInventories, { size: newSize, stock: 0, minStock: 5 }]);
                                  setCustomSize('');
                                }
                              }}
                              className="h-9 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:text-slate-600 text-white text-sm font-semibold rounded-lg whitespace-nowrap"
                            >
                              Agregar
                            </button>
                          </div>
                        </div>

                        {/* Lista de tallas configuradas */}
                        {sizeInventories.length > 0 && (
                          <div className="space-y-2">
                            {/* Acciones rÃ¡pidas inline */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">Llenar todo con:</span>
                              <button
                                type="button"
                                onClick={() => setSizeInventories(sizeInventories.map(inv => ({ ...inv, stock: 10, minStock: 5 })))}
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md"
                              >10 c/u</button>
                              <button
                                type="button"
                                onClick={() => setSizeInventories(sizeInventories.map(inv => ({ ...inv, stock: 20, minStock: 10 })))}
                                className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md"
                              >20 c/u</button>
                              <span className="ml-auto text-xs font-semibold text-emerald-700">
                                Total: {getTotalStockFromSizes()} uds
                              </span>
                            </div>

                            {/* Tarjetas compactas por talla */}
                            <div className="grid grid-cols-2 gap-2">
                              {sizeInventories.map((sizeInv) => {
                                const statusColor = sizeInv.stock === 0
                                  ? 'bg-red-600'
                                  : sizeInv.stock <= sizeInv.minStock
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600';
                                return (
                                  <div
                                    key={sizeInv.size}
                                    className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-2"
                                  >
                                    {/* Badge talla */}
                                    <div className={`w-10 h-10 ${statusColor} rounded-lg flex items-center justify-center shrink-0`}>
                                      <span className="text-white text-xs font-black">{sizeInv.size}</span>
                                    </div>
                                    {/* Inputs */}
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-xs text-gray-500 font-medium block mb-0.5">Stock actual</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={sizeInv.stock}
                                          onChange={(e) => updateSizeInventory(sizeInv.size, 'stock', parseInt(e.target.value) || 0)}
                                          className="h-8 text-sm font-semibold border border-blue-300 focus:border-blue-500 px-2"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500 font-medium block mb-0.5">MÃ­nimo</label>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={sizeInv.minStock}
                                          onChange={(e) => updateSizeInventory(sizeInv.size, 'minStock', parseInt(e.target.value) || 0)}
                                          className="h-8 text-sm font-semibold border border-amber-300 focus:border-amber-500 px-2"
                                        />
                                      </div>
                                    </div>
                                    {/* Eliminar */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSizeInventories(sizeInventories.filter(si => si.size !== sizeInv.size));
                                        setAvailableSizes(availableSizes.filter(s => s !== sizeInv.size));
                                      }}
                                      className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentStep === 2 && (
                      <Card className="border border-emerald-200 bg-white shadow-sm">
                        <CardHeader className="bg-linear-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                          <CardTitle className="text-base text-emerald-900 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Resumen antes de guardar
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 pb-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">CÃ³digo</p>
                              <p className="font-semibold text-slate-800">{code || 'Sin cÃ³digo'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">Nombre</p>
                              <p className="font-semibold text-slate-800">{name || 'Sin nombre'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">CategorÃ­a</p>
                              <p className="font-semibold text-slate-800">{category || 'Sin categorÃ­a'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">Color / Estilo</p>
                              <p className="font-semibold text-slate-800">{color || 'Sin color'} / {style || 'Sin estilo'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">Precio</p>
                              <p className="font-semibold text-slate-800">{hasPrice ? `L. ${price.toFixed(2)}` : 'Calculado por configuraciÃ³n'}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                              <p className="text-slate-500 text-xs">Stock</p>
                              <p className="font-semibold text-slate-800">{hasSizesCategory ? `${getTotalStockFromSizes()} (por tallas)` : stock}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                </>

                </form>
              </div>
              
              {/* Footer fijo FUERA del scroll con botones */}
              <div className="px-3 sm:px-6 py-3 border-t bg-white flex justify-between items-center shadow-lg shrink-0">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Paso {currentStep} de 2</span> â€¢ {stepLabels[currentStep - 1]}
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      // NO llamar resetForm() aquÃ­ - el Dialog onOpenChange lo harÃ¡
                    }}
                    className="h-10 px-6 border-2 border-gray-300 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setError('');
                        setCurrentStep((prev) => Math.max(prev - 1, 1));
                      }}
                      className="h-10 px-6 border-2 border-slate-300 hover:bg-slate-100"
                    >
                      Anterior
                    </Button>
                  )}
                  {currentStep < 2 ? (
                    <Button
                      type="button"
                      onClick={goToNextStep}
                        className="h-10 px-8 bg-none bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                    >
                      Siguiente
                    </Button>
                  ) : (
                  <Button 
                    type="button"
                    onClick={async (e) => {
                      if (loading) {
                        return;
                      }
                      
                      // Crear evento sintÃ©tico de submit para el formulario
                      const syntheticEvent = {
                        preventDefault: () => {},
                        stopPropagation: () => {},
                      } as React.FormEvent;
                      
                      await handleSubmit(syntheticEvent);
                    }}
                    disabled={loading}
                    className="h-10 px-8 bg-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'â³ Guardando...' : editingProduct ? 'âœï¸ Actualizar Producto' : 'âœ… Guardar Producto'}
                  </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por cÃ³digo, nombre o categorÃ­a..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-sm">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">
            Productos ({displayProducts.length})
            {filteredProducts.length !== displayProducts.length && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                agrupados desde {filteredProducts.length} registros
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1">
          {loadingProducts ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700">Cargando productos...</p>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700">No se encontraron productos</p>
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <ListView
                  products={displayProducts}
                  onSelectProduct={handleSelectProduct}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getStockStatus={getStockStatus}
                />
              )}
              {viewMode === 'grid' && (
                <GridView
                  products={displayProducts}
                  onSelectProduct={handleSelectProduct}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getStockStatus={getStockStatus}
                />
              )}
              {viewMode === 'cards' && (
                <CardsView
                  products={displayProducts}
                  onSelectProduct={handleSelectProduct}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getStockStatus={getStockStatus}
                />
              )}
              {viewMode === 'compact' && (
                <CompactView
                  products={displayProducts}
                  onSelectProduct={handleSelectProduct}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  getStockStatus={getStockStatus}
                />
              )}

            </>
          )}
        </CardContent>
      </Card>

      <ProductPreviewModal
        product={selectedPreviewProduct}
        onClose={() => setSelectedPreviewProduct(null)}
        onEdit={(product) => {
          setSelectedPreviewProduct(null);
          handleEdit(product);
        }}
      />

      {/* Calculate Stickers Dialog */}
      <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Total de Stickers en Inventario</DialogTitle>
            <DialogDescription>
              Resumen de stickers por tipo y total general
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(stickerTotals).map(([name, count]: [string, any]) => {
              if (name === 'TOTAL_GENERAL') return null;
              return (
                <div key={name} className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">{name}</span>
                  <Badge className="bg-blue-600">{count} unidades</Badge>
                </div>
              );
            })}
            {stickerTotals.TOTAL_GENERAL !== undefined && (
              <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4 mt-4">
                <span className="font-bold text-green-900">TOTAL GENERAL</span>
                <Badge className="bg-green-600 text-lg px-4 py-1">
                  {stickerTotals.TOTAL_GENERAL} unidades
                </Badge>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
