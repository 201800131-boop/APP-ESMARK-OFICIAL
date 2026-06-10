/**
 * Integración del sistema de plantillas con generación de facturas/recibos/cotizaciones
 * Fases 7-8: Uso real de plantillas en el sistema
 */

import { projectId, publicAnonKey } from './supabase/info';

/**
 * Generar factura usando plantilla activa
 */
export async function generateInvoiceFromTemplate(invoiceData: any) {
  try {
    // Preparar datos para la plantilla
    const templateData = {
      // Cliente
      cliente_nombre: invoiceData.customer_name || '',
      cliente_rtn: invoiceData.customer_rtn || '',
      cliente_direccion: invoiceData.customer_address || '',
      cliente_telefono: invoiceData.customer_phone || '',
      
      // Factura
      factura_numero: invoiceData.invoice_number || '',
      factura_fecha: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
      factura_vencimiento: invoiceData.due_date || '',
      
      // Montos
      subtotal: invoiceData.subtotal || 0,
      isv: invoiceData.tax_amount || 0,
      total: invoiceData.total || 0,
      
      // Items (tabla)
      items: invoiceData.items || [],
      
      // Empresa
      empresa_nombre: invoiceData.company_name || 'ESMARK',
      empresa_rtn: invoiceData.company_rtn || '',
      empresa_direccion: invoiceData.company_address || '',
      empresa_telefono: invoiceData.company_phone || '',
      
      // Otros
      notas: invoiceData.notes || '',
      terminos: invoiceData.terms || ''
    };

    // Generar documento usando el endpoint
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_type: 'factura',
          data: templateData
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar factura');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating invoice from template:', error);
    throw error;
  }
}

/**
 * Generar recibo usando plantilla activa
 */
export async function generateReceiptFromTemplate(receiptData: any) {
  try {
    const templateData = {
      // Recibo
      recibo_numero: receiptData.receipt_number || '',
      recibo_fecha: receiptData.receipt_date || new Date().toISOString().split('T')[0],
      recibo_serie: receiptData.series || '',
      
      // Cliente
      cliente_nombre: receiptData.customer_name || 'Cliente General',
      
      // Monto
      monto: receiptData.amount || 0,
      monto_letras: receiptData.amount_in_words || '',
      
      // Concepto
      concepto: receiptData.concept || '',
      descripcion: receiptData.description || '',
      
      // Pago
      forma_pago: receiptData.payment_method || 'Efectivo',
      referencia: receiptData.reference || '',
      
      // Empresa
      empresa_nombre: receiptData.company_name || 'ESMARK',
      empresa_rtn: receiptData.company_rtn || '',
      
      // Emisor
      emitido_por: receiptData.issued_by || '',
      firma: '[FIRMA]'
    };

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_type: 'recibo',
          data: templateData
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar recibo');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating receipt from template:', error);
    throw error;
  }
}

/**
 * Generar cotización usando plantilla activa
 */
export async function generateQuoteFromTemplate(quoteData: any) {
  try {
    const templateData = {
      // Cotización
      cotizacion_numero: quoteData.quote_number || '',
      cotizacion_fecha: quoteData.quote_date || new Date().toISOString().split('T')[0],
      cotizacion_vencimiento: quoteData.expiration_date || '',
      
      // Cliente
      cliente_nombre: quoteData.customer_name || '',
      cliente_telefono: quoteData.customer_phone || '',
      cliente_email: quoteData.customer_email || '',
      cliente_direccion: quoteData.customer_address || '',
      
      // Items
      items: quoteData.items || [],
      
      // Montos
      subtotal: quoteData.subtotal || 0,
      isv: quoteData.tax_amount || 0,
      total: quoteData.total || 0,
      
      // Empresa
      empresa_nombre: quoteData.company_name || 'ESMARK',
      empresa_telefono: quoteData.company_phone || '',
      empresa_email: quoteData.company_email || '',
      
      // Otros
      notas: quoteData.notes || '',
      terminos: quoteData.terms || 'Cotización válida por 15 días',
      tiempo_entrega: quoteData.delivery_time || '',
      
      // Vendedor
      vendedor: quoteData.salesperson || '',
      firma: '[FIRMA]'
    };

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_type: 'cotizacion',
          data: templateData
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al generar cotización');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating quote from template:', error);
    throw error;
  }
}

/**
 * Verificar si hay plantilla activa para un tipo
 */
export async function hasActiveTemplate(type: 'factura' | 'recibo' | 'cotizacion'): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates?type=${type}&active=true`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.templates && data.templates.length > 0;
  } catch (error) {
    console.error('Error checking active template:', error);
    return false;
  }
}

/**
 * Obtener plantilla activa para un tipo
 */
export async function getActiveTemplate(type: 'factura' | 'recibo' | 'cotizacion') {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates?type=${type}&active=true`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener plantilla activa');
    }

    const data = await response.json();
    return data.templates && data.templates.length > 0 ? data.templates[0] : null;
  } catch (error) {
    console.error('Error getting active template:', error);
    throw error;
  }
}

/**
 * Validar datos antes de generar documento
 */
export async function validateBeforeGenerate(
  type: 'factura' | 'recibo' | 'cotizacion',
  data: any
) {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/templates/validate-data`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_type: type,
          data
        })
      }
    );

    if (!response.ok) {
      throw new Error('Error al validar datos');
    }

    const result = await response.json();
    return result.validation;
  } catch (error) {
    console.error('Error validating data:', error);
    throw error;
  }
}

/**
 * Obtener historial de documentos generados
 */
export async function getGeneratedDocuments(type?: 'factura' | 'recibo' | 'cotizacion', limit: number = 50) {
  try {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('limit', limit.toString());

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/esmark-sync/documents/history?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener historial');
    }

    const data = await response.json();
    return data.documents || [];
  } catch (error) {
    console.error('Error getting document history:', error);
    throw error;
  }
}
