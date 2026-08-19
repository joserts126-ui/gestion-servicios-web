import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import PanelAgrupacion from './PanelAgrupacion'
import MatrizComparativa from './MatrizComparativa'
import { exportarExcelMatriz } from '../utils/exportadorExcel' // O la ruta donde lo hayas guardado

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
              ...det, proveedorNombre: cot.proveedor?.razonsocial || 'Desconocido', moneda: cot.moneda?.moneda.includes('USD') ? '$' : 'S/',
              totalFila: totalFila, idPrimaryKey: det.iddetcot, idcotizacion: cot.idcotizacion
            })
          })
        }
      })
      setItemsCotizaciones(todosLosItems); setPuntajesEvaluacion(pIniciales); setCargando(false);
    }
    if (servicio) inicializar();
  }, [servicio])

  // Lógica delegada
  const handleCrearCategoria = async () => {
    if(!nuevaCategoria.trim()) return
    const { data } = await supabase.from('categoriahomologacion').insert([{ idservicio: servicio.idservicio, nombrecategoria: nuevaCategoria.trim() }]).select()
    if(data) { setCategoriasHomologacion([...categoriasHomologacion, data[0]]); setNuevaCategoria('') }
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
      setItemsCotizaciones(itemsCotizaciones.map(item => itemsSeleccionados.includes(item.idPrimaryKey) ? { ...item, idcategoria: idCategoria } : item)); setItemsSeleccionados([])
    }
  }
  const desasignarItem = async (idItem) => {
    const { error } = await supabase.from('detallecotizacion').update({ idcategoria: null }).eq('iddetcot', idItem)
    if(!error) setItemsCotizaciones(itemsCotizaciones.map(item => item.idPrimaryKey === idItem ? { ...item, idcategoria: null } : item))
  }

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
      alert("¡Evaluaciones guardadas con éxito!"); if (onActualizado) onActualizado();
    } catch (error) { alert("Error al guardar."); } finally { setGuardandoMatriz(false); }
  }

  const handleImprimir = () => window.print();
  const handleExportarExcel = () => exportarExcelMatriz(servicio.idservicio, servicio.cotizaciones?.length || 1);

  if (cargando) return <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, color: 'white' }}>Cargando Centro de Evaluación...</div>
  const itemsPendientes = itemsCotizaciones.filter(i => !i.idcategoria)
  
  const cotizacionesParticipantes = servicio.cotizaciones || [];
  let maxNota = -1; let idGanador = null;
  cotizacionesParticipantes.forEach(cot => { const nota = parseFloat(calcularNotaIntegral(cot.idcotizacion)); if (nota > maxNota && nota > 0) { maxNota = nota; idGanador = cot.idcotizacion; } });

  const N = cotizacionesParticipantes.length || 1;
  const minContainerWidth = Math.max(1400, N * 400 + 400);

  return (
    <>
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #area-impresion, #area-impresion * { visibility: visible; }
            
            /* Rompemos la jaula del modal para alinear al inicio de la hoja */
            .modal-overlay { position: absolute !important; background: transparent !important; top: 0 !important; left: 0 !important; align-items: flex-start !important; }
            .modal-cuerpo { box-shadow: none !important; margin: 0 !important; padding: 0 !important; height: auto !important; width: 100% !important; max-width: none !important; border-radius: 0 !important; }
            
            #area-impresion { position: absolute; left: 0; top: 0; width: 100%; overflow: visible !important; padding: 0 !important; margin: 0 !important; }
            
            /* CLAVE: Evita que las columnas se aplasten. Mantiene la proporción real */
            .impresion-width-auto { min-width: max-content !important; width: 100% !important; }
            
            /* Forzamos que se impriman los colores amarillos y grises */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .no-print { display: none !important; }
            tr { page-break-inside: avoid; }
            
            /* Dejamos el tamaño en automático para que respete tu decisión de Vertical (Portrait) */
            @page { size: auto; margin: 10mm; }
          }
        `}
      </style>

      <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
        <div className="modal-cuerpo" style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', width: '98%', maxWidth: '1600px', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
          
          <div className="no-print" style={{ padding: '20px 30px 0 30px', backgroundColor: '#FFF', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#1E293B' }}>⚖️ Centro de Homologación y Evaluación</h2>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748B' }}>Servicio #{servicio.idservicio} - {servicio.servicio}</p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <button onClick={() => setPestañaHomologacion('agrupar')} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'agrupar' ? '3px solid #2563EB' : '3px solid transparent', color: pestanaHomologacion === 'agrupar' ? '#2563EB' : '#64748B', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>Paso 1: Agrupar Canastas</button>
                <button onClick={() => setPestañaHomologacion('evaluar')} disabled={itemsPendientes.length > 0} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: pestanaHomologacion === 'evaluar' ? '3px solid #2563EB' : '3px solid transparent', color: pestanaHomologacion === 'evaluar' ? '#2563EB' : (itemsPendientes.length > 0 ? '#CBD5E1' : '#64748B'), fontWeight: '700', fontSize: '14px', cursor: itemsPendientes.length > 0 ? 'not-allowed' : 'pointer' }}>Paso 2: Matriz Comparativa</button>
              </div>
            </div>
            <button onClick={onClose} style={{ marginBottom: '20px', padding: '10px 20px', backgroundColor: '#1E293B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Cerrar Panel</button>
          </div>

          {pestanaHomologacion === 'agrupar' && <PanelAgrupacion itemsPendientes={itemsPendientes} itemsSeleccionados={itemsSeleccionados} toggleSeleccionItem={toggleSeleccionItem} categoriasHomologacion={categoriasHomologacion} nuevaCategoria={nuevaCategoria} setNuevaCategoria={setNuevaCategoria} handleCrearCategoria={handleCrearCategoria} handleEliminarCategoria={handleEliminarCategoria} asignarItemsACategoria={asignarItemsACategoria} itemsCotizaciones={itemsCotizaciones} desasignarItem={desasignarItem} />}
          
          {pestanaHomologacion === 'evaluar' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#525659', overflow: 'hidden', padding: '20px', alignItems: 'center' }}>
              
              <MatrizComparativa servicio={servicio} cotizacionesParticipantes={cotizacionesParticipantes} categoriasHomologacion={categoriasHomologacion} itemsCotizaciones={itemsCotizaciones} edicionMatriz={edicionMatriz} handleEdicionMatriz={handleEdicionMatriz} puntajesEvaluacion={puntajesEvaluacion} handlePuntajeChange={handlePuntajeChange} calcularNotaIntegral={calcularNotaIntegral} idGanador={idGanador} N={N} wItem={4} wDesc={28} wPres={8} wProv={60/N} minContainerWidth={minContainerWidth} />
              
              <div className="no-print" style={{ width: '100%', padding: '15px 30px', backgroundColor: '#FFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleImprimir} style={{ padding: '10px 20px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>🖨️ Imprimir / Guardar PDF</button>
                  <button onClick={handleExportarExcel} style={{ padding: '10px 20px', backgroundColor: '#16A34A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 Descargar Excel</button>
                </div>
                <button onClick={guardarMatrizEvaluacion} disabled={guardandoMatriz} style={{ padding: '12px 24px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: guardandoMatriz ? 'wait' : 'pointer', fontWeight: '700', fontSize: '16px' }}>{guardandoMatriz ? 'Guardando...' : '💾 Confirmar Evaluación'}</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
export default CentroEvaluacion