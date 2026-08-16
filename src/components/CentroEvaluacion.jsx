import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

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
  const [exportando, setExportando] = useState(false)

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
        pIniciales[cot.idcotizacion] = { eco: cot.puntaje_eco || 0, plazo: cot.puntaje_plazo || 0, alcance: cot.puntaje_alcance || 0, pago: cot.puntaje_pago || 0 }

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
    const { data, error } = await supabase.from('categoriahomologacion').insert([{ idservicio: servicio.idservicio, nombrecategoria: nuevaCategoria.trim() }]).select()
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
  const handleEdicionMatriz = (idCat, idCot, campo, valor) => { setEdicionMatriz(prev => ({ ...prev, [`${idCat}-${idCot}`]: { ...(prev[`${idCat}-${idCot}`] || {}), [campo]: valor } })) }
  const handlePuntajeChange = (idCot, campo, valor) => { const num = parseFloat(valor) || 0; setPuntajesEvaluacion(prev => ({ ...prev, [idCot]: { ...prev[idCot], [campo]: num > 5 ? 5 : (num < 0 ? 0 : num) } })); }
  const calcularNotaIntegral = (idCot) => { const p = puntajesEvaluacion[idCot] || {}; return ((p.eco || 0) * 0.35 + (p.plazo || 0) * 0.35 + (p.alcance || 0) * 0.20 + (p.pago || 0) * 0.10).toFixed(2); }
  const guardarMatrizEvaluacion = async () => {
    setGuardandoMatriz(true);
    try {
      for (const id of Object.keys(puntajesEvaluacion)) {
        const p = puntajesEvaluacion[id];
        await supabase.from('cotizaciones').update({ puntaje_eco: p.eco, puntaje_plazo: p.plazo, puntaje_alcance: p.alcance, puntaje_pago: p.pago }).eq('idcotizacion', id);
      }
      alert("¡Evaluaciones guardadas con éxito!");
      if (onActualizado) onActualizado();
    } catch (error) { alert("Error al guardar: " + error.message); } finally { setGuardandoMatriz(false); }
  }

  // ================= EXPORTACIÓN MEJORADA =================
  const exportarPDF = async () => {
    setExportando(true);
    const elemento = document.getElementById('documento-pdf');
    
    const originalWidth = elemento.style.width;
    const originalHeight = elemento.style.height;
    const originalOverflow = elemento.style.overflow;

    const fullWidth = elemento.scrollWidth;
    const fullHeight = elemento.scrollHeight;

    elemento.style.width = `${fullWidth}px`;
    elemento.style.height = `${fullHeight}px`;
    elemento.style.overflow = 'visible';

    try {
      const canvas = await html2canvas(elemento, {
        scale: 2, 
        useCORS: true,
        scrollY: 0,
        scrollX: 0,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const maxImgWidth = pdfWidth - (margin * 2);
      const maxImgHeight = pdfHeight - (margin * 2);

      const ratio = canvas.width / canvas.height;

      let finalWidth = maxImgWidth;
      let finalHeight = maxImgWidth / ratio;

      if (finalHeight > maxImgHeight) {
        finalHeight = maxImgHeight;
        finalWidth = maxImgHeight * ratio;
      }

      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`Matriz_Comparativa_Servicio_${servicio.idservicio}.pdf`);

    } catch (error) {
      console.error("Error crítico al generar el PDF:", error);
      alert("Hubo un problema al generar el documento. Verifica la consola.");
    } finally {
      elemento.style.width = originalWidth;
      elemento.style.height = originalHeight;
      elemento.style.overflow = originalOverflow || 'auto';
      setExportando(false);
    }
  }

  const exportarExcel = () => {
    const tabla = document.getElementById('tabla-maestra')
    const workbook = XLSX.utils.table_to_book(tabla, { sheet: "Matriz Homologación" })
    const ws = workbook.Sheets["Matriz Homologación"]
    
    const nProveedores = servicio.cotizaciones ? servicio.cotizaciones.length : 1;
    let colWidths = [
      { wch: 6 },   
      { wch: 45 },  
      { wch: 15 },  
    ];

    for (let i = 0; i < nProveedores; i++) {
      colWidths.push({ wch: 8 });  
      colWidths.push({ wch: 10 }); 
      colWidths.push({ wch: 12 }); 
      colWidths.push({ wch: 16 }); 
    }

    ws['!cols'] = colWidths;
    XLSX.writeFile(workbook, `Matriz_Comparativa_Servicio_${servicio.idservicio}.xlsx`)
  }

  // ================= ESTILOS ACTUALIZADOS =================
  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', danger: '#DC2626', inputBg: '#FFFFFF' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const borderPdf = '1px solid #000';
  
  const thPdf = { border: borderPdf, backgroundColor: '#D9D9D9', padding: '12px 6px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' };
  const tdPdf = { border: borderPdf, padding: '12px 6px', fontSize: '11px', color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' };
  const tdCenter = { ...tdPdf, textAlign: 'center' };
  const tdRight = { ...tdPdf, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px' }; 
  const rowBlack = { backgroundColor: '#000', color: '#FFF', fontWeight: 'bold' };
  const rowYellow = { backgroundColor: '#FFFF00', color: '#000', fontWeight: 'bold' };
  
  // FIX DEFINITIVO PARA INPUTS: height y lineHeight estrictos en 20px
  const inputStyleMatriz = { 
    width: '100%', 
    height: '20px', 
    lineHeight: '20px', 
    border: 'none', 
    textAlign: 'center', 
    fontSize: '11px', 
    outline: 'none', 
    backgroundColor: 'transparent', 
    padding: '0', 
    margin: '0', 
    color: '#000', 
    fontWeight: 'bold', 
    boxSizing: 'border-box' 
  };

  if (cargando) return <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, color: 'white' }}>Cargando Centro de Evaluación...</div>

  const itemsPendientes = itemsCotizaciones.filter(i => !i.idcategoria)
  const cotizacionesParticipantes = servicio.cotizaciones || []
  let maxNota = -1; let idGanador = null;
  cotizacionesParticipantes.forEach(cot => { const nota = parseFloat(calcularNotaIntegral(cot.idcotizacion)); if (nota > maxNota && nota > 0) { maxNota = nota; idGanador = cot.idcotizacion; } });

  const N = cotizacionesParticipantes.length || 1;
  const wItem = 4;      
  const wDesc = 28;     
  const wPres = 8;      
  const wProv = 60 / N; 

  const minContainerWidth = Math.max(1400, N * 400 + 400);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: theme.bgApp, borderRadius: '16px', width: '98%', maxWidth: '1600px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ padding: '20px 30px 0 30px', backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: theme.textMain }}>⚖️ Centro de Homologación y Evaluación</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: theme.textMuted }}>Servicio #{servicio.idservicio} - {servicio.servicio}</p>
            <div style={{ display: 'flex', gap: '20px' }}>
              <button onClick={() => setPestañaHomologacion('agrupar')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'agrupar' ? `3px solid ${theme.primary}` : '3px solid transparent', color: pestanaHomologacion === 'agrupar' ? theme.primary : theme.textMuted, fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: '0.2s' }}>Paso 1: Agrupar Canastas</button>
              <button onClick={() => setPestañaHomologacion('evaluar')} disabled={itemsPendientes.length > 0} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'evaluar' ? `3px solid ${theme.primary}` : '3px solid transparent', color: pestanaHomologacion === 'evaluar' ? theme.primary : (itemsPendientes.length > 0 ? '#CBD5E1' : theme.textMuted), fontWeight: '700', fontSize: '14px', cursor: itemsPendientes.length > 0 ? 'not-allowed' : 'pointer', transition: '0.2s' }}>Paso 2: Matriz Comparativa (PDF)</button>
            </div>
          </div>
          <button onClick={onClose} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: theme.textMain, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cerrar Panel</button>
        </div>

        {pestanaHomologacion === 'agrupar' && (
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
        )}

        {pestanaHomologacion === 'evaluar' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#525659', overflow: 'hidden', padding: '20px', alignItems: 'center' }}>
            
            <div id="documento-pdf" style={{ backgroundColor: 'white', width: '100%', maxWidth: '1800px', flex: 1, overflow: 'auto', padding: '40px 50px', boxShadow: '0 0 10px rgba(0,0,0,0.3)', fontFamily: 'Arial, sans-serif' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', minWidth: `${minContainerWidth}px` }}>
                <div style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
                  <h1 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold', textDecoration: 'underline' }}>COMPARATIVO DE PROPUESTAS</h1>
                  
                  {/* LOGO EMPRESA - FUNCIONANDO */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '50px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <img src="../public/logoCentenario.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  </div>

                  <table style={{ width: '50%', fontSize: '11px', textAlign: 'left', marginBottom: '10px' }}>
                    <tbody>
                      <tr><td style={{ width: '80px', fontWeight: 'bold', padding: '4px' }}>Asunto</td><td style={{ padding: '4px' }}>{servicio.servicio.toUpperCase()}</td></tr>
                      <tr><td style={{ fontWeight: 'bold', padding: '4px' }}>Proyecto</td><td style={{ padding: '4px' }}>{servicio.lugarejecucion?.lugarejecucion?.toUpperCase() || '---'}</td></tr>
                      <tr><td style={{ fontWeight: 'bold', padding: '4px' }}>Fecha</td><td style={{ padding: '4px' }}>{new Date().toLocaleDateString('es-PE')}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <table id="tabla-maestra" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: `${minContainerWidth}px` }}>
                <colgroup>
                  <col style={{ width: `${wItem}%` }} />
                  <col style={{ width: `${wDesc}%` }} />
                  <col style={{ width: `${wPres}%` }} />
                  {cotizacionesParticipantes.map(c => (
                    <React.Fragment key={`cg-${c.idcotizacion}`}>
                      <col style={{ width: `${wProv * 0.25}%` }} /> 
                      <col style={{ width: `${wProv * 0.25}%` }} /> 
                      <col style={{ width: `${wProv * 0.25}%` }} /> 
                      <col style={{ width: `${wProv * 0.25}%` }} /> 
                    </React.Fragment>
                  ))}
                </colgroup>

                <tbody>
                  {/* --- TABLA RESUMEN SUPERIOR --- */}
                  <tr>
                    <td style={{ border: 'none' }}></td><td style={{ border: 'none' }}></td><td style={{ border: 'none' }}></td>
                    {cotizacionesParticipantes.map(cot => ( <td colSpan="4" key={`top-head-${cot.idcotizacion}`} style={{ ...thPdf, backgroundColor: '#D9D9D9' }}>{cot.proveedor?.razonsocial}</td> ))}
                  </tr>
                  <tr>
                    <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>COSTO DIRECTO</td><td style={{ border: 'none' }}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      return <td colSpan="4" key={`top-cd-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>S/ {cd.toFixed(2)}</td>
                    })}
                  </tr>
                  <tr>
                    <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>IGV</td><td style={{ border: 'none' }}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      const igv = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 0.18;
                      return <td colSpan="4" key={`top-igv-${cot.idcotizacion}`} style={tdCenter}>S/ {igv.toFixed(2)}</td>
                    })}
                  </tr>
                  <tr>
                    <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>TOTAL</td><td style={{ border: 'none' }}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      const total = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 1.18;
                      return <td colSpan="4" key={`top-tot-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>S/ {total.toFixed(2)}</td>
                    })}
                  </tr>

                  <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '35px' }}></td></tr>

                  {/* --- 1. EVALUACIÓN ECONÓMICA --- */}
                  <tr>
                    <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación Económica</th>
                    {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`eco-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
                  </tr>
                  <tr>
                    <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Presupuesto<br/>Objetivo y</th>
                    {cotizacionesParticipantes.map(cot => (
                      <React.Fragment key={`eco-head2-${cot.idcotizacion}`}>
                        <th style={{ ...thPdf, fontSize: '10px', padding: '12px 2px' }}>UNIDAD</th>
                        <th style={{ ...thPdf, fontSize: '10px', padding: '12px 2px' }}>CANTIDAD</th>
                        <th style={{ ...thPdf, fontSize: '10px', padding: '12px 2px' }}>P.U.</th>
                        <th style={{ ...thPdf, fontSize: '10px', padding: '12px 2px' }}>PARCIAL</th>
                      </React.Fragment>
                    ))}
                  </tr>
                  
                  {categoriasHomologacion.map((cat, idx) => (
                    <tr key={`cat-${cat.idcategoria}`}>
                      <td style={{ ...tdCenter, fontWeight: 'bold' }}>{idx + 1}</td><td style={tdPdf}>{cat.nombrecategoria.toUpperCase()}</td><td style={tdPdf}></td>
                      {cotizacionesParticipantes.map(cot => {
                        const itemsCruzados = itemsCotizaciones.filter(i => i.idcategoria === cat.idcategoria && i.idcotizacion === cot.idcotizacion)
                        const parcial = itemsCruzados.reduce((acc, curr) => acc + curr.totalFila, 0)
                        const keyEdicion = `${cat.idcategoria}-${cot.idcotizacion}`;
                        const und = edicionMatriz[keyEdicion]?.und !== undefined ? edicionMatriz[keyEdicion].und : (itemsCruzados.length > 1 ? 'GLB' : 'UND');
                        const cantInput = edicionMatriz[keyEdicion]?.cant !== undefined ? edicionMatriz[keyEdicion].cant : '1.00';
                        const cantNum = parseFloat(cantInput) || 1;
                        const pu = parcial > 0 ? (parcial / cantNum).toFixed(2) : '-';

                        return (
                          <React.Fragment key={`eco-data-${keyEdicion}`}>
                            <td style={{ ...tdCenter, padding: '4px' }}><input type="text" value={und} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'und', e.target.value.toUpperCase())} style={inputStyleMatriz} /></td>
                            <td style={{ ...tdCenter, padding: '4px' }}><input type="text" value={cantInput} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'cant', e.target.value)} style={inputStyleMatriz} /></td>
                            <td style={tdRight}>{pu !== '-' ? `S/ ${pu}` : '-'}</td>
                            <td style={{ ...tdRight, fontWeight: 'bold' }}>{parcial > 0 ? `S/ ${parcial.toFixed(2)}` : '-'}</td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  ))}
                  
                  <tr style={rowBlack}>
                    <td style={tdCenter}>A</td><td style={tdPdf}>COSTO DIRECTO (S/.)</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      return <React.Fragment key={`cd-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {cd.toFixed(2)}</td></React.Fragment>
                    })}
                  </tr>
                  <tr>
                    <td style={tdCenter}>A.1</td><td style={tdPdf}>GASTOS GENERALES</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`gg-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {parseFloat(cot.gastos_generales||0).toFixed(2)}</td></React.Fragment> ))}
                  </tr>
                  <tr>
                    <td style={tdCenter}>A.2</td><td style={tdPdf}>UTILIDADES</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`ut-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {parseFloat(cot.utilidades||0).toFixed(2)}</td></React.Fragment> ))}
                  </tr>
                  <tr style={rowBlack}>
                    <td style={tdCenter}>B</td><td style={tdPdf}>SUB TOTAL (S/.)</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      const sub = cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0);
                      return <React.Fragment key={`sb-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {sub.toFixed(2)}</td></React.Fragment>
                    })}
                  </tr>
                  <tr>
                    <td style={tdCenter}>B.1</td><td style={tdPdf}>IGV (18%)</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      const igv = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 0.18;
                      return <React.Fragment key={`igv-${cot.idcotizacion}`}><td colSpan="2" style={tdPdf}></td><td colSpan="1" style={tdRight}>18%</td><td colSpan="1" style={tdRight}>S/ {igv.toFixed(2)}</td></React.Fragment>
                    })}
                  </tr>
                  <tr style={rowBlack}>
                    <td style={tdCenter}>C</td><td style={tdPdf}>TOTAL (S/.)</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => {
                      const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
                      const total = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 1.18;
                      return <React.Fragment key={`tot-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {total.toFixed(2)}</td></React.Fragment>
                    })}
                  </tr>
                  <tr style={rowYellow}>
                    <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN ECONÓMICA</td><td style={tdCenter}>5.00</td>
                    {cotizacionesParticipantes.map(cot => (
                      <td colSpan="4" key={`peco-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '4px' }}>
                        <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.eco} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'eco', e.target.value)} style={inputStyleMatriz} />
                      </td>
                    ))}
                  </tr>

                  <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '35px' }}></td></tr>

                  {/* --- 2. EVALUACIÓN DE PLAZO --- */}
                  <tr>
                    <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de Plazo</th>
                    {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`plz-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
                  </tr>
                  <tr>
                    <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Plazo Objetivo<br/>y Puntaje</th>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`plz-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>PLAZO</th><th colSpan="3" style={thPdf}>ENTREGABLE</th></React.Fragment> ))}
                  </tr>
                  <tr>
                    <td style={tdCenter}>2.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>PLAZOS DE ENTREGA</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`plz-data-${cot.idcotizacion}`}><td colSpan="1" style={tdCenter}>{cot.plazo_dias?.toUpperCase() || '---'}</td><td colSpan="3" style={tdPdf}>{cot.entregables || '---'}</td></React.Fragment> ))}
                  </tr>
                  <tr style={rowYellow}>
                    <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN DE PLAZO</td><td style={tdCenter}>5.00</td>
                    {cotizacionesParticipantes.map(cot => (
                      <td colSpan="4" key={`pplz-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '4px' }}>
                        <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.plazo} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'plazo', e.target.value)} style={inputStyleMatriz} />
                      </td>
                    ))}
                  </tr>

                  <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '35px' }}></td></tr>

                  {/* --- 3. EVALUACIÓN DE ALCANCE --- */}
                  <tr>
                    <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación del Alcance Considerado</th>
                    {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`alc-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
                  </tr>
                  <tr>
                    <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#00B050', color: 'white' }}>Puntaje<br/>Máximo</th>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`alc-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>ITEM</th><th colSpan="3" style={thPdf}>DESCRIPCIÓN</th></React.Fragment> ))}
                  </tr>
                  <tr>
                    <td style={tdCenter}>3</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>ALCANCES CONSIDERADOS</td><td style={{ ...tdPdf, borderBottom: 'none' }}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`alc-0-${cot.idcotizacion}`}><td colSpan="1" style={{...tdPdf, borderBottom: 'none'}}></td><td colSpan="3" style={{...tdPdf, borderBottom: 'none'}}></td></React.Fragment> ))}
                  </tr>
                  {categoriasHomologacion.map((cat, idx) => {
                    const letra = String.fromCharCode(97 + idx); 
                    return (
                      <tr key={`alc-cat-${cat.idcategoria}`}>
                        <td style={tdCenter}>{letra}.</td><td style={tdPdf}>{cat.nombrecategoria}</td><td style={{ ...tdPdf, borderTop: 'none', borderBottom: 'none' }}></td>
                        {cotizacionesParticipantes.map(cot => (
                           <React.Fragment key={`alc-cat-${cat.idcategoria}-${cot.idcotizacion}`}>
                             <td colSpan="1" style={tdCenter}>{letra}.</td><td colSpan="3" style={tdPdf}>{cat.nombrecategoria}</td>
                           </React.Fragment> 
                        ))}
                      </tr>
                    )
                  })}
                  <tr style={rowYellow}>
                    <td colSpan="2" style={tdPdf}>PUNTAJE - CUMPLIMIENTO DE ALCANCES</td><td style={tdCenter}>5.00</td>
                    {cotizacionesParticipantes.map(cot => (
                      <td colSpan="4" key={`palc-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '4px' }}>
                        <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.alcance} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'alcance', e.target.value)} style={inputStyleMatriz} />
                      </td>
                    ))}
                  </tr>

                  <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '35px' }}></td></tr>

                  {/* --- 4. FORMA DE PAGO --- */}
                  <tr>
                    <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de forma de Pago</th>
                    {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`pag-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
                  </tr>
                  <tr>
                    <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Porcentajes<br/>Objetivo...</th>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>%</th><th colSpan="3" style={thPdf}>Descripción</th></React.Fragment> ))}
                  </tr>
                  <tr>
                    <td style={tdCenter}>4.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>FORMA DE PAGO</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-0-${cot.idcotizacion}`}><td colSpan="1" style={tdPdf}></td><td colSpan="3" style={tdPdf}></td></React.Fragment> ))}
                  </tr>
                  <tr>
                    <td style={tdCenter}>a.</td><td style={tdPdf}>Condición del Postor</td><td style={tdPdf}></td>
                    {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-1-${cot.idcotizacion}`}><td colSpan="1" style={tdPdf}></td><td colSpan="3" style={tdCenter}>{cot.idformapago ? 'Ver ficha' : '---'}</td></React.Fragment> ))}
                  </tr>
                  <tr style={rowYellow}>
                    <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN DE FORMA DE PAGO</td><td style={tdCenter}>5.00</td>
                    {cotizacionesParticipantes.map(cot => (
                      <td colSpan="4" key={`ppag-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '4px' }}>
                        <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.pago} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'pago', e.target.value)} style={inputStyleMatriz} />
                      </td>
                    ))}
                  </tr>

                  <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '50px' }}></td></tr>

                  {/* --- TABLA FINAL: RESULTADOS --- */}
                  <tr>
                    <td colSpan={2}></td>
                    <td colSpan="1" style={{ border: 'none' }}></td>
                    <td colSpan={N * 4}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        
                        <table style={{ width: '60%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                          <thead>
                            <tr style={rowBlack}>
                              <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>INCIDENCIA</th><th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>ABREVIATURA</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td style={tdPdf}>Propuesta Económica</td><td style={tdCenter}>35%</td><td style={tdCenter}>PE</td></tr>
                            <tr><td style={tdPdf}>Plazos</td><td style={tdCenter}>35%</td><td style={tdCenter}>PL</td></tr>
                            <tr><td style={tdPdf}>Entregables y Alcances</td><td style={tdCenter}>20%</td><td style={tdCenter}>EA</td></tr>
                            <tr><td style={tdPdf}>Forma de Pago</td><td style={tdCenter}>10%</td><td style={tdCenter}>FP</td></tr>
                            <tr><td style={tdPdf}></td><td style={{...tdCenter, fontWeight: 'bold'}}>100%</td><td style={tdPdf}></td></tr>
                          </tbody>
                        </table>

                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                          <tbody>
                            <tr>
                              <td style={{ ...tdCenter, width: '30%', fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>Puntaje final</td>
                              {cotizacionesParticipantes.map(cot => {
                                 const notaCalc = calcularNotaIntegral(cot.idcotizacion);
                                 return <td key={`rfin-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>{notaCalc}</td>
                              })}
                            </tr>
                            <tr><td colSpan={cotizacionesParticipantes.length + 1} style={{ border: 'none', height: '10px' }}></td></tr>
                            <tr>
                              <td style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>POSTOR GANADOR</td>
                              {cotizacionesParticipantes.map(cot => {
                                 const notaCalc = calcularNotaIntegral(cot.idcotizacion);
                                 const isWinner = (cot.idcotizacion === idGanador && idGanador !== null);
                                 return <td key={`rgan-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>{isWinner ? cot.proveedor?.razonsocial : ''} {isWinner ? `(${notaCalc})` : ''}</td>
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>

                </tbody>
              </table>

            </div>
            
            <div style={{ width: '100%', padding: '15px 30px', backgroundColor: theme.bgCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={exportarPDF} disabled={exportando} style={{ padding: '10px 20px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: exportando ? 'wait' : 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📄 {exportando ? 'Generando...' : 'Descargar PDF'}
                </button>
                <button onClick={exportarExcel} style={{ padding: '10px 20px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Descargar Excel
                </button>
              </div>

              <button onClick={guardarMatrizEvaluacion} disabled={guardandoMatriz} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: guardandoMatriz ? 'wait' : 'pointer', fontWeight: '700', fontSize: '16px' }}>
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