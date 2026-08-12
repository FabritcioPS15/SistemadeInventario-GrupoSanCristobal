import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // Ancho en caracteres para Excel
}

export interface ExportOptions {
  title: string;       // Título del reporte
  filename: string;    // Nombre del módulo (ej: 'Cámaras', 'Usuarios')
  sede?: string;       // Sede/ubicación filtrada (opcional)
  columns: ExportColumn[];
  data: Record<string, any>[]; // Datos a exportar, cada objeto debe tener las keys definidas en columns
}

export const generateExcel = async ({ title, filename, sede, columns, data }: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // Asegurar al menos 1 columna para evitar errores de merge
  const colCount = Math.max(columns.length, 1);
  const endColLetter = colCount <= 26
    ? String.fromCharCode(64 + colCount)
    : String.fromCharCode(64 + Math.floor((colCount - 1) / 26)) + String.fromCharCode(65 + ((colCount - 1) % 26));

  // Título Principal (Negro)
  worksheet.mergeCells(`A1:${endColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }; // Negro
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Franja Naranja abajo del título
  worksheet.mergeCells(`A2:${endColLetter}2`);
  const orangeCell = worksheet.getCell('A2');
  orangeCell.value = '';
  orangeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8C00' } }; // Naranja Oscuro
  worksheet.getRow(2).height = 5;

  // Subtítulo / Fecha de generación
  worksheet.mergeCells(`A3:${endColLetter}3`);
  const dateCell = worksheet.getCell('A3');
  dateCell.value = `Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
  dateCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(3).height = 20;

  // Fila en blanco para separación
  worksheet.getRow(4).height = 10;

  // Configurar Columnas
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20
  }));

  // Los valores de encabezado van en la fila 5
  worksheet.getRow(5).values = columns.map(c => c.header);

  // Estilizar Encabezados (Azul Secundario / Oscuro corporativo)
  const headerRow = worksheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } }; // Azul Corporativo Profundo
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 30;

  // Agregar Datos
  data.forEach((row, index) => {
    const newRow = worksheet.addRow(row);
    newRow.alignment = { vertical: 'middle', wrapText: true };
    newRow.font = { size: 10, name: 'Arial' };

    // Zebra striping (Fila intercalada)
    if (index % 2 !== 0) {
      newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Gris/Azul muy claro
    }
  });

  // Bordes para las celdas (desde la fila 5 en adelante)
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
      });
    }
  });

  // Exportar y Descargar
  const nombre = `Reporte ${filename}${sede ? ` - ${sede}` : ''}`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nombre}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

// Helper: carga el logo corporativo como base64 para incrustarlo en jsPDF
const loadLogoBase64 = (): Promise<string> =>
  fetch('/Enblanco.png')
    .then(r => r.blob())
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .catch(() => ''); // Si falla, continúa sin logo

// Dibuja el encabezado corporativo unificado en el doc jsPDF
const drawPDFHeader = (doc: jsPDF, title: string, logoBase64: string) => {
  const pageW = doc.internal.pageSize.width;

  // Banda negra principal
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageW, 24, 'F');

  // Franja naranja
  doc.setFillColor(255, 140, 0);
  doc.rect(0, 24, pageW, 3, 'F');

  // Franja gris delgada debajo de la naranja
  doc.setFillColor(180, 180, 180);
  doc.rect(0, 27, pageW, 1, 'F');

  // Logo corporativo (derecha del header)
  if (logoBase64) {
    try {
      // Alto del logo = 16mm, ajustado dentro de la banda negra
      const logoH = 16;
      const logoW = logoH * 3.5; // proporción aproximada del logo
      doc.addImage(logoBase64, 'PNG', pageW - logoW - 6, 4, logoW, logoH);
    } catch (_) { /* ignorar si el logo no carga */ }
  }

  // Título (blanco, izquierda)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 13);

  // Fecha debajo del título (gris claro, pequeño)
  const now = new Date();
  const fechaHora = `${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}  •  ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(fechaHora, 10, 18);
};

export const generatePDF = async ({ title, filename, sede, columns, data }: ExportOptions) => {
  const logoBase64 = await loadLogoBase64();

  // Configurar documento en orientación horizontal (landscape)
  const doc = new jsPDF('landscape');

  drawPDFHeader(doc, title, logoBase64);

  // Mapear los datos según las columnas
  const tableData = data.map(row => columns.map(col => row[col.key]));

  // Dibujar la tabla
  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: tableData,
    startY: 36, // Debajo del encabezado
    margin: { top: 36 }, // En páginas 2+ la tabla empieza debajo del header redibujado
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [30, 30, 30], // Negro corporativo (unificado)
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    didDrawPage: (hookData) => {
      // Redibujar encabezado en todas las páginas (incluyendo la primera)
      drawPDFHeader(doc, title, logoBase64);
      // --- Pie de Página ---
      const str = `Página ${(doc.internal as any).getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, hookData.settings.margin.left, doc.internal.pageSize.height - 8);
      doc.text('Sistema de Gestión - Corporación San Cristobal', doc.internal.pageSize.width - hookData.settings.margin.right, doc.internal.pageSize.height - 8, { align: 'right' });
    }
  });

  const nombre = `Reporte ${filename}${sede ? ` - ${sede}` : ''}`;
  doc.save(`${nombre}.pdf`);
};
