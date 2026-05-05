import { jsPDF } from 'jspdf';
import { Factura, Recibo, EmpresaInfo, DatosFiscales, DisenoConfig } from './context/AppContext';

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
  let yPos = margin;

  // ENCABEZADO: Info factura a la izquierda, Logo a la derecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Factura', margin, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text(`N: ${factura.numeroFactura || 'Borrador'}`, margin, yPos);
  yPos += 4;
  const fechaEmision = factura.fechaEmision || factura.fechaCreacion.split('T')[0];
  doc.text(`FECHA EMISIÓN: ${fechaEmision}`, margin, yPos);
  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ORIGINAL: CLIENTE', margin, yPos);

  // Logo a la derecha
  const logoSize = disenoConfig?.tamanoLogo || 30;
  const logoX = pageWidth - margin - logoSize;
  const logoY = margin;

  if (empresaInfo.logo) {
    try {
      doc.addImage(empresaInfo.logo, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      doc.setFillColor(232, 245, 233);
      doc.rect(logoX, logoY, logoSize, logoSize, 'F');
      doc.setFontSize(20);
      doc.text('🚀', logoX + logoSize/2, logoY + logoSize/2, { align: 'center' });
    }
  } else {
    doc.setFillColor(232, 245, 233);
    doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    doc.setFontSize(20);
    doc.text('🚀', logoX + logoSize/2, logoY + logoSize/2, { align: 'center' });
  }

  // DATOS DE LA EMPRESA
  yPos = margin + logoSize + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaInfo.razonSocial, margin, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  yPos += 4;
  doc.text('Sociedad Anónima Tegucigalpa', margin, yPos);
  yPos += 4;
  doc.text(`Teléfono: ${empresaInfo.telefono}`, margin, yPos);
  yPos += 4;
  doc.text(`Dirección: ${empresaInfo.direccion}`, margin, yPos);
  yPos += 4;
  doc.text(`RTN: ${empresaInfo.rtn}`, margin, yPos);

  // DATOS DEL CLIENTE
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente: ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente.nombre, margin + 15, yPos);

  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('RTN: ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(factura.cliente.rtn || '000000000000', margin + 15, yPos);

  // ENCABEZADO "Productos / Servicios"
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Productos / Servicios', margin, yPos);

  // TABLA DE PRODUCTOS
  yPos += 5;
  const tableStartY = yPos;
  const colWidths = {
    producto: 80,
    cant: 15,
    precio: 25,
    descuento: 25,
    impuesto: 25,
    total: 25
  };

  // Encabezado de tabla
  const headerColor = disenoConfig?.colorEncabezadoTabla || '#1F2D3D';
  const rgb = hexToRgb(headerColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(margin, yPos, pageWidth - 2*margin, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  let xPos = margin + 2;
  doc.text('Producto / Descripción', xPos, yPos + 5);
  xPos += colWidths.producto;
  doc.text('Cant.', xPos, yPos + 5, { align: 'center' });
  xPos += colWidths.cant;
  doc.text('Precio', xPos, yPos + 5, { align: 'right' });
  xPos += colWidths.precio;
  doc.text('Descuento', xPos, yPos + 5, { align: 'right' });
  xPos += colWidths.descuento;
  doc.text('Impuesto (ISV)', xPos, yPos + 5, { align: 'right' });
  xPos += colWidths.impuesto;
  doc.text('Total', xPos, yPos + 5, { align: 'right' });

  yPos += 7;

  // Filas de productos
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  factura.productos.forEach((producto) => {
    const subtotal = producto.cantidad * producto.precio;
    const descuento = subtotal * (producto.descuento / 100);
    const baseImponible = subtotal - descuento;
    const impuesto = baseImponible * (producto.impuesto / 100);
    const total = baseImponible + impuesto;

    // Borde de celda
    doc.setDrawColor(221, 221, 221);
    doc.rect(margin, yPos, pageWidth - 2*margin, 6);

    xPos = margin + 2;
    doc.text(producto.nombre, xPos, yPos + 4);
    xPos += colWidths.producto;
    doc.text(producto.cantidad.toString(), xPos, yPos + 4, { align: 'center' });
    xPos += colWidths.cant;
    doc.text(`L${producto.precio.toFixed(2)}`, xPos, yPos + 4, { align: 'right' });
    xPos += colWidths.precio;
    doc.text(`${producto.descuento.toFixed(2)}%`, xPos, yPos + 4, { align: 'right' });
    xPos += colWidths.descuento;
    doc.text(`${producto.impuesto.toFixed(2)}%`, xPos, yPos + 4, { align: 'right' });
    xPos += colWidths.impuesto;
    doc.text(`L${total.toFixed(2)}`, xPos, yPos + 4, { align: 'right' });

    yPos += 6;
  });

  // SECCIÓN INFERIOR: Info adicional (izquierda) y Totales (derecha)
  yPos += 10;
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;

  // Columna izquierda
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No. Orden de compra exento:', leftColX, yPos);
  yPos += 5;
  doc.text('No. Constancia de exoneración:', leftColX, yPos);
  yPos += 5;
  doc.text('No. Registro SAG:', leftColX, yPos);
  yPos += 8;
  doc.text('Notas:', leftColX, yPos);
  if (factura.nota) {
    doc.setFont('helvetica', 'normal');
    yPos += 4;
    doc.text(factura.nota, leftColX, yPos);
  }
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Código/Lugar de la factura:', leftColX, yPos);

  // Columna derecha - Totales
  let totalYPos = yPos - 50;
  doc.setFont('helvetica', 'normal');

  doc.text('Descuento:', rightColX, totalYPos);
  doc.text('0.00', pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('Importe Exento:', rightColX, totalYPos);
  doc.text('0.00', pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('Importe Exonerado:', rightColX, totalYPos);
  doc.text('0.00', pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('Importe Gravado 15%:', rightColX, totalYPos);
  doc.text(`L${factura.subtotal.toFixed(2)}`, pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('Importe Gravado 18%:', rightColX, totalYPos);
  doc.text('0.00', pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('ISV 15%:', rightColX, totalYPos);
  doc.text(`L${factura.impuestos.toFixed(2)}`, pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 5;

  doc.text('ISV 18%:', rightColX, totalYPos);
  doc.text('0.00', pageWidth - margin, totalYPos, { align: 'right' });
  totalYPos += 8;

  // TOTAL FACTURA con fondo
  const totalColor = disenoConfig?.colorTotales || '#1F2D3D';
  const totalRgb = hexToRgb(totalColor);
  doc.setFillColor(totalRgb.r, totalRgb.g, totalRgb.b);
  doc.roundedRect(rightColX - 2, totalYPos - 4, pageWidth - margin - rightColX + 2, 8, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL FACTURA:', rightColX, totalYPos);
  doc.text(`L${factura.total.toFixed(2)}`, pageWidth - margin, totalYPos, { align: 'right' });

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
  disenoConfig?: DisenoConfig
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 139.7] // Media carta
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = margin;

  // ENCABEZADO
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Recibo', margin, yPos);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  yPos += 5;
  doc.text(`N: ${recibo.numeroRecibo}`, margin, yPos);
  yPos += 4;
  doc.text(`FECHA: ${recibo.fechaEmision}`, margin, yPos);
  yPos += 4;
  doc.text(`MÉTODO DE PAGO: ${recibo.metodoPago}`, margin, yPos);

  // Logo a la derecha
  const logoSize = disenoConfig?.tamanoLogo || 25;
  const logoX = pageWidth - margin - logoSize;
  const logoY = margin;

  if (empresaInfo.logo) {
    try {
      doc.addImage(empresaInfo.logo, 'PNG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      doc.setFillColor(76, 175, 80);
      doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F');
    }
  } else {
    doc.setFillColor(76, 175, 80);
    doc.circle(logoX + logoSize/2, logoY + logoSize/2, logoSize/2, 'F');
  }

  // DATOS DE LA EMPRESA
  yPos = margin + logoSize + 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaInfo.razonSocial, margin, yPos);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  yPos += 4;
  doc.text(`RTN: ${empresaInfo.rtn}`, margin, yPos);
  yPos += 3.5;
  doc.text(`Tel: ${empresaInfo.telefono}`, margin, yPos);

  // RECIBIDO DE
  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Recibido de: ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(recibo.cliente.nombre, margin + 22, yPos);

  yPos += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('RTN: ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(recibo.cliente.rtn || 'N/A', margin + 10, yPos);

  // TABLA DE CONCEPTOS
  yPos += 6;
  const headerColor = disenoConfig?.colorEncabezadoTabla || '#1F2D3D';
  const rgb = hexToRgb(headerColor);
  doc.setFillColor(rgb.r, rgb.g, rgb.b);
  doc.rect(margin, yPos, pageWidth - 2*margin, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Concepto', margin + 2, yPos + 4);
  doc.text('Cant', pageWidth / 2, yPos + 4, { align: 'center' });
  doc.text('Precio', pageWidth - 40, yPos + 4, { align: 'right' });
  doc.text('Total', pageWidth - margin - 2, yPos + 4, { align: 'right' });

  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  recibo.productos.forEach((producto) => {
    const total = producto.cantidad * producto.precio;
    doc.setDrawColor(221, 221, 221);
    doc.rect(margin, yPos, pageWidth - 2*margin, 5);

    doc.text(producto.nombre, margin + 2, yPos + 3.5);
    doc.text(producto.cantidad.toString(), pageWidth / 2, yPos + 3.5, { align: 'center' });
    doc.text(`L${producto.precio.toFixed(2)}`, pageWidth - 40, yPos + 3.5, { align: 'right' });
    doc.text(`L${total.toFixed(2)}`, pageWidth - margin - 2, yPos + 3.5, { align: 'right' });

    yPos += 5;
  });

  // TOTAL
  yPos += 5;
  const totalColor = disenoConfig?.colorTotales || '#1F2D3D';
  const totalRgb = hexToRgb(totalColor);
  doc.setFillColor(totalRgb.r, totalRgb.g, totalRgb.b);
  doc.roundedRect(pageWidth - 60, yPos - 3, 50, 7, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', pageWidth - 58, yPos);
  doc.text(`L${recibo.total.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: 'right' });

  // OBSERVACIONES
  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('Observaciones:', margin, yPos);
  if (recibo.nota) {
    doc.setFont('helvetica', 'normal');
    yPos += 4;
    const notaLines = doc.splitTextToSize(recibo.nota, pageWidth - 2*margin);
    doc.text(notaLines, margin, yPos);
  }

  // FIRMA AUTORIZADA
  let firmasY = 115;

  // Si hay firma, mostrarla
  if (empresaInfo.firma) {
    try {
      const firmaWidth = 40;
      const firmaHeight = 20;
      const firmaX = (pageWidth - firmaWidth) / 2;
      doc.addImage(empresaInfo.firma, 'PNG', firmaX, firmasY, firmaWidth, firmaHeight);
      firmasY += firmaHeight + 2;
    } catch (e) {
      // Si falla la carga de la firma, continuar sin ella
    }
  } else {
    firmasY += 25; // Espacio para firma manual
  }

  // Línea para firma
  doc.setDrawColor(102, 102, 102);
  const lineWidth = 50;
  const lineX = (pageWidth - lineWidth) / 2;
  doc.line(lineX, firmasY, lineX + lineWidth, firmasY);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma Autorizada', pageWidth / 2, firmasY + 4, { align: 'center' });

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
