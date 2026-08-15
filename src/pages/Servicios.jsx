import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'
import CentroEvaluacion from '../components/CentroEvaluacion'

function Servicios() {
  const navigate = useNavigate()
  
  const [listaServicios, setListaServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [tiposSistema, setTiposSistema] = useState([]) 
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [filasExpandidas, setFilasExpandidas] = useState([])
  const [idUsuarioActual, setIdUsuarioActual] = useState('')

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [idServicioActual, setIdServicioActual] = useState(null)
  const [nombreServicio, setNombreServicio] = useState('')
  const [detalleServicio, setDetalleServicio] = useState('')
  const [idLugar, setIdLugar] = useState('')
  const [estadoServicio, setEstadoServicio] = useState('EN ESPERA')
  
  const [prioridad, setPrioridad] = useState('Media')
  const [numRequerimiento, setNumRequerimiento] = useState('')
  const [ordenCompra, setOrdenCompra] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [idTipoSistema, setIdTipoSistema] = useState('')

  const [mostrarModalLugar, setMostrarModalLugar] = useState(false)
  const [nuevoLugar, setNuevoLugar] = useState('')
  const [catImpuestos, setCatImpuestos] = useState([])

  // Estado del nuevo componente
  const [mostrarModalHomologacion, setMostrarModalHomologacion] = useState(false)
  const [servicioHomologacion, setServicioHomologacion] = useState(null)

  const cargarDatosIniciales = async () => {
    setCargando(true)
    
    const { data: dataServicios } = await supabase
      .from('servicios')
      .select(`
        *, 
        lugarejecucion(lugarejecucion), 
        usuario(nombre), 
        tipoinfraestructura(tipoinfraestructura),
        cotizaciones(
          idcotizacion, estado, fecharecepcion, gastos_generales, utilidades, plazo_dias, entregables,
          puntaje_eco, puntaje_plazo, puntaje_alcance, puntaje_pago,
          proveedor(razonsocial), 
          moneda(moneda),
          detallecotizacion(*),
          comentario(comentario, fecha)
        )
      `)
      .order('idservicio', { ascending: false })
      
    if (dataServicios) setListaServicios(dataServicios)

    const [resLugares, resUsuarios, resTipos, resImp] = await Promise.all([
      supabase.from('lugarejecucion').select('*').eq('activo', true),
      supabase.from('usuario').select('*').eq('activo', true),
      supabase.from('tipoinfraestructura').select('*').eq('activo', true),
      supabase.from('impuestos').select('*')
    ])
    
    if (resLugares.data) setLugares(resLugares.data)
    if (resTipos.data) setTiposSistema(resTipos.data)
    if (resImp.data) setCatImpuestos(resImp.data)
    
    if (resUsuarios.data && resUsuarios.data.length > 0) {
      setIdUsuarioActual(resUsuarios.data[0].idusuario)
    }
    setCargando(false)
  }

  useEffect(() => { cargarDatosIniciales() }, [])

  const toggleFila = (id) => setFilasExpandidas(prev => prev.includes(id) ? prev.filter(filaId => filaId !== id) : [...prev, id])

  const calcularTotalCotizacion = (cot) => {
    if (!cot.detallecotizacion || cot.detallecotizacion.length === 0) return 0
    let totalFinal = 0
    cot.detallecotizacion.forEach(fila => {
      const baseFila = fila.cantidad * fila.preciounitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idimpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') totalFinal += baseFila
      else if (tipoImpuesto === '+ IGV') totalFinal += (baseFila * 1.18)
      else totalFinal += baseFila
    })
    const adicionales = (parseFloat(cot.gastos_generales || 0) + parseFloat(cot.utilidades || 0)) * 1.18
    return totalFinal + adicionales
  }

  const abrirModalHomologacion = (srv) => {
    setServicioHomologacion(srv)
    setMostrarModalHomologacion(true)
  }

  const abrirModalNuevo = () => {
    setModoEdicion(false); setIdServicioActual(null); setNombreServicio(''); setDetalleServicio(''); 
    setIdLugar(''); setEstadoServicio('EN ESPERA');
    setPrioridad('Media'); setNumRequerimiento(''); setOrdenCompra(''); setProgreso(0); setIdTipoSistema('');
    setMostrarModal(true)
  }

  const abrirModalEditar = (srv) => {
    setModoEdicion(true); setIdServicioActual(srv.idservicio); setNombreServicio(srv.servicio); 
    setDetalleServicio(srv.detalle || ''); setIdLugar(srv.idlugar || ''); setEstadoServicio(srv.estado);
    setPrioridad(srv.prioridad || 'Media'); setNumRequerimiento(srv.num_requerimiento || ''); 
    setOrdenCompra(srv.orden_compra || ''); setProgreso(srv.progreso || 0); setIdTipoSistema(srv.idtipo || '');
    setMostrarModal(true)
  }

  const handleGuardarServicio = async (e) => {
    e.preventDefault()
    if (progreso < 0 || progreso > 100) { alert("El progreso debe ser un número entre 0 y 100"); return }
    setGuardando(true)
    const datosGuardar = { servicio: nombreServicio, detalle: detalleServicio, idlugar: idLugar || null, estado: estadoServicio, prioridad: prioridad, num_requerimiento: numRequerimiento || null, orden_compra: ordenCompra || null, progreso: parseInt(progreso), idtipo: idTipoSistema || null }
    let errorQuery = null
    if (modoEdicion) {
      const { error } = await supabase.from('servicios').update(datosGuardar).eq('idservicio', idServicioActual)
      errorQuery = error
    } else {
      datosGuardar.idusuario = idUsuarioActual || null
      const { error } = await supabase.from('servicios').insert([datosGuardar])
      errorQuery = error
    }
    setGuardando(false)
    if (errorQuery) alert('Error al guardar: ' + errorQuery.message)
    else { setMostrarModal(false); cargarDatosIniciales() }
  }

  const handleGuardarLugar = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase.from('lugarejecucion').insert([{ lugarejecucion: nuevoLugar }]).select()
    if (!error && data) { setLugares([...lugares, data[0]]); setIdLugar(data[0].idlugar); setNuevoLugar(''); setMostrarModalLugar(false) }
  }

  const serviciosFiltrados = listaServicios.filter(srv => {
    const term = busqueda.toLowerCase()
    return srv.servicio.toLowerCase().includes(term) || (srv.lugarejecucion?.lugarejecucion || '').toLowerCase().includes(term) || (srv.tipoinfraestructura?.tipoinfraestructura || '').toLowerCase().includes(term) || (srv.orden_compra || '').toLowerCase().includes(term) || (srv.num_requerimiento || '').toLowerCase().includes(term) || srv.estado.toLowerCase().includes(term) || srv.idservicio.toString().includes(term)
  })

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', bgSubTable: '#F1F5F9', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', warning: '#F59E0B', danger: '#DC2626', inputBg: '#FFFFFF' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }
  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }
  
  const getBadgeColor = (estado) => { switch(estado) { case '8. COMPLETADO': return { bg: '#DCFCE7', text: '#166534' }; case '6. EN EJECUCIÓN': return { bg: '#FEF9C3', text: '#854D0E' }; case 'CANCELADO': case 'REQUERIMIENTO CANCELADO': return { bg: '#FEE2E2', text: '#991B1B' }; case '2. COTIZACIÓN': return { bg: '#FEF08A', text: '#713F12' }; case '2.1 REQUERIMIENTO EN ESPERA DE APROBACION': return { bg: '#FFEDD5', text: '#9A3412' }; default: return { bg: '#DBEAFE', text: '#1E40AF' } } }
  const getPrioridadColor = (prio) => { switch(prio) { case 'Crítica': return theme.danger; case 'Alta': return theme.warning; case 'Media': return theme.primary; case 'Baja': return theme.success; default: return theme.textMuted; } }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      <TopBar />

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted }}>← Volver al Panel</button>
            <h2 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Control Maestro de Servicios</h2>
            <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: '15px' }}>Visualiza requerimientos y despliega las ofertas de los proveedores.</p>
            <input type="text" placeholder="🔍 Buscar por servicio, lugar, OC, Req..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '12px 16px', width: '450px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgCard }} />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>+ Nuevo Servicio</button>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información global...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{...thStyle, width: '40px'}}></th><th style={thStyle}>ID / Pri.</th><th style={thStyle}>Servicio & Sistema</th><th style={thStyle}>Lugar</th><th style={thStyle}>Docs (Req / OC)</th><th style={{...thStyle, width: '150px'}}>Progreso</th><th style={{...thStyle, textAlign: 'center'}}>Estado General</th><th style={{...thStyle, textAlign: 'center', width: '280px'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {serviciosFiltrados.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No se encontraron servicios.</td></tr>
                ) : (
                  serviciosFiltrados.map((srv) => {
                    const badge = getBadgeColor(srv.estado)
                    const prioColor = getPrioridadColor(srv.prioridad)
                    const estaExpandido = filasExpandidas.includes(srv.idservicio)
                    const tieneCotizaciones = srv.cotizaciones && srv.cotizaciones.length > 0
                    
                    return (
                      <React.Fragment key={srv.idservicio}>
                        <tr style={{ transition: 'background 0.2s', borderLeft: `4px solid ${prioColor}`, backgroundColor: estaExpandido ? '#F8FAFC' : 'white' }}>
                          <td style={{...tdStyle, padding: '16px 8px', textAlign: 'center'}}><button onClick={() => toggleFila(srv.idservicio)} style={{ background: 'none', border: 'none', cursor: tieneCotizaciones ? 'pointer' : 'default', fontSize: '14px', color: tieneCotizaciones ? theme.primary : '#CBD5E1', padding: '5px', transition: 'transform 0.2s', transform: estaExpandido ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</button></td>
                          <td style={{ ...tdStyle, fontWeight: '700' }}>#{srv.idservicio}<div style={{fontSize: '11px', color: prioColor, marginTop: '4px', fontWeight: 'bold'}}>{srv.prioridad?.toUpperCase()}</div></td>
                          <td style={{ ...tdStyle, maxWidth: '250px' }}><div style={{ fontWeight: '700', color: theme.textMain }}>{srv.servicio}</div><div style={{ fontSize: '12px', color: theme.primary, fontWeight: '600', marginTop: '4px' }}>{srv.tipoinfraestructura ? `📁 ${srv.tipoinfraestructura.tipoinfraestructura}` : 'Sin clasificar'}</div></td>
                          <td style={{ ...tdStyle, fontWeight: '500' }}>{srv.lugarejecucion ? srv.lugarejecucion.lugarejecucion : '---'}</td>
                          <td style={tdStyle}><div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '2px' }}><b style={{color: theme.textMain}}>Req:</b> {srv.num_requerimiento || '---'}</div><div style={{ fontSize: '13px', color: theme.textMuted }}><b style={{color: theme.textMain}}>OC:</b> {srv.orden_compra || '---'}</div></td>
                          <td style={tdStyle}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: theme.textMain }}><span>Avance</span><span>{srv.progreso || 0}%</span></div><div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: `${srv.progreso || 0}%`, height: '100%', backgroundColor: srv.progreso === 100 ? theme.success : theme.primary, transition: 'width 0.3s ease' }}></div></div></td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ padding: '6px 12px', backgroundColor: badge.bg, color: badge.text, borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'inline-block', textAlign: 'center', minWidth: '100px' }}>{srv.estado}</span></td>
                          <td style={{ ...tdStyle, textAlign: 'center' }}>
                            <button onClick={() => abrirModalEditar(srv)} style={{ marginRight: '8px', padding: '6px 10px', cursor: 'pointer', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', color: theme.textMain, fontSize: '12px' }}>✏️</button>
                            <button onClick={() => navigate(`/cotizaciones/${srv.idservicio}`)} style={{ marginRight: '8px', padding: '6px 12px', cursor: 'pointer', backgroundColor: '#F8FAFC', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', fontSize: '12px' }}>📄 Cotizar</button>
                            <button onClick={() => abrirModalHomologacion(srv)} style={{ padding: '6px 12px', cursor: tieneCotizaciones ? 'pointer' : 'not-allowed', backgroundColor: tieneCotizaciones ? '#EFF6FF' : '#F1F5F9', color: tieneCotizaciones ? theme.primary : '#94A3B8', border: tieneCotizaciones ? '1px solid #BFDBFE' : `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '700', fontSize: '12px' }} disabled={!tieneCotizaciones}>⚖️ Homologar</button>
                          </td>
                        </tr>
                        {estaExpandido && (
                          <tr style={{ backgroundColor: theme.bgSubTable, borderBottom: `2px solid ${theme.border}` }}>
                            <td colSpan="8" style={{ padding: '20px 40px 30px 60px' }}>
                              <h4 style={{ margin: '0 0 12px 0', color: theme.textMain, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>📑 Ofertas Totales</h4>
                              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead><tr><th style={{ padding: '10px 16px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, backgroundColor: '#F8FAFC' }}>Proveedor</th><th style={{ padding: '10px 16px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, backgroundColor: '#F8FAFC', textAlign: 'right' }}>Monto Total</th><th style={{ padding: '10px 16px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, backgroundColor: '#F8FAFC', textAlign: 'center' }}>Estado Prov.</th></tr></thead>
                                  <tbody>
                                    {srv.cotizaciones.map(cot => (
                                        <tr key={cot.idcotizacion} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: theme.textMain }}>{cot.proveedor?.razonsocial || 'Desconocido'}</td>
                                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', textAlign: 'right', color: theme.primary }}>{cot.moneda?.moneda.includes('USD') ? '$' : 'S/'} {calcularTotalCotizacion(cot).toFixed(2)}</td>
                                          <td style={{ padding: '12px 16px', fontSize: '12px', textAlign: 'center', fontWeight: '700' }}>{cot.estado}</td>
                                        </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* AQUÍ INVOCAMOS AL COMPONENTE EXTERNO GIGANTE */}
        {mostrarModalHomologacion && servicioHomologacion && (
          <CentroEvaluacion 
            servicio={servicioHomologacion} 
            onClose={() => setMostrarModalHomologacion(false)} 
            onActualizado={() => {
              setMostrarModalHomologacion(false)
              cargarDatosIniciales()
            }}
          />
        )}

        {/* MODAL NUEVO SERVICIO Y LUGAR */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '16px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', fontWeight: '700' }}>{modoEdicion ? `Gestión de Servicio #${idServicioActual}` : 'Registrar Nuevo Servicio'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {modoEdicion && (<select value={estadoServicio} onChange={(e) => setEstadoServicio(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: theme.inputBg, color: theme.textMain }}><option value="EN ESPERA">EN ESPERA</option><option value="2. COTIZACIÓN">2. COTIZACIÓN</option><option value="2.1 REQUERIMIENTO EN ESPERA DE APROBACION">2.1 REQUERIMIENTO EN ESPERA DE APROBACION</option><option value="6. EN EJECUCIÓN">6. EN EJECUCIÓN</option><option value="8. COMPLETADO">8. COMPLETADO</option><option value="CANCELADO">CANCELADO</option><option value="REQUERIMIENTO CANCELADO">REQUERIMIENTO CANCELADO</option></select>)}
                  <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer' }}>×</button>
                </div>
              </div>
              <form onSubmit={handleGuardarServicio} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>1. Datos Técnicos</h4>
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Nombre del Servicio *</label><input type="text" required value={nombreServicio} onChange={(e) => setNombreServicio(e.target.value)} placeholder="Ej: Mantenimiento Preventivo" style={inputStyle} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Prioridad</label><select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={{...inputStyle, fontWeight: 'bold', color: getPrioridadColor(prioridad)}}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option></select></div>
                      <div><label style={labelStyle}>Clasificación / Sistema</label><select value={idTipoSistema} onChange={(e) => setIdTipoSistema(e.target.value)} style={inputStyle}><option value="">-- Sin clasificar --</option>{tiposSistema.map(t => <option key={t.idtipo} value={t.idtipo}>{t.tipoinfraestructura}</option>)}</select></div>
                    </div>
                    <div><label style={labelStyle}>Lugar de Ejecución</label><div style={{ display: 'flex', gap: '12px' }}><select value={idLugar} onChange={(e) => setIdLugar(e.target.value)} style={{ ...inputStyle, flex: 1 }}><option value="">-- Seleccionar --</option>{lugares.map(l => <option key={l.idlugar} value={l.idlugar}>{l.lugarejecucion}</option>)}</select><button type="button" onClick={() => setMostrarModalLugar(true)} style={{ padding: '0 16px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>+ Nuevo</button></div></div>
                  </div>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>2. Control Documental</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}><div><label style={labelStyle}>Nº Requerimiento</label><input type="text" value={numRequerimiento} onChange={(e) => setNumRequerimiento(e.target.value)} placeholder="Ej: REQ-2026-001" style={inputStyle} /></div><div><label style={labelStyle}>Orden de Compra (OC)</label><input type="text" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} placeholder="Ej: OC-4589" style={inputStyle} /></div></div>
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Progreso de Avance (%)</label><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><input type="range" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ flex: 1, accentColor: theme.primary }} /><input type="number" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ ...inputStyle, width: '80px', textAlign: 'center', fontWeight: 'bold' }} /><span style={{fontWeight: 'bold', color: theme.textMuted}}>%</span></div></div>
                    <div><label style={labelStyle}>Detalles / Alcance</label><textarea value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} placeholder="Especificaciones requeridas..." rows="2" style={{ ...inputStyle, resize: 'none' }}></textarea></div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '12px 24px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: theme.textMain }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>{guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Servicio' : 'Guardar Nuevo Servicio')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {mostrarModalLugar && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 4000 }}>
            <div style={{ backgroundColor: theme.bgCard, padding: '24px', borderRadius: '12px', width: '350px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', color: theme.textMain }}>Añadir Lugar</h4>
              <form onSubmit={handleGuardarLugar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" required placeholder="Ej: Almacén Norte" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} style={inputStyle} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}><button type="button" onClick={() => setMostrarModalLugar(false)} style={{ padding: '8px 16px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button><button type="submit" style={{ padding: '8px 16px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Añadir</button></div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Servicios