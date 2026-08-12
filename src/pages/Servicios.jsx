import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Servicios() {
  const navigate = useNavigate()
  
  const [listaServicios, setListaServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [tiposSistema, setTiposSistema] = useState([]) // Nuevo catálogo
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [nombreUsuarioActual, setNombreUsuarioActual] = useState('Cargando...')

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Estados del Formulario Clásicos
  const [idServicioActual, setIdServicioActual] = useState(null)
  const [nombreServicio, setNombreServicio] = useState('')
  const [detalleServicio, setDetalleServicio] = useState('')
  const [idLugar, setIdLugar] = useState('')
  const [estadoServicio, setEstadoServicio] = useState('Pendiente')
  
  // NUEVOS Estados del Formulario
  const [prioridad, setPrioridad] = useState('Media')
  const [numRequerimiento, setNumRequerimiento] = useState('')
  const [ordenCompra, setOrdenCompra] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [idTipoSistema, setIdTipoSistema] = useState('')

  // Modales Secundarios
  const [mostrarModalLugar, setMostrarModalLugar] = useState(false)
  const [nuevoLugar, setNuevoLugar] = useState('')

  const cargarDatosIniciales = async () => {
    setCargando(true)
    
    // Traemos servicios cruzados con las nuevas tablas
    const { data: dataServicios } = await supabase
      .from('servicios')
      .select('*, lugarejecucion(lugarejecucion), usuario(nombre), tipoinfraestructura(tipoinfraestructura)')
      .order('idservicio', { ascending: false })
      
    if (dataServicios) setListaServicios(dataServicios)

    const [resLugares, resUsuarios, resTipos] = await Promise.all([
      supabase.from('lugarejecucion').select('*').eq('activo', true),
      supabase.from('usuario').select('*').eq('activo', true),
      supabase.from('tipoinfraestructura').select('*').eq('activo', true) // Cargamos Sistemas
    ])
    
    if (resLugares.data) setLugares(resLugares.data)
    if (resTipos.data) setTiposSistema(resTipos.data)
    if (resUsuarios.data) {
      if (resUsuarios.data.length > 0) {
        setIdUsuarioActual(resUsuarios.data[0].idusuario)
        setNombreUsuarioActual(resUsuarios.data[0].nombre)
      }
    }
    setCargando(false)
  }

  useEffect(() => { cargarDatosIniciales() }, [])

  const abrirModalNuevo = () => {
    setModoEdicion(false); setIdServicioActual(null); setNombreServicio(''); setDetalleServicio(''); 
    setIdLugar(''); setEstadoServicio('Pendiente');
    // Resetear nuevos campos
    setPrioridad('Media'); setNumRequerimiento(''); setOrdenCompra(''); setProgreso(0); setIdTipoSistema('');
    setMostrarModal(true)
  }

  const abrirModalEditar = (srv) => {
    setModoEdicion(true); setIdServicioActual(srv.idservicio); setNombreServicio(srv.servicio); 
    setDetalleServicio(srv.detalle || ''); setIdLugar(srv.idlugar || ''); setEstadoServicio(srv.estado);
    // Cargar nuevos campos
    setPrioridad(srv.prioridad || 'Media'); setNumRequerimiento(srv.num_requerimiento || ''); 
    setOrdenCompra(srv.orden_compra || ''); setProgreso(srv.progreso || 0); setIdTipoSistema(srv.idtipo || '');
    setMostrarModal(true)
  }

  const handleGuardarServicio = async (e) => {
    e.preventDefault()
    
    // Validación de Progreso
    if (progreso < 0 || progreso > 100) { alert("El progreso debe ser un número entre 0 y 100"); return }

    setGuardando(true)
    const datosGuardar = { 
      servicio: nombreServicio, detalle: detalleServicio, idlugar: idLugar || null, estado: estadoServicio,
      prioridad: prioridad, num_requerimiento: numRequerimiento || null, orden_compra: ordenCompra || null, 
      progreso: parseInt(progreso), idtipo: idTipoSistema || null
    }
    
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
    return srv.servicio.toLowerCase().includes(term) || 
           (srv.lugarejecucion?.lugarejecucion || '').toLowerCase().includes(term) || 
           (srv.tipoinfraestructura?.tipoinfraestructura || '').toLowerCase().includes(term) || 
           (srv.orden_compra || '').toLowerCase().includes(term) ||
           (srv.num_requerimiento || '').toLowerCase().includes(term) ||
           srv.estado.toLowerCase().includes(term) || 
           srv.idservicio.toString().includes(term)
  })

  // ================= DISEÑO (VARIABLES CSS) =================
  const theme = {
    bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
    primary: '#2563EB', success: '#16A34A', warning: '#F59E0B', danger: '#DC2626', inputBg: '#FFFFFF'
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }
  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }
  
  const getBadgeColor = (estado) => {
    switch(estado) {
      case 'Terminado': return { bg: '#DCFCE7', text: '#166534' }
      case 'En Proceso': return { bg: '#FEF9C3', text: '#854D0E' }
      case 'Cancelado': return { bg: '#FEE2E2', text: '#991B1B' }
      default: return { bg: '#DBEAFE', text: '#1E40AF' } // Pendiente
    }
  }

  const getPrioridadColor = (prio) => {
    switch(prio) {
      case 'Crítica': return theme.danger;
      case 'Alta': return theme.warning;
      case 'Media': return theme.primary;
      case 'Baja': return theme.success;
      default: return theme.textMuted;
    }
  }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* TOP BAR */}
      <div style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, padding: '12px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.textMain, fontWeight: '600' }}>
          <span>{nombreUsuarioActual}</span>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: theme.primary, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>{nombreUsuarioActual.charAt(0)}</div>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        {/* ENCABEZADO Y BUSCADOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted }}>← Volver al Panel</button>
            <h2 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Bandeja de Servicios</h2>
            <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: '15px' }}>Gestiona requerimientos, órdenes de compra y avances.</p>
            <input type="text" placeholder="🔍 Buscar por servicio, lugar, OC, Req..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '12px 16px', width: '450px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgCard }} />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
            + Nuevo Servicio
          </button>
        </div>

        {/* TABLA PRINCIPAL */}
        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>ID / Pri.</th>
                  <th style={thStyle}>Servicio & Sistema</th>
                  <th style={thStyle}>Lugar</th>
                  <th style={thStyle}>Docs (Req / OC)</th>
                  <th style={{...thStyle, width: '150px'}}>Progreso</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Estado</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {serviciosFiltrados.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No se encontraron servicios.</td></tr>
                ) : (
                  serviciosFiltrados.map((srv) => {
                    const badge = getBadgeColor(srv.estado)
                    const prioColor = getPrioridadColor(srv.prioridad)
                    
                    return (
                      <tr key={srv.idservicio} style={{ transition: 'background 0.2s', borderLeft: `4px solid ${prioColor}` }}>
                        <td style={{ ...tdStyle, fontWeight: '700' }}>
                          #{srv.idservicio}
                          <div style={{fontSize: '11px', color: prioColor, marginTop: '4px', fontWeight: 'bold'}}>{srv.prioridad?.toUpperCase()}</div>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: '250px' }}>
                          <div style={{ fontWeight: '700', color: theme.textMain }}>{srv.servicio}</div>
                          <div style={{ fontSize: '12px', color: theme.primary, fontWeight: '600', marginTop: '4px' }}>
                            {srv.tipoinfraestructura ? `📁 ${srv.tipoinfraestructura.tipoinfraestructura}` : 'Sin clasificar'}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: '500' }}>{srv.lugarejecucion ? srv.lugarejecucion.lugarejecucion : '---'}</td>
                        <td style={tdStyle}>
                          <div style={{ fontSize: '13px', color: theme.textMuted, marginBottom: '2px' }}><b style={{color: theme.textMain}}>Req:</b> {srv.num_requerimiento || '---'}</div>
                          <div style={{ fontSize: '13px', color: theme.textMuted }}><b style={{color: theme.textMain}}>OC:</b> {srv.orden_compra || '---'}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: theme.textMain }}>
                            <span>Avance</span><span>{srv.progreso || 0}%</span>
                          </div>
                          {/* Barra visual de progreso */}
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${srv.progreso || 0}%`, height: '100%', backgroundColor: srv.progreso === 100 ? theme.success : theme.primary, transition: 'width 0.3s ease' }}></div>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ padding: '6px 12px', backgroundColor: badge.bg, color: badge.text, borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{srv.estado}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => abrirModalEditar(srv)} style={{ marginRight: '8px', padding: '8px 16px', cursor: 'pointer', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', color: theme.textMain }}>Editar</button>
                          <button onClick={() => navigate(`/cotizaciones/${srv.idservicio}`)} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#EFF6FF', color: theme.primary, border: '1px solid #BFDBFE', borderRadius: '6px', fontWeight: '700' }}>Cotizaciones</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL SERVICIO */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '16px', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', fontWeight: '700' }}>{modoEdicion ? `Gestión de Servicio #${idServicioActual}` : 'Registrar Nuevo Servicio'}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {modoEdicion && (
                    <select value={estadoServicio} onChange={(e) => setEstadoServicio(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: theme.inputBg, color: theme.textMain }}>
                      <option value="Pendiente">Pendiente</option><option value="En Proceso">En Proceso</option><option value="Terminado">Terminado</option><option value="Cancelado">Cancelado</option>
                    </select>
                  )}
                  <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer' }}>×</button>
                </div>
              </div>
              
              <form onSubmit={handleGuardarServicio} style={{ padding: '24px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* COLUMNA 1: Datos Técnicos */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>1. Datos Técnicos</h4>
                    
                    <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Nombre del Servicio *</label><input type="text" required value={nombreServicio} onChange={(e) => setNombreServicio(e.target.value)} placeholder="Ej: Mantenimiento Preventivo" style={inputStyle} /></div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={labelStyle}>Prioridad</label>
                        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={{...inputStyle, fontWeight: 'bold', color: getPrioridadColor(prioridad)}}>
                          <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Clasificación / Sistema</label>
                        <select value={idTipoSistema} onChange={(e) => setIdTipoSistema(e.target.value)} style={inputStyle}>
                          <option value="">-- Sin clasificar --</option>
                          {tiposSistema.map(t => <option key={t.idtipo} value={t.idtipo}>{t.tipoinfraestructura}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Lugar de Ejecución</label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <select value={idLugar} onChange={(e) => setIdLugar(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                          <option value="">-- Seleccionar --</option>
                          {lugares.map(l => <option key={l.idlugar} value={l.idlugar}>{l.lugarejecucion}</option>)}
                        </select>
                        <button type="button" onClick={() => setMostrarModalLugar(true)} style={{ padding: '0 16px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>+ Nuevo</button>
                      </div>
                    </div>
                  </div>

                  {/* COLUMNA 2: Control Documental y Progreso */}
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>2. Control Documental</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Nº Requerimiento</label><input type="text" value={numRequerimiento} onChange={(e) => setNumRequerimiento(e.target.value)} placeholder="Ej: REQ-2026-001" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Orden de Compra (OC)</label><input type="text" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} placeholder="Ej: OC-4589" style={inputStyle} /></div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Progreso de Avance (%)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="range" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ flex: 1, accentColor: theme.primary }} />
                        <input type="number" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ ...inputStyle, width: '80px', textAlign: 'center', fontWeight: 'bold' }} />
                        <span style={{fontWeight: 'bold', color: theme.textMuted}}>%</span>
                      </div>
                    </div>

                    <div><label style={labelStyle}>Detalles / Alcance</label><textarea value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} placeholder="Especificaciones requeridas..." rows="2" style={{ ...inputStyle, resize: 'none' }}></textarea></div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '12px 24px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: theme.textMain }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                    {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Servicio' : 'Guardar Nuevo Servicio')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NUEVO LUGAR */}
        {mostrarModalLugar && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: theme.bgCard, padding: '24px', borderRadius: '12px', width: '350px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', color: theme.textMain }}>Añadir Lugar</h4>
              <form onSubmit={handleGuardarLugar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" required placeholder="Ej: Almacén Norte" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} style={inputStyle} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setMostrarModalLugar(false)} style={{ padding: '8px 16px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '8px 16px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Añadir</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Servicios