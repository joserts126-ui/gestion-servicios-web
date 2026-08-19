// ==============================================================================
// VISTA MAESTRA DE SERVICIOS
// ==============================================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'
import CentroEvaluacion from '../components/CentroEvaluacion'
import ServicioModal from '../components/ServicioModal'

function Servicios() {
  const navigate = useNavigate()
  
  // Estados de datos y catálogos
  const [listaServicios, setListaServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [tiposInfraestructura, setTiposInfraestructura] = useState([]) 
  const [tiposServicio, setTiposServicio] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [subsistemas, setSubsistemas] = useState([])
  const [catImpuestos, setCatImpuestos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [idUsuarioActual, setIdUsuarioActual] = useState('')

  // Multi-Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState([])
  const [filtroPrioridad, setFiltroPrioridad] = useState([])
  const [filtroLugar, setFiltroLugar] = useState([])

  const [mostrarMenuEstado, setMostrarMenuEstado] = useState(false)
  const [mostrarMenuPrioridad, setMostrarMenuPrioridad] = useState(false)
  const [mostrarMenuLugar, setMostrarMenuLugar] = useState(false)

  // Ordenamiento y Paginación
  const [sortConfig, setSortConfig] = useState({ key: 'idservicio', direction: 'desc' })
  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(50)

  // Interfaz de Tabla
  const [filasExpandidas, setFilasExpandidas] = useState([])
  const [menuAccionesFila, setMenuAccionesFila] = useState(null)
  const [mostrarMenuColumnas, setMostrarMenuColumnas] = useState(false)
  
  const [columnas, setColumnas] = useState({
    idPri: true, fechaCreacion: true, servicio: true, lugar: true,
    responsable: false, docs: true, fechasNuevas: false, progreso: true, estado: true
  })

  // Modales
  const [mostrarModalPrincipal, setMostrarModalPrincipal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null)
  
  const [mostrarModalHomologacion, setMostrarModalHomologacion] = useState(false)
  const [servicioHomologacion, setServicioHomologacion] = useState(null)

  const cargarDatosIniciales = async () => {
    setCargando(true)
    const { data: dataServicios } = await supabase.from('servicios').select(`
      *, lugarejecucion(lugarejecucion), usuario(nombre), tipoinfraestructura(tipoinfraestructura),
      tiposervicio(tiposervicio), sistema(sistema), subsistema(sub_sistema),
      cotizaciones(idcotizacion, estado, fecharecepcion, gastos_generales, utilidades, plazo_dias, entregables,
      puntaje_eco, puntaje_plazo, puntaje_alcance, puntaje_pago, proveedor(razonsocial), moneda(moneda),
      detallecotizacion(*), comentario(comentario, fecha))
    `)
    if (dataServicios) setListaServicios(dataServicios)

    const fetchSafe = async (query) => { const { data } = await query; return data || [] }
    
    setLugares(await fetchSafe(supabase.from('lugarejecucion').select('*').eq('activo', true)))
    setTiposInfraestructura(await fetchSafe(supabase.from('tipoinfraestructura').select('*')))
    setTiposServicio(await fetchSafe(supabase.from('tiposervicio').select('*')))
    setSistemas(await fetchSafe(supabase.from('sistema').select('*')))
    setSubsistemas(await fetchSafe(supabase.from('subsistema').select('*')))
    setCatImpuestos(await fetchSafe(supabase.from('impuestos').select('*')))
    
    const dataUsuarios = await fetchSafe(supabase.from('usuario').select('*').eq('activo', true))
    if (dataUsuarios && dataUsuarios.length > 0) setIdUsuarioActual(dataUsuarios[0].idusuario)
    
    setCargando(false)
  }

  useEffect(() => { cargarDatosIniciales() }, [])
  useEffect(() => { setPaginaActual(1) }, [busqueda, filtroEstado, filtroPrioridad, filtroLugar])
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.menu-acciones-container') || e.target.closest('.filtro-dropdown-container')) return;
      setMenuAccionesFila(null); 
      setMostrarMenuColumnas(false); 
      setMostrarMenuEstado(false); 
      setMostrarMenuPrioridad(false); 
      setMostrarMenuLugar(false);
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const toggleFila = (id, e) => {
    e.stopPropagation()
    setFilasExpandidas(prev => prev.includes(id) ? prev.filter(filaId => filaId !== id) : [...prev, id])
  }

  const toggleAcciones = (id, e) => {
    e.stopPropagation()
    setMenuAccionesFila(prev => prev === id ? null : id)
    setMostrarMenuColumnas(false)
    setMostrarMenuEstado(false)
    setMostrarMenuPrioridad(false)
    setMostrarMenuLugar(false)
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }
  
  const handleCheckboxChange = (valor, filtroActual, setFiltro) => setFiltro(filtroActual.includes(valor) ? filtroActual.filter(item => item !== valor) : [...filtroActual, valor])
  
  const handleSelectAll = (todasLasOpciones, filtroActual, setFiltro) => {
    if (filtroActual.length === todasLasOpciones.length) setFiltro([])
    else setFiltro([...todasLasOpciones])
  }

  // Cálculo de montos para la sub-tabla de cotizaciones desplegadas
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

  // Procesamiento de Datos (Filtro + Orden + Paginación)
  let datosProcesados = listaServicios.filter(srv => {
    let cumpleBusqueda = busqueda ? (srv.servicio?.toLowerCase() || '').includes(busqueda.toLowerCase()) || (srv.lugarejecucion?.lugarejecucion || '').toLowerCase().includes(busqueda.toLowerCase()) || (srv.orden_compra || '').toLowerCase().includes(busqueda.toLowerCase()) || (srv.num_requerimiento || '').toLowerCase().includes(busqueda.toLowerCase()) || srv.estado.toLowerCase().includes(busqueda.toLowerCase()) || srv.idservicio.toString().includes(busqueda.toLowerCase()) || (srv.responsable || '').toLowerCase().includes(busqueda.toLowerCase()) : true
    let cumpleEstado = filtroEstado.length > 0 ? filtroEstado.includes(srv.estado) : true
    let cumplePrioridad = filtroPrioridad.length > 0 ? filtroPrioridad.includes(srv.prioridad) : true
    let cumpleLugar = filtroLugar.length > 0 ? filtroLugar.includes(srv.idlugar?.toString()) : true
    return cumpleBusqueda && cumpleEstado && cumplePrioridad && cumpleLugar
  })

  datosProcesados.sort((a, b) => {
    const getVal = (obj, key) => {
      if (key === 'lugar') return obj.lugarejecucion?.lugarejecucion || ''
      if (key === 'sistema') return obj.sistema?.sistema || obj.tipoinfraestructura?.tipoinfraestructura || ''
      return obj[key]
    }
    let valA = getVal(a, sortConfig.key)
    let valB = getVal(b, sortConfig.key)

    if (valA === null || valA === undefined) valA = ''
    if (valB === null || valB === undefined) valB = ''
    
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const totalPaginas = Math.ceil(datosProcesados.length / registrosPorPagina) || 1
  const indiceUltimoRegistro = paginaActual * registrosPorPagina
  const datosPaginados = datosProcesados.slice(indiceUltimoRegistro - registrosPorPagina, indiceUltimoRegistro)

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span style={{ color: '#CBD5E1', marginLeft: '4px' }}>↕</span>
    return sortConfig.direction === 'asc' ? <span style={{ color: theme.primary, marginLeft: '4px' }}>↑</span> : <span style={{ color: theme.primary, marginLeft: '4px' }}>↓</span>
  }

  const estadosUnicos = [...new Set(listaServicios.map(s => s.estado))]
  const prioridadesUnicas = ['Baja', 'Media', 'Alta', 'Crítica']
  const lugaresUnicos = lugares.map(l => l.idlugar.toString())

  const abrirModalNuevo = () => { setModoEdicion(false); setServicioSeleccionado(null); setMostrarModalPrincipal(true); }
  const abrirModalEditar = (srv) => { setModoEdicion(true); setServicioSeleccionado(srv); setMostrarModalPrincipal(true); }
  const abrirModalHomologacion = (srv) => { setServicioHomologacion(srv); setMostrarModalHomologacion(true); }

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', bgSubTable: '#F1F5F9', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', warning: '#F59E0B', danger: '#DC2626' }
  const thStyle = { padding: '10px 12px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}`, cursor: 'pointer', userSelect: 'none' }
  const tdStyle = { padding: '8px 12px', fontSize: '13px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }

  const getBadgeColor = (estado) => { 
    const est = estado?.toUpperCase() || '';
    if (est.includes('COMPLETADO') || est.includes('EJECUTADO')) return { bg: '#DCFCE7', text: '#166534' }
    if (est.includes('EJECUCIÓN')) return { bg: '#FEF9C3', text: '#854D0E' }
    if (est.includes('CANCELADO')) return { bg: '#FEE2E2', text: '#991B1B' }
    if (est.includes('COTIZACIÓN')) return { bg: '#FEF08A', text: '#713F12' }
    if (est.includes('APROBACION')) return { bg: '#FFEDD5', text: '#9A3412' }
    return { bg: '#DBEAFE', text: '#1E40AF' }
  }
  const getPrioridadColor = (prio) => { const p = prio?.toUpperCase() || ''; return p.includes('CRÍTICA') || p.includes('ALTA') ? theme.danger : p.includes('MEDIA') ? theme.primary : theme.success; }

  const controlesPaginacion = (
    <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <div style={{ fontSize: '13px', color: theme.textMuted }}>
        Mostrando {datosProcesados.length === 0 ? 0 : indiceUltimoRegistro - registrosPorPagina + 1} a {Math.min(indiceUltimoRegistro, datosProcesados.length)} de {datosProcesados.length}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <select value={registrosPorPagina} onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }}>
          <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          <option value={datosProcesados.length > 0 ? datosProcesados.length : 1000}>Todos</option>
        </select>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} style={{ padding: '4px 8px', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Pág. {paginaActual} de {totalPaginas}</span>
          <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} style={{ padding: '4px 8px', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar />
      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        {/* Cabecera y Filtros */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '12px', padding: '6px 12px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, fontSize: '13px' }}>← Volver</button>
            <h2 style={{ margin: '0 0 8px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Control Maestro de Servicios</h2>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 Buscar servicio, OC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '8px 12px', width: '280px', borderRadius: '6px', border: `1px solid ${theme.border}`, outline: 'none' }} />
              
              {/* Filtro Estado */}
              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuEstado(!mostrarMenuEstado); setMostrarMenuPrioridad(false); setMostrarMenuLugar(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroEstado.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroEstado.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Estados {filtroEstado.length > 0 && `(${filtroEstado.length})`} ▼</button>
                {mostrarMenuEstado && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '250px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}>
                      <input type="checkbox" checked={filtroEstado.length === estadosUnicos.length && estadosUnicos.length > 0} onChange={() => handleSelectAll(estadosUnicos, filtroEstado, setFiltroEstado)} /> Seleccionar Todo
                    </label>
                    {estadosUnicos.map(est => (
                      <label key={est} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroEstado.includes(est)} onChange={() => handleCheckboxChange(est, filtroEstado, setFiltroEstado)} /> {est}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtro Prioridad */}
              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuPrioridad(!mostrarMenuPrioridad); setMostrarMenuEstado(false); setMostrarMenuLugar(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroPrioridad.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroPrioridad.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Prioridad {filtroPrioridad.length > 0 && `(${filtroPrioridad.length})`} ▼</button>
                {mostrarMenuPrioridad && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '180px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}>
                      <input type="checkbox" checked={filtroPrioridad.length === prioridadesUnicas.length && prioridadesUnicas.length > 0} onChange={() => handleSelectAll(prioridadesUnicas, filtroPrioridad, setFiltroPrioridad)} /> Seleccionar Todo
                    </label>
                    {prioridadesUnicas.map(prio => (
                      <label key={prio} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroPrioridad.includes(prio)} onChange={() => handleCheckboxChange(prio, filtroPrioridad, setFiltroPrioridad)} /> {prio}</label>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtro Lugar */}
              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuLugar(!mostrarMenuLugar); setMostrarMenuEstado(false); setMostrarMenuPrioridad(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroLugar.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroLugar.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Lugares {filtroLugar.length > 0 && `(${filtroLugar.length})`} ▼</button>
                {mostrarMenuLugar && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '250px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}>
                      <input type="checkbox" checked={filtroLugar.length === lugaresUnicos.length && lugaresUnicos.length > 0} onChange={() => handleSelectAll(lugaresUnicos, filtroLugar, setFiltroLugar)} /> Seleccionar Todo
                    </label>
                    {lugares.map(l => (
                      <label key={l.idlugar} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroLugar.includes(l.idlugar.toString())} onChange={() => handleCheckboxChange(l.idlugar.toString(), filtroLugar, setFiltroLugar)} /> {l.lugarejecucion}</label>
                    ))}
                  </div>
                )}
              </div>

              {(filtroEstado.length > 0 || filtroPrioridad.length > 0 || filtroLugar.length > 0 || busqueda !== '') && (
                <button onClick={() => { setFiltroEstado([]); setFiltroPrioridad([]); setFiltroLugar([]); setBusqueda(''); }} style={{ padding: '8px 12px', border: 'none', background: 'none', color: theme.danger, cursor: 'pointer', fontWeight: '600' }}>✕ Limpiar</button>
              )}
            </div>
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '10px 20px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>+ Nuevo Servicio</button>
        </div>

        {/* Tabla */}
        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ flex: 1 }}>{controlesPaginacion}</div>
            
            <div className="filtro-dropdown-container" style={{ position: 'relative', paddingRight: '16px', borderLeft: `1px solid ${theme.border}`, height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '16px', backgroundColor: '#F8FAFC' }}>
              <button onClick={(e) => { e.stopPropagation(); setMostrarMenuColumnas(!mostrarMenuColumnas); }} style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>⚙️ Columnas</button>
              {mostrarMenuColumnas && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 16, top: '100%', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '200px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  {Object.keys(columnas).map(col => (
                    <label key={col} style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={columnas[col]} onChange={() => setColumnas({...columnas, [col]: !columnas[col]})} /> Mostrar {col}</label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información de la base de datos...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{...thStyle, width: '30px', cursor: 'default'}}></th>
                    {columnas.idPri && <th style={thStyle} onClick={() => handleSort('idservicio')}>ID/Pri {renderSortIcon('idservicio')}</th>}
                    {columnas.fechaCreacion && <th style={thStyle} onClick={() => handleSort('fechasolicitud')}>F. Creación {renderSortIcon('fechasolicitud')}</th>}
                    {columnas.servicio && <th style={thStyle} onClick={() => handleSort('servicio')}>Servicio {renderSortIcon('servicio')}</th>}
                    {columnas.lugar && <th style={thStyle} onClick={() => handleSort('lugar')}>Lugar {renderSortIcon('lugar')}</th>}
                    {columnas.responsable && <th style={thStyle} onClick={() => handleSort('responsable')}>Responsable {renderSortIcon('responsable')}</th>}
                    {columnas.docs && <th style={thStyle} onClick={() => handleSort('num_requerimiento')}>Req / OC {renderSortIcon('num_requerimiento')}</th>}
                    {columnas.fechasNuevas && <th style={thStyle} onClick={() => handleSort('solped')}>Solped {renderSortIcon('solped')}</th>}
                    {columnas.progreso && <th style={thStyle} onClick={() => handleSort('progreso')}>Progreso {renderSortIcon('progreso')}</th>}
                    {columnas.estado && <th style={{...thStyle, textAlign: 'center'}} onClick={() => handleSort('estado')}>Estado {renderSortIcon('estado')}</th>}
                    <th style={{...thStyle, width: '50px', cursor: 'default'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {datosPaginados.map(srv => {
                    const badge = getBadgeColor(srv.estado)
                    const prioColor = getPrioridadColor(srv.prioridad)
                    const expandido = filasExpandidas.includes(srv.idservicio)
                    const tieneCotizaciones = srv.cotizaciones && srv.cotizaciones.length > 0
                    
                    return (
                      <React.Fragment key={srv.idservicio}>
                        <tr style={{ borderLeft: `4px solid ${prioColor}`, backgroundColor: expandido ? '#F8FAFC' : 'white' }}>
                          <td style={{...tdStyle, textAlign: 'center'}}><button onClick={(e) => toggleFila(srv.idservicio, e)} style={{ background: 'none', border: 'none', cursor: tieneCotizaciones ? 'pointer' : 'default', color: tieneCotizaciones ? theme.primary : '#CBD5E1', transform: expandido ? 'rotate(90deg)' : 'none' }}>▶</button></td>
                          {columnas.idPri && <td style={{ ...tdStyle, fontWeight: '700' }}>#{srv.idservicio}<div style={{fontSize: '10px', color: prioColor}}>{srv.prioridad?.toUpperCase()}</div></td>}
                          {columnas.fechaCreacion && <td style={tdStyle}>{srv.fechasolicitud ? new Date(srv.fechasolicitud).toLocaleDateString() : '---'}</td>}
                          {columnas.servicio && <td style={{ ...tdStyle, maxWidth: '250px' }}><div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.servicio}</div><div style={{ fontSize: '11px', color: theme.primary }}>{srv.sistema?.sistema || srv.tipoinfraestructura?.tipoinfraestructura}</div></td>}
                          {columnas.lugar && <td style={tdStyle}>{srv.lugarejecucion?.lugarejecucion || '---'}</td>}
                          {columnas.responsable && <td style={tdStyle}>{srv.responsable || '---'}</td>}
                          {columnas.docs && <td style={tdStyle}><div style={{fontSize: '11px'}}>R: {srv.num_requerimiento || '-'}</div><div style={{fontSize: '11px'}}>OC: {srv.orden_compra || '-'}</div></td>}
                          {columnas.fechasNuevas && <td style={tdStyle}><div style={{fontSize: '11px'}}>Sol: {srv.solped || '-'}</div></td>}
                          {columnas.progreso && <td style={tdStyle}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '600', marginBottom: '2px' }}><span>{srv.progreso || 0}%</span></div><div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: `${srv.progreso || 0}%`, height: '100%', backgroundColor: srv.progreso === 100 ? theme.success : theme.primary }}></div></div></td>}
                          {columnas.estado && <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ padding: '4px 8px', backgroundColor: badge.bg, color: badge.text, borderRadius: '12px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>{srv.estado}</span></td>}
                          
                          {/* Botón de 3 puntos con la tabla de acciones integrada y opción de Evaluar */}
                          <td style={{ ...tdStyle, textAlign: 'center', position: 'relative' }}>
                            <div className="menu-acciones-container" style={{ display: 'inline-block' }}>
                              <button onClick={(e) => toggleAcciones(srv.idservicio, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: theme.textMuted }}>⋮</button>
                              {menuAccionesFila === srv.idservicio && (
                                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', zIndex: 50, display: 'flex', gap: '4px', padding: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                  <button onClick={() => {abrirModalEditar(srv); setMenuAccionesFila(null)}} style={{ padding: '6px 10px', border: `1px solid ${theme.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                                  <button onClick={() => {navigate(`/cotizaciones/${srv.idservicio}`); setMenuAccionesFila(null)}} style={{ padding: '6px 10px', border: `1px solid ${theme.border}`, borderRadius: '6px', background: '#F8FAFC', color: theme.primary, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📄 Cotizar</button>
                                  <button onClick={() => {abrirModalHomologacion(srv); setMenuAccionesFila(null)}} disabled={!tieneCotizaciones} style={{ padding: '6px 10px', cursor: tieneCotizaciones ? 'pointer' : 'not-allowed', backgroundColor: tieneCotizaciones ? '#EFF6FF' : '#F1F5F9', color: tieneCotizaciones ? theme.primary : '#94A3B8', border: tieneCotizaciones ? '1px solid #BFDBFE' : `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>⚖️ Evaluar</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* TABLA DESPLEGABLE REAL DE COTIZACIONES */}
                        {expandido && (
                          <tr style={{ backgroundColor: theme.bgSubTable, borderBottom: `2px solid ${theme.border}` }}>
                            <td colSpan="11" style={{ padding: '16px 24px 24px 40px' }}>
                              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                <div style={{ padding: '8px 12px', backgroundColor: '#F8FAFC', borderBottom: `1px solid ${theme.border}`, fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>
                                  COTIZACIONES REGISTRADAS PARA ESTE SERVICIO:
                                </div>
                                {tieneCotizaciones ? (
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}` }}>Proveedor</th>
                                        <th style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, textAlign: 'right' }}>Monto Total</th>
                                        <th style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, textAlign: 'center' }}>Estado Prov.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {srv.cotizaciones.map(cot => (
                                        <tr key={cot.idcotizacion} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: theme.textMain }}>{cot.proveedor?.razonsocial || 'Desconocido'}</td>
                                          <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700', textAlign: 'right', color: theme.primary }}>{cot.moneda?.moneda?.includes('USD') ? '$' : 'S/'} {calcularTotalCotizacion(cot).toFixed(2)}</td>
                                          <td style={{ padding: '8px 12px', fontSize: '11px', textAlign: 'center', fontWeight: '700' }}>{cot.estado}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: theme.textMuted }}>
                                    No hay cotizaciones registradas para este servicio todavía.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {datosProcesados.length > 0 && (
                <div style={{ borderTop: `1px solid ${theme.border}` }}>
                  {controlesPaginacion}
                </div>
              )}
            </div>
          )}
        </div>

        <ServicioModal 
          visible={mostrarModalPrincipal} 
          modoEdicion={modoEdicion} 
          servicioAEditar={servicioSeleccionado}
          idUsuarioActual={idUsuarioActual}
          lugares={lugares}
          tiposInfraestructura={tiposInfraestructura}
          tiposServicio={tiposServicio}
          sistemas={sistemas}
          subsistemas={subsistemas}
          onClose={() => setMostrarModalPrincipal(false)}
          onSuccess={() => { setMostrarModalPrincipal(false); cargarDatosIniciales(); }}
        />

        {mostrarModalHomologacion && servicioHomologacion && (
          <CentroEvaluacion servicio={servicioHomologacion} onClose={() => setMostrarModalHomologacion(false)} onActualizado={() => { setMostrarModalHomologacion(false); cargarDatosIniciales() }} />
        )}

      </div>
    </div>
  )
}

export default Servicios