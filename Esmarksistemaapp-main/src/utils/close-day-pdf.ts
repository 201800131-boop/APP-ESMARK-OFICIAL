// Generador de PDF para cierre de día
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sanitizeDataForPDF } from './pdf-safe-renderer';

export interface CloseDayReportData {
  date: string;
  closedAt?: string;
  closedBy?: string;
  
  orders: {
    total: number;
    delivered: number;
    pending: number;
    production: number;
    design: number;
    list: any[];
  };
  
  financial: {
    totalSales: number;
    totalPaid: number;
    totalPending: number;
    cash: number;
    card: number;
    transfer: number;
  };
  
  quotes: {
    total: number;
    amount: number;
    accepted: number;
    pending: number;
  };
  
  pettyCash: {
    initial: number;
    current: number;
    expenses: number;
    income: number;
  };
  
  inventory: {
    movements: number;
    lowStock: number;
  };
  
  cashCount?: {
    bills: any;
    total: number;
    difference: number;
    notes: string;
    addedCash?: number; // ✨ NUEVO: Monto agregado para cubrir faltante
  };
}

export function generateCloseDayPDF(reportData: CloseDayReportData): void {
  try {
    // Sanitizar datos para prevenir errores de memoria
    const sanitizedData = sanitizeDataForPDF(reportData) as CloseDayReportData;
    // Usar los datos sanitizados en lugar de los originales
    reportData = sanitizedData;
    
  const doc = new jsPDF();
  
  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // ENCABEZADO
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ESMARK SYSTEM', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 8;
  doc.setFontSize(16);
  doc.text('REPORTE DE CIERRE DE DÍA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Formatear fecha con manejo de errores
  let fechaFormateada = reportData.date;
  try {
    fechaFormateada = format(new Date(reportData.date), 'PPP', { locale: es });
  } catch (error) {
    console.error('Error formateando fecha del reporte:', reportData.date, error);
  }
  
  doc.text(`Fecha: ${fechaFormateada}`, margin, yPos);
  
  yPos += 5;
  // Solo mostrar fecha de cierre si el día ya fue cerrado
  if (reportData.closedAt) {
    try {
      doc.text(`Cerrado: ${format(new Date(reportData.closedAt), 'PPP p', { locale: es })}`, margin, yPos);
    } catch (error) {
      doc.text(`Cerrado: ${reportData.closedAt}`, margin, yPos);
    }
    yPos += 5;
  }
  
  // Solo mostrar usuario que cerró si el día ya fue cerrado
  if (reportData.closedBy) {
    doc.text(`Cerrado por: ${reportData.closedBy}`, margin, yPos);
    yPos += 5;
  } else {
    doc.text(`Estado: REPORTE PRELIMINAR (No cerrado)`, margin, yPos);
    yPos += 5;
  }
  
  yPos += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // SECCIÓN 1: RESUMEN FINANCIERO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN FINANCIERO', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: [
      ['Ventas Totales del Día', `L ${reportData.financial.totalSales.toFixed(2)}`],
      ['Total Cobrado', `L ${reportData.financial.totalPaid.toFixed(2)}`],
      ['Pendiente por Cobrar', `L ${reportData.financial.totalPending.toFixed(2)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [100, 100, 100] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // DESGLOSE DE PAGOS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose de Pagos Recibidos', margin, yPos);
  yPos += 6;

  autoTable(doc, {
    startY: yPos,
    head: [['Método de Pago', 'Monto']],
    body: [
      ['Efectivo', `L ${reportData.financial.cash.toFixed(2)}`],
      ['Tarjeta', `L ${reportData.financial.card.toFixed(2)}`],
      ['Transferencia', `L ${reportData.financial.transfer.toFixed(2)}`],
      ['TOTAL', `L ${reportData.financial.totalPaid.toFixed(2)}`],
    ],
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [80, 80, 80] },
    footStyles: { fillColor: [60, 60, 60], fontStyle: 'bold' },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // CONTEO DE EFECTIVO
  if (reportData.cashCount) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Conteo de Efectivo Físico', margin, yPos);
    yPos += 6;

    const billData = [
      ['L 500', reportData.cashCount.bills.b500, `L ${(reportData.cashCount.bills.b500 * 500).toFixed(2)}`],
      ['L 200', reportData.cashCount.bills.b200, `L ${(reportData.cashCount.bills.b200 * 200).toFixed(2)}`],
      ['L 100', reportData.cashCount.bills.b100, `L ${(reportData.cashCount.bills.b100 * 100).toFixed(2)}`],
      ['L 50', reportData.cashCount.bills.b50, `L ${(reportData.cashCount.bills.b50 * 50).toFixed(2)}`],
      ['L 20', reportData.cashCount.bills.b20, `L ${(reportData.cashCount.bills.b20 * 20).toFixed(2)}`],
      ['L 10', reportData.cashCount.bills.b10, `L ${(reportData.cashCount.bills.b10 * 10).toFixed(2)}`],
      ['L 5', reportData.cashCount.bills.b5, `L ${(reportData.cashCount.bills.b5 * 5).toFixed(2)}`],
      ['L 2', reportData.cashCount.bills.b2, `L ${(reportData.cashCount.bills.b2 * 2).toFixed(2)}`],
      ['L 1', reportData.cashCount.bills.b1, `L ${(reportData.cashCount.bills.b1 * 1).toFixed(2)}`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Denominación', 'Cantidad', 'Subtotal']],
      body: billData,
      foot: [['TOTAL FÍSICO', '', `L ${reportData.cashCount.total.toFixed(2)}`]],
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [80, 80, 80] },
      footStyles: { fillColor: [60, 60, 60], fontStyle: 'bold' },
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // Diferencia
    if (reportData.cashCount.difference !== 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const diffText = reportData.cashCount.difference > 0 ? 'SOBRANTE' : 'FALTANTE';
      const diffColor = reportData.cashCount.difference > 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
      doc.text(
        `${diffText}: L ${Math.abs(reportData.cashCount.difference).toFixed(2)}`,
        margin,
        yPos
      );
      doc.setTextColor(0, 0, 0);
      
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Descripción: ${reportData.cashCount.notes}`, margin, yPos, {
        maxWidth: pageWidth - 2 * margin,
      });
      yPos += 10;

      // ✨ NUEVO: Monto agregado para cubrir faltante
      if (reportData.cashCount.addedCash && reportData.cashCount.addedCash > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // Azul
        doc.text(
          `💰 Monto Agregado: L ${reportData.cashCount.addedCash.toFixed(2)}`,
          margin,
          yPos
        );
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        // Calcular si cubrió el faltante
        const remainingShortage = Math.abs(reportData.cashCount.difference) - reportData.cashCount.addedCash;
        if (remainingShortage <= 0) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(34, 197, 94); // Verde
          doc.text('✅ El faltante fue cubierto completamente', margin, yPos);
        } else {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(239, 68, 68); // Rojo
          doc.text(`⚠️ Aún falta cubrir: L ${remainingShortage.toFixed(2)}`, margin, yPos);
        }
        doc.setTextColor(0, 0, 0);
        yPos += 10;
      }
    }
  }

  // Nueva página para detalles de pedidos
  doc.addPage();
  yPos = 20;

  // SECCIÓN 2: PEDIDOS DEL DÍA
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDOS DEL DÍA', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Estado', 'Cantidad']],
    body: [
      ['Total del Día', reportData.orders.total.toString()],
      ['Entregados', reportData.orders.delivered.toString()],
      ['En Producción', reportData.orders.production.toString()],
      ['En Diseño', reportData.orders.design.toString()],
      ['Pendientes', reportData.orders.pending.toString()],
    ],
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [80, 80, 80] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Detalle de pedidos
  if (reportData.orders.list && reportData.orders.list.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Pedidos', margin, yPos);
    yPos += 6;

    const orderRows = reportData.orders.list.map((order: any) => {
      let hora = 'N/A';
      if (order.created_at) {
        try {
          hora = format(new Date(order.created_at), 'HH:mm', { locale: es });
        } catch (error) {
          console.error('Error formateando fecha del pedido:', order.created_at, error);
          hora = 'N/A';
        }
      }
      
      return [
        order.order_number || 'N/A',
        order.customer_name || 'Cliente',
        order.status || 'N/A',
        `L ${(order.total || 0).toFixed(2)}`,
        order.payment_status || 'N/A',
        hora,
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['# Pedido', 'Cliente', 'Estado', 'Total', 'Pago', 'Hora']],
      body: orderRows,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // SECCIÓN 3: COTIZACIONES
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIONES', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Valor']],
    body: [
      ['Total Generadas', reportData.quotes.total.toString()],
      ['Aceptadas', reportData.quotes.accepted.toString()],
      ['Pendientes', reportData.quotes.pending.toString()],
      ['Monto Total', `L ${reportData.quotes.amount.toFixed(2)}`],
    ],
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [80, 80, 80] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN 4: CAJA CHICA
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CAJA CHICA', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: [
      ['Saldo Inicial', `L ${reportData.pettyCash.initial.toFixed(2)}`],
      ['+ Ingresos', `L ${reportData.pettyCash.income.toFixed(2)}`],
      ['- Egresos', `L ${reportData.pettyCash.expenses.toFixed(2)}`],
      ['= Saldo Final', `L ${reportData.pettyCash.current.toFixed(2)}`],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [80, 80, 80] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // SECCIÓN 5: INVENTARIO
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVENTARIO', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Cantidad']],
    body: [
      ['Movimientos del Día', reportData.inventory.movements.toString()],
      ['Productos con Stock Bajo', reportData.inventory.lowStock.toString()],
    ],
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [80, 80, 80] },
  });

  // Pie de página
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${totalPages} - Generado: ${format(new Date(), 'PPP p', { locale: es })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
  }

  // Guardar PDF
  let fileDate = reportData.date;
  try {
    fileDate = format(new Date(reportData.date), 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formateando fecha para nombre de archivo:', reportData.date, error);
  }
  
  const fileName = `Cierre_Dia_${fileDate}.pdf`;
  doc.save(fileName);
  } catch (error: any) {
    console.error('Error generando PDF de cierre de día:', error);
    
    // Detectar errores de memoria específicos
    if (
      error.name === 'DataCloneError' ||
      error.message?.includes('out of memory') ||
      error.message?.includes('cannot be cloned')
    ) {
      alert(
        'El reporte es demasiado grande. Por favor, reduce el número de pedidos mostrados e intenta nuevamente.'
      );
      throw error;
    }
    
    alert(`Error al generar PDF: ${error.message || 'Error desconocido'}`);
    throw error;
  }
}