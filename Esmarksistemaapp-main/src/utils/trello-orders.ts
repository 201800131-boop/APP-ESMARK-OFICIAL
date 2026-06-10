// 🎯 SISTEMA DE PEDIDOS 100% EN TRELLO
// Los pedidos se guardan únicamente en Trello como tarjetas
// No se usa localStorage para pedidos
import { logActivity } from './api';
import { projectId, publicAnonKey } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/esmark-trello`;
const OFFLINE_ORDERS_CACHE_KEY = 'trello_orders_offline_cache';

function isOfflineMode(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function getOfflineOrdersCache(): any[] {
  try {
    const raw = localStorage.getItem(OFFLINE_ORDERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 🔍 Función de diagnóstico del servidor
export async function checkServerHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    console.log('🏥 Verificando salud del servidor...');
    console.log('🌐 URL del servidor:', API_URL);
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return { 
        ok: false, 
        error: `Servidor respondió con error ${response.status}` 
      };
    }
    
    console.log('✅ Servidor operativo');
    return { ok: true };
  } catch (error: any) {
    console.error('❌ Error verificando servidor:', error);
    return { 
      ok: false, 
      error: error.message || 'No se pudo conectar al servidor' 
    };
  }
}

interface TrelloConfig {
  api_key: string;
  token: string;
  board_id: string;
  default_list_id?: string;
}

interface OrderData {
  number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  items: any[];
  status: string;
  total: number;
  subtotal: number;
  isv: number;
  discount: number;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  due_date?: string;
  due_time?: string;
  notes?: string;
  attached_photos?: string[];
  attached_documents?: Array<{name: string, data: string, type: string}>;
  doc_number?: string;
  is_special_order?: boolean;
  special_order_reason?: string;
  discount_authorized_by?: string;
  discount_reason?: string;
  created_at?: string;
  updated_at?: string;
  delivered_at?: string;
  delivered_by?: string;
}

// Obtener configuración de Trello
function getTrelloConfig(): TrelloConfig | null {
  try {
    const settingsStr = localStorage.getItem('esmark_settings');
    if (!settingsStr) return null;

    const settings = JSON.parse(settingsStr);
    
    // Solo verificar board_id - las credenciales se manejan en el servidor
    if (!settings.trello_board_id) {
      return null;
    }

    let prefs: any = null;
    try {
      const prefsStr = localStorage.getItem('trello_preferences');
      prefs = prefsStr ? JSON.parse(prefsStr) : null;
    } catch (error) {
      prefs = null;
    }

    const defaultListId =
      prefs?.listId ||
      settings.trello_default_list_id ||
      settings.trello_list_production ||
      '';

    return {
      api_key: '',
      token: '',
      board_id: settings.trello_board_id,
      default_list_id: defaultListId
    };
  } catch (error) {
    console.error('Error obteniendo configuración de Trello:', error);
    return null;
  }
}

// Verificar si Trello está configurado
export function isTrelloConfigured(): boolean {
  return getTrelloConfig() !== null;
}

// Adjuntar archivo a una tarjeta de Trello
async function attachFileToCard(cardId: string, base64Data: string, fileName: string, config: TrelloConfig): Promise<void> {
  try {
    console.log(`📤 Iniciando subida de archivo: ${fileName}`);
    
    // Convertir base64 a Blob
    const base64Content = base64Data.split(',')[1] || base64Data;
    const mimeType = base64Data.split(',')[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
    
    console.log(`📝 MIME Type detectado: ${mimeType}`);
    console.log(`📊 Tamaño base64: ${base64Content.length} caracteres`);
    
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    console.log(`📦 Blob creado: ${blob.size} bytes (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // ⚠️ LÍMITE DE TRELLO: 10 MB por archivo
    if (blob.size > 10 * 1024 * 1024) {
      throw new Error(`El archivo ${fileName} excede el límite de 10 MB de Trello (tamaño: ${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    // Crear FormData
    const formData = new FormData();
    formData.append('file', blob, fileName);
    
    // Subir archivo a Trello usando el servidor proxy
    console.log(`🌐 Enviando a servidor proxy: /trello/card/${cardId}/attachment`);
    
    const response = await fetch(`${API_URL}/trello/card/${cardId}/attachment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `Error ${response.status}`;
      console.error(`❌ Error response: ${errorMsg}`);
      throw new Error(`Error al adjuntar archivo: ${errorMsg}`);
    }
    
    const { attachment: result } = await response.json();
    console.log(`✅ Archivo adjuntado exitosamente: ${fileName} (ID: ${result.id})`);
  } catch (error) {
    console.error(`❌ Error adjuntando archivo ${fileName}:`, error);
    throw error;
  }
}

