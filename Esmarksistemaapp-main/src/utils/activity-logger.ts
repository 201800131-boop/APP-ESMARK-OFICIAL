import { api } from './api';

/**
 * Sistema de registro de actividad para EsmarkSystem
 * Registra todas las acciones importantes en el sistema
 */

export type ActionType =
  | 'pedido_creado'
  | 'pedido_editado'
  | 'pedido_estado'
  | 'pedido_eliminado'
  | 'cotizacion_creada'
  | 'cotizacion_editada'
  | 'cotizacion_convertida'
  | 'producto_creado'
  | 'producto_editado'
  | 'producto_eliminado'
  | 'cierre_dia'
  | 'inicio_dia'
  | 'caja_chica'
  | 'usuario_login'
  | 'usuario_logout'
  | 'configuracion'
  | 'configuracion_fiscal'
  | 'inventario_ajuste'
  | 'discount_authorized'
  | 'pago_registrado'
  | 'entrega_realizada'
  | 'cliente_creado'
  | 'trello_sincronizado'
  | 'backup_creado'; // Nuevo tipo para descuentos autorizados

interface ActivityLogData {
  actionType: ActionType;
  description: string;
  details?: Record<string, any>;
}

/**
 * Registra una actividad en el sistema
 * También acepta parámetros individuales para mayor flexibilidad
 */
export async function logActivity(
  actionTypeOrData: ActionType | ActivityLogData,
  description?: string,
  details?: Record<string, any>
): Promise<void> {
  // Si se pasa un objeto, usarlo directamente
  let data: ActivityLogData;
  if (typeof actionTypeOrData === 'object') {
    data = actionTypeOrData;
  } else {
    // Si se pasan parámetros individuales, construir el objeto
    data = {
      actionType: actionTypeOrData,
      description: description || '',
      details: details || {}
    };
  }
  
  async function executeLog(logData: ActivityLogData): Promise<void> {
    try {
      let user: any = null;
      
      // Intentar obtener usuario del backend
      try {
        user = await api.getCurrentUser();
      } catch (error) {
        // Si falla, obtener usuario de localStorage (sesión local)
        const storedUser = localStorage.getItem('current_user');
        if (storedUser) {
          user = JSON.parse(storedUser);
        } else {
          // Usuario por defecto si no hay nada
          user = {
            username: 'Sistema',
            name: 'Sistema',
            role: 'operator'
          };
        }
      }
      
      await api.createActivityLog({
        userName: user.name || user.username || 'Desconocido',
        userRole: user.role || 'operator',
        actionType: logData.actionType,
        description: logData.description,
        details: logData.details || {},
      });
    } catch (error) {
      // No fallar si el registro de actividad falla
      console.error('Error registrando actividad:', error);
    }
  }

  try {
    await executeLog(data);
  } catch (error) {
    console.error('Error en logActivity:', error);
  }
}

/**
 * Funciones específicas para registrar actividades comunes
 */

export async function logOrderCreated(orderNumber: number, customerName: string, total: number) {
  await logActivity({
    actionType: 'pedido_creado',
    description: `Pedido #${orderNumber} creado para ${customerName}`,
    details: {
      'Número de Pedido': orderNumber,
      'Cliente': customerName,
      'Total': `L ${total.toFixed(2)}`,
    },
  });
}

export async function logOrderEdited(orderNumber: number, changes: string) {
  await logActivity({
    actionType: 'pedido_editado',
    description: `Pedido #${orderNumber} actualizado`,
    details: {
      'Número de Pedido': orderNumber,
      'Cambios': changes,
    },
  });
}

export async function logOrderStatusChange(orderNumber: number, oldStatus: string, newStatus: string) {
  await logActivity({
    actionType: 'pedido_estado',
    description: `Pedido #${orderNumber} cambió de ${oldStatus} a ${newStatus}`,
    details: {
      'Número de Pedido': orderNumber,
      'Estado Anterior': oldStatus,
      'Estado Nuevo': newStatus,
    },
  });
}

export async function logOrderDeleted(orderNumber: number) {
  await logActivity({
    actionType: 'pedido_eliminado',
    description: `Pedido #${orderNumber} eliminado`,
    details: {
      'Número de Pedido': orderNumber,
    },
  });
}

export async function logQuoteCreated(quoteNumber: number, customerName: string, total: number) {
  await logActivity({
    actionType: 'cotizacion_creada',
    description: `Cotización #${quoteNumber} creada para ${customerName}`,
    details: {
      'Número de Cotización': quoteNumber,
      'Cliente': customerName,
      'Total': `L ${total.toFixed(2)}`,
    },
  });
}

export async function logQuoteEdited(quoteNumber: number, changes: string) {
  await logActivity({
    actionType: 'cotizacion_editada',
    description: `Cotización #${quoteNumber} actualizada`,
    details: {
      'Número de Cotización': quoteNumber,
      'Cambios': changes,
    },
  });
}

