/**
 * Sistema de impresion de recibos para Esmark Media
 * Genera recibos profesionales con la plantilla corporativa
 */

import ReactDOM from 'react-dom/client';
import { createElement } from 'react';
import ReceiptTemplate from './ReceiptTemplate';
import { amountToWords } from '../../utils/number-to-words';
import { getActiveTemplate } from '../../utils/template-integration';
import { generateReceiptPDF } from '../../utils/pdf-generator';
import { safeParse } from '../../utils/safe-parse';
import { api } from '../../utils/api';

interface PrintReceiptOptions {
  order: any;
  income: {
    id: string;
    order_id: string;
    order_number: string;
    customer_name: string;
    date: string;
    amount: number;
    payment_type: string;
    payment_status: string;
    doc_type: string;
  };
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

/**
 * Imprime un recibo usando la plantilla corporativa de Esmark Media
 */
export async function printReceipt(options: PrintReceiptOptions): Promise<void> {
  const { order, income, onSuccess, onError } = options;
  const receiptNumber = order?.doc_number || order?.receipt_correlative || income.order_number;

  const fetchAsDataUrl = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('No se pudo descargar la plantilla');
    }
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer la plantilla'));
      reader.readAsDataURL(blob);
    });
  };

  try {
    // Generar concepto basado en los items del pedido
    let concept = '';
    if (order.items && order.items.length > 0) {
      if (order.items.length === 1) {
        const item = order.items[0];
        concept = item.descripcion || item.product_name || 'Producto';
      } else {
        concept = `${order.items.length} productos: ${order.items.slice(0, 2).map((item: any) => 
          item.descripcion || item.product_name || 'Producto'
        ).join(', ')}${order.items.length > 2 ? '...' : ''}`;
      }
    } else {
      concept = 'Pago de pedido';
    }

    // Calcular saldos
    const total = order.total || 0;
    // El abono es el monto especifico de este pago (del income)
    const payment = income.amount || 0;
    // El monto total pagado hasta ahora (acumulado)
    const paidAmount = order.paid_amount || 0;
    // El saldo anterior era: total - (paidAmount - payment actual)
    const previousBalance = total - (paidAmount - payment);
    // El saldo actual es: total - paidAmount
    const currentBalance = total - paidAmount;

    // Convertir el monto del pago actual a palabras
    const amountInWordsText = amountToWords(payment);

    let settings: any = {};
    try {
      settings = (await api.getSettings()).settings || {};
    } catch {
      settings = safeParse(localStorage.getItem('esmark_settings'), {});
    }
    let activeTemplate: any = null;

    try {
      activeTemplate = await getActiveTemplate('recibo');
    } catch (error) {
      console.warn('No se pudo cargar plantilla activa de recibo:', error);
    }

    let templateDataUrl: string | null = null;
    let templateFields: any[] = [];
    let templateWidthPx: number | undefined;
    let templateHeightPx: number | undefined;
    let templateDpi: number | undefined;
    let templateMimeType: string | undefined;

    if (activeTemplate?.preview_url) {
      templateDataUrl = await fetchAsDataUrl(activeTemplate.preview_url);
      templateFields = activeTemplate.fields || [];
      templateWidthPx = activeTemplate.width_px;
      templateHeightPx = activeTemplate.height_px;
      templateDpi = activeTemplate.dpi;
      templateMimeType = activeTemplate.mime_type;
    }

    let templateConfig: any = null;
    try {
      templateConfig = await api.getAppSetting('receipt_template', null);
    } catch {
      const storedTemplate = localStorage.getItem('receipt_template');
      templateConfig = storedTemplate ? safeParse(storedTemplate, null) : null;
    }

    if (!templateDataUrl && templateConfig?.pdfDataUrl) {
      templateDataUrl = templateConfig.pdfDataUrl;
      templateFields = templateConfig.fields || [];
      templateWidthPx = templateConfig.widthPx;
      templateHeightPx = templateConfig.heightPx;
      templateDpi = templateConfig.dpi;
      templateMimeType = templateConfig.mimeType;
    }

    if (templateDataUrl) {
      const receiptData = {
        receipt_number: receiptNumber,
        receipt_date: income.date || order.created_at,
        series: order.doc_series || '',
        customer_name: order.customer_name || income.customer_name || 'Cliente',
        amount: payment,
        amount_in_words: amountInWordsText,
        concept,
        description: order.notes || '',
        payment_method: income.payment_type || order.payment_type || '',
        reference: order.payment_reference || '',
        previous_balance: previousBalance,
        payment,
        current_balance: currentBalance,
        order_number: income.order_number,
        issued_by: order.created_by_name || 'Sistema'
      };

      const defaultFontFamily =
        activeTemplate?.default_font_family ||
        templateConfig?.defaultFontFamily ||
        'Helvetica';
      const defaultFontSize =
        activeTemplate?.default_font_size ||
        templateConfig?.defaultFontSize ||
        10;

      const pdfConfig = {
        ...(settings.pdf_config || {}),
        company_name: settings.company_name || 'ESMARK',
        company_rtn: settings.company_rtn || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        company_website: settings.company_website || '',
        receipt_template: templateDataUrl,
        receipt_fields: templateFields,
        default_font_family: defaultFontFamily,
        default_font_size: defaultFontSize,
        template_width_px: templateWidthPx,
        template_height_px: templateHeightPx,
        template_dpi: templateDpi,
        template_mime_type: templateMimeType
      };

      const pdfBytes = await generateReceiptPDF(receiptData, pdfConfig);
      if (pdfBytes) {
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresion. Permite ventanas emergentes.');
        }

        const printHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Recibo #${receiptNumber} - Esmark Media</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; background: #f5f5f5; }
                .print-controls {
                  padding: 12px;
                  background: white;
                  border-bottom: 2px solid #E31E24;
                  text-align: center;
                }
                .print-controls button {
                  margin: 0 8px;
                  padding: 10px 20px;
                  font-size: 14px;
                  border: none;
                  border-radius: 5px;
                  cursor: pointer;
                  font-weight: 500;
                }
                .btn-print { background: #E31E24; color: white; }
                .btn-close { background: #666; color: white; }
                .receipt-frame {
                  width: 100%;
                  height: calc(100vh - 60px);
                  border: none;
                  background: white;
                }
                @media print {
                  .print-controls { display: none !important; }
                  body { background: white; }
                  .receipt-frame { height: 100vh; }
                }
              </style>
            </head>
            <body>
              <div class="print-controls">
                <button onclick="document.getElementById('receipt-frame').contentWindow.print()" class="btn-print">
                  Imprimir recibo
                </button>
                <button onclick="window.close()" class="btn-close">
                  Cerrar
                </button>
              </div>
              <iframe id="receipt-frame" class="receipt-frame" src="${url}"></iframe>
              <script>
                window.addEventListener('beforeunload', () => {
                  try { URL.revokeObjectURL('${url}'); } catch (e) {}
                });
              </script>
            </body>
          </html>
        `;

        printWindow.document.write(printHTML);
        printWindow.document.close();

        if (onSuccess) {
          onSuccess(`OK. Recibo generado: #${receiptNumber}`);
        }
        return;
      }
    }
    
    console.log('Datos del recibo:', {
      total,
      payment,
      paidAmount,
      previousBalance,
      currentBalance,
      amountInWordsText
    });

    // Crear contenedor temporal para renderizar el componente
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    document.body.appendChild(tempDiv);

    // Renderizar el componente React
    const root = ReactDOM.createRoot(tempDiv);
    
    await new Promise<void>((resolve) => {
      root.render(
        createElement(ReceiptTemplate, {
          receiptNumber,
          date: new Date(order.created_at),
          customerName: order.customer_name || 'Cliente',
          amount: payment,
          amountInWords: amountInWordsText,
          concept: concept,
          previousBalance: previousBalance,
          payment: payment,
          currentBalance: currentBalance,
          orderNumber: income.order_number
        })
      );
      // Esperar a que React renderice
      setTimeout(resolve, 100);
    });

    // Obtener el HTML renderizado
    const receiptElement = tempDiv.querySelector('#receipt-template');
    if (!receiptElement) {
      throw new Error('No se pudo renderizar la plantilla del recibo');
    }

    const receiptHTML = receiptElement.outerHTML;

    // Limpiar el DOM temporal
    root.unmount();
    document.body.removeChild(tempDiv);

    // Crear ventana de impresion con el recibo
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      throw new Error('No se pudo abrir la ventana de impresion. Permite ventanas emergentes.');
    }

    // HTML completo para la ventana de impresion
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Recibo #${receiptNumber} - Esmark Media</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif; 
              padding: 0;
              background: #f5f5f5;
              margin: 0;
            }
            .print-controls {
              padding: 15px;
              background: white;
              border-bottom: 2px solid #E31E24;
              text-align: center;
            }
            .print-controls button {
              margin: 0 10px;
              padding: 12px 24px;
              font-size: 14px;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-weight: 500;
            }
            .btn-print {
              background: #E31E24;
              color: white;
            }
            .btn-print:hover {
              background: #B71C1C;
            }
            .btn-close {
              background: #666;
              color: white;
            }
            .btn-close:hover {
              background: #333;
            }
            .receipt-container {
              padding: 20px;
              max-width: 220mm;
              margin: 0 auto;
            }
            @media print {
              .print-controls { display: none !important; }
              body { 
                background: white;
                padding: 0;
              }
              .receipt-container {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-controls">
            <button onclick="window.print()" class="btn-print">
              Imprimir recibo
            </button>
            <button onclick="window.close()" class="btn-close">
              Cerrar
            </button>
          </div>
          
          <div class="receipt-container">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();

    if (onSuccess) {
      onSuccess(`OK. Recibo generado: #${receiptNumber}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al imprimir recibo';
    console.error('Error al imprimir recibo:', errorMessage);

    if (onError) {
      onError(errorMessage);
    } else {
      alert(`Error: ${errorMessage}`);
    }
  }
}