// Mapear estado de pedido a lista de Trello
function getListIdForStatus(status: string, lists: any[]): string | null {
  const statusLower = status.toLowerCase();
  
  for (const list of lists) {
    const listName = list.name.toLowerCase();
    
    // Estados principales (nuevos)
    if (statusLower === 'pedido ingresado' && listName.includes('pedido ingresado')) return list.id;
    if (statusLower === 'pendiente de información' && listName.includes('pendiente de información')) return list.id;
    if (statusLower === 'diseño' && listName === 'diseño') return list.id;
    if (statusLower === 'diseño en proceso' && listName.includes('diseño en proceso')) return list.id;
    if (statusLower === 'esperando aprobación' && listName.includes('esperando aprobación')) return list.id;
    if (statusLower === 'en producción' && listName.includes('en producción')) return list.id;
    if (statusLower === 'control de calidad' && listName.includes('control de calidad')) return list.id;
    if (statusLower === 'listo para entrega' && listName.includes('listo para entrega')) return list.id;
    if (statusLower === 'entregado' && (listName.includes('entregado') || listName.includes('entregados de'))) return list.id;
    if (statusLower === 'cancelado' && listName.includes('cancelado')) return list.id;
    
    // Estados legacy de Trello (mantener compatibilidad)
    if (statusLower === 'pendiente de confirmación' && listName.includes('pendiente de confirmación')) return list.id;
    if (statusLower === 'revisión de área' && listName.includes('revisión de área')) return list.id;
    if (statusLower === 'diseño finalizado' && listName.includes('diseño finalizado')) return list.id;
    if (statusLower === 'pedido listo para impresión' && listName.includes('pedido listo para impresión')) return list.id;
    if (statusLower === 'impresión en proceso' && listName.includes('impresión en proceso')) return list.id;
    if (statusLower === 'corte en proceso' && listName.includes('corte en proceso')) return list.id;
    if (statusLower === 'impresión y corte finalizada' && listName.includes('impresión y corte finalizada')) return list.id;
    if (statusLower === 'pedido listo para sublimación' && listName.includes('pedido listo para sublimacin')) return list.id;
    if (statusLower === 'sublimación en proceso' && listName.includes('sublimación en proceso')) return list.id;
    if (statusLower === 'sublimación terminada' && listName.includes('sublimación terminada')) return list.id;
    if (statusLower === 'corte pvc, acrílico' && (listName.includes('corte pvc') || listName.includes('corte acrílico'))) return list.id;
    if (statusLower === 'corte finalizado' && listName.includes('corte finalizado')) return list.id;
    if (statusLower === 'instalación' && listName.includes('instalación')) return list.id;
  }
  
  // Si no se encuentra, usar la primera lista
  return lists.length > 0 ? lists[0].id : null;
}

// Mapear lista de Trello a estado de pedido
function getStatusFromListId(listId: string, lists: any[]): string {
  const list = lists.find(l => l.id === listId);
  if (!list) return 'PEDIDO INGRESADO';
  
  const listName = list.name.toLowerCase();
  
  // Estados principales (nuevos) - Mapeo según los estados del sistema
  if (listName.includes('pedido ingresado')) return 'PEDIDO INGRESADO';
  if (listName.includes('pendiente de información')) return 'PENDIENTE DE INFORMACIÓN';
  if (listName === 'diseño') return 'DISEÑO';
  if (listName.includes('diseño en proceso')) return 'DISEÑO EN PROCESO';
  if (listName.includes('esperando aprobación')) return 'ESPERANDO APROBACIÓN';
  if (listName.includes('en producción')) return 'EN PRODUCCIÓN';
  if (listName.includes('control de calidad')) return 'CONTROL DE CALIDAD';
  if (listName.includes('listo para entrega')) return 'LISTO PARA ENTREGA';
  if (listName.includes('entregado') || listName.includes('entregados de')) return 'ENTREGADO';
  if (listName.includes('cancelado')) return 'CANCELADO';
  
  // Estados legacy de Trello (mantener compatibilidad)
  if (listName.includes('pendiente de confirmación')) return 'PENDIENTE DE CONFIRMACIÓN';
  if (listName.includes('revisión de área')) return 'REVISIÓN DE ÁREA';
  if (listName.includes('diseño finalizado')) return 'DISEÑO FINALIZADO';
  if (listName.includes('pedido listo para impresión')) return 'PEDIDO LISTO PARA IMPRESIÓN';
  if (listName.includes('impresión en proceso')) return 'IMPRESIÓN EN PROCESO';
  if (listName.includes('corte en proceso')) return 'CORTE EN PROCESO';
  if (listName.includes('impresión y corte finalizada')) return 'IMPRESIÓN Y CORTE FINALIZADA';
  if (listName.includes('pedido listo para sublimación')) return 'PEDIDO LISTO PARA SUBLIMACIÓN';
  if (listName.includes('sublimación en proceso')) return 'SUBLIMACIÓN EN PROCESO';
  if (listName.includes('sublimación terminada')) return 'SUBLIMACIÓN TERMINADA';
  if (listName.includes('corte pvc') || listName.includes('corte acrílico')) return 'CORTE PVC, ACRÍLICO';
  if (listName.includes('corte finalizado')) return 'CORTE FINALIZADO';
  if (listName.includes('instalación')) return 'INSTALACIÓN';
  
  // Fallback
  return 'PEDIDO INGRESADO';
}

// Obtener listas del tablero
async function getBoardLists(config: TrelloConfig): Promise<any[]> {
  const response = await fetch(`${API_URL}/trello/lists/${config.board_id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error al obtener listas: ${response.status}`);
  }
  
  const data = await response.json();
  const lists = Array.isArray(data) ? data : Array.isArray(data?.lists) ? data.lists : [];
  try {
    localStorage.setItem('esmark_trello_lists_cache', JSON.stringify(lists));
  } catch {
    // no-op
  }
  return lists;
}