export async function logQuoteConverted(quoteNumber: number, orderNumber: number) {
  await logActivity({
    actionType: 'cotizacion_convertida',
    description: `Cotización #${quoteNumber} convertida a Pedido #${orderNumber}`,
    details: {
      'Número de Cotización': quoteNumber,
      'Número de Pedido': orderNumber,
    },
  });
}

export async function logProductCreated(productName: string, sku: string) {
  await logActivity({
    actionType: 'producto_creado',
    description: `Producto "${productName}" agregado al inventario`,
    details: {
      'Producto': productName,
      'SKU': sku,
    },
  });
}

export async function logProductEdited(productName: string, changes: string) {
  await logActivity({
    actionType: 'producto_editado',
    description: `Producto "${productName}" actualizado`,
    details: {
      'Producto': productName,
      'Cambios': changes,
    },
  });
}

export async function logProductDeleted(productName: string) {
  await logActivity({
    actionType: 'producto_eliminado',
    description: `Producto "${productName}" eliminado del inventario`,
    details: {
      'Producto': productName,
    },
  });
}

export async function logDayClose(totalOrders: number, totalRevenue: number) {
  await logActivity({
    actionType: 'cierre_dia',
    description: `Cierre de día realizado`,
    details: {
      'Pedidos del Día': totalOrders,
      'Ingresos': `L ${totalRevenue.toFixed(2)}`,
    },
  });
}

export async function logDayStart(dayStartData: any) {
  await logActivity({
    actionType: 'inicio_dia',
    description: `Inicio de día con caja chica de L. ${dayStartData.total.toFixed(2)}`,
    details: {
      'Fecha': dayStartData.date,
      'Total Caja Chica': `L ${dayStartData.total.toFixed(2)}`,
      'Desglose': dayStartData.bills,
      'Abierto por': dayStartData.opened_by_name || dayStartData.opened_by || 'Sistema'
    },
  });
}

export async function logPettyCash(type: 'ingreso' | 'egreso', amount: number, concept: string) {
  await logActivity({
    actionType: 'caja_chica',
    description: `${type === 'ingreso' ? 'Ingreso' : 'Egreso'} en caja chica: ${concept}`,
    details: {
      'Tipo': type === 'ingreso' ? 'Ingreso' : 'Egreso',
      'Monto': `L ${amount.toFixed(2)}`,
      'Concepto': concept,
    },
  });
}

