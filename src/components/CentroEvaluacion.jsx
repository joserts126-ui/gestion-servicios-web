import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function CentroEvaluacion({ servicio, onClose, onActualizado }) {
  const [cargando, setCargando] = useState(true)
  const [categoriasHomologacion, setCategoriasHomologacion] = useState([])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [itemsSeleccionados, setItemsSeleccionados] = useState([])
  const [itemsCotizaciones, setItemsCotizaciones] = useState([])
  
  const [pestanaHomologacion, setPestañaHomologacion] = useState('agrupar')
  const [edicionMatriz, setEdicionMatriz] = useState({})
  const [puntajesEvaluacion, setPuntajesEvaluacion] = useState({})
  const [guardandoMatriz, setGuardandoMatriz] = useState(false)

  // Inicialización inteligente y aislada
  useEffect(() => {
    const inicializar = async () => {
      setCargando(true)
      const [resCat, resImp] = await Promise.all([
        supabase.from('categoriahomologacion').select('*').eq('idservicio', servicio.idservicio),
        supabase.from('impuestos').select('*')
      ])
      
      setCategoriasHomologacion(resCat.data || [])
      const impuestos = resImp.data || []

      let todosLosItems = []
      let pIniciales = {}

      servicio.cotizaciones.forEach(cot => {
        pIniciales[cot.idcotizacion] = {
          eco: cot.puntaje_eco || 0,
          plazo: cot.puntaje_plazo || 0,
          alcance: cot.puntaje_alcance || 0,
          pago: cot.puntaje_pago || 0
        }

        if(cot.detallecotizacion) {
          cot.detallecotizacion.forEach((det) => {
            const baseFila = det.cantidad * det.preciounitario
            const tipoImpuesto = impuestos.find(i => i.idimpuestos == det.idimpuestos)?.impuesto
            let totalFila = baseFila
            if (tipoImpuesto === '+ IGV') totalFila = baseFila * 1.18
            
            todosLosItems.push({
              ...det,
              proveedorNombre: cot.proveedor?.razonsocial || 'Desconocido',
              moneda: cot.moneda?.moneda.includes('USD') ? '$' : 'S/',
              totalFila: totalFila,
              idPrimaryKey: det.iddetcot,
              idcotizacion: cot.idcotizacion
            })
          })
        }
      })
      
      setItemsCotizaciones(todosLosItems)
      setPuntajesEvaluacion(pIniciales)
      setCargando(false)
    }
    
    if (servicio) inicializar()
  }, [servicio])

  // ================= FUNCIONES DE AGRUPACIÓN =================
  const handleCrearCategoria = async () => {
    if(!nuevaCategoria.trim()) return
    const { data, error } = await supabase.from('categoriahomologacion')
      .insert([{ idservicio: servicio.idservicio, nombrecategoria: nuevaCategoria.trim() }]).select()
    if(data) { setCategoriasHomologacion([...categoriasHomologacion, data[0]]); setNuevaCategoria('') }
    if(error) alert("Error al crear categoría: " + error.message)
  }

  const handleEliminarCategoria = async (idCategoria) => {
    if(!window.confirm("¿Seguro que deseas eliminar esta canasta? Todos sus ítems regresarán a la bandeja de pendientes.")) return;
    const { error } = await supabase.from('categoriahomologacion').delete().eq('idcategoria', idCategoria);
    if (!error) {
      setCategoriasHomologacion(categoriasHomologacion.filter(c => c.idcategoria !== idCategoria));
      setItemsCotizaciones(itemsCotizaciones.map(item => item.idcategoria === idCategoria ? { ...item, idcategoria: null } : item));
    }
  }

  const toggleSeleccionItem = (idItem) => setItemsSeleccionados(prev => prev.includes(idItem) ? prev.filter(id => id !== idItem) : [...prev, idItem])

  const asignarItemsACategoria = async (idCategoria) => {
    if(itemsSeleccionados.length === 0) return
    const { error } = await supabase.from('detallecotizacion').update({ idcategoria: idCategoria }).in('iddetcot', itemsSeleccionados)
    if(!error) {
      setItemsCotizaciones(itemsCotizaciones.map(item => itemsSeleccionados.includes(item.idPrimaryKey) ? { ...item, idcategoria: idCategoria } : item))
      setItemsSeleccionados([])
    }
  }

  const desasignarItem = async (idItem) => {
    const { error } = await supabase.from('detallecotizacion').update({ idcategoria: null }).eq('iddetcot', idItem)
    if(!error) setItemsCotizaciones(itemsCotizaciones.map(item => item.idPrimaryKey === idItem ? { ...item, idcategoria: null } : item))
  }

  // ================= FUNCIONES DE MATRIZ =================
  const handleEdicionMatriz = (idCat, idCot, campo, valor) => {
    setEdicionMatriz(prev => ({ ...prev, [`${idCat}-${idCot}`]: { ...(prev[`${idCat}-${idCot}`] || {}), [campo]: valor } }))
  }

  const handlePuntajeChange = (idCot, campo, valor) => {
    const num = parseFloat(valor) || 0;
    setPuntajesEvaluacion(prev => ({ ...prev, [idCot]: { ...prev[idCot], [campo]: num > 5 ? 5 : (num < 0 ? 0 : num) } }));
  }

  const calcularNotaIntegral = (idCot) => {
    const p = puntajesEvaluacion[idCot] || {};
    return ((p.eco || 0) * 0.35 + (p.plazo || 0) * 0.35 + (p.alcance || 0) * 0.20 + (p.pago || 0) * 0.10).toFixed(2);
  }

  const guardarMatrizEvaluacion = async () => {
    setGuardandoMatriz(true);
    try {
      for (const id of Object.keys(puntajesEvaluacion)) {
        const p = puntajesEvaluacion[id];
        await supabase.from('cotizaciones').update({ puntaje_eco: p.eco, puntaje_plazo: p.plazo, puntaje_alcance: p.alcance, puntaje_pago: p.pago }).eq('idcotizacion', id);
      }
      alert("¡Evaluaciones guardadas con éxito!");
      if (onActualizado) onActualizado();
    } catch (error) { alert("Error al guardar: " + error.message); } 
    finally { setGuardandoMatriz(false); }
  }

  // ================= RENDERIZADO =================
  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', danger: '#DC2626', inputBg: '#FFFFFF' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }

  if (cargando) return <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, color: 'white' }}>Cargando Centro de Evaluación...</div>

  const itemsPendientes = itemsCotizaciones.filter(i => !i.idcategoria)
  const cotizacionesParticipantes = servicio.cotizaciones || []
  let maxNota = -1; let idGanador = null;
  cotizacionesParticipantes.forEach(cot => { const nota = parseFloat(calcularNotaIntegral(cot.idcotizacion)); if (nota > maxNota && nota > 0) { maxNota = nota; idGanador = cot.idcotizacion; } });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: theme.bgApp, borderRadius: '16px', width: '98%', maxWidth: '1500px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ padding: '20px 30px 0 30px', backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: theme.textMain }}>⚖️ Centro de Homologación y Evaluación</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: theme.textMuted }}>Servicio #{servicio.idservicio} - {servicio.servicio}</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => setPestañaHomologacion('agrupar')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'agrupar' ? `3px solid ${theme.primary}` : '3px solid transparent', color: pestanaHomologacion === 'agrupar' ? theme.primary : theme.textMuted, fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: '0.2s' }}>Paso 1: Agrupar Canastas</button>
              <button onClick={() => setPestañaHomologacion('evaluar')} disabled={itemsPendientes.length > 0} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'evaluar' ? `3px solid ${theme.primary}` : '3px solid transparent', color: pestanaHomologacion === 'evaluar' ? theme.primary : (itemsPendientes.length > 0 ? '#CBD5E1' : theme.textMuted), fontWeight: '700', fontSize: '14px', cursor: itemsPendientes.length > 0 ? 'not-allowed' : 'pointer', transition: '0.2s' }} title={itemsPendientes.length > 0 ? 'Clasifica todos los ítems primero' : ''}>Paso 2: Matriz Comparativa (PDF)</button>
            </div>
          </div>
          <button onClick={onClose} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: theme.textMain, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cerrar Panel</button>
        </div>

        {/* PESTAÑA 1: AGRUPAR */}
        {pestanaHomologacion === 'agrupar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden' }}>
            <div style={{ borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC' }}>
              <div style={{ padding: '20px', borderBottom: `1px solid ${theme.border}`, backgroundColor: 'white' }}><h3 style={{ margin: 0, fontSize: '16px', color: theme.textMain }}>Ítems sin Clasificar ({itemsPendientes.length})</h3></div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {itemsPendientes.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: theme.textMuted }}>¡Todos clasificados! Ve al Paso 2. 🎉</div> : (
                  itemsPendientes.map(item => (
                    <div key={item.idPrimaryKey} style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '15px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', marginBottom: '10px' }}>
                      <input type="checkbox" checked={itemsSeleccionados.includes(item.idPrimaryKey)} onChange={() => toggleSeleccionItem(item.idPrimaryKey)} style={{ marginTop: '5px', width: '18px', height: '18px', cursor: 'pointer' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: theme.primary }}>🏢 {item.proveedorNombre}</div>
                        <div style={{ fontSize: '14px', color: theme.textMain, fontWeight: '600' }}>{item.item}</div>
                        <div style={{ fontSize: '12px', color: theme.textMuted }}>Total: {item.moneda}{item.totalFila.toFixed(2)}</div>
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
                              <div style={{ flex: 1 }}><span style={{ fontWeight: 'bold', color: theme.textMuted }}>[{item.proveedorNombre}]</span> {item.item}</div>
                              <div style={{ fontWeight: 'bold', marginRight: '15px' }}>{item.moneda}{item.totalFila.toFixed(2)}</div>
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
        )}

        {/* PESTAÑA 2: EVALUACIÓN */}
        {pestanaHomologacion === 'evaluar' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#F8FAFC', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: `2px solid ${theme.textMain}`, paddingBottom: '16px' }}>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '800', color: theme.textMain }}>COMPARATIVO DE PROPUESTAS</h1>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: theme.textMuted }}>{servicio.servicio.toUpperCase()}</h2>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: theme.primary, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>I. Evaluación Económica</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${theme.border}` }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9' }}>
                        <th style={{ ...thStyle, width: '40px', border: `1px solid ${theme.border}` }}>ITEM</th>
                        <th style={{ ...thStyle, textAlign: 'left', border: `1px solid ${theme.border}` }}>DESCRIPCIÓN (CANASTA)</th>
                        {cotizacionesParticipantes.map(cot => (
                          <React.Fragment key={`head-prov-${cot.idcotizacion}`}>
                            <th style={{ ...thStyle, width: '80px', border: `1px solid ${theme.border}` }}>UND</th>
                            <th style={{ ...thStyle, width: '80px', border: `1px solid ${theme.border}` }}>CANT</th>
                            <th style={{ ...thStyle, border: `1px solid ${theme.border}`, backgroundColor: '#EFF6FF', color: theme.primary, textAlign: 'center' }}>{cot.proveedor?.razonsocial}</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoriasHomologacion.map((cat, idx) => (
                        <tr key={cat.idcategoria}>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', border: `1px solid ${theme.border}` }}>{idx + 1}</td>
                          <td style={{ ...tdStyle, border: `1px solid ${theme.border}` }}>{cat.nombrecategoria.toUpperCase()}</td>
                          {cotizacionesParticipantes.map(cot => {
                            const itemsCruzados = itemsCotizaciones.filter(i => i.idcategoria === cat.idcategoria && i.idcotizacion === cot.idcotizacion)
                            const suma = itemsCruzados.reduce((acc, curr) => acc + curr.totalFila, 0)
                            const keyEdicion = `${cat.idcategoria}-${cot.idcotizacion}`;
                            const und = edicionMatriz[keyEdicion]?.und !== undefined ? edicionMatriz[keyEdicion].und : (itemsCruzados.length > 1 ? 'GLB' : 'UND');
                            const cant = edicionMatriz[keyEdicion]?.cant !== undefined ? edicionMatriz[keyEdicion].cant : '1.00';
                            return (
                              <React.Fragment key={`body-${keyEdicion}`}>
                                <td style={{ border: `1px solid ${theme.border}`, padding: '4px' }}><input type="text" value={und} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'und', e.target.value.toUpperCase())} style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px', outline: 'none', backgroundColor: 'transparent' }} /></td>
                                <td style={{ border: `1px solid ${theme.border}`, padding: '4px' }}><input type="text" value={cant} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'cant', e.target.value)} style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: '13px', outline: 'none', backgroundColor: 'transparent' }} /></td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: suma > 0 ? theme.textMain : '#CBD5E1', border: `1px solid ${theme.border}` }}>{suma > 0 ? `S/ ${suma.toFixed(2)}` : '-'}</td>
                              </React.Fragment>
                            )
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', border: `1px solid ${theme.border}` }}>A. COSTO DIRECTO (S/.)</td>
                        {cotizacionesParticipantes.map(cot => {
                          const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                          return <td colSpan="3" key={`cd-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', border: `1px solid ${theme.border}` }}>S/ {cd.toFixed(2)}</td>
                        })}
                      </tr>
                      <tr>
                        <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: theme.textMuted, border: `1px solid ${theme.border}` }}>A.1 GASTOS GENERALES</td>
                        {cotizacionesParticipantes.map(cot => ( <td colSpan="3" key={`gg-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'right', border: `1px solid ${theme.border}` }}>S/ {parseFloat(cot.gastos_generales || 0).toFixed(2)}</td> ))}
                      </tr>
                      <tr>
                        <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: theme.textMuted, border: `1px solid ${theme.border}` }}>A.2 UTILIDADES</td>
                        {cotizacionesParticipantes.map(cot => ( <td colSpan="3" key={`ut-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'right', border: `1px solid ${theme.border}` }}>S/ {parseFloat(cot.utilidades || 0).toFixed(2)}</td> ))}
                      </tr>
                      <tr>
                        <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', fontSize: '15px', color: theme.primary, border: `1px solid ${theme.border}` }}>C. TOTAL (Inc. IGV)</td>
                        {cotizacionesParticipantes.map(cot => {
                          const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                          const total = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 1.18;
                          return <td colSpan="3" key={`tot-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', fontSize: '15px', color: theme.primary, border: `1px solid ${theme.border}` }}>S/ {total.toFixed(2)}</td>
                        })}
                      </tr>
                      <tr style={{ backgroundColor: '#FEF9C3' }}>
                        <td colSpan="2" style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#854D0E', border: `1px solid ${theme.border}` }}>PUNTAJE - EVALUACIÓN ECONÓMICA</td>
                        {cotizacionesParticipantes.map(cot => (
                          <td colSpan="3" key={`peco-${cot.idcotizacion}`} style={{ border: `1px solid ${theme.border}`, padding: '0' }}><input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.eco} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'eco', e.target.value)} style={{ width: '100%', height: '40px', border: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#854D0E', backgroundColor: 'transparent', outline: 'none' }} /></td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: theme.primary, borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>II. Evaluación Técnica (Plazos y Alcance)</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${theme.border}` }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9' }}><th style={{ ...thStyle, width: '200px', border: `1px solid ${theme.border}`, textAlign: 'left' }}>CRITERIO</th>{cotizacionesParticipantes.map(cot => ( <th key={`tech-${cot.idcotizacion}`} style={{ ...thStyle, border: `1px solid ${theme.border}`, textAlign: 'center' }}>{cot.proveedor?.razonsocial}</th> ))}</tr>
                    </thead>
                    <tbody>
                      <tr><td style={{ ...tdStyle, fontWeight: '700', border: `1px solid ${theme.border}` }}>Plazos de Entrega</td>{cotizacionesParticipantes.map(cot => ( <td key={`plzd-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'center', border: `1px solid ${theme.border}` }}>{cot.plazo_dias || '---'}</td> ))}</tr>
                      <tr style={{ backgroundColor: '#FEF9C3' }}><td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#854D0E', border: `1px solid ${theme.border}` }}>PUNTAJE PLAZOS</td>{cotizacionesParticipantes.map(cot => ( <td key={`ppla-${cot.idcotizacion}`} style={{ border: `1px solid ${theme.border}`, padding: '0' }}><input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.plazo} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'plazo', e.target.value)} style={{ width: '100%', height: '40px', border: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#854D0E', backgroundColor: 'transparent', outline: 'none' }} /></td> ))}</tr>
                      <tr><td style={{ ...tdStyle, fontWeight: '700', border: `1px solid ${theme.border}` }}>Entregables Considerados</td>{cotizacionesParticipantes.map(cot => ( <td key={`entd-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'center', border: `1px solid ${theme.border}`, fontSize: '12px' }}>{cot.entregables || '---'}</td> ))}</tr>
                      <tr style={{ backgroundColor: '#FEF9C3' }}><td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#854D0E', border: `1px solid ${theme.border}` }}>PUNTAJE ALCANCE</td>{cotizacionesParticipantes.map(cot => ( <td key={`palc-${cot.idcotizacion}`} style={{ border: `1px solid ${theme.border}`, padding: '0' }}><input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.alcance} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'alcance', e.target.value)} style={{ width: '100%', height: '40px', border: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#854D0E', backgroundColor: 'transparent', outline: 'none' }} /></td> ))}</tr>
                      <tr style={{ backgroundColor: '#FEF9C3' }}><td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#854D0E', border: `1px solid ${theme.border}` }}>PUNTAJE FORMA DE PAGO</td>{cotizacionesParticipantes.map(cot => ( <td key={`ppag-${cot.idcotizacion}`} style={{ border: `1px solid ${theme.border}`, padding: '0' }}><input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.pago} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'pago', e.target.value)} style={{ width: '100%', height: '40px', border: 'none', textAlign: 'center', fontSize: '18px', fontWeight: '900', color: '#854D0E', backgroundColor: 'transparent', outline: 'none' }} /></td> ))}</tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <table style={{ width: '60%', borderCollapse: 'collapse', border: `2px solid ${theme.textMain}` }}>
                    <thead><tr><th style={{ ...thStyle, backgroundColor: theme.textMain, color: 'white', textAlign: 'left', border: `1px solid ${theme.textMain}` }}>RESULTADO FINAL</th>{cotizacionesParticipantes.map(cot => ( <th key={`rhead-${cot.idcotizacion}`} style={{ ...thStyle, backgroundColor: theme.textMain, color: 'white', textAlign: 'center', border: `1px solid ${theme.textMain}` }}>{cot.proveedor?.razonsocial}</th> ))}</tr></thead>
                    <tbody>
                      <tr>
                        <td style={{ ...tdStyle, fontWeight: '800', fontSize: '16px', border: `1px solid ${theme.textMain}` }}>Puntaje Ponderado Total</td>
                        {cotizacionesParticipantes.map(cot => {
                          const notaCalc = calcularNotaIntegral(cot.idcotizacion);
                          const isWinner = (cot.idcotizacion === idGanador);
                          return (
                            <td key={`rbody-${cot.idcotizacion}`} style={{ ...tdStyle, textAlign: 'center', backgroundColor: isWinner ? '#DCFCE7' : 'transparent', border: `1px solid ${theme.textMain}` }}>
                              <div style={{ fontSize: '24px', fontWeight: '900', color: isWinner ? theme.success : theme.textMain }}>{notaCalc}</div>
                              {isWinner && <div style={{ fontSize: '12px', color: theme.success, fontWeight: 'bold', marginTop: '4px' }}>🏆 POSTOR GANADOR</div>}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
            <div style={{ padding: '20px 30px', backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button onClick={guardarMatrizEvaluacion} disabled={guardandoMatriz} style={{ padding: '12px 24px', backgroundColor: theme.success, color: 'white', border: 'none', borderRadius: '8px', cursor: guardandoMatriz ? 'wait' : 'pointer', fontWeight: '700', fontSize: '16px', boxShadow: '0 4px 6px rgba(22, 163, 74, 0.2)' }}>
                {guardandoMatriz ? 'Guardando en Base de Datos...' : '💾 Confirmar Evaluación'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CentroEvaluacion