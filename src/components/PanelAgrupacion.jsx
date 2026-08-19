import React from 'react';

export default function PanelAgrupacion({ itemsPendientes, itemsSeleccionados, toggleSeleccionItem, categoriasHomologacion, nuevaCategoria, setNuevaCategoria, handleCrearCategoria, handleEliminarCategoria, asignarItemsACategoria, itemsCotizaciones, desasignarItem }) {
  const theme = { textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', danger: '#DC2626', inputBg: '#FFFFFF' };
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden' }}>
      <div style={{ borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, backgroundColor: 'white' }}><h3 style={{ margin: 0, fontSize: '16px', color: theme.textMain }}>Ítems sin Clasificar ({itemsPendientes.length})</h3></div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {itemsPendientes.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>¡Todos clasificados! Ve al Paso 2. 🎉</div> : (
            itemsPendientes.map(item => (
              <div key={item.idPrimaryKey} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', marginBottom: '10px' }}>
                <input type="checkbox" checked={itemsSeleccionados.includes(item.idPrimaryKey)} onChange={() => toggleSeleccionItem(item.idPrimaryKey)} style={{ marginTop: '5px', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: theme.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.proveedorNombre}>🏢 {item.proveedorNombre}</div>
                  <div style={{ fontSize: '14px', color: theme.textMain, fontWeight: '600', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={item.item}>{item.item}</div>
                  <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '4px' }}>Total: {item.moneda}{item.totalFila.toFixed(2)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, backgroundColor: '#F1F5F9' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: theme.textMain }}>Tus Canastas</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={nuevaCategoria} onChange={(e)=>setNuevaCategoria(e.target.value)} placeholder="Ej: Mantenimiento" style={{...inputStyle, flex: 1}} />
            <button onClick={handleCrearCategoria} style={{ padding: '10px 15px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>Crear</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {categoriasHomologacion.map(cat => {
            const itemsEnCanasta = itemsCotizaciones.filter(i => i.idcategoria === cat.idcategoria)
            return (
              <div key={cat.idcategoria} style={{ border: `1px solid ${theme.primary}`, borderRadius: '8px', marginBottom: '15px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#EFF6FF', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, color: theme.primary, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>📁 {cat.nombrecategoria} <button onClick={() => handleEliminarCategoria(cat.idcategoria)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar">🗑️</button></h4>
                  <button onClick={() => asignarItemsACategoria(cat.idcategoria)} disabled={itemsSeleccionados.length === 0} style={{ padding: '6px 12px', backgroundColor: itemsSeleccionados.length > 0 ? theme.primary : '#CBD5E1', color: 'white', border: 'none', borderRadius: '4px', cursor: itemsSeleccionados.length > 0 ? 'pointer' : 'not-allowed', fontSize: '12px' }}>Asignar</button>
                </div>
                {itemsEnCanasta.length > 0 && (
                  <div style={{ padding: '10px', backgroundColor: 'white' }}>
                    {itemsEnCanasta.map(item => (
                      <div key={item.idPrimaryKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px dashed #E2E8F0', fontSize: '12px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ display: 'inline-block', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.proveedorNombre}>[{item.proveedorNombre}]</span>
                          <span style={{ display: 'inline-block', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: theme.textMain }} title={item.item}>{item.item}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', marginRight: '15px', whiteSpace: 'nowrap' }}>{item.moneda}{item.totalFila.toFixed(2)}</div>
                        <button onClick={() => desasignarItem(item.idPrimaryKey)} style={{ background: 'none', border: 'none', color: theme.danger, cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}