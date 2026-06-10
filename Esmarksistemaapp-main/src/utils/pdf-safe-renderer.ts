/**
 * Utilidad para renderizar PDFs de manera segura sin errores de memoria
 * Previene el error: DataCloneError de html2canvas
 */

// Configuración de límites para prevenir errores de memoria
const MAX_IMAGE_SIZE = 2048; // px
const MAX_ATTACHMENTS = 10; // Reducido de 20 a 10
const MAX_PRODUCTS = 30; // Reducido de 50 a 30
const MAX_ORDERS_IN_REPORT = 20; // NUEVO: Límite crítico para reportes

/**
 * Optimiza una imagen para reducir el uso de memoria
 */
export async function optimizeImage(
  imageUrl: string,
  maxWidth: number = MAX_IMAGE_SIZE,
  maxHeight: number = MAX_IMAGE_SIZE
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Crear canvas y redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto 2D'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a data URL con calidad reducida
        const optimizedUrl = canvas.toDataURL('image/jpeg', 0.7); // Reducida de 0.8 a 0.7
        resolve(optimizedUrl);
        
        // Limpiar
        canvas.width = 0;
        canvas.height = 0;
      } catch (error) {
        console.error('Error optimizando imagen:', error);
        // Si falla la optimización, devolver la URL original
        resolve(imageUrl);
      }
    };
    
    img.onerror = () => {
      console.error('Error cargando imagen para optimizar');
      resolve(imageUrl); // Devolver URL original en caso de error
    };
    
    img.src = imageUrl;
  });
}

/**
 * Limpia y optimiza un objeto de datos antes de ser procesado por html2canvas o PDF generators
 */
export function sanitizeDataForPDF(data: any): any {
  const sanitized = { ...data };
  
  // Limitar archivos adjuntos
  if (sanitized.attachments && Array.isArray(sanitized.attachments)) {
    if (sanitized.attachments.length > MAX_ATTACHMENTS) {
      console.warn(`⚠️ Limitando archivos adjuntos de ${sanitized.attachments.length} a ${MAX_ATTACHMENTS}`);
      sanitized.attachments = sanitized.attachments.slice(0, MAX_ATTACHMENTS);
    }
  }
  
  // Limitar productos
  if (sanitized.items && Array.isArray(sanitized.items)) {
    if (sanitized.items.length > MAX_PRODUCTS) {
      console.warn(`⚠️ Limitando productos de ${sanitized.items.length} a ${MAX_PRODUCTS}`);
      sanitized.items = sanitized.items.slice(0, MAX_PRODUCTS);
    }
  }
  
  // Limitar productos (alias)
  if (sanitized.products && Array.isArray(sanitized.products)) {
    if (sanitized.products.length > MAX_PRODUCTS) {
      console.warn(`⚠️ Limitando productos de ${sanitized.products.length} a ${MAX_PRODUCTS}`);
      sanitized.products = sanitized.products.slice(0, MAX_PRODUCTS);
    }
  }
  
  // 🔥 CRÍTICO: Limitar listas de pedidos en reportes (CAUSA PRINCIPAL DEL ERROR)
  if (sanitized.orders && sanitized.orders.list && Array.isArray(sanitized.orders.list)) {
    if (sanitized.orders.list.length > MAX_ORDERS_IN_REPORT) {
      console.warn(`🔥 CRÍTICO: Limitando pedidos en reporte de ${sanitized.orders.list.length} a ${MAX_ORDERS_IN_REPORT}`);
      sanitized.orders.list = sanitized.orders.list.slice(0, MAX_ORDERS_IN_REPORT);
    }
  }
  
  return sanitized;
}

/**
 * Ejecuta una función de generación de PDF con manejo de errores de memoria
 */
export async function safeGeneratePDF<T>(
  generatorFn: (data: T) => Promise<void> | void,
  data: T,
  options?: {
    onError?: (error: Error) => void;
    sanitize?: boolean;
  }
): Promise<boolean> {
  try {
    const processedData = options?.sanitize !== false 
      ? sanitizeDataForPDF(data)
      : data;
    
    await generatorFn(processedData);
    return true;
  } catch (error: any) {
    console.error('❌ Error generando PDF:', error);
    
    // Detectar errores de memoria específicos
    if (
      error.name === 'DataCloneError' ||
      error.message?.includes('out of memory') ||
      error.message?.includes('cannot be cloned')
    ) {
      const memoryError = new Error(
        '⚠️ El documento tiene demasiados elementos. Algunos elementos han sido omitidos automáticamente. Si el error persiste, contacta al soporte técnico.'
      );
      
      if (options?.onError) {
        options.onError(memoryError);
      } else {
        alert(memoryError.message);
      }
    } else {
      if (options?.onError) {
        options.onError(error);
      } else {
        alert(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
      }
    }
    
    return false;
  }
}

/**
 * Limpia la memoria después de operaciones pesadas
 */
export function cleanupMemory(): void {
  // Forzar garbage collection (solo funciona en algunos navegadores con flags especiales)
  if (typeof (window as any).gc === 'function') {
    try {
      (window as any).gc();
    } catch (e) {
      // Ignorar si gc no está disponible
    }
  }
  
  // Limpiar caches de imágenes
  const images = document.querySelectorAll('img[data-pdf-temp]');
  images.forEach(img => img.remove());
}

/**
 * Configuración global para prevenir errores de memoria en html2canvas
 */
export const HTML2CANVAS_SAFE_OPTIONS = {
  scale: 0.8, // Reducido de 1 a 0.8
  useCORS: true,
  allowTaint: false,
  logging: false,
  imageTimeout: 5000,
  removeContainer: true,
  backgroundColor: '#ffffff',
  // Limitar tamaño máximo del canvas
  width: 1000, // Reducido de 1200 a 1000
  windowWidth: 1000,
  onclone: (clonedDoc: Document) => {
    // Optimizar el documento clonado antes de renderizar
    const clonedImages = clonedDoc.querySelectorAll('img');
    clonedImages.forEach((img: any) => {
      // Limitar tamaño de imágenes
      if (img.naturalWidth > MAX_IMAGE_SIZE || img.naturalHeight > MAX_IMAGE_SIZE) {
        const ratio = Math.min(
          MAX_IMAGE_SIZE / img.naturalWidth,
          MAX_IMAGE_SIZE / img.naturalHeight
        );
        img.style.width = `${img.naturalWidth * ratio}px`;
        img.style.height = `${img.naturalHeight * ratio}px`;
      }
    });
  },
};
