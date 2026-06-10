import { jsPDF } from 'jspdf';
import { Factura, EmpresaInfo, DatosFiscales, DisenoConfig } from '../context/AppContext';
import { subtotalByTax, taxByRate } from '../../../utils/factura-calculations';
import defaultLogoDataUrl from '../../../assets/ffdf99bb628c8e85f335dd944a9262e778ba9405.png?inline';

type TextAlign = 'left' | 'center' | 'right';

type PdfDesign = {
  accent: string;
  dark: string;
  table: string;
  radius: number;
  logoSize: number;
  titleSize: number;
  textSize: number;
  spacing: number;
};

type ProductRow = {
  description: string;
  quantity: number;
  price: number;
  discountAmount: number;
  taxRate: number;
  total: number;
};

export function generateFacturaPDF(
  factura: Factura,
  empresaInfo: EmpresaInfo,
  datosFiscales: DatosFiscales,
  _disenoConfig?: DisenoConfig
) {
  const cfg = normalizeDisenoConfig();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const sheetX = 8.9;
  const sheetY = 8.9;
  const sheetW = pageWidth - sheetX * 2;
  const sheetH = pageHeight - sheetY * 2;
  const innerX = sheetX + 4;
  const innerY = sheetY + 4;
  const innerW = sheetW - 8;

  const fechaEmision = factura.fechaEmision || factura.fechaCreacion.split('T')[0];
  const products = factura.productos.map(toProductRow);
  const isCompact = products.length > 7;
  const isUltraCompact = products.length > 14;
  const tableRowH = isUltraCompact ? 4.1 : isCompact ? 5.2 : 7.1;
  const tableHeaderH = isUltraCompact ? 6.2 : isCompact ? 7 : 8.4;
  const headerH = isCompact ? 51 : 55;
  const clientH = 27;
  const productsTitleH = 8;
  const bottomH = 57;
  const wordsH = 11;
  const footerH = 11;
  const gap = 2.5 + cfg.spacing * 0.15;

  const headerY = innerY;
  const clientY = headerY + headerH + gap;
  const titleY = clientY + clientH + gap;
  const tableY = titleY + productsTitleH;
  const footerY = sheetY + sheetH - footerH - 4;
  const wordsY = footerY - wordsH - gap;
  const bottomY = wordsY - bottomH - gap;
  const tableH = Math.max(46, bottomY - tableY - gap);
  const maxRows = Math.max(1, Math.floor((tableH - tableHeaderH) / tableRowH));
  const visibleProducts = products.slice(0, maxRows);
  const hiddenProducts = Math.max(0, products.length - visibleProducts.length);

  const gravado15 = subtotalByTax(factura, 15);
  const gravado18 = subtotalByTax(factura, 18);
  const isv15 = taxByRate(factura, 15) || factura.impuestos;
  const isv18 = taxByRate(factura, 18);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  setDrawHex(doc, '#1E3A8A');
  doc.setLineWidth(0.55);
  doc.roundedRect(sheetX, sheetY, sheetW, sheetH, cfg.radius, cfg.radius, 'S');

  drawHeader(doc, {
    x: innerX,
    y: headerY,
    width: innerW,
    height: headerH,
    empresaInfo,
    factura,
    datosFiscales,
    fechaEmision,
    cfg,
  });

  drawClientBlock(doc, {
    x: innerX,
    y: clientY,
    width: innerW,
    height: clientH,
    factura,
    fechaEmision,
    cfg,
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.7);
  doc.setTextColor(15, 23, 42);
  doc.text('Productos / Servicios', innerX, titleY + 5.5);

  drawProductsTable(doc, {
    x: innerX,
    y: tableY,
    width: innerW,
    height: tableH,
    rowH: tableRowH,
    headerH: tableHeaderH,
    visibleProducts,
    hiddenProducts,
    isCompact,
    isUltraCompact,
    cfg,
  });

  drawFiscalAndTotals(doc, {
    x: innerX,
    y: bottomY,
    width: innerW,
    height: bottomH,
    factura,
    datosFiscales,
    gravado15,
    gravado18,
    isv15,
    isv18,
    cfg,
  });

  drawAmountInWords(doc, {
    x: innerX,
    y: wordsY,
    width: innerW,
    height: wordsH,
    amount: factura.total,
    cfg,
  });

  drawFooter(doc, {
    x: innerX,
    y: footerY,
    width: innerW,
    height: footerH,
    copyType: 'CLIENTE',
    cfg,
  });

  return doc;
}

function drawHeader(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    empresaInfo: EmpresaInfo;
    factura: Factura;
    datosFiscales: DatosFiscales;
    fechaEmision: string;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, empresaInfo, factura, datosFiscales, fechaEmision, cfg } = params;
  const rightW = 68;
  const leftW = width - rightW - 3;

  drawCard(doc, x, y, width, height, '#FFFFFF', '#CBD5E1', cfg.radius * 0.68);

  const logoImage = getPrintableLogo(empresaInfo.logo);
  const logoBoxH = clamp(cfg.logoSize, 14, 20);
  const logoBoxW = clamp(cfg.logoSize * 1.95, 26, 38);
  const logoX = x + 3.5;
  const logoY = y + 5;
  if (logoImage) {
    try {
      addContainedImage(doc, logoImage, getImageFormat(logoImage), logoX, logoY, logoBoxW, logoBoxH);
    } catch {
      drawLogoText(doc, logoX, logoY, logoBoxW, logoBoxH);
    }
  } else {
    drawLogoText(doc, logoX, logoY, logoBoxW, logoBoxH);
  }

  const companyX = logoX + logoBoxW + 3;
  const textW = leftW - logoBoxW - 11;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(clamp(cfg.titleSize * 1.28, 11, 16));
  setTextHex(doc, cfg.accent);
  doc.text(firstLine(empresaInfo.razonSocial || empresaInfo.nombreComercial || 'ESMARK', doc, textW), companyX, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text(firstLine(empresaInfo.nombreComercial || empresaInfo.razonSocial || 'ESMARK', doc, textW), companyX, y + 15.1);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(clamp(cfg.textSize * 0.86, 5.9, 7.2));
  doc.setTextColor(71, 85, 105);
  drawKeyValueLine(doc, 'Direccion:', empresaInfo.direccion || '-', companyX, y + 21, textW);
  drawKeyValueLine(doc, 'Tel:', empresaInfo.telefono || '-', companyX, y + 25.2, textW / 2 - 2);
  drawKeyValueLine(doc, 'Email:', empresaInfo.email || '-', companyX + textW / 2 + 2, y + 25.2, textW / 2 - 2);
  drawKeyValueLine(doc, 'RTN:', empresaInfo.rtn || '-', companyX, y + 29.4, textW);
  drawKeyValueLine(doc, 'CAI:', datosFiscales.cai || '-', companyX, y + 33.6, textW);

  const invoiceX = x + width - rightW;
  drawCard(doc, invoiceX, y + 3.2, rightW, height - 6.4, '#F8FAFC', '#CBD5E1', cfg.radius * 0.68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  setTextHex(doc, cfg.accent);
  doc.text('FACTURA', invoiceX + rightW / 2, y + 9.5, { align: 'center' });

  drawCard(doc, invoiceX + 3.5, y + 12.2, rightW - 7, 10.8, '#FFFFFF', '#E2E8F0', 2.4);
  doc.setFontSize(5.5);
  doc.text('NUMERO DE FACTURA', invoiceX + 6.5, y + 16.1);
  doc.setFontSize(9.2);
  doc.setTextColor(2, 6, 23);
  doc.text(`No. ${factura.numeroFactura || 'Borrador'}`, invoiceX + 6.5, y + 21);

  drawCard(doc, invoiceX + 3.5, y + 25, rightW - 7, 22.8, '#FFFFFF', '#E2E8F0', 2.4);
  doc.setFontSize(5.4);
  setTextHex(doc, cfg.accent);
  doc.text('RANGO AUTORIZADO', invoiceX + 6.5, y + 29);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.7);
  doc.setTextColor(51, 65, 85);
  doc.text(firstLine(getAuthorizedRange(datosFiscales), doc, rightW - 13), invoiceX + 6.5, y + 33.1);

  doc.setFontSize(5.5);
  setTextHex(doc, cfg.accent);
  doc.text('FECHA RECEPCION', invoiceX + 6.5, y + 39.2);
  doc.text('FECHA LIMITE', invoiceX + rightW / 2 + 4, y + 39.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(formatDate(fechaEmision), invoiceX + 6.5, y + 43.3);
  doc.text(formatDate(datosFiscales.fechaExpiracion), invoiceX + rightW / 2 + 4, y + 43.3);
}

function drawClientBlock(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    factura: Factura;
    fechaEmision: string;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, factura, fechaEmision, cfg } = params;
  const dateW = 50;
  drawCard(doc, x, y, width, height, '#F8FAFC', '#CBD5E1', cfg.radius * 0.68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  setTextHex(doc, cfg.accent);
  doc.text('CLIENTE', x + 4, y + 7);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(firstLine(factura.cliente.nombre || 'Consumidor final', doc, width - dateW - 14), x + 4, y + 14.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`RTN: ${factura.cliente.rtn || '-'}`, x + 4, y + 20);
  if (factura.cliente.direccion) {
    doc.text(firstLine(`Direccion: ${factura.cliente.direccion}`, doc, width - dateW - 14), x + 48, y + 20);
  }

  const dateX = x + width - dateW;
  drawCard(doc, dateX, y + 4.5, dateW - 4, height - 9, '#FFFFFF', '#BFDBFE', 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.7);
  setTextHex(doc, cfg.accent);
  doc.text('FACTURA EMITIDA', dateX + (dateW - 4) / 2, y + 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(fechaEmision), dateX + (dateW - 4) / 2, y + 18, { align: 'center' });
}

function drawProductsTable(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    rowH: number;
    headerH: number;
    visibleProducts: ProductRow[];
    hiddenProducts: number;
    isCompact: boolean;
    isUltraCompact: boolean;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, rowH, headerH, visibleProducts, hiddenProducts, isCompact, isUltraCompact, cfg } = params;
  const columns = [
    { label: 'Producto / Descripcion', width: width - 107, align: 'left' as TextAlign },
    { label: 'Cant.', width: 14, align: 'center' as TextAlign },
    { label: 'Precio', width: 24, align: 'right' as TextAlign },
    { label: 'Descuento', width: 22, align: 'right' as TextAlign },
    { label: 'Impuesto', width: 20, align: 'center' as TextAlign },
    { label: 'Total', width: 27, align: 'right' as TextAlign },
  ];

  drawCard(doc, x, y, width, height, '#FFFFFF', '#CBD5E1', cfg.radius * 0.68);
  setFillHex(doc, cfg.table);
  doc.rect(x, y, width, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isUltraCompact ? 5.6 : isCompact ? 6.1 : 6.6);
  doc.setTextColor(255, 255, 255);

  let colX = x;
  columns.forEach((col) => {
    drawAlignedText(doc, col.label, colX, y + headerH / 2 + 1.7, col.width, col.align, 2.5);
    colX += col.width;
  });

  let rowY = y + headerH;
  visibleProducts.forEach((producto) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, rowY, width, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.12);
    doc.line(x, rowY + rowH, x + width, rowY + rowH);

    colX = x;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isUltraCompact ? 5.6 : isCompact ? 6.2 : 6.8);
    doc.setTextColor(30, 41, 59);
    drawAlignedText(doc, firstLine(producto.description, doc, columns[0].width - 4), colX, rowY + rowH / 2 + 1.4, columns[0].width, 'left', 2.5);
    colX += columns[0].width;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    drawAlignedText(doc, String(producto.quantity), colX, rowY + rowH / 2 + 1.4, columns[1].width, 'center', 1);
    colX += columns[1].width;
    drawAlignedText(doc, money(producto.price), colX, rowY + rowH / 2 + 1.4, columns[2].width, 'right', 2);
    colX += columns[2].width;
    drawAlignedText(doc, money(producto.discountAmount), colX, rowY + rowH / 2 + 1.4, columns[3].width, 'right', 2);
    colX += columns[3].width;
    drawAlignedText(doc, `${producto.taxRate.toFixed(2)}%`, colX, rowY + rowH / 2 + 1.4, columns[4].width, 'center', 1);
    colX += columns[4].width;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawAlignedText(doc, money(producto.total), colX, rowY + rowH / 2 + 1.4, columns[5].width, 'right', 2.5);
    rowY += rowH;
  });

  if (hiddenProducts > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`+ ${hiddenProducts} producto(s) adicional(es).`, x + 3, y + height - 3);
  }
}

