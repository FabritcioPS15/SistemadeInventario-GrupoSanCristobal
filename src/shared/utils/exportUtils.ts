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
  filename: string;    // Nombre del archivo (sin extensión)
  columns: ExportColumn[];
  data: Record<string, any>[]; // Datos a exportar, cada objeto debe tener las keys definidas en columns
}

export const generateExcel = async ({ title, filename, columns, data }: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte');

  // Asegurar al menos 1 columna para evitar errores de merge
  const colCount = Math.max(columns.length, 1);
  const endColLetter = colCount <= 26 
    ? String.fromCharCode(64 + colCount) 
    : String.fromCharCode(64 + Math.floor((colCount - 1) / 26)) + String.fromCharCode(65 + ((colCount - 1) % 26));

  // Título Principal
  worksheet.mergeCells(`A1:${endColLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } }; // Azul Corporativo Profundo
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Subtítulo / Fecha de generación
  worksheet.mergeCells(`A2:${endColLetter}2`);
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
  dateCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF555555' } };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Fila en blanco para separación
  worksheet.getRow(3).height = 10;

  // Configurar Columnas
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 20
  }));

  // Los valores de encabezado van en la fila 4
  worksheet.getRow(4).values = columns.map(c => c.header);
  
  // Estilizar Encabezados
  const headerRow = worksheet.getRow(4);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004080' } }; // Azul Secundario
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

  // Bordes para las celdas (desde la fila 4 en adelante)
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= 4) {
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
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};

export const generatePDF = ({ title, filename, columns, data }: ExportOptions) => {
  // Configurar documento en orientación horizontal (landscape)
  const doc = new jsPDF('landscape');
  
  // --- Encabezado Personalizado (Banda Superior) ---
  doc.setFillColor(0, 40, 85); // Azul corporativo (#002855)
  doc.rect(0, 0, doc.internal.pageSize.width, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 16);

  // Fecha en el lado derecho del encabezado
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 15, 16, { align: 'right' });

  // Mapear los datos según las columnas
  const tableData = data.map(row => columns.map(col => row[col.key]));
  
  // Dibujar la tabla
  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: tableData,
    startY: 32, // Empezar debajo del encabezado
    theme: 'grid',
    styles: { 
      fontSize: 8,
      cellPadding: 4,
      lineColor: [220, 220, 220], // Bordes gris claro
      lineWidth: 0.1,
      font: 'helvetica'
    },
    headStyles: { 
      fillColor: [0, 64, 128], // Azul secundario para las cabeceras de columna
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // Fondo muy claro alterno (slate-50)
    },
    didDrawPage: (hookData) => {
      // --- Pie de Página ---
      const str = `Página ${doc.internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(str, hookData.settings.margin.left, doc.internal.pageSize.height - 10);
      
      // Footer Branding
      doc.text('Sistema de Gestión - Grupo San Cristobal', doc.internal.pageSize.width - hookData.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
    }
  });

  doc.save(`${filename}.pdf`);
};