// Convertir datos de pedido a formato de tarjeta Trello
// ✅ SOLO INFORMACIÓN DE PRODUCCIÓN (sin precios ni datos contables)
function orderToCardData(order: OrderData): { name: string; desc: string } {
  console.log('🔄 Convirtiendo pedido a tarjeta de Trello:', {
    customer: order.customer_name,
    items: order.items?.length || 0
  });
  
  // Nombre de la tarjeta: Solo el nombre del cliente
  const name = order.customer_name || 'Sin nombre';
  
  // Descripción: SOLO información de producción en formato Markdown
  const sections: string[] = [];
  
  // ✅ PRODUCTOS - Información directa sin títulos decorativos
  order.items.forEach((item, index) => {
    const itemDesc = item.descripcion || item.product_name || 'Sin descripción';
    
    sections.push(`**${itemDesc}**`);
    
    // Medidas (si existen)
    if (item.ancho && item.alto && item.unidad) {
      const unidadMap: Record<string, string> = {
        cm: 'cm',
        pulgadas: 'pulgadas',
        metros: 'm',
        pies: 'pies'
      };
      const unidadKey = typeof item.unidad === 'string' ? item.unidad : '';
      const unidadDisplay = unidadMap[unidadKey] || item.unidad;
      sections.push(`- **Medidas:** ${item.ancho} × ${item.alto} ${unidadDisplay}`);
    }
    
    // Detalles de camisas/prendas
    if (item.talla) sections.push(`- **Talla:** ${item.talla}`);
    if (item.color) sections.push(`- **Color:** ${item.color}`);
    
    // Detalles de impresión
    if (item.tipo_impresion) {
      sections.push(`- **Impresión:** ${item.tipo_impresion}`);
      sections.push(`- **Lados a imprimir:** ${item.numero_lados}`);
      sections.push(`- **Diseño Lado 1:** ${item.nivel_diseno_lado1}`);
      if (item.numero_lados === 2) {
        sections.push(`- **Diseño Lado 2:** ${item.nivel_diseno_lado2}`);
      }
    }
    
    // Detalles de PVC (si existen)
    if (item.tipo_material === 'PVC') {
      if (item.mano_obra) {
        sections.push(`- **Mano de obra:** ${item.mano_obra}`);
      }
      if (item.tiene_ojetes) {
        sections.push(`- **Ojetes:** Sí`);
      }
    }
    
    // Detalles de Banner (si existen)
    if (item.tipo_material === 'BANNER') {
      if (item.mano_obra) {
        sections.push(`- **Mano de obra:** ${item.mano_obra}`);
      }
      if (item.tiene_ojetes) {
        sections.push(`- **Ojetes:** Sí`);
      }
    }
    
    // Cantidad (IMPORTANTE para producción)
    sections.push(`- **Cantidad:** ${item.unidades} unidad(es)`);
    
    // Notas específicas del item
    if (item.notas) {
      sections.push(`- **Notas:** ${item.notas}`);
    }
    
    sections.push('');
  });
  
  // Notas generales del pedido
  if (order.notes) {
    sections.push(`**NOTAS:**`);
    sections.push(order.notes);
    sections.push('');
  }
  
  // Pedido especial (afecta a producción)
  if (order.is_special_order) {
    sections.push(`### ⭐ PEDIDO ESPECIAL`);
    if (order.special_order_reason) {
      sections.push(`**Razón:** ${order.special_order_reason}`);
    }
    sections.push('');
  }
  
  // Metadata mínima (para sincronización)
  sections.push(`---`);
  sections.push(`🕒 **Creado:** ${order.created_at || new Date().toISOString()}`);
  
  // Construir descripción final
  const MAX_DESC_LENGTH = 16000;
  let finalDesc = sections.join('\n');
  
  // Validar y truncar si es necesario
  if (finalDesc.length > MAX_DESC_LENGTH) {
    console.warn(`⚠️ Descripción muy larga (${finalDesc.length} chars), truncando...`);
    finalDesc = finalDesc.substring(0, MAX_DESC_LENGTH) + '\n\n... (descripción truncada)';
  }
  
  // Asegurar que la descripción no sea vacía
  if (!finalDesc || finalDesc.trim() === '') {
    finalDesc = `Pedido de: ${order.customer_name}\nProductos: ${order.items?.length || 0}`;
  }
  
  console.log('✅ Descripción generada (solo info de producción):', finalDesc.length, 'caracteres');
  
  return {
    name: name || 'Sin nombre',
    desc: finalDesc
  };
}

// Convertir tarjeta de Trello a pedido
function cardToOrder(card: any, lists: any[]): any {
  try {
    // Calcular progreso del checklist si existe
    let checklistProgress = null;
    if (card.badges && card.badges.checkItems > 0) {
      checklistProgress = {
        completed: card.badges.checkItemsChecked || 0,
        total: card.badges.checkItems || 0
      };
    }
    
    // 📎 Procesar attachments de Trello
    let attachments: any[] = [];
    if (card.attachments && Array.isArray(card.attachments)) {
      attachments = card.attachments.map((att: any) => ({
        id: att.id,
        name: att.name,
        url: att.url,
        isImage: att.mimeType?.startsWith('image/') || att.url?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i),
        isPdf: att.mimeType === 'application/pdf' || att.url?.match(/\.pdf$/i),
        mimeType: att.mimeType,
        bytes: att.bytes,
        date: att.date
      }));
    }
    
    // Intentar extraer metadata del final de la descripción
    const metadataMatch = card.desc?.match(/```json\n([\s\S]*?)\n```/);
    
    if (metadataMatch) {
      // Si hay metadata, usarla
      const metadata = JSON.parse(metadataMatch[1]);
      return {
        ...metadata,
        id: metadata.order_id || `order:trello:${card.id}`,
        status: getStatusFromListId(card.idList, lists),
        trello_card_id: card.id,
        trello_url: card.url,
        trello_short_link: card.shortLink,
        trello_list_id: card.idList,
        checklist_progress: checklistProgress,
        attachments,  // 📎 Incluir attachments
        updated_at: card.dateLastActivity || new Date().toISOString(),
        // ✅ MAPEAR FECHA DE VENCIMIENTO desde Trello
        due_date: card.due || metadata.due_date,
        due_at: card.due || metadata.due_at
      };
    } else {
      // Si no hay metadata, parsear la descripción manualmente (formato legacy)
      return parseLegacyCard(card, lists, checklistProgress, attachments);
    }
  } catch (error) {
    console.error('Error parseando tarjeta:', error);
    return parseLegacyCard(card, lists, null, []);
  }
}

