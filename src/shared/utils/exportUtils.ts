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
  /** Clave de columna por la cual agrupar los datos (ej: 'category'). Si no se indica, no se agrupa. */
  groupBy?: string;
  /** Clave de columna por la cual dividir los datos en hojas separadas del Excel (ej: 'category').
   *  Cada hoja se nombra con el valor de la categoría. Si no se indica, se genera una sola hoja. */
  sheetBy?: string;
  /** Mapeo opcional: valor del grupo -> etiqueta visible (ej: { '1': 'Tecnología' }) */
  groupLabels?: Record<string, string>;
  /** Descripciones de los filtros activos que se mostrarán en el encabezado del reporte. */
  filters?: string[];
  /** Total de registros exportados (se muestra en el encabezado). Si no se indica, usa data.length. */
  registros?: number;
}

// Agrupa los datos según la clave groupBy y ordena los grupos + filas alfabéticamente.
const groupData = (
  data: Record<string, any>[],
  groupBy?: string,
  groupLabels?: Record<string, string>
): { key: string | null; label: string; rows: Record<string, any>[] }[] => {
  if (!groupBy) return [{ key: null, label: '', rows: data }];

  const map = new Map<string, Record<string, any>[]>();
  data.forEach(row => {
    const raw = row[groupBy];
    const key = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '(Sin valor)';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  });

  const groups: { key: string; label: string; rows: Record<string, any>[] }[] = [];
  map.forEach((rows, key) => groups.push({ key, label: groupLabels?.[key] ?? key, rows }));
  groups.sort((a, b) => a.label.localeCompare(b.label, 'es'));
  return groups;
};

