import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PDFDocument, rgb } from 'pdf-lib'; // ✨ NUEVO: Para trabajar con plantillas PDF
import { sanitizeDataForPDF } from './pdf-safe-renderer';

interface QuoteData {
  number: string;
  fecha: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  items: any[];
  subtotal: number;
  impuesto: number;
  total: number;
  discount?: number;
  descuento?: number;
  notes?: string;
  valid_until?: string;
}

interface ReceiptData {
  receipt_number: string;
  receipt_date?: string | Date;
  series?: string;
  customer_name: string;
  amount: number;
  amount_in_words?: string;
  concept?: string;
  description?: string;
  payment_method?: string;
  reference?: string;
  previous_balance?: number;
  payment?: number;
  current_balance?: number;
  order_number?: string;
  issued_by?: string;
}

interface PDFConfig {
  company_name?: string;
  company_rtn?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  company_website?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  terms?: string;
  footer_notes?: string;
  quote_template?: string; // ✨ NUEVO: Plantilla personalizada de cotización
  quote_fields?: any[]; // ✨ NUEVO: Campos configurados de la plantilla
  receipt_template?: string;
  receipt_fields?: any[];
  default_font_family?: string;
  default_font_size?: number;
  template_width_px?: number;
  template_height_px?: number;
  template_dpi?: number;
  template_mime_type?: string;
  authorized_by_name?: string;
  authorized_by_title?: string;
}

export const generateQuotePDF = async (quote: QuoteData, config?: PDFConfig): Promise<void> => {
  try {
    const sanitizedQuote = sanitizeDataForPDF(quote);
    const pdfConfig: PDFConfig = {
      company_name: config?.company_name || 'ESMARK',
      company_rtn: config?.company_rtn || '',
      company_address: config?.company_address || 'Honduras',
      company_phone: config?.company_phone || '',
      company_email: config?.company_email || '',
      company_website: config?.company_website || '',
      logo_url: config?.logo_url || '',
      terms: config?.terms || 'La cotizacion tiene una validez de 15 dias calendario.\nTiempo de entrega sujeto a confirmacion de diseno, materiales y pago.\nForma de pago: 50% de anticipo y 50% contra entrega.',
      footer_notes: config?.footer_notes || 'Gracias por su preferencia',
      authorized_by_name: config?.authorized_by_name || config?.company_name || 'ESMARK',
      authorized_by_title: config?.authorized_by_title || 'Autorizado',
      ...config,
    };

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageX = 8.9;
    const pageY = 8.9;
    const pageW = pageWidth - pageX * 2;
    const pageH = pageHeight - pageY * 2;
    const innerX = pageX + 4.2;
    const innerY = pageY + 4.2;
    const innerW = pageW - 8.4;

    const blue = '#172554';
    const blueMid = '#1E40AF';
    const slate = '#334155';
    const slateLight = '#E2E8F0';

    setDrawHex(doc, blue);
    doc.setLineWidth(0.7);
    doc.roundedRect(pageX, pageY, pageW, pageH, 4.5, 4.5);

    drawQuoteHeader(doc, sanitizedQuote, pdfConfig, innerX, innerY, innerW, blue, blueMid, slate, slateLight);
    const clientY = innerY + 48;
    drawQuoteClient(doc, sanitizedQuote, innerX, clientY, innerW, blue, slate, slateLight);

    const tableY = clientY + 31;
    const lowerY = pageHeight - 81;
    drawQuoteItemsTable(doc, sanitizedQuote.items || [], innerX, tableY, innerW, lowerY - 5, blue, slate, slateLight);

    drawQuoteLowerSection(doc, sanitizedQuote, pdfConfig, innerX, lowerY, innerW, blue, blueMid, slate, slateLight);
    drawQuoteFooter(doc, pdfConfig, pageX, pageWidth, pageHeight, blue);

    const quoteNumber = getQuoteNumber(sanitizedQuote);
    doc.save(`Cotizacion-${quoteNumber}.pdf`);
  } catch (error: any) {
    console.error('Error generando PDF de cotizacion:', error);

    if (
      error.name === 'DataCloneError' ||
      error.message?.includes('out of memory') ||
      error.message?.includes('cannot be cloned')
    ) {
      throw new Error(
        'El documento es demasiado grande. Por favor, reduce el numero de productos e intenta nuevamente.'
      );
    }

    throw error;
  }
};

