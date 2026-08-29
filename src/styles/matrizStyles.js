// =========================================================
// DICCIONARIO MAESTRO DE VARIABLES (Design Tokens)
// Modifica estos valores para achicar o agrandar todo el PDF
// =========================================================
export const CONFIG_PDF = {
  fuente: {
    titulo: '14px',       // Antes era 16px
    subtitulo: '10px',    // Antes era 10.5px
    cuerpo: '9px',        // Antes era 10.5px (texto general de la tabla)
    pequeno: '8.5px'      // Para los inputs
  },
  caja: {
    paddingCuerpo: '3px 4px',    // Antes era '8px 4px'. Reducimos el alto de la caja.
    paddingCabecera: '4px 2px',  // Antes era '10px 4px'
  },
  colores: {
    borde: '#000',
    texto: '#000'
  }
};

export const borderPdf = `1px solid ${CONFIG_PDF.colores.borde}`;

export const thPdf = { 
  border: borderPdf, backgroundColor: '#D9D9D9', padding: CONFIG_PDF.caja.paddingCabecera, 
  fontSize: CONFIG_PDF.fuente.cuerpo, fontWeight: 'bold', textAlign: 'center', 
  color: CONFIG_PDF.colores.texto, wordWrap: 'break-word', verticalAlign: 'middle' 
};

export const tdPdf = { 
  border: borderPdf, padding: CONFIG_PDF.caja.paddingCuerpo, fontSize: CONFIG_PDF.fuente.cuerpo, 
  color: CONFIG_PDF.colores.texto, wordWrap: 'break-word', verticalAlign: 'middle' 
};

export const tdCenter = { ...tdPdf, textAlign: 'center' };

export const tdRight = { 
  ...tdPdf, textAlign: 'right', whiteSpace: 'nowrap', fontSize: CONFIG_PDF.fuente.cuerpo 
}; 

export const rowBlack = { backgroundColor: '#000', color: '#FFF', fontWeight: 'bold' };
export const rowYellow = { backgroundColor: '#FFFF00', color: '#000', fontWeight: 'bold' };

export const inputStyleMatriz = { 
  width: '100%', height: '22px', lineHeight: '22px', border: 'none', 
  textAlign: 'center', fontSize: CONFIG_PDF.fuente.pequeno, outline: 'none', 
  backgroundColor: 'transparent', padding: '0', margin: '0', 
  color: CONFIG_PDF.colores.texto, fontWeight: 'bold', boxSizing: 'border-box' 
};