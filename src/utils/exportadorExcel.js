import * as XLSX from 'xlsx-js-style'

export const exportarExcelMatriz = (servicioId, numProveedores) => {
  const tabla = document.getElementById('tabla-maestra');
  const workbook = XLSX.utils.table_to_book(tabla, { sheet: "Matriz Homologación", raw: false });
  const ws = workbook.Sheets["Matriz Homologación"];
  
  const nProveedores = numProveedores || 1;

  // 1. ANCHOS DE COLUMNAS DELIMITADOS (Punto 3: Estética y legibilidad sin cortes)
  let colWidths = [
    { wch: 6 },   // Col 0: ITEM
    { wch: 42 },  // Col 1: DESCRIPCIÓN PRINCIPAL (Amplia para evitar saltos raros)
    { wch: 14 }   // Col 2: PRESUPUESTO OBJETIVO
  ];

  // Asignamos anchos estéticos y proporcionales para cada bloque de proveedor
  for (let i = 0; i < nProveedores; i++) { 
    colWidths.push(
      { wch: 8 },  // UNIDAD (Compacta)
      { wch: 11 }, // CANTIDAD (Espacio para números enteros/decimales)
      { wch: 13 }, // P.U. (Precio Unitario)
      { wch: 18 }  // PARCIAL (Amplia para montos grandes en Soles)
    ); 
  }
  ws['!cols'] = colWidths;

  // 2. COMBINACIONES DE CELDAS EXPLÍCITAS (Punto 1: Merges idénticos al PDF)
  // Definimos rangos de celdas a combinar en el Excel (Filas y Columnas basadas en índice 0)
  const merges = [];
  
  // Ejemplo: Combinar las cabeceras superiores de los proveedores (Fila 0 y Fila 1)
  // Cada proveedor abarca 4 columnas consecutivas a partir de la columna 3 (D)
  let startCol = 3;
  for (let i = 0; i < nProveedores; i++) {
    merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 3 } }); // Nombre del proveedor
    merges.push({ s: { r: 1, c: startCol }, e: { r: 1, c: startCol + 3 } }); // Costo Directo
    merges.push({ s: { r: 2, c: startCol }, e: { r: 2, c: startCol + 3 } }); // IGV
    merges.push({ s: { r: 3, c: startCol }, e: { r: 3, c: startCol + 3 } }); // Total
    startCol += 4;
  }
  ws['!merges'] = merges;

  // 3. INYECCIÓN DE ESTILOS, COLORES Y ALTURAS DE FILA
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    let rowColor = null; 
    let textColor = "000000"; 
    let isBold = false;
    let rowText = "";

    for (let i = 0; i < 3; i++) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: i });
      if (ws[cellRef] && ws[cellRef].v) {
        rowText += String(ws[cellRef].v).toUpperCase() + " ";
      }
    }

    // Reglas de colores corporativos por fila
    if (rowText.includes('COSTO DIRECTO (S/.)') || rowText.includes('SUB TOTAL (S/.)') || rowText.includes('TOTAL (S/.)')) {
      rowColor = "000000"; textColor = "FFFFFF"; isBold = true;
    } else if (rowText.includes('PUNTAJE -')) {
      rowColor = "FFFF00"; textColor = "000000"; isBold = true;
    } else if (rowText.includes('PUNTAJE FINAL') || rowText.includes('PUNTAJE')) {
      rowColor = "5DADE2"; textColor = "000000"; isBold = true;
    } else if (rowText.includes('POSTOR GANADOR')) {
      rowColor = "A6ACAF"; textColor = "000000"; isBold = true;
    }

    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) continue;
      
      let val = String(ws[addr].v || "").toUpperCase();
      let cellBg = rowColor; 
      let cellText = textColor; 
      let cellBold = isBold;
      let alignH = (typeof ws[addr].v === 'number' || val.includes('S/') || val.includes('%') || C === 0) ? "center" : "left";

      // Estilos para cabeceras y bloques técnicos
      if (!rowColor && (val.includes('EVALUACIÓN') || val === 'ITEM' || val === 'DESCRIPCIÓN' || val === 'UNIDAD' || val === 'CANTIDAD' || val === 'P.U.' || val === 'PARCIAL' || val === 'PLAZO' || val === 'ENTREGABLE' || val === '%' || val === 'INCIDENCIA' || val === 'ABREVIATURA')) {
         cellBg = "D9D9D9"; cellBold = true; alignH = "center";
      }
      if (val.includes('PRESUPUESTO') || val.includes('PORCENTAJE') || val.includes('OBJETIVO')) { 
        cellBg = "0070C0"; cellText = "FFFFFF"; cellBold = true; alignH = "center"; 
      }
      if (val.includes('MÁXIMO')) { 
        cellBg = "00B050"; cellText = "FFFFFF"; cellBold = true; alignH = "center"; 
      }
      
      if (R <= 3 && val && !val.includes('COSTO DIRECTO') && !val.includes('IGV') && !val.includes('TOTAL')) { 
        cellBg = "D9D9D9"; cellBold = true; alignH = "center"; 
      }

      // Estética de celdas: Control de bordes, fuentes claras y alineación vertical centrada
      ws[addr].s = {
        font: { name: "Arial", sz: 10, bold: cellBold, color: { rgb: cellText } },
        fill: cellBg ? { fgColor: { rgb: cellBg } } : undefined,
        border: {
          top: { style: "thin", color: { rgb: "000000" } }, 
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } }, 
          right: { style: "thin", color: { rgb: "000000" } }
        },
        alignment: { vertical: "center", horizontal: alignH, wrapText: true }
      };
    }
  }

  XLSX.writeFile(workbook, `Matriz_Comparativa_Servicio_${servicioId}.xlsx`);
};