// Parsear tarjetas antiguas sin metadata
function parseLegacyCard(card: any, lists: any[], checklistProgress: { completed: number; total: number } | null, attachments: any[]): any {
  const items = [];
  
  if (card.desc && card.desc.trim()) {
    const lines = card.desc.split('\n').filter((l: string) => l.trim());
    lines.forEach((line: string) => {
      if (line.trim() && !line.startsWith('---') && !line.startsWith('```')) {
        items.push({
          descripcion: line.trim(),
          unidades: 1,
          precio_unitario: 0,
          subtotal: 0,
          origen: 'externo',
          descontar_stock: false
        });
      }
    });
  }

  if (items.length === 0) {
    items.push({
      descripcion: card.name,
      unidades: 1,
      precio_unitario: 0,
      subtotal: 0,
      origen: 'externo',
      descontar_stock: false
    });
  }

  return {
    id: `order:trello:${card.id}`,
    number: `T-${card.idShort}`,
    customer_name: card.name,
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    items,
    status: getStatusFromListId(card.idList, lists),
    total: 0,
    subtotal: 0,
    isv: 0,
    discount: 0,
    amount_paid: 0,
    payment_method: 'EFECTIVO',
    payment_status: 'PENDIENTE',
    created_at: card.dateLastActivity || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    trello_card_id: card.id,
    trello_url: card.url,
    trello_short_link: card.shortLink,
    trello_list_id: card.idList,
    notes: card.desc || '',
    source: 'trello_legacy',
    // ✅ MAPEAR FECHA DE VENCIMIENTO desde Trello
    due_date: card.due,
    due_at: card.due,
    checklist_progress: checklistProgress,
    attachments  // 📎 Incluir attachments
  };
}

// 📝 CREAR PEDIDO (crear tarjeta en Trello)
export async function createTrelloOrder(orderData: OrderData): Promise<{ success: boolean; order?: any; cardId?: string; error?: string }> {
  try {
    console.log('📝 Creando pedido en Trello...');
    
    const config = getTrelloConfig();
    if (!config) {
      console.error('❌ Trello no está configurado en localStorage');
      console.error('💡 Solución: Ve a Ajustes → Trello y configura las credenciales');
      throw new Error('Trello no está configurado. Ve a Ajustes → Trello y vuelve a guardar la configuración');
    }
    
    console.log('✅ Configuración de Trello encontrada en localStorage');
    console.log('   Board ID:', config.board_id);
    
    // 🎯 IMPORTANTE: Priorizar listId personalizado del pedido
    let listId = (orderData as any).trello_list_id;
    
    console.log('🎯 Determinando lista de destino:');
    console.log('   trello_list_id personalizado:', listId);
    
    // Obtener listas del tablero (necesario para cardToOrder más adelante)
    const lists = await getBoardLists(config);
    
    // Si no hay listId personalizado, determinar según el estado
    if (!listId) {
      console.log('   No hay lista personalizada, determinando por estado...');
      listId = getListIdForStatus(orderData.status || 'PENDIENTE', lists);
      
      // Si no se encuentra lista para el estado, usar la lista por defecto
      if (!listId && config.default_list_id) {
        console.log('   Usando lista por defecto de config:', config.default_list_id);
        listId = config.default_list_id;
      }
      
      // Si aún no hay lista, usar la primera
      if (!listId && lists.length > 0) {
        console.log('   Usando primera lista disponible:', lists[0].id);
        listId = lists[0].id;
      }
    } else {
      console.log('   ✅ Usando lista personalizada del pedido:', listId);
    }
    
    if (!listId) {
      throw new Error('No se pudo determinar la lista de Trello para el pedido');
    }
    
    console.log('   🎯 LISTA FINAL USADA:', listId);
    
    // Convertir pedido a formato de tarjeta
    const cardData = orderToCardData(orderData);
    
    // ✅ VALIDAR datos antes de enviar
    console.log('📊 Datos de la tarjeta:', {
      name: cardData.name,
      descLength: cardData.desc?.length || 0,
      listId
    });
    
    // Asegurar que name y desc sean strings válidos
    const cardPayload: any = {
      listId: listId,
      name: String(cardData.name || 'Sin nombre'),
      desc: String(cardData.desc || '')
    };
    
    // ✅ AGREGAR FECHA DE VENCIMIENTO si existe
    if (orderData.due_date && orderData.due_time) {
      // Combinar fecha y hora en formato ISO
      const dueDateTime = `${orderData.due_date}T${orderData.due_time}:00.000Z`;
      cardPayload.due = dueDateTime;
      console.log('📅 Fecha de vencimiento agregada:', dueDateTime);
    } else if (orderData.due_date) {
      // Solo fecha, usar medianoche
      const dueDateTime = `${orderData.due_date}T23:59:59.000Z`;
      cardPayload.due = dueDateTime;
      console.log('📅 Fecha de vencimiento agregada (sin hora):', dueDateTime);
    }
    
    // ✅ AGREGAR ETIQUETAS si existen
    if ((orderData as any).trello_label_ids && (orderData as any).trello_label_ids.length > 0) {
      cardPayload.labelIds = (orderData as any).trello_label_ids;
      console.log('🏷️ Etiquetas agregadas:', cardPayload.labelIds);
    }
    
    // ✅ AGREGAR MIEMBROS si existen
    if ((orderData as any).trello_member_ids && (orderData as any).trello_member_ids.length > 0) {
      cardPayload.memberIds = (orderData as any).trello_member_ids;
      console.log('👥 Miembros agregados:', cardPayload.memberIds);
    }
    
    console.log('📤 Payload completo:', cardPayload);
    
    // Crear tarjeta en Trello usando el servidor proxy
    const response = await fetch(`${API_URL}/trello/create-card`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardPayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error del servidor:', response.status, errorData);
      
      // Mensaje más específico según el error
      if (response.status === 400 && errorData.error?.includes('credenciales')) {
        throw new Error('Las credenciales de Trello no están configuradas en el servidor. Ve a Ajustes → Trello y vuelve a guardar la configuración para sincronizarlas.');
      }
      
      throw new Error(errorData.error || `Error al crear tarjeta en Trello: ${response.status}`);
    }
    
    const { card: createdCard } = await response.json();
    console.log('✅ Tarjeta creada en Trello:', createdCard.id);
    
    // Adjuntar fotos si existen
    if (orderData.attached_photos && orderData.attached_photos.length > 0) {
      console.log(`📷 Adjuntando ${orderData.attached_photos.length} fotos...`);
      for (let i = 0; i < orderData.attached_photos.length; i++) {
        try {
          await attachFileToCard(createdCard.id, orderData.attached_photos[i], `foto_${i + 1}.jpg`, config);
        } catch (error) {
          console.error(`⚠️ Error adjuntando foto ${i + 1}:`, error);
        }
      }
    }
    
    // Adjuntar documentos si existen
    if (orderData.attached_documents && orderData.attached_documents.length > 0) {
      console.log(`📄 Adjuntando ${orderData.attached_documents.length} documentos...`);
      for (const doc of orderData.attached_documents) {
        try {
          await attachFileToCard(createdCard.id, doc.data, doc.name, config);
        } catch (error) {
          console.error(`⚠️ Error adjuntando documento ${doc.name}:`, error);
        }
      }
    }
    
    // Convertir la tarjeta creada a pedido para retornarla
    const order = cardToOrder(createdCard, lists);

    // 📝 REGISTRAR ACTIVIDAD: Nuevo Pedido
    try {
      await logActivity(
        'PEDIDO_CREADO', 
        `Nuevo pedido creado: ${order.customer_name} (#${order.number})`, 
        { 
          orderNumber: order.number,
          customer: order.customer_name,
          total: order.total,
          trelloCardId: createdCard.id
        }
      );
    } catch (e) {
      console.error('Error registrando actividad:', e);
    }
    
    return {
      success: true,
      order,
      cardId: createdCard.id
    };
    
  } catch (error: any) {
    console.error('❌ Error creando pedido en Trello:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al crear pedido en Trello'
    };
  }
}