function drawFiscalAndTotals(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    factura: Factura;
    datosFiscales: DatosFiscales;
    gravado15: number;
    gravado18: number;
    isv15: number;
    isv18: number;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, factura, datosFiscales, gravado15, gravado18, isv15, isv18, cfg } = params;
  const totalW = 68;
  const fiscalW = width - totalW - 4;

  drawCard(doc, x, y, fiscalW, 26, '#FFFFFF', '#CBD5E1', cfg.radius * 0.68);
  doc.setFontSize(6.3);
  drawInfoRow(doc, 'No. Orden de compra exenta', '-', x + 4, y + 6.5, fiscalW - 8);
  drawInfoRow(doc, 'No. Constancia de exoneracion', '-', x + 4, y + 12.5, fiscalW - 8);
  drawInfoRow(doc, 'No. Registro SAG', '-', x + 4, y + 18.5, fiscalW - 8);

  drawCard(doc, x, y + 29, fiscalW, height - 29, '#FFFFFF', '#CBD5E1', cfg.radius * 0.68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.3);
  doc.setTextColor(15, 23, 42);
  doc.text('Nota:', x + 4, y + 36);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(factura.nota || datosFiscales.lugarEmision || '-', fiscalW - 8).slice(0, 2), x + 4, y + 41.4);

  const totalX = x + fiscalW + 4;
  setFillHex(doc, cfg.dark);
  doc.setDrawColor(15, 23, 42);
  doc.roundedRect(totalX, y, totalW, height, cfg.radius * 0.68, cfg.radius * 0.68, 'F');

  let totalY = y + 6;
  doc.setFontSize(6.7);
  drawTotalRow(doc, 'Descuento', `-${money(factura.descuento)}`, totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'Importe Exento', money(0), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'Importe Exonerado', money(0), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'Importe Gravado 15%', money(gravado15), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'Importe Gravado 18%', money(gravado18), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'ISV 15%', money(isv15), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'ISV 18%', money(isv18), totalX + 4, totalY, totalW - 8);
  totalY += 5.3;
  drawTotalRow(doc, 'Envio', money(factura.envio), totalX + 4, totalY, totalW - 8);

  setFillHex(doc, cfg.table);
  doc.rect(totalX, y + height - 11, totalW, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Total factura', totalX + 4, y + height - 4);
  doc.text(money(factura.total), totalX + totalW - 4, y + height - 4, { align: 'right' });
}