function drawQuoteHeader(
  doc: jsPDF,
  quote: any,
  config: PDFConfig,
  x: number,
  y: number,
  width: number,
  blue: string,
  blueMid: string,
  slate: string,
  slateLight: string
) {
  drawRoundedBox(doc, x, y, width, 42, slateLight, 3);
  const logoX = x + 4;
  const logoY = y + 7;
  const logoW = 28;
  const logoH = 20;

  if (config.logo_url) {
    try {
      addContainedImage(doc, config.logo_url, getDataUrlImageFormat(config.logo_url), logoX, logoY, logoW, logoH);
    } catch (error) {
      console.warn('No se pudo cargar el logo en la cotizacion:', error);
      drawLogoFallback(doc, logoX, logoY, logoW, logoH, blue);
    }
  } else {
    drawLogoFallback(doc, logoX, logoY, logoW, logoH, blue);
  }

  const companyX = x + 38;
  const companyW = width - 109;
  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(18);
  doc.text(firstLine(doc, config.company_name || 'ESMARK', companyW), companyX, y + 12);

  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blueMid);
  doc.setFontSize(8.5);
  doc.text('Disenos personalizados - Impresion - Sublimacion', companyX, y + 18, { maxWidth: companyW });

  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(7.5);
  doc.text(`Direccion: ${config.company_address || '-'}`, companyX, y + 24, { maxWidth: companyW });
  doc.text(`Tel: ${config.company_phone || '-'}   Correo: ${config.company_email || '-'}`, companyX, y + 29.5, { maxWidth: companyW });
  doc.text(`RTN: ${config.company_rtn || '-'}`, companyX, y + 35, { maxWidth: companyW });

  const boxW = 68;
  const boxX = x + width - boxW - 4;
  setFillHex(doc, '#F8FAFC');
  setDrawHex(doc, slateLight);
  doc.roundedRect(boxX, y + 5, boxW, 29, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(17);
  doc.text('Cotizacion', boxX + boxW - 5, y + 14, { align: 'right' });

  doc.setFontSize(7.5);
  setTextHex(doc, slate);
  const number = getQuoteNumber(quote);
  doc.text(`No. ${number}`, boxX + boxW - 5, y + 20, { align: 'right' });
  doc.text(`Fecha: ${formatQuoteDate(quote.fecha || quote.created_at)}`, boxX + boxW - 5, y + 25, { align: 'right' });
  doc.text(`Valida hasta: ${formatQuoteValidUntil(quote)}`, boxX + boxW - 5, y + 30, { align: 'right' });
}