// 📖 LEER TODOS LOS PEDIDOS (leer todas las tarjetas activas)
export async function getTrelloOrders(): Promise<{ success: boolean; orders?: any[]; error?: string }> {
  try {
    console.log('📖 Obteniendo pedidos desde Trello...');

    // Modo offline: usar solo datos ya cargados previamente
    if (isOfflineMode()) {
      const cachedOrders = getOfflineOrdersCache();
      return {
        success: true,
        orders: cachedOrders,
      };
    }
    
    // 🧹 LIMPIEZA: Remover caché viejo que puede estar causando problemas de memoria
    try {
      const cacheSize = localStorage.getItem('trello_orders_cache')?.length || 0;
      if (cacheSize > 500000) { // Si el caché es mayor a 500KB
        console.warn('⚠️ Caché muy grande detectado, limpiando...');
        localStorage.removeItem('trello_orders_cache');
      }
    } catch (e) {
      localStorage.removeItem('trello_orders_cache');
    }
    
    const config = getTrelloConfig();
    if (!config) {
      throw new Error('Trello no está configurado');
    }
    
    // Obtener listas usando el servidor proxy
    const lists = await getBoardLists(config);
    
    // Obtener tarjetas del tablero usando el servidor proxy
    const response = await fetch(`${API_URL}/trello/board-cards`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al obtener tarjetas: ${response.status}`);
    }
    
    const { cards: allCards } = await response.json();
    
    // Filtrar solo tarjetas activas (no archivadas)
    const activeCards = allCards.filter((c: any) => !c.closed);
    
    // Convertir tarjetas a pedidos y preservar fecha de creación
    const orders = activeCards.map((card: any) => {
      const order = cardToOrder(card, lists);
      // Preservar fecha de creación de la tarjeta
      if (!order.created_at && card.dateLastActivity) {
        order.created_at = card.dateLastActivity;
      }
      // Guardar la fecha de creación original de Trello
      order.dateCreated = card.dateLastActivity || order.created_at;
      return order;
    });
    
    // 🔄 DETECTAR CAMBIOS EXTERNOS (Diffing) - Para reflejar movimientos hechos en Trello
    try {
      const cachedStr = localStorage.getItem('trello_orders_cache');
      if (cachedStr) {
        const cachedOrders: any[] = JSON.parse(cachedStr);
        const cachedMap = new Map<string, any>(cachedOrders.map((o: any) => [o.trello_card_id, o]));
        
        const logPromises = [];
        const canDispatch = typeof window !== 'undefined' && typeof window.dispatchEvent === 'function';

        for (const order of orders) {
          const oldOrder = cachedMap.get(order.trello_card_id) as any;
          
          if (oldOrder) {
            // 1. Cambio de Estado
            if (order.status !== oldOrder.status) {
               logPromises.push(logActivity(
                'CAMBIO_ESTADO_TRELLO',
                `Trello: Estado cambiado de ${oldOrder.status} a ${order.status}`,
                { 
                  orderNumber: order.number,
                  customer: order.customer_name,
                  oldStatus: oldOrder.status,
                  newStatus: order.status,
                  source: 'trello_sync'
                }
              ));
              if (canDispatch) {
                window.dispatchEvent(new CustomEvent('order-activity', {
                  detail: {
                    type: 'status',
                    orderNumber: order.number,
                    customer: order.customer_name,
                    oldStatus: oldOrder.status,
                    newStatus: order.status,
                    source: 'trello'
                  }
                }));
              }
            }
            
            // 2. Nuevos Pagos (Si se actualizó el custom field en Trello)
            const oldPaid = oldOrder.amount_paid || 0;
            const newPaid = order.amount_paid || 0;
            if (newPaid > oldPaid) {
              const diff = newPaid - oldPaid;
              logPromises.push(logActivity(
                'PAGO_DETECTADO_TRELLO',
                `Trello: Nuevo pago detectado de L. ${diff.toFixed(2)}`,
                { 
                   orderNumber: order.number,
                   amount: diff,
                   totalPaid: newPaid,
                   source: 'trello_sync'
                }
              ));
              if (canDispatch) {
                window.dispatchEvent(new CustomEvent('order-activity', {
                  detail: {
                    type: 'payment',
                    orderNumber: order.number,
                    customer: order.customer_name,
                    amount: diff,
                    totalPaid: newPaid,
                    source: 'trello'
                  }
                }));
              }
            }
          } else {
            // 3. Nuevo Pedido (Importado desde Trello)
            // Solo registramos si no existen en el caché (son nuevos para la app)
            logPromises.push(logActivity(
              'PEDIDO_IMPORTADO_TRELLO',
              `Nuevo pedido desde Trello: ${order.customer_name} (#${order.number})`,
              { 
                 orderNumber: order.number,
                 customer: order.customer_name,
                 total: order.total,
                 source: 'trello_sync'
              }
            ));
            if (canDispatch) {
              window.dispatchEvent(new CustomEvent('order-activity', {
                detail: {
                  type: 'new',
                  orderNumber: order.number,
                  customer: order.customer_name,
                  total: order.total,
                  source: 'trello'
                }
              }));
            }
          }
        }
        
        if (logPromises.length > 0) {
           // Ejecutar logs en segundo plano para no bloquear la carga
           Promise.all(logPromises).catch(err => console.error('Error logging Trello diffs:', err));
        }
      }
      
      // Actualizar caché para la próxima vez (solo metadata, sin attachments pesados)
      try {
        const lightweightCache = orders.map((o: any) => ({
          trello_card_id: o.trello_card_id,
          number: o.number,
          customer_name: o.customer_name,
          status: o.status,
          amount_paid: o.amount_paid,
          total: o.total,
          // NO incluir: attachments, images, description larga
        }));
        localStorage.setItem('trello_orders_cache', JSON.stringify(lightweightCache));
        // Cache completo para uso offline (solo cuando no hay internet)
        localStorage.setItem(OFFLINE_ORDERS_CACHE_KEY, JSON.stringify(orders));
      } catch (cacheError) {
        // Si falla el caché, simplemente no lo guardamos (no es crítico)
        console.warn('⚠️ No se pudo actualizar caché (datos muy grandes)');
        localStorage.removeItem('trello_orders_cache'); // Limpiar caché corrupto
      }
      
    } catch (err) {
      console.error('Error en diffing de Trello:', err);
    }

    console.log(`✅ ${orders.length} pedidos obtenidos desde Trello`);
    
    return {
      success: true,
      orders
    };
    
  } catch (error: any) {
    console.error('❌ Error obteniendo pedidos desde Trello:', error.message);

    // Solo fallback local cuando realmente no hay internet
    if (isOfflineMode()) {
      return {
        success: true,
        orders: getOfflineOrdersCache(),
      };
    }
    
    let errorMessage = error.message || 'Error desconocido al obtener pedidos';
    
    // Proporcionar más contexto sobre errores de red
    if (error.message === 'Failed to fetch') {
      errorMessage = 'No se pudo conectar al servidor. Verifica tu conexión a internet y que el servidor esté en ejecución.';
    }
    
    return {
      success: false,
      orders: [],
      error: errorMessage
    };
  }
}

