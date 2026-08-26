export const borderPdf = '1px solid #000';

export const thPdf = { 
  border: borderPdf, backgroundColor: '#D9D9D9', padding: '10px 4px', 
  fontSize: '10.5px', fontWeight: 'bold', textAlign: 'center', 
  color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' 
};

export const tdPdf = { 
  border: borderPdf, padding: '8px 4px', fontSize: '10.5px', 
  color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' 
};

export const tdCenter = { ...tdPdf, textAlign: 'center' };

export const tdRight = { 
  ...tdPdf, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '10.5px' 
}; 

export const rowBlack = { backgroundColor: '#000', color: '#FFF', fontWeight: 'bold' };
export const rowYellow = { backgroundColor: '#FFFF00', color: '#000', fontWeight: 'bold' };

export const inputStyleMatriz = { 
  width: '100%', height: '22px', lineHeight: '22px', border: 'none', 
  textAlign: 'center', fontSize: '10.5px', outline: 'none', 
  backgroundColor: 'transparent', padding: '0', margin: '0', 
  color: '#000', fontWeight: 'bold', boxSizing: 'border-box' 
};