function drawAmountInWords(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    amount: number;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, amount, cfg } = params;
  drawCard(doc, x, y, width, height, '#F8FAFC', '#CBD5E1', cfg.radius * 0.68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(amountToWords(amount), x + width / 2, y + height / 2 + 2.2, { align: 'center' });
}

function drawFooter(
  doc: jsPDF,
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    copyType: string;
    cfg: PdfDesign;
  }
) {
  const { x, y, width, height, copyType, cfg } = params;
  drawCard(doc, x, y, width, height, '#FFFFFF', '#CBD5E1', cfg.radius * 0.68);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Original:', x + 4, y + height / 2 + 2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(copyType, x + 18, y + height / 2 + 2);
}

function toProductRow(producto: Factura['productos'][number]): ProductRow {
  const subtotal = producto.cantidad * producto.precio;
  const discountAmount = subtotal * ((producto.descuento || 0) / 100);
  const base = subtotal - discountAmount;
  const taxRate = producto.impuesto || 0;
  const total = base + base * (taxRate / 100);

  return {
    description: producto.nombre || 'Producto / Servicio',
    quantity: producto.cantidad,
    price: producto.precio,
    discountAmount,
    taxRate,
    total,
  };
}

function drawLogoText(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  setTextHex(doc, '#1E3A8A');
  doc.text('ESMARK', x + width / 2, y + height / 2 + 1.5, { align: 'center' });
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
  const props = doc.getImageProperties(imageData);
  const imageW = Number(props?.width) || maxW;
  const imageH = Number(props?.height) || maxH;
  const scale = Math.min(maxW / imageW, maxH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;

  doc.addImage(
    imageData,
    format,
    x + (maxW - width) / 2,
    y + (maxH - height) / 2,
    width,
    height
  );
}

function getPrintableLogo(logo?: string) {
  const trimmedLogo = logo?.trim();
  if (trimmedLogo && trimmedLogo.startsWith('data:image/')) return trimmedLogo;
  const fallbackLogo = defaultLogoDataUrl.trim();
  return fallbackLogo.startsWith('data:image/') ? fallbackLogo : '';
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const mime = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/)?.[1]?.toLowerCase();
  if (mime === 'jpg' || mime === 'jpeg') return 'JPEG';
  if (mime === 'webp') return 'WEBP';
  return 'PNG';
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number, fillHex: string, strokeHex: string, radius = 4) {
  setFillHex(doc, fillHex);
  setDrawHex(doc, strokeHex);
  doc.setLineWidth(0.18);
  doc.roundedRect(x, y, width, height, radius, radius, 'FD');
}

function drawAlignedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  align: TextAlign,
  padding = 0
) {
  if (align === 'right') {
    doc.text(text, x + width - padding, y, { align: 'right' });
    return;
  }

  if (align === 'center') {
    doc.text(text, x + width / 2, y, { align: 'center' });
    return;
  }

  doc.text(text, x + padding, y);
}

function drawKeyValueLine(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number) {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(label, x, y);
  const labelW = doc.getTextWidth(label) + 1.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(firstLine(value, doc, maxWidth - labelW), x + labelW, y);
}

function drawInfoRow(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number) {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${label}:`, x, y);
  const labelW = Math.min(58, doc.getTextWidth(`${label}:`) + 1.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(firstLine(value, doc, maxWidth - labelW), x + labelW, y);
}

function drawTotalRow(doc: jsPDF, label: string, value: string, x: number, y: number, width: number) {
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(value, x + width, y, { align: 'right' });
}

function normalizeDisenoConfig(config?: DisenoConfig): PdfDesign {
  return {
    accent: '#1E40AF',
    dark: '#0F172A',
    table: '#1D4ED8',
    radius: 3.2,
    logoSize: 18,
    titleSize: 11,
    textSize: 7,
    spacing: 5,
  };
}

function isHexColor(value?: string) {
  return /^#?([a-f\d]{6})$/i.test(value || '');
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function money(value: number) {
  return `L${Number(value || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function firstLine(text: string, doc: jsPDF, maxWidth: number) {
  return doc.splitTextToSize(String(text || '-'), Math.max(8, maxWidth))[0] || '-';
}

function formatDate(value: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('T')[0].split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getAuthorizedRange(datosFiscales: DatosFiscales) {
  const prefix = datosFiscales.prefijo || '000-001-01';
  return `${prefix}-${datosFiscales.primerNumero || '00000001'} al ${prefix}-${datosFiscales.ultimoNumero || '00000200'}`;
}

function amountToWords(value: number) {
  const amount = Number(value || 0);
  const integerPart = Math.floor(amount);
  const cents = Math.round((amount - integerPart) * 100);
  return `${numberToSpanish(integerPart).toUpperCase()} LEMPIRAS Y ${String(cents).padStart(2, '0')}/100 CENTAVOS EXACTOS`;
}

function numberToSpanish(value: number): string {
  if (value === 0) return 'cero';
  if (value < 0) return `menos ${numberToSpanish(Math.abs(value))}`;
  if (value < 30) {
    const units = [
      'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
      'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete',
      'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidos', 'veintitres',
      'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve',
    ];
    return units[value];
  }
  if (value < 100) {
    const tens: Record<number, string> = {
      30: 'treinta',
      40: 'cuarenta',
      50: 'cincuenta',
      60: 'sesenta',
      70: 'setenta',
      80: 'ochenta',
      90: 'noventa',
    };
    const ten = Math.floor(value / 10) * 10;
    const unit = value % 10;
    return unit ? `${tens[ten]} y ${numberToSpanish(unit)}` : tens[ten];
  }
  if (value < 1000) {
    const hundreds: Record<number, string> = {
      100: 'cien',
      200: 'doscientos',
      300: 'trescientos',
      400: 'cuatrocientos',
      500: 'quinientos',
      600: 'seiscientos',
      700: 'setecientos',
      800: 'ochocientos',
      900: 'novecientos',
    };
    if (value === 100) return 'cien';
    const hundred = Math.floor(value / 100) * 100;
    const rest = value % 100;
    return `${hundred === 100 ? 'ciento' : hundreds[hundred]}${rest ? ` ${numberToSpanish(rest)}` : ''}`;
  }
  if (value < 1000000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const prefix = thousands === 1 ? 'mil' : `${numberToSpanish(thousands)} mil`;
    return `${prefix}${rest ? ` ${numberToSpanish(rest)}` : ''}`;
  }
  const millions = Math.floor(value / 1000000);
  const rest = value % 1000000;
  const prefix = millions === 1 ? 'un millon' : `${numberToSpanish(millions)} millones`;
  return `${prefix}${rest ? ` ${numberToSpanish(rest)}` : ''}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