// 🔄 ACTUALIZAR PEDIDO (actualizar tarjeta en Trello)
export async function updateTrelloOrder(cardId: string, updates: Partial<OrderData>): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔄 Actualizando pedido en Trello...');
    
    const config = getTrelloConfig();
    if (!config) {
      throw new Error('Trello no está configurado');
    }
    
    const lists = await getBoardLists(config);
    
    // Si se actualiza el estado, mover la tarjeta a la lista correspondiente
    if (updates.status) {
      console.log(`📋 Cambiando estado a: ${updates.status}`);
      
      // CASO ESPECIAL: Si el estado es ENTREGADO, buscar lista de "Entregados"
      let newListId: string | null = null;
      
      if (updates.status.toUpperCase() === 'ENTREGADO') {
        console.log('🎯 Estado ENTREGADO detectado - Buscando lista de Entregados...');
        
        // Buscar lista de entregados con varios nombres posibles y patrones de fecha
        const deliveredList = lists.find((list: any) => {
          const listName = list.name.toLowerCase();
          // Buscar listas que contengan "entregado" o variaciones
          // Incluyendo listas con fechas como "ENTREGADOS DE 10-15 DE NOVIEMBRE"
          return listName.includes('entregado') || 
                 listName.includes('completado') || 
                 listName.includes('finalizado') ||
                 listName === 'entregados' ||
                 listName === 'completados' ||
                 listName === 'done';
        });
        
        if (deliveredList) {
          newListId = deliveredList.id;
          console.log(`✅ Lista de entregados encontrada: "${deliveredList.name}" (${deliveredList.id})`);
        } else {
          console.warn('⚠️ No se encontró lista de "Entregados" en Trello.');
          console.warn('💡 Consejo: Crea una lista con nombre "Entregados" o "ENTREGADOS DE [fechas]" en tu tablero de Trello');
          // Intentar con mapeo normal como fallback
          newListId = getListIdForStatus(updates.status, lists);
        }
      } else {
        // Para otros estados, usar el mapeo normal
        newListId = getListIdForStatus(updates.status, lists);
      }
      
      // Mover la tarjeta a la lista correspondiente
      if (newListId) {
        console.log(`🔀 Moviendo tarjeta a lista: ${newListId}`);
        const moveResponse = await fetch(`${API_URL}/trello/card/${cardId}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            idList: newListId,
            pos: 'top' // 🎯 Colocar al inicio de la lista de entregados
          })
        });
        
        if (!moveResponse.ok) {
          console.error('❌ Error al mover tarjeta:', moveResponse.status);
          const errorData = await moveResponse.json().catch(() => ({}));
          console.error('Error details:', errorData.error || 'Unknown error');
        } else {
          console.log('✅ Tarjeta movida exitosamente a la lista de Entregados');
        }
      }
      
      // ✅ NUEVO: Marcar checklist cuando el estado es "LISTO PARA ENTREGA"
      if (updates.status.toUpperCase() === 'LISTO PARA ENTREGA') {
        console.log('📋 Estado LISTO PARA ENTREGA detectado - Marcando checklist...');
        await markChecklistItemComplete(cardId, config);
      }
    }
    
    // Obtener la tarjeta actual para preservar datos
    const getResponse = await fetch(`${API_URL}/trello/card/${cardId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!getResponse.ok) {
      const errorData = await getResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'No se pudo obtener la tarjeta actual');
    }
    
    const { card: currentCard } = await getResponse.json();
    const currentOrder = cardToOrder(currentCard, lists);
    
    // Combinar datos actuales con actualizaciones
    const updatedOrder = {
      ...currentOrder,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Regenerar el contenido de la tarjeta
    const cardData = orderToCardData(updatedOrder);
    
    // Actualizar tarjeta usando el servidor proxy
    const response = await fetch(`${API_URL}/trello/card/${cardId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        name: cardData.name,
        desc: cardData.desc
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al actualizar tarjeta: ${response.status}`);
    }
    
    console.log('✅ Pedido actualizado en Trello');

    // 📝 REGISTRAR ACTIVIDAD: Actualización
    try {
      let actionType = 'ACTUALIZACION_PEDIDO';
      let actionDesc = `Pedido actualizado (${updatedOrder.number})`;
      
      if (updates.status) {
        actionType = 'CAMBIO_ESTADO';
        actionDesc = `Estado cambiado a ${updates.status} (${updatedOrder.customer_name})`;
        
        if (updates.status === 'ENTREGADO') {
          actionType = 'PEDIDO_ENTREGADO';
          actionDesc = `Pedido entregado: ${updatedOrder.customer_name}`;
        }
      } else if (updates.amount_paid !== undefined) {
        actionType = 'PAGO_REGISTRADO';
        actionDesc = `Pago registrado: L. ${updates.amount_paid} (Total: L. ${updatedOrder.total})`;
      }

      await logActivity(
        actionType,
        actionDesc,
        { 
          orderNumber: updatedOrder.number,
          customer: updatedOrder.customer_name,
          updates,
          newBalance: updatedOrder.total - (updatedOrder.amount_paid || 0)
        }
      );
    } catch (e) {
      console.error('Error registrando actividad:', e);
    }
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Error actualizando pedido en Trello:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al actualizar pedido'
    };
  }
}