function drawQuoteClient(doc: jsPDF, quote: any, x: number, y: number, width: number, blue: string, slate: string, slateLight: string) {
  drawRoundedBox(doc, x, y, width, 24, slateLight, 3);
  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(9);
  doc.text('Cliente', x + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(8.2);
  const name = quote.customer_name || quote.cliente_nombre || quote.cliente?.nombre || 'Consumidor final';
  const phone = quote.customer_phone || quote.cliente_telefono || quote.cliente?.telefono || '-';
  const email = quote.customer_email || quote.cliente_email || quote.cliente?.correo || '-';
  doc.text(`Nombre: ${name}`, x + 4, y + 13, { maxWidth: width - 8 });
  doc.text(`Telefono: ${phone}`, x + 4, y + 19, { maxWidth: width / 2 - 8 });
  doc.text(`Correo: ${email}`, x + width / 2, y + 19, { maxWidth: width / 2 - 8 });
}

function drawQuoteItemsTable(
  doc: jsPDF,
  items: any[],
  x: number,
  y: number,
  width: number,
  maxY: number,
  blue: string,
  slate: string,
  slateLight: string
) {
  const qtyW = 18;
  const priceW = 30;
  const totalW = 31;
  const descW = width - qtyW - priceW - totalW;
  const headerH = 10;
  const usableItems = items.slice(0, 12);
  const compact = usableItems.length > 6;
  const rowH = compact ? 11.4 : 14;

  setFillHex(doc, blue);
  doc.roundedRect(x, y, width, headerH, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(255, 255, 255);
  doc.text('Descripcion', x + 4, y + 6.5);
  doc.text('Cant.', x + descW + qtyW / 2, y + 6.5, { align: 'center' });
  doc.text('Precio Unit.', x + descW + qtyW + priceW - 3, y + 6.5, { align: 'right' });
  doc.text('Total', x + width - 3, y + 6.5, { align: 'right' });

  let rowY = y + headerH;
  usableItems.forEach((item, index) => {
    if (rowY + rowH > maxY) return;
    setFillHex(doc, index % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
    doc.rect(x, rowY, width, rowH, 'F');
    setDrawHex(doc, slateLight);
    doc.line(x, rowY + rowH, x + width, rowY + rowH);

    const qty = Number(item.qty || item.unidades || item.cantidad || 1);
    const total = Number(item.subtotal || item.total || item.precio_total || 0);
    const price = Number(item.precio_unitario || item.precio || item.unit_price || (qty ? total / qty : 0));
    const title = getQuoteItemTitle(item, index);
    const detail = getQuoteItemDetail(item);

    doc.setFont('helvetica', 'bold');
    setTextHex(doc, '#0F172A');
    doc.setFontSize(compact ? 7 : 7.8);
    doc.text(firstLine(doc, title, descW - 7), x + 4, rowY + 4.8);

    if (detail) {
      doc.setFont('helvetica', 'normal');
      setTextHex(doc, slate);
      doc.setFontSize(compact ? 6.1 : 6.7);
      doc.text(firstLine(doc, detail, descW - 7), x + 4, rowY + 9.1);
    }

    doc.setFont('helvetica', 'normal');
    setTextHex(doc, slate);
    doc.setFontSize(7.4);
    doc.text(String(qty), x + descW + qtyW / 2, rowY + 7.3, { align: 'center' });
    doc.text(formatQuoteMoney(price), x + descW + qtyW + priceW - 3, rowY + 7.3, { align: 'right' });
    doc.text(formatQuoteMoney(total), x + width - 3, rowY + 7.3, { align: 'right' });
    rowY += rowH;
  });

  if (items.length > usableItems.length) {
    doc.setFont('helvetica', 'italic');
    setTextHex(doc, slate);
    doc.setFontSize(7);
    doc.text(`Se muestran ${usableItems.length} de ${items.length} productos.`, x + 4, rowY + 5);
    rowY += 7;
  }

  return rowY;
}

function drawQuoteLowerSection(
  doc: jsPDF,
  quote: any,
  config: PDFConfig,
  x: number,
  y: number,
  width: number,
  blue: string,
  blueMid: string,
  slate: string,
  slateLight: string
) {
  const leftW = width - 75;
  const rightW = 68;
  drawRoundedBox(doc, x, y, leftW, 39, slateLight, 3);

  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(8.5);
  doc.text('Notas', x + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(6.8);
  const noteLines = doc.splitTextToSize(quote.notes || 'Precios expresados en Lempiras (L).', leftW - 8).slice(0, 2);
  doc.text(noteLines, x + 4, y + 12);

  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(8.5);
  doc.text('Terminos', x + 4, y + 23);
  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(6.6);
  getTerms(config.terms).slice(0, 3).forEach((term, index) => {
    doc.text(`- ${firstLine(doc, term, leftW - 10)}`, x + 5, y + 28 + index * 4.2);
  });

  const totalsX = x + width - rightW;
  drawRoundedBox(doc, totalsX, y, rightW, 39, slateLight, 3);
  const subtotal = Number(quote.subtotal || 0);
  const discount = Number(quote.discount || quote.descuento || 0);
  const isv = Number(quote.impuesto || quote.isv || 0);
  const total = Number(quote.total || subtotal - discount + isv);

  drawTotalLine(doc, 'Subtotal', subtotal, totalsX + 4, y + 8, rightW - 8, slate);
  drawTotalLine(doc, 'Descuento', discount, totalsX + 4, y + 15, rightW - 8, slate);
  drawTotalLine(doc, 'ISV', isv, totalsX + 4, y + 22, rightW - 8, slate);

  setFillHex(doc, blue);
  doc.roundedRect(totalsX + 3.5, y + 26.5, rightW - 7, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.setTextColor(255, 255, 255);
  doc.text('Total', totalsX + 6, y + 32.1);
  doc.text(formatQuoteMoney(total), totalsX + rightW - 6, y + 32.1, { align: 'right' });

  const authY = y + 43;
  setDrawHex(doc, slateLight);
  doc.line(totalsX + 8, authY + 9, totalsX + rightW - 8, authY + 9);
  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blueMid);
  doc.setFontSize(7.5);
  doc.text(config.authorized_by_name || 'ESMARK', totalsX + rightW / 2, authY + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(6.7);
  doc.text(config.authorized_by_title || 'Autorizado', totalsX + rightW / 2, authY + 18, { align: 'center' });
}

function drawQuoteFooter(doc: jsPDF, config: PDFConfig, x: number, pageWidth: number, pageHeight: number, blue: string) {
  setFillHex(doc, blue);
  doc.roundedRect(x, pageHeight - 17.5, pageWidth - x * 2, 8.5, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(config.footer_notes || 'Gracias por su preferencia', pageWidth / 2, pageHeight - 12.1, { align: 'center' });
}

function drawRoundedBox(doc: jsPDF, x: number, y: number, width: number, height: number, borderHex: string, radius: number) {
  doc.setFillColor(255, 255, 255);
  setDrawHex(doc, borderHex);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, radius, radius, 'FD');
}

function addContainedImage(
  doc: jsPDF,
  imageData: string,
  format: 'PNG' | 'JPEG' | 'WEBP',
  x: number,
  y: number,
  maxW: number,
  maxH: number
) {
  const props = (doc as any).getImageProperties?.(imageData);
  const imageW = Number(props?.width) || maxW;
  const imageH = Number(props?.height) || maxH;
  const scale = Math.min(maxW / imageW, maxH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  const centeredX = x + (maxW - width) / 2;
  const centeredY = y + (maxH - height) / 2;

  doc.addImage(imageData, format, centeredX, centeredY, width, height);
}

function drawLogoFallback(doc: jsPDF, x: number, y: number, width: number, height: number, blue: string) {
  doc.setFont('helvetica', 'bold');
  setTextHex(doc, blue);
  doc.setFontSize(9);
  doc.text('LOGO', x + width / 2, y + height / 2 + 2, { align: 'center' });
}

function drawTotalLine(doc: jsPDF, label: string, value: number, x: number, y: number, width: number, slate: string) {
  doc.setFont('helvetica', 'normal');
  setTextHex(doc, slate);
  doc.setFontSize(7.5);
  doc.text(`${label}:`, x, y);
  doc.text(formatQuoteMoney(value), x + width, y, { align: 'right' });
}

function getQuoteNumber(quote: any) {
  return quote.number || quote.numero || quote.quote_number || 'COT-000001';
}

function formatQuoteDate(value?: string | Date | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
}

function formatQuoteValidUntil(quote: any) {
  if (quote.valid_until || quote.validaHasta) {
    return formatQuoteDate(quote.valid_until || quote.validaHasta);
  }

  const baseDate = quote.fecha || quote.created_at ? new Date(quote.fecha || quote.created_at) : new Date();
  if (Number.isNaN(baseDate.getTime())) return '';
  baseDate.setDate(baseDate.getDate() + 15);
  return formatQuoteDate(baseDate);
}

function formatQuoteMoney(value?: number | null) {
  return `L ${Number(value || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getQuoteItemTitle(item: any, index: number) {
  return item.description || item.descripcion || item.product_name || item.nombre || `Producto ${index + 1}`;
}

function getQuoteItemDetail(item: any) {
  const details: string[] = [];
  if (item.detail || item.detalle) details.push(item.detail || item.detalle);
  if (item.category === 'camisa') {
    if (item.shirt_type) details.push(`Tipo: ${item.shirt_type}`);
    if (item.fabric_type) details.push(`Tela: ${item.fabric_type}`);
    if (item.shirt_color) details.push(`Color: ${item.shirt_color}`);
    if (item.shirt_size) details.push(`Talla: ${item.shirt_size}`);
    if (item.design_level) details.push(`Diseno: ${item.design_level}`);
    if (item.application_type) details.push(`Aplicacion: ${item.application_type}`);
    if (item.shirt_sides) details.push(`Lados: ${item.shirt_sides}`);
  }
  if (['banner', 'stickers', 'pvc', 'carnet', 'reconocimiento'].includes(item.category)) {
    if (item.ancho && item.alto) details.push(`Medidas: ${item.ancho} x ${item.alto} ${item.unidad || 'cm'}`);
    if (item.category === 'pvc' && item.pvc_thickness) details.push(`Grosor: ${item.pvc_thickness}`);
  }
  return details.join(' | ');
}

function getTerms(terms?: string) {
  return (terms || '')
    .split(/\n|\r|\u2022|-/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function firstLine(doc: jsPDF, text: string, maxWidth: number) {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  return Array.isArray(lines) ? lines[0] || '' : String(lines || '');
}

function getDataUrlImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const lower = dataUrl.toLowerCase();
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'JPEG';
  if (lower.includes('image/webp')) return 'WEBP';
  return 'PNG';
}

function setFillHex(doc: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
}

function setDrawHex(doc: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  doc.setDrawColor(rgb.r, rgb.g, rgb.b);
}

function setTextHex(doc: jsPDF, hex: string) {
  const rgb = hexToRgb(hex);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
}

export const generateReceiptPDF = async (
  receipt: ReceiptData,
  config?: PDFConfig
): Promise<Uint8Array | null> => {
  try {
    const sanitizedReceipt = sanitizeDataForPDF(receipt);
    if (!config?.receipt_template) {
      return null;
    }

    const pdfConfig: PDFConfig = {
      company_name: config?.company_name || 'EsMark Media',
      company_rtn: config?.company_rtn || '',
      company_address: config?.company_address || 'Honduras',
      company_phone: config?.company_phone || '+504 0000-0000',
      company_email: config?.company_email || 'info@esmarkmedia.com',
      company_website: config?.company_website || '',
      ...config
    };

    const receiptTemplate = pdfConfig.receipt_template;
    if (!receiptTemplate) {
      return null;
    }

    let pdfBytes: Uint8Array | ArrayBuffer;
    if (receiptTemplate.startsWith('data:image')) {
      const pdfDoc = await PDFDocument.create();
      const templateDpi = pdfConfig.template_dpi || 96;
      const pxToPt = (px: number) => (px / templateDpi) * 72;

      let image;
      if (receiptTemplate.includes('image/png')) {
        image = await pdfDoc.embedPng(receiptTemplate);
      } else {
        image = await pdfDoc.embedJpg(receiptTemplate);
      }

      const imgDims = image.scale(1);
      const pageWidth = pxToPt(pdfConfig.template_width_px || imgDims.width);
      const pageHeight = pxToPt(pdfConfig.template_height_px || imgDims.height);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });

      pdfBytes = await pdfDoc.save();
    } else {
      const base64Data = receiptTemplate.split(',')[1];
      pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const fields = Array.isArray(pdfConfig.receipt_fields) ? pdfConfig.receipt_fields : [];

    const formatCurrency = (value?: number | null) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '';
      return `L ${value.toFixed(2)}`;
    };

    const parsedDate = sanitizedReceipt.receipt_date
      ? new Date(sanitizedReceipt.receipt_date)
      : new Date();

    const formattedDate = Number.isNaN(parsedDate.getTime())
      ? format(new Date(), 'dd/MM/yyyy', { locale: es })
      : format(parsedDate, 'dd/MM/yyyy', { locale: es });

    const getFieldValue = (fieldKey: string): string => {
      const normalizedKey = fieldKey?.toLowerCase().trim();
      switch (normalizedKey) {
        case 'recibo_numero':
        case 'receipt_number':
        case 'numero_recibo':
        case 'doc_number':
          return sanitizedReceipt.receipt_number || '';
        case 'recibo_fecha':
        case 'receipt_date':
        case 'fecha':
          return formattedDate;
        case 'recibo_serie':
        case 'serie':
          return sanitizedReceipt.series || '';
        case 'cliente_nombre':
        case 'customer_name':
          return sanitizedReceipt.customer_name || '';
        case 'monto':
        case 'amount':
        case 'total':
          return formatCurrency(sanitizedReceipt.amount);
        case 'monto_letras':
        case 'amount_in_words':
          return sanitizedReceipt.amount_in_words || '';
        case 'concepto':
          return sanitizedReceipt.concept || '';
        case 'descripcion':
          return sanitizedReceipt.description || '';
        case 'forma_pago':
        case 'payment_method':
          return sanitizedReceipt.payment_method || '';
        case 'referencia':
        case 'payment_reference':
          return sanitizedReceipt.reference || '';
        case 'saldo_anterior':
        case 'previous_balance':
          return formatCurrency(sanitizedReceipt.previous_balance);
        case 'abono':
        case 'payment':
          return formatCurrency(sanitizedReceipt.payment);
        case 'saldo_actual':
        case 'current_balance':
          return formatCurrency(sanitizedReceipt.current_balance);
        case 'pedido_numero':
        case 'order_number':
          return sanitizedReceipt.order_number || '';
        case 'emitido_por':
        case 'issued_by':
          return sanitizedReceipt.issued_by || '';
        case 'empresa_nombre':
        case 'company_name':
          return pdfConfig.company_name || '';
        case 'empresa_rtn':
        case 'company_rtn':
          return pdfConfig.company_rtn || '';
        case 'empresa_direccion':
        case 'company_address':
          return pdfConfig.company_address || '';
        case 'empresa_telefono':
        case 'company_phone':
          return pdfConfig.company_phone || '';
        case 'empresa_email':
        case 'company_email':
          return pdfConfig.company_email || '';
        case 'empresa_website':
        case 'company_website':
          return pdfConfig.company_website || '';
        default:
          return '';
      }
    };

    const fontCache = new Map<string, any>();
    const resolveFontFamily = (field: any) =>
      field?.font_family ||
      field?.fontFamily ||
      pdfConfig.default_font_family ||
      'Helvetica';
    const resolveFontSize = (field: any) =>
      field?.font_size ||
      field?.fontSize ||
      pdfConfig.default_font_size ||
      10;
    const resolveFontName = (family: string, bold: boolean) => {
      const normalized = family.toLowerCase();
      if (normalized.includes('times')) {
        return bold ? 'Times-Bold' : 'Times-Roman';
      }
      if (normalized.includes('courier')) {
        return bold ? 'Courier-Bold' : 'Courier';
      }
      return bold ? 'Helvetica-Bold' : 'Helvetica';
    };
    const getFontForField = async (field: any) => {
      const family = resolveFontFamily(field);
      const bold = Boolean(field?.bold);
      const fontName = resolveFontName(family, bold);
      if (fontCache.has(fontName)) {
        return fontCache.get(fontName);
      }
      const font = await pdfDoc.embedFont(fontName as any);
      fontCache.set(fontName, font);
      return font;
    };

    const wrapTextToWidth = (text: string, font: any, fontSize: number, maxWidth: number) => {
      if (!maxWidth || maxWidth <= 0) return [text];
      const parts = text.split('\n').map((line) => line.trim());
      const lines: string[] = [];

      parts.forEach((part) => {
        if (!part) {
          lines.push('');
          return;
        }
        const words = part.split(/\s+/);
        let current = '';
        words.forEach((word) => {
          const test = current ? `${current} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
            current = test;
          } else {
            if (current) {
              lines.push(current);
            }
            current = word;
          }
        });
        if (current) {
          lines.push(current);
        }
      });

      return lines;
    };

    const templateWidthPx = pdfConfig.template_width_px;
    const templateHeightPx = pdfConfig.template_height_px;
    const usePixelCoords = Boolean(templateWidthPx && templateHeightPx);

    for (const field of fields) {
      const fieldKey = field.field_key || field.key || field.type || '';
      const value = getFieldValue(fieldKey);
      if (!value) continue;

      const x = usePixelCoords
        ? (field.x / templateWidthPx!) * width
        : (field.x / 100) * width;
      const y = usePixelCoords
        ? height - ((field.y / templateHeightPx!) * height)
        : height - ((field.y / 100) * height);
      const fontSize = resolveFontSize(field);
      const font = await getFontForField(field);
      const fieldWidth = usePixelCoords && field.width
        ? (field.width / templateWidthPx!) * width
        : 0;
      const maxWidth = fieldWidth || 0;
      const lines = maxWidth ? wrapTextToWidth(value, font, fontSize, maxWidth) : value.split('\n');
      const lineHeight = fontSize + 2;
      const maxLines = usePixelCoords && field.height
        ? Math.max(1, Math.floor((field.height / templateHeightPx!) * height / lineHeight))
        : lines.length;

      lines.slice(0, maxLines).forEach((line, index) => {
        const lineY = y - (index * lineHeight);
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        let alignedX = x;
        if (fieldWidth) {
          if (field.align === 'center') {
            alignedX = x + Math.max(0, (fieldWidth - textWidth) / 2);
          } else if (field.align === 'right') {
            alignedX = x + Math.max(0, fieldWidth - textWidth);
          }
        }
        firstPage.drawText(line, {
          x: alignedX,
          y: lineY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return modifiedPdfBytes;
  } catch (error) {
    console.error('Error generando PDF de recibo:', error);
    return null;
  }
};

// Función auxiliar para convertir hex a RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 214, g: 28, b: 28 }; // Color por defecto (rojo EsMark)
}

// ✨ NUEVO: Función para generar PDF a partir de una plantilla
async function generateQuoteFromTemplate(quote: QuoteData, config: PDFConfig): Promise<void> {
  try {
    // Verificar que tenemos plantilla y campos
    if (!config.quote_template) {
      console.warn('Plantilla no configurada. Usando generación por defecto.');
      const tempConfig = { ...config };
      delete tempConfig.quote_template;
      return await generateQuotePDF(quote, tempConfig);
    }

    const quoteFields = Array.isArray(config.quote_fields) ? config.quote_fields : [];

    // Si la plantilla es una imagen, convertirla a PDF primero
    let pdfBytes: Uint8Array | ArrayBuffer;
    
    if (config.quote_template.startsWith('data:image')) {
      const pdfDoc = await PDFDocument.create();
      const templateDpi = config.template_dpi || 96;
      const pxToPt = (px: number) => (px / templateDpi) * 72;

      let image;
      if (config.quote_template.includes('image/png')) {
        image = await pdfDoc.embedPng(config.quote_template);
      } else {
        image = await pdfDoc.embedJpg(config.quote_template);
      }

      const imgDims = image.scale(1);
      const pageWidth = pxToPt(config.template_width_px || imgDims.width);
      const pageHeight = pxToPt(config.template_height_px || imgDims.height);
      const page = pdfDoc.addPage([pageWidth, pageHeight]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight
      });

      pdfBytes = await pdfDoc.save();
    } else {
      // Es un PDF, extraer los bytes
      const base64Data = config.quote_template.split(',')[1];
      pdfBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    }
    
    // Cargar el PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    const getFieldValue = (fieldKey: string): string => {
      const normalizedKey = fieldKey?.toLowerCase().trim();
      switch (normalizedKey) {
        case 'customer_name':
        case 'cliente_nombre':
          return quote.customer_name || '';
        case 'customer_phone':
        case 'cliente_telefono':
          return quote.customer_phone || '';
        case 'customer_email':
        case 'cliente_email':
          return quote.customer_email || '';
        case 'customer_address':
        case 'cliente_direccion':
          return '';
        case 'order_number':
        case 'doc_number':
        case 'cotizacion_numero':
          return quote.number || '';
        case 'date':
        case 'cotizacion_fecha':
          return format(new Date(quote.fecha), 'dd/MM/yyyy', { locale: es });
        case 'due_date':
        case 'cotizacion_vencimiento':
          return quote.valid_until ? format(new Date(quote.valid_until), 'dd/MM/yyyy', { locale: es }) : '';
        case 'payment_method':
          return 'Por Definir'; // No está en QuoteData actual
        case 'subtotal':
          return `L ${quote.subtotal.toFixed(2)}`;
        case 'isv':
          return `L ${quote.impuesto.toFixed(2)}`;
        case 'total':
          return `L ${quote.total.toFixed(2)}`;
        case 'notes':
        case 'notas':
          return quote.notes || '';
        case 'items_table':
        case 'items':
          return '[Tabla de Productos]'; // Esto requiere lógica especial
        case 'cai':
        case 'serie_range':
          return ''; // No aplica para cotizaciones
        case 'empresa_nombre':
        case 'company_name':
          return config.company_name || '';
        case 'empresa_telefono':
        case 'company_phone':
          return config.company_phone || '';
        case 'empresa_email':
        case 'company_email':
          return config.company_email || '';
        case 'empresa_direccion':
        case 'company_address':
          return config.company_address || '';
        case 'empresa_rtn':
        case 'company_rtn':
          return config.company_rtn || '';
        case 'empresa_website':
        case 'company_website':
          return config.company_website || '';
        default:
          return '';
      }
    };
    
    // Embeder fuente personalizada si es necesario
    const fontCache = new Map<string, any>();
    const resolveFontFamily = (field: any) =>
      field?.font_family ||
      field?.fontFamily ||
      config.default_font_family ||
      'Helvetica';
    const resolveFontSize = (field: any) =>
      field?.font_size ||
      field?.fontSize ||
      config.default_font_size ||
      10;
    const resolveFontName = (family: string, bold: boolean) => {
      const normalized = family.toLowerCase();
      if (normalized.includes('times')) {
        return bold ? 'Times-Bold' : 'Times-Roman';
      }
      if (normalized.includes('courier')) {
        return bold ? 'Courier-Bold' : 'Courier';
      }
      return bold ? 'Helvetica-Bold' : 'Helvetica';
    };
    const getFontForField = async (field: any) => {
      const family = resolveFontFamily(field);
      const bold = Boolean(field?.bold);
      const fontName = resolveFontName(family, bold);
      if (fontCache.has(fontName)) {
        return fontCache.get(fontName);
      }
      const font = await pdfDoc.embedFont(fontName as any);
      fontCache.set(fontName, font);
      return font;
    };
    
    // Agregar texto dinámico según los campos configurados
    const templateWidthPx = config.template_width_px;
    const templateHeightPx = config.template_height_px;
    const usePixelCoords = Boolean(templateWidthPx && templateHeightPx);

    for (const field of quoteFields) {
      const fieldKey = field.field_key || field.key || field.type || '';
      const fieldType = field.field_type || field.type || '';
      const value = getFieldValue(fieldKey);
      
      // Manejar tabla de productos separadamente
      if (fieldType === 'table' || fieldKey === 'items_table') {
        const tableX = usePixelCoords
          ? (field.x / templateWidthPx!) * width
          : (field.x / 100) * width;
        const tableY = usePixelCoords
          ? height - ((field.y / templateHeightPx!) * height)
          : height - ((field.y / 100) * height);
        const fontSize = resolveFontSize(field);
        const tableFont = await getFontForField(field);
        const tableWidth = usePixelCoords && field.width
          ? (field.width / templateWidthPx!) * width
          : Math.max(260, width - tableX - 20);
        const tableHeight = usePixelCoords && field.height
          ? (field.height / templateHeightPx!) * height
          : height - 50;
        
        let currentY = tableY;
        const lineHeight = fontSize + 4;
        const colWidths = {
          descripcion: tableWidth * 0.45,
          cantidad: tableWidth * 0.12,
          precio: tableWidth * 0.18,
          total: tableWidth * 0.18
        };
        
        // Headers de la tabla
        firstPage.drawText('Descripción', {
          x: tableX,
          y: currentY,
          size: fontSize,
          font: tableFont,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText('Cant.', {
          x: tableX + colWidths.descripcion,
          y: currentY,
          size: fontSize,
          font: tableFont,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText('Precio Unit.', {
          x: tableX + colWidths.descripcion + colWidths.cantidad,
          y: currentY,
          size: fontSize,
          font: tableFont,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText('Subtotal', {
          x: tableX + colWidths.descripcion + colWidths.cantidad + colWidths.precio,
          y: currentY,
          size: fontSize,
          font: tableFont,
          color: rgb(0, 0, 0),
        });
        
        currentY -= lineHeight;
        const maxRows = Math.max(1, Math.floor((tableHeight - lineHeight) / lineHeight));
        
        // Items de la tabla
        if (quote.items && Array.isArray(quote.items)) {
          for (const [index, item] of quote.items.entries()) {
            if (index >= maxRows) break;
            // Descripción (truncar si es muy larga)
            const desc = item.descripcion || item.product_name || '';
            const maxDescLength = 50;
            const truncDesc = desc.length > maxDescLength ? desc.substring(0, maxDescLength) + '...' : desc;
            
            firstPage.drawText(truncDesc, {
              x: tableX,
              y: currentY,
              size: fontSize - 1,
              font: tableFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            
            // Cantidad
            firstPage.drawText(String(item.unidades || 1), {
              x: tableX + colWidths.descripcion,
              y: currentY,
              size: fontSize - 1,
              font: tableFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            
            // Precio unitario
            firstPage.drawText(`L ${(item.precio_unitario || 0).toFixed(2)}`, {
              x: tableX + colWidths.descripcion + colWidths.cantidad,
              y: currentY,
              size: fontSize - 1,
              font: tableFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            
            // Subtotal
            firstPage.drawText(`L ${(item.subtotal || 0).toFixed(2)}`, {
              x: tableX + colWidths.descripcion + colWidths.cantidad + colWidths.precio,
              y: currentY,
              size: fontSize - 1,
              font: tableFont,
              color: rgb(0.2, 0.2, 0.2),
            });
            
            currentY -= lineHeight;
          }
        }
        
        continue;
      }
      
      if (!value) continue;
      
      // Calcular posición en el PDF (convertir % a coordenadas)
      const x = usePixelCoords
        ? (field.x / templateWidthPx!) * width
        : (field.x / 100) * width;
      const y = usePixelCoords
        ? height - ((field.y / templateHeightPx!) * height)
        : height - ((field.y / 100) * height);
      const fontSize = resolveFontSize(field);
      const font = await getFontForField(field);
      let alignedX = x;
      if (usePixelCoords && field.width) {
        const fieldWidth = (field.width / templateWidthPx!) * width;
        const textWidth = font.widthOfTextAtSize(value, fontSize);
        if (field.align === 'center') {
          alignedX = x + Math.max(0, (fieldWidth - textWidth) / 2);
        } else if (field.align === 'right') {
          alignedX = x + Math.max(0, fieldWidth - textWidth);
        }
      }
      
      // Agregar el texto
      firstPage.drawText(value, {
        x: alignedX,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
    
    // Guardar el PDF modificado
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Descargar el PDF
    const blob = new Blob([modifiedPdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cotizacion-${quote.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ PDF generado desde plantilla personalizada');
  } catch (error) {
    console.error('Error generando PDF desde plantilla:', error);
    // Fallback a generación programática
    const tempConfig = { ...config };
    delete tempConfig.quote_template;
    return await generateQuotePDF(quote, tempConfig);
  }
}