export async function logUserLogin(username: string) {
  await logActivity({
    actionType: 'usuario_login',
    description: `Usuario ${username} inició sesión`,
    details: {
      'Usuario': username,
      'Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logUserLogout(username: string) {
  await logActivity({
    actionType: 'usuario_logout',
    description: `Usuario ${username} cerró sesión`,
    details: {
      'Usuario': username,
      'Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logConfigChange(section: string, description: string) {
  await logActivity({
    actionType: 'configuracion',
    description: `Configuración actualizada: ${description}`,
    details: {
      'Sección': section,
      'Descripción': description,
    },
  });
}

export async function logFiscalConfigChange(section: string, description: string) {
  await logActivity({
    actionType: 'configuracion_fiscal',
    description: `Configuración fiscal actualizada: ${description}`,
    details: {
      'Sección': section,
      'Descripción': description,
    },
  });
}

export async function logInventoryAdjustment(productName: string, oldStock: number, newStock: number, reason: string) {
  await logActivity({
    actionType: 'inventario_ajuste',
    description: `Ajuste de inventario para "${productName}"`,
    details: {
      'Producto': productName,
      'Stock Anterior': oldStock,
      'Stock Nuevo': newStock,
      'Diferencia': newStock - oldStock,
      'Razón': reason,
    },
  });
}

export async function logDiscountAuthorized(authorizedBy: string, discountAmount: number, reason: string, items: any[]) {
  await logActivity({
    actionType: 'discount_authorized',
    description: `Descuento de L. ${discountAmount.toFixed(2)} autorizado por ${authorizedBy}`,
    details: {
      'Autorizado Por': authorizedBy,
      'Monto del Descuento': `L ${discountAmount.toFixed(2)}`,
      'Motivo': reason,
      'Cantidad de Items': items.length,
      'Items': items,
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logPaymentRegistered(paymentId: number, amount: number, method: string) {
  await logActivity({
    actionType: 'pago_registrado',
    description: `Pago registrado con ID #${paymentId}`,
    details: {
      'ID de Pago': paymentId,
      'Monto': `L ${amount.toFixed(2)}`,
      'Método de Pago': method,
    },
  });
}

export async function logDeliveryCompleted(deliveryId: number, customerName: string) {
  await logActivity({
    actionType: 'entrega_realizada',
    description: `Entrega completada para ${customerName}`,
    details: {
      'ID de Entrega': deliveryId,
      'Cliente': customerName,
    },
  });
}

export async function logCustomerCreated(customerName: string) {
  await logActivity({
    actionType: 'cliente_creado',
    description: `Cliente "${customerName}" agregado`,
    details: {
      'Cliente': customerName,
    },
  });
}

export async function logTrelloSync(imported: number = 0, skipped: number = 0) {
  await logActivity({
    actionType: 'trello_sincronizado',
    description: `Sincronización con Trello: ${imported} importados, ${skipped} omitidos`,
    details: {
      'Pedidos Importados': imported,
      'Pedidos Omitidos': skipped,
      'Total Procesado': imported + skipped,
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logBackupCreated() {
  await logActivity({
    actionType: 'backup_creado',
    description: `Backup de datos creado`,
    details: {
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

// 🔥 NUEVAS FUNCIONES PARA MOVIMIENTOS DE TRELLO

export async function logTrelloCardCreated(orderNumber: number | string, customerName: string, cardUrl?: string) {
  await logActivity({
    actionType: 'pedido_creado',
    description: `Tarjeta de Trello creada para Pedido #${orderNumber} - ${customerName}`,
    details: {
      'Número de Pedido': orderNumber,
      'Cliente': customerName,
      'URL de Trello': cardUrl || 'N/A',
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logTrelloCardMoved(orderNumber: number | string, fromList: string, toList: string, newStatus: string) {
  await logActivity({
    actionType: 'pedido_estado',
    description: `Pedido #${orderNumber} movido en Trello: "${fromList}" → "${toList}"`,
    details: {
      'Número de Pedido': orderNumber,
      'Lista Anterior': fromList,
      'Lista Nueva': toList,
      'Nuevo Estado': newStatus,
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logTrelloCardUpdated(orderNumber: number | string, changes: string[]) {
  await logActivity({
    actionType: 'pedido_editado',
    description: `Pedido #${orderNumber} actualizado desde Trello`,
    details: {
      'Número de Pedido': orderNumber,
      'Cambios': changes.join(', '),
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logTrelloCardDeleted(orderNumber: number | string, customerName: string) {
  await logActivity({
    actionType: 'pedido_eliminado',
    description: `Tarjeta de Trello eliminada: Pedido #${orderNumber} - ${customerName}`,
    details: {
      'Número de Pedido': orderNumber,
      'Cliente': customerName,
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logTrelloCommentAdded(orderNumber: number | string, comment: string) {
  await logActivity({
    actionType: 'pedido_editado',
    description: `Comentario agregado en Trello para Pedido #${orderNumber}`,
    details: {
      'Número de Pedido': orderNumber,
      'Comentario': comment.substring(0, 100) + (comment.length > 100 ? '...' : ''),
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logTrelloDueDateChanged(orderNumber: number | string, oldDate: string, newDate: string) {
  await logActivity({
    actionType: 'pedido_editado',
    description: `Fecha de entrega actualizada en Trello para Pedido #${orderNumber}`,
    details: {
      'Número de Pedido': orderNumber,
      'Fecha Anterior': oldDate,
      'Fecha Nueva': newDate,
      'Origen': 'Trello',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logLocalOrderCreated(orderNumber: number | string, customerName: string, total: number) {
  await logActivity({
    actionType: 'pedido_creado',
    description: `Pedido #${orderNumber} creado en la interfaz para ${customerName}`,
    details: {
      'Número de Pedido': orderNumber,
      'Cliente': customerName,
      'Total': `L ${total.toFixed(2)}`,
      'Origen': 'Interfaz Local',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logLocalOrderEdited(orderNumber: number | string, changes: string) {
  await logActivity({
    actionType: 'pedido_editado',
    description: `Pedido #${orderNumber} editado en la interfaz`,
    details: {
      'Número de Pedido': orderNumber,
      'Cambios': changes,
      'Origen': 'Interfaz Local',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logLocalOrderStatusChanged(orderNumber: number | string, oldStatus: string, newStatus: string) {
  await logActivity({
    actionType: 'pedido_estado',
    description: `Estado de Pedido #${orderNumber} cambiado en la interfaz: ${oldStatus} → ${newStatus}`,
    details: {
      'Número de Pedido': orderNumber,
      'Estado Anterior': oldStatus,
      'Estado Nuevo': newStatus,
      'Origen': 'Interfaz Local',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}

export async function logLocalOrderDeleted(orderNumber: number | string, customerName: string) {
  await logActivity({
    actionType: 'pedido_eliminado',
    description: `Pedido #${orderNumber} eliminado desde la interfaz - ${customerName}`,
    details: {
      'Número de Pedido': orderNumber,
      'Cliente': customerName,
      'Origen': 'Interfaz Local',
      'Fecha y Hora': new Date().toLocaleString('es-HN'),
    },
  });
}