// 🔲 MARCAR CHECKLIST ITEM CUANDO ESTÁ LISTO PARA ENTREGA
async function markChecklistItemComplete(cardId: string, config: TrelloConfig): Promise<void> {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 INICIANDO MARCADO DE CHECKLIST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Card ID:', cardId);
    
    // Obtener todos los checklists de la tarjeta usando el servidor proxy
    console.log('📡 Obteniendo checklists de la tarjeta...');
    
    const checklistsResponse = await fetch(`${API_URL}/trello/card/${cardId}/checklists`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!checklistsResponse.ok) {
      console.error('❌ Error HTTP:', checklistsResponse.status, checklistsResponse.statusText);
      return;
    }
    
    const { checklists } = await checklistsResponse.json();
    console.log('📦 Respuesta recibida:', checklists);
    
    if (!checklists || checklists.length === 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️ NO HAY CHECKLISTS EN ESTA TARJETA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 Para usar esta funcionalidad:');
      console.log('   1. Ve a Trello');
      console.log('   2. Abre la tarjeta del pedido');
      console.log('   3. Haz clic en "Checklist" en el menú lateral');
      console.log('   4. Agrega un checklist con nombre descriptivo');
      console.log('   5. Agrega ítems como:');
      console.log('      - "Listo para entrega"');
      console.log('      - "Control de calidad completado"');
      console.log('      - "Empaquetado y etiquetado"');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ ENCONTRADOS ${checklists.length} CHECKLIST(S)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Mostrar todos los checklists e ítems para debugging
    checklists.forEach((checklist: any, idx: number) => {
      console.log(`\n📋 CHECKLIST #${idx + 1}: "${checklist.name}"`);
      console.log(`   ID: ${checklist.id}`);
      console.log(`   Ítems totales: ${checklist.checkItems?.length || 0}`);
      
      if (checklist.checkItems && checklist.checkItems.length > 0) {
        console.log('   ─────────────────────────────────────────');
        checklist.checkItems.forEach((item: any, itemIdx: number) => {
          const status = item.state === 'complete' ? '✅' : '⬜';
          console.log(`   ${status} ${itemIdx + 1}. "${item.name}"`);
          console.log(`      Estado: ${item.state}`);
          console.log(`      ID: ${item.id}`);
        });
        console.log('   ─────────────────────────────────────────');
      } else {
        console.log('   ⚠️ Este checklist está vacío');
      }
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 BUSCANDO ÍTEMS PARA MARCAR...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Buscar el ítem del checklist que corresponde a "Listo para entrega"
    const searchTerms = [
      'listo para entrega',
      'listo entrega',
      'ready for delivery',
      'ready to deliver',
      'preparado para entrega',
      'preparado',
      'listo',
      'ready'
    ];
    
    console.log('📝 Términos de búsqueda:', searchTerms);
    
    let itemsMarked = 0;
    let itemsFound = 0;
    
    for (const checklist of checklists) {
      if (!checklist.checkItems || checklist.checkItems.length === 0) continue;
      
      for (const item of checklist.checkItems) {
        const itemNameLower = item.name.toLowerCase().trim();
        
        // Verificar si el nombre del ítem coincide con alguno de los términos de búsqueda
        const matches = searchTerms.some(term => itemNameLower.includes(term));
        
        if (matches) {
          itemsFound++;
          console.log(`\n🎯 ÍTEM COINCIDENTE ENCONTRADO:`);
          console.log(`   Nombre: "${item.name}"`);
          console.log(`   Checklist: "${checklist.name}"`);
          console.log(`   Estado actual: ${item.state}`);
          
          // Solo marcar si no está ya marcado
          if (item.state !== 'complete') {
            console.log(`   ⏳ Marcando como completado...`);
            
            // Marcar el ítem como completo usando el servidor proxy
            const updateResponse = await fetch(`${API_URL}/trello/card/${cardId}/checkitem/${item.id}`, {
              method: 'PUT',
              headers: { 
                'Authorization': `Bearer ${publicAnonKey}`,
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({ state: 'complete' })
            });
            
            if (updateResponse.ok) {
              console.log(`   ✅ MARCADO EXITOSAMENTE`);
              itemsMarked++;
            } else {
              const errorText = await updateResponse.text();
              console.error(`   ❌ ERROR al marcar:`, updateResponse.status, errorText);
            }
          } else {
            console.log(`   ℹ️ Ya estaba marcado como completado - omitiendo`);
          }
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ Ítems encontrados que coinciden: ${itemsFound}`);
    console.log(`✓ Ítems marcados como completados: ${itemsMarked}`);
    
    if (itemsFound === 0) {
      console.log('\n⚠️ NO SE ENCONTRARON ÍTEMS QUE COINCIDAN');
      console.log('\n💡 SOLUCIÓN:');
      console.log('   En Trello, agrega un ítem al checklist con un nombre que contenga:');
      console.log('   - "Listo para entrega"');
      console.log('   - "Ready for delivery"');
      console.log('   - "Preparado"');
      console.log('   - O similar');
      console.log('\n📌 NOMBRES ACTUALES EN TUS CHECKLISTS:');
      checklists.forEach((checklist: any) => {
        if (checklist.checkItems && checklist.checkItems.length > 0) {
          console.log(`   Checklist "${checklist.name}":`);
          checklist.checkItems.forEach((item: any) => {
            console.log(`   - "${item.name}"`);
          });
        }
      });
    } else if (itemsMarked > 0) {
      console.log(`\n🎉 ¡OPERACIÓN COMPLETADA EXITOSAMENTE!`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR CRÍTICO EN MARCADO DE CHECKLIST');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    // No lanzar error - esto es opcional
  }
}

// 🗑️ ELIMINAR PEDIDO (archivar tarjeta en Trello)
export async function deleteTrelloOrder(cardId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ Archivando pedido en Trello...');
    
    const config = getTrelloConfig();
    if (!config) {
      throw new Error('Trello no está configurado');
    }
    
    const response = await fetch(`${API_URL}/trello/card/${cardId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ closed: true })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error al archivar tarjeta: ${response.status}`);
    }
    
    console.log('✅ Pedido archivado en Trello');
    
    return { success: true };
    
  } catch (error: any) {
    console.error('❌ Error archivando pedido en Trello:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al archivar pedido'
    };
  }
}

// 📊 OBTENER ESTADÍSTICAS DE PEDIDOS
export async function getTrelloOrdersStats(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    pendientes: number;
    pendientesInfo: number;
    enDiseño: number;
    diseñoProceso: number;
    esperandoAprobacion: number;
    enProduccion: number;
    controlCalidad: number;
    listos: number;
    listoEntrega: number;
    entregados: number;
    cancelados: number;
  };
  error?: string;
}> {
  try {
    const result = await getTrelloOrders();
    
    if (!result.success || !result.orders) {
      throw new Error(result.error || 'No se pudieron obtener pedidos');
    }
    
    const orders = result.orders;
    
    const stats = {
      total: orders.length,
      pendientes: orders.filter(o => o.status === 'PENDIENTE').length,
      pendientesInfo: orders.filter(o => o.status === 'PENDIENTE DE INFORMACIÓN').length,
      enDiseño: orders.filter(o => o.status === 'DISEÑO').length,
      diseñoProceso: orders.filter(o => o.status === 'DISEÑO EN PROCESO').length,
      esperandoAprobacion: orders.filter(o => o.status === 'ESPERANDO APROBACIÓN').length,
      enProduccion: orders.filter(o => o.status === 'EN PRODUCCIÓN' || o.status === 'PRODUCCIÓN').length,
      controlCalidad: orders.filter(o => o.status === 'CONTROL DE CALIDAD').length,
      listos: orders.filter(o => o.status === 'LISTO').length,
      listoEntrega: orders.filter(o => o.status === 'LISTO PARA ENTREGA').length,
      entregados: orders.filter(o => o.status === 'ENTREGADO').length,
      cancelados: orders.filter(o => o.status === 'CANCELADO').length
    };
    
    return {
      success: true,
      stats
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