export const generateExcel = async ({ title, filename, sede, columns, data, groupBy, groupLabels, filters, registros, sheetBy }: ExportOptions) => {
  const workbook = new ExcelJS.Workbook();

  // Asegurar al menos 1 columna para evitar errores de merge
  const colCount = Math.max(columns.length, 1);
  const endColLetter = colCount <= 26
    ? String.fromCharCode(64 + colCount)
    : String.fromCharCode(64 + Math.floor((colCount - 1) / 26)) + String.fromCharCode(65 + ((colCount - 1) % 26));

  // Cargar y registrar el logo una sola vez (reutilizable por todas las hojas)
  const logoBase64 = await loadLogoBase64();
  let logoId: number | undefined;
  if (logoBase64) {
    try {
      logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });
    } catch (_) { /* Ignorar si no es posible incrustar la imagen */ }
  }

  // Construye una hoja completa con cabecera corporativa, encabezados y datos
  const populateWorksheet = (sheetName: string, rows: Record<string, any>[], sheetRegistros: number, sheetSubtitle?: string) => {
    const worksheet = workbook.addWorksheet(sheetName);

    // Título Principal (Negro)
    worksheet.mergeCells(`A1:${endColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = sheetSubtitle ? `${title} - ${sheetSubtitle}` : title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }; // Negro
    titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(1).height = 46;

    // Logo corporativo en la parte superior derecha
    if (logoId !== undefined) {
      try {
        worksheet.addImage(logoId, {
          tl: { col: Math.max(colCount - 1, 0), row: 0.15 },
          ext: { width: 160, height: 43 }
        });
      } catch (_) { /* Ignorar si no es posible incrustar la imagen */ }
    }

    // Franja Naranja abajo del título
    worksheet.mergeCells(`A2:${endColLetter}2`);
    const orangeCell = worksheet.getCell('A2');
    orangeCell.value = '';
    orangeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8C00' } }; // Naranja Oscuro
    worksheet.getRow(2).height = 4;

    // Franja Gris delgada
    worksheet.mergeCells(`A3:${endColLetter}3`);
    const greyCell = worksheet.getCell('A3');
    greyCell.value = '';
    greyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4B4B4' } }; // Gris delgada
    worksheet.getRow(3).height = 2;

    // Subtítulo / Fecha de generación, Sede y Filtros
    worksheet.mergeCells(`A4:${endColLetter}4`);
    const dateCell = worksheet.getCell('A4');
    const now = new Date();
    const fechaHoraStr = `${now.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}  •  ${now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`;
    const filterStr = filters && filters.length > 0 ? `   |   Filtros: ${filters.join(' • ')}` : '';
    const registrosStr = `   |   Registros: ${sheetRegistros}`;
    dateCell.value = `Generado el: ${fechaHoraStr}${sede ? `   |   Sede: ${sede}` : ''}${filterStr}${registrosStr}   |   Sistema de Gestión - Corporación San Cristobal`;
    dateCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF555555' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
    // Ajustar altura según el contenido (filtros y sedes largos) para que no se corte
    const headerTextLen = (dateCell.value as string).length;
    worksheet.getRow(4).height = headerTextLen > 160 ? 40 : headerTextLen > 110 ? 32 : 26;

    // Fila en blanco para separación
    worksheet.getRow(5).height = 8;

    // Configurar Columnas (sin header para no sobrescribir la fila 1 con los títulos;
    // los encabezados se escriben manualmente en la fila 6 más abajo)
    worksheet.columns = columns.map(col => ({
      key: col.key,
      width: col.width || 20
    }));

    // Los valores de encabezado van en la fila 6
    worksheet.getRow(6).values = columns.map(c => c.header);

    // Estilizar Encabezados (Azul Secundario / Oscuro corporativo)
    const headerRow = worksheet.getRow(6);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Arial' };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002855' } }; // Azul Corporativo Profundo
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.height = 28;

    // Agregar Datos (agrupados opcionalmente por groupBy dentro de la misma hoja)
    const groups = groupData(rows, groupBy, groupLabels);
    let zebraIndex = 0;

    groups.forEach(group => {
      // Fila de encabezado del grupo
      if (groupBy && group.key !== null) {
        const groupRowIdx = worksheet.rowCount + 1;
        const groupRow = worksheet.addRow([group.label]);
        const gCell = groupRow.getCell(1);
        gCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF164085' } };
        gCell.alignment = { horizontal: 'left', vertical: 'middle' };
        worksheet.mergeCells(`A${groupRowIdx}:${endColLetter}${groupRowIdx}`);
        groupRow.height = 22;
      }

      group.rows.forEach(rowData => {
        const newRow = worksheet.addRow(rowData);
        newRow.alignment = { vertical: 'middle', wrapText: true };
        newRow.font = { size: 10, name: 'Arial' };

        // Zebra striping (Fila intercalada)
        if (zebraIndex % 2 !== 0) {
          newRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Gris/Azul muy claro
        }
        zebraIndex++;
      });
    });

    // Bordes para las celdas (desde la fila 6 en adelante)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber >= 6) {
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

    // Filtros nativos de Excel en los encabezados de la tabla (fila 6)
    if (worksheet.rowCount >= 6) {
      worksheet.autoFilter = {
        from: 'A6',
        to: `${endColLetter}${worksheet.rowCount}`
      };
    }
  };

  const totalRegistros = registros ?? data.length;

  // Nombre válido para hoja: máx 31 caracteres, sin caracteres reservados
  const sanitizeSheetName = (name: string): string => {
    const cleaned = String(name).replace(/[\\\/\?\*\[\]:]/g, ' ').replace(/\s+/g, ' ').trim();
    const truncated = cleaned.length > 28 ? cleaned.slice(0, 28).trim() : cleaned;
    return truncated || 'Reporte';
  };

  // Si se indica sheetBy, se genera una hoja por categoría
  if (sheetBy) {
    const groups = groupData(data, sheetBy, groupLabels);
    const hasGroups = groups.length > 0 && groups[0].key !== null;
    if (hasGroups) {
      groups.forEach(group => {
        populateWorksheet(sanitizeSheetName(group.label), group.rows, group.rows.length, group.label);
      });
    } else {
      populateWorksheet('Reporte', data, totalRegistros);
    }
  } else {
    populateWorksheet('Reporte', data, totalRegistros);
  }

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
const drawPDFHeader = (doc: jsPDF, title: string, logoBase64: string, filters?: string[], registros?: number) => {
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
  const filterStr = filters && filters.length > 0 ? `   •   Filtros: ${filters.join(' / ')}` : '';
  const registrosStr = registros != null ? `   •   Registros: ${registros}` : '';
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`${fechaHora}${filterStr}${registrosStr}`, 10, 18);
};

export const generatePDF = async ({ title, filename, sede, columns, data, groupBy, groupLabels, filters, registros }: ExportOptions) => {
  const logoBase64 = await loadLogoBase64();

  // Configurar documento en orientación horizontal (landscape)
  const doc = new jsPDF('landscape');

  drawPDFHeader(doc, title, logoBase64, filters, registros ?? data.length);

  // Mapear los datos según las columnas (con filas de agrupación)
  const groups = groupData(data, groupBy, groupLabels);
  const tableData: any[] = [];
  groups.forEach(group => {
    if (groupBy && group.key !== null) {
      tableData.push([{
        content: group.label,
        colSpan: columns.length,
        styles: {
          fillColor: [22, 64, 133],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'left',
        },
      }]);
    }
    group.rows.forEach(row => {
      tableData.push(columns.map(col => row[col.key]));
    });
  });

  // Dibujar la tabla
  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: tableData,
    startY: 36, // Debajo del encabezado
    margin: { top: 40 }, // En páginas 2+ la tabla empieza debajo del header redibujado
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
      drawPDFHeader(doc, title, logoBase64, filters, registros ?? data.length);
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
