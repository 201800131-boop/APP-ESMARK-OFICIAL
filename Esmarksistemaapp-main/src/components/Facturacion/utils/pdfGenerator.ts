import { jsPDF } from 'jspdf';
import { Factura, Recibo, EmpresaInfo, DatosFiscales, DisenoConfig } from '../context/AppContext';
import { amountToWords } from '../../../utils/number-to-words';

export function generateFacturaPDF(
  factura: Factura,
  empresaInfo: EmpresaInfo,
  datosFiscales: DatosFiscales,
  disenoConfig?: DisenoConfig
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const cfg = {
    tamanoLogo: disenoConfig?.tamanoLogo || 30,
    fuenteTitulo: disenoConfig?.fuenteTitulo || 10,
    fuenteTexto: disenoConfig?.fuenteTexto || 8,
    espaciado: disenoConfig?.espaciado || 5,
    colorEncabezadoTabla: disenoConfig?.colorEncabezadoTabla || '#1F2D3D',
    colorTotales: disenoConfig?.colorTotales || '#1F2D3D',
  };

  const innerWidth = pageWidth - (margin * 2);
  const lineHeight = Math.max(4, cfg.espaciado);
  let yPos = margin;

  // ENCABEZADO: bloque izquierdo
  doc.setFontSize(cfg.fuenteTitulo);
  doc.setFont('helvetica', 'bold');
  doc.text('Factura', margin, yPos);

  const fechaEmision = factura.fechaEmision || factura.fechaCreacion.split('T')[0];
  doc.setFontSize(cfg.fuenteTexto);
  doc.setFont('helvetica', 'normal');
  yPos += lineHeight;
  doc.text(`N: ${factura.numeroFactura || 'Borrador'}`, margin, yPos);
  yPos += lineHeight;
  doc.text(`FECHA EMISIÓN: ${fechaEmision}`, margin, yPos);
  yPos += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('ORIGINAL: CLIENTE', margin, yPos);

  // Logo a la derecha
  const logoSize = cfg.tamanoLogo;
  const logoX = pageWidth - margin - logoSize;
  const logoY = margin;

  if (empresaInfo.logo) {
    try {
      doc.addImage(empresaInfo.logo, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      doc.setFillColor(232, 245, 233);
      doc.rect(logoX, logoY, logoSize, logoSize, 'F');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text('Logo', logoX + (logoSize / 2), logoY + (logoSize / 2), { align: 'center' });
    }
  } else {
    doc.setFillColor(232, 245, 233);
    doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Logo', logoX + (logoSize / 2), logoY + (logoSize / 2), { align: 'center' });
  }

  // DATOS DE EMPRESA
  yPos = margin + logoSize + 8;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(cfg.fuenteTitulo);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaInfo.razonSocial, margin, yPos);

  doc.setFontSize(cfg.fuenteTexto);
  doc.setFont('helvetica', 'normal');
  yPos += lineHeight;
  doc.text('Sociedad Anónima Tegucigalpa', margin, yPos);
  yPos += lineHeight;
  doc.text(`Teléfono: ${empresaInfo.telefono}`, margin, yPos);
  yPos += lineHeight;
  doc.text(`Dirección: ${empresaInfo.direccion}`, margin, yPos);
  yPos += lineHeight;
  doc.text(`RTN: ${empresaInfo.rtn}`, margin, yPos);

  // DATOS CLIENTE
  yPos += lineHeight + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente.nombre, margin + 15, yPos);

  yPos += lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('RTN:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente.rtn || '000000000000', margin + 15, yPos);

  // TITULO TABLA
  yPos += lineHeight + 2;
  doc.setFontSize(cfg.fuenteTitulo);
  doc.setFont('helvetica', 'bold');
  doc.text('Productos / Servicios', margin, yPos);

  // TABLA
  yPos += 4;
  const tableHeaderHeight = 7;
  const rowHeight = 6;
  const columns = [
    { key: 'descripcion', label: 'Producto / Descripción', width: 70, align: 'left' as const },
    { key: 'cantidad', label: 'Cant.', width: 15, align: 'center' as const },
    { key: 'precio', label: 'Precio', width: 22, align: 'right' as const },
    { key: 'descuento', label: 'Descuento', width: 22, align: 'right' as const },
    { key: 'impuesto', label: 'Impuesto (ISV)', width: 28, align: 'right' as const },
    { key: 'total', label: 'Total', width: 28, align: 'right' as const },
  ];

  const headerRgb = hexToRgb(cfg.colorEncabezadoTabla);
  doc.setFillColor(headerRgb.r, headerRgb.g, headerRgb.b);
  doc.rect(margin, yPos, innerWidth, tableHeaderHeight, 'F');

  let colX = margin;
  doc.setFontSize(cfg.fuenteTexto);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  columns.forEach((col) => {
    if (col.align === 'left') {
      doc.text(col.label, colX + 2, yPos + 4.8);
    } else if (col.align === 'center') {
      doc.text(col.label, colX + (col.width / 2), yPos + 4.8, { align: 'center' });
    } else {
      doc.text(col.label, colX + col.width - 2, yPos + 4.8, { align: 'right' });
    }
    colX += col.width;
  });

  yPos += tableHeaderHeight;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(221, 221, 221);

  factura.productos.forEach((producto) => {
    const subtotal = producto.cantidad * producto.precio;
    const descuentoValor = subtotal * (producto.descuento / 100);
    const baseImponible = subtotal - descuentoValor;
    const impuestoValor = baseImponible * (producto.impuesto / 100);
    const total = baseImponible + impuestoValor;

    colX = margin;
    columns.forEach((col) => {
      doc.rect(colX, yPos, col.width, rowHeight);

      let value = '';
      if (col.key === 'descripcion') value = producto.nombre;
      if (col.key === 'cantidad') value = String(producto.cantidad);
      if (col.key === 'precio') value = `L${producto.precio.toFixed(2)}`;
      if (col.key === 'descuento') value = `${producto.descuento.toFixed(2)}%`;
      if (col.key === 'impuesto') value = `${producto.impuesto.toFixed(2)}%`;
      if (col.key === 'total') value = `L${total.toFixed(2)}`;

      if (col.align === 'left') {
        const short = doc.splitTextToSize(value, col.width - 4)[0] || '';
        doc.text(String(short), colX + 2, yPos + 4.2);
      } else if (col.align === 'center') {
        doc.text(value, colX + (col.width / 2), yPos + 4.2, { align: 'center' });
      } else {
        doc.text(value, colX + col.width - 2, yPos + 4.2, { align: 'right' });
      }

      colX += col.width;
    });

    yPos += rowHeight;
  });

  // SECCIÓN INFERIOR
  const sectionStartY = yPos + 10;
  const leftColX = margin;
  const rightColX = margin + (innerWidth * 0.56);
  const rightColW = pageWidth - margin - rightColX;

  let leftY = sectionStartY;
  doc.setFontSize(cfg.fuenteTexto);
  doc.setFont('helvetica', 'bold');
  doc.text('No. Orden de compra exento:', leftColX, leftY);
  leftY += lineHeight;
  doc.text('No. Constancia de exoneración:', leftColX, leftY);
  leftY += lineHeight;
  doc.text('No. Registro SAG:', leftColX, leftY);
  leftY += lineHeight + 2;
  doc.text('Notas:', leftColX, leftY);

  if (factura.nota) {
    doc.setFont('helvetica', 'normal');
    const notaY = leftY + lineHeight;
    const notaLines = doc.splitTextToSize(factura.nota, (innerWidth * 0.5) - 4);
    doc.text(notaLines, leftColX, notaY);
    leftY = notaY + (notaLines.length * lineHeight);
  }

  leftY += lineHeight + 1;
  doc.setFont('helvetica', 'bold');
  doc.text('Código/Lugar de la factura:', leftColX, leftY);

  let rightY = sectionStartY;
  doc.setFont('helvetica', 'normal');
  doc.text('Descuento:', rightColX, rightY);
  doc.text(`L${factura.descuento.toFixed(2)}`, pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('Importe Exento:', rightColX, rightY);
  doc.text('0.00', pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('Importe Exonerado:', rightColX, rightY);
  doc.text('0.00', pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('Importe Gravado 15%:', rightColX, rightY);
  doc.text(`L${factura.subtotal.toFixed(2)}`, pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('Importe Gravado 18%:', rightColX, rightY);
  doc.text('0.00', pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('ISV 15%:', rightColX, rightY);
  doc.text(`L${factura.impuestos.toFixed(2)}`, pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight;

  doc.text('ISV 18%:', rightColX, rightY);
  doc.text('0.00', pageWidth - margin, rightY, { align: 'right' });
  rightY += lineHeight + 2;

  const totalRgb = hexToRgb(cfg.colorTotales);
  doc.setFillColor(totalRgb.r, totalRgb.g, totalRgb.b);
  doc.roundedRect(rightColX - 2, rightY - 4.8, rightColW + 2, 8.5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(cfg.fuenteTitulo);
  doc.text('TOTAL FACTURA:', rightColX, rightY + 1);
  doc.text(`L${factura.total.toFixed(2)}`, pageWidth - margin, rightY + 1, { align: 'right' });

  // PIE DE PÁGINA
  const footerY = pageHeight - 30;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  doc.text(`Rango autorizado del: (Documento protegido) al ${datosFiscales.prefijo}-${datosFiscales.ultimoNumero}`, margin, footerY);
  doc.text(`Fecha límite de emisión: ${datosFiscales.fechaExpiracion}`, margin, footerY + 3.5);
  doc.text(`CAI: ${datosFiscales.cai}`, margin, footerY + 7);
  doc.text(`Lugar de emisión: ${datosFiscales.lugarEmision || 'Tegucigalpa, Honduras'}`, margin, footerY + 10.5);

  doc.setFontSize(6);
  doc.text('Página 1 de 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  return doc;
}

export function generateReciboPDF(
  recibo: Recibo,
  empresaInfo: EmpresaInfo,
  _disenoConfig?: DisenoConfig
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [139.7, 215.9]
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8.9;
  const cfg = {
    tamanoLogo: 30,
    fuenteTitulo: 10,
    fuenteTexto: 8,
    espaciado: 5,
    colorEtiquetas: '#10B981',
    colorEncabezadoTabla: '#065F46',
    colorTotales: '#065F46',
    colorTextoEncabezado: '#FFFFFF',
    radioBloques: 14,
  };

  const formatMoney = (value: number) => `L ${Number(value || 0).toLocaleString('es-HN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const accent = hexToRgb(cfg.colorEncabezadoTabla);
  const total = hexToRgb(cfg.colorTotales);
  const tag = hexToRgb(cfg.colorEtiquetas);
  const contentX = margin;
  const contentY = margin;
  const contentW = pageWidth - margin * 2;
  const contentH = pageHeight - margin * 2;
  const radius = Math.max(3, Math.min(8, cfg.radioBloques / 3));

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setDrawColor(accent.r, accent.g, accent.b);
  doc.setLineWidth(0.55);
  doc.roundedRect(contentX, contentY, contentW, contentH, radius, radius);

  const innerX = contentX + 3.2;
  const innerY = contentY + 3.2;
  const innerW = contentW - 6.4;
  const headerH = 26;
  const receiptBoxW = 42;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(innerX, innerY, innerW, headerH, 3.2, 3.2);

  const logoSize = Math.max(10, Math.min(18, cfg.tamanoLogo * 0.55));
  const logoX = innerX + 3;
  const logoY = innerY + 4;
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 2.2, 2.2);
  if (empresaInfo.logo) {
    try {
      doc.addImage(empresaInfo.logo, getImageFormat(empresaInfo.logo), logoX + 1, logoY + 1, logoSize - 2, logoSize - 2);
    } catch (e) {
      console.warn('No se pudo insertar el logo en el recibo PDF.', e);
    }
  }

  const companyX = logoX + logoSize + 3;
  const companyW = innerW - receiptBoxW - logoSize - 12;
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(Math.max(8, cfg.fuenteTitulo + 2));
  doc.text(empresaInfo.razonSocial || empresaInfo.nombreComercial || 'ESMARK MEDIA', companyX, innerY + 7, { maxWidth: companyW });

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(Math.max(5.8, cfg.fuenteTexto - 1));
  doc.text(`Direccion: ${empresaInfo.direccion || 'Juticalpa, Olancho, Honduras'}`, companyX, innerY + 12.4, { maxWidth: companyW / 2 - 2 });
  doc.text(`Tel: ${empresaInfo.telefono || '+504 9999-9999'}`, companyX + companyW / 2, innerY + 12.4, { maxWidth: companyW / 2 });
  doc.text(`Correo: ${empresaInfo.email || 'esmarkmedia@gmail.com'}`, companyX, innerY + 16.3, { maxWidth: companyW / 2 - 2 });
  doc.text(`RTN: ${empresaInfo.rtn || '08011999012345'}`, companyX + companyW / 2, innerY + 16.3, { maxWidth: companyW / 2 });

  doc.setDrawColor(tag.r, tag.g, tag.b);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(companyX, innerY + 19.5, 50, 5, 2, 2, 'FD');
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.4);
  doc.text('FECHA DE EMISION', companyX + 2, innerY + 22.9);
  doc.setTextColor(15, 23, 42);
  doc.text(recibo.fechaEmision || recibo.fechaCreacion.split('T')[0], companyX + 30, innerY + 22.9);

  const boxX = innerX + innerW - receiptBoxW - 2;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, innerY + 3, receiptBoxW, headerH - 6, 3.2, 3.2, 'FD');
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RECIBO', boxX + receiptBoxW / 2, innerY + 8.2, { align: 'center' });
  doc.setTextColor(2, 6, 23);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(boxX + 5, innerY + 10.2, receiptBoxW - 10, 6.5, 2, 2, 'FD');
  doc.setFontSize(8.8);
  doc.text(`N ${recibo.numeroRecibo}`, boxX + receiptBoxW / 2, innerY + 14.8, { align: 'center' });
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.roundedRect(boxX + 14, innerY + 18, receiptBoxW - 28, 4.5, 1.8, 1.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.8);
  doc.text('PAGADO', boxX + receiptBoxW / 2, innerY + 21.2, { align: 'center' });

  const sectionX = innerX + 3;
  const sectionW = innerW - 6;
  let y = innerY + headerH + 5;
  const labelSize = Math.max(5.8, cfg.fuenteTexto - 1.2);
  const bodySize = Math.max(7.2, cfg.fuenteTexto + 1.2);

  const drawLabelBox = (label: string, value: string, height: number, fill = false) => {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(fill ? 248 : 255, fill ? 250 : 255, fill ? 252 : 255);
    doc.roundedRect(sectionX, y, sectionW, height, 3, 3, 'FD');
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(labelSize);
    doc.text(label.toUpperCase(), sectionX + 3, y + 5);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(bodySize);
    doc.text(value, sectionX + 3, y + height - 3.2, { maxWidth: sectionW - 6 });
    y += height + 3.5;
  };

  drawLabelBox('Recibido de', recibo.cliente.nombre || 'Cliente', 13, true);

  const concepto = recibo.productos.length > 0
    ? recibo.productos.map((producto) => producto.nombre).filter(Boolean).join(', ')
    : 'Recibo de pago por productos o servicios realizados.';
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sectionX, y, sectionW, 16, 3, 3);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(labelSize);
  doc.text('CONCEPTO', sectionX + 3, y + 5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(bodySize);
  doc.text(doc.splitTextToSize(concepto || 'Recibo de pago.', sectionW - 48)[0] || concepto, sectionX + 3, y + 11.3);
  doc.setTextColor(71, 85, 105);
  doc.text('Metodo:', sectionX + sectionW - 43, y + 11.3);
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'bold');
  doc.text(recibo.metodoPago || 'Efectivo', sectionX + sectionW - 30, y + 11.3, { maxWidth: 28 });
  y += 19.5;

  drawLabelBox('Cantidad en letras', amountToWords(recibo.total), 13, false);

  const saldoBoxW = 56;
  const signatureX = sectionX + saldoBoxW + 4;
  const bottomH = 23;
  doc.setFillColor(total.r, total.g, total.b);
  doc.setDrawColor(total.r, total.g, total.b);
  doc.roundedRect(sectionX, y, saldoBoxW, bottomH, 3, 3, 'FD');
  const saldoRows = [
    ['Saldo anterior', recibo.total],
    ['Abono', recibo.total],
    ['Saldo actual', 0],
  ];
  saldoRows.forEach(([label, value], index) => {
    const rowY = y + 5.4 + index * 6.6;
    if (index > 0) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.08);
      doc.line(sectionX, y + index * 7.2, sectionX + saldoBoxW, y + index * 7.2);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', index === 1 ? 'bold' : 'normal');
    doc.setFontSize(index === 1 ? 7 : 6.4);
    doc.text(String(label), sectionX + 3, rowY);
    doc.text(formatMoney(Number(value)), sectionX + saldoBoxW - 3, rowY, { align: 'right' });
  });

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(signatureX, y, sectionW - saldoBoxW - 4, bottomH, 3, 3, 'FD');
  let firmaLineY = y + 16;
  if (empresaInfo.firma) {
    try {
      doc.addImage(empresaInfo.firma, getImageFormat(empresaInfo.firma), signatureX + 30, y + 2, 38, 11);
      firmaLineY = y + 15.5;
    } catch (e) {
      firmaLineY = y + 16;
    }
  }
  const lineW = 68;
  const lineX = signatureX + (sectionW - saldoBoxW - 4 - lineW) / 2;
  doc.setDrawColor(31, 41, 55);
  doc.line(lineX, firmaLineY, lineX + lineW, firmaLineY);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.text('Firma', signatureX + (sectionW - saldoBoxW - 4) / 2, firmaLineY + 4.2, { align: 'center' });

  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('Gracias por su preferencia', pageWidth / 2, contentY + contentH - 3.2, { align: 'center' });

  return doc;
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

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const mime = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);/)?.[1]?.toLowerCase();
  if (mime === 'jpg' || mime === 'jpeg') return 'JPEG';
  if (mime === 'webp') return 'WEBP';
  return 'PNG';
}
