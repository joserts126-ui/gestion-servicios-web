import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Servicios() {
  const navigate = useNavigate()
  
  // ================= ESTADOS PRINCIPALES =================
  const [listaServicios, setListaServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Usuario Activo (Simulado en top bar)
  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [nombreUsuarioActual, setNombreUsuarioActual] = useState('Cargando...')

  // ================= ESTADOS DEL MODAL =================
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Campos del Formulario
  const [idServicioActual, setIdServicioActual] = useState(null)
  const [nombreServicio, setNombreServicio] = useState('')
  const [detalleServicio, setDetalleServicio] = useState('')
  const [idLugar, setIdLugar] = useState('')
  const [estadoServicio, setEstadoServicio] = useState('Pendiente')

  // Modal Secundario (Nuevo Lugar)
  const [mostrarModalLugar, setMostrarModalLugar] = useState(false)
  const [nuevoLugar, setNuevoLugar] = useState('')

  // ================= CARGAR DATOS =================
  const cargarDatosIniciales = async () => {
    setCargando(true)
    
    // 1. Cargar Servicios (Cruzando con Lugar y Usuario)
    const { data: dataServicios } = await supabase
      .from('servicios')
      .select('*, lugarejecucion(lugarejecucion), usuario(nombre)')
      .order('idservicio', { ascending: false })
      
    if (dataServicios) setListaServicios(dataServicios)

    // 2. Cargar Catálogos
    const [resLugares, resUsuarios] = await Promise.all([
      supabase.from('lugarejecucion').select('*').eq('activo', true),
      supabase.from('usuario').select('*').eq('activo', true)
    ])
    
    if (resLugares.data) setLugares(resLugares.data)
    if (resUsuarios.data) {
      setUsuarios(resUsuarios.data)
      // Asignamos el primer usuario temporalmente
      if (resUsuarios.data.length > 0) {
        setIdUsuarioActual(resUsuarios.data[0].idusuario)
        setNombreUsuarioActual(resUsuarios.data[0].nombre)
      }
    }
    
    setCargando(false)
  }

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  // ================= LÓGICA DE MODALES =================
  const abrirModalNuevo = () => {
    setModoEdicion(false)
    setIdServicioActual(null)
    setNombreServicio('')
    setDetalleServicio('')
    setIdLugar('')
    setEstadoServicio('Pendiente')
    setMostrarModal(true)
  }

  const abrirModalEditar = (srv) => {
    setModoEdicion(true)
    setIdServicioActual(srv.idservicio)
    setNombreServicio(srv.servicio)
    setDetalleServicio(srv.detalle || '')
    setIdLugar(srv.idlugar || '')
    setEstadoServicio(srv.estado)
    setMostrarModal(true)
  }

  // ================= GUARDAR / EDITAR =================
  const handleGuardarServicio = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const datosGuardar = {
      servicio: nombreServicio,
      detalle: detalleServicio,
      idlugar: idLugar || null,
      estado: estadoServicio
    }

    let errorQuery = null

    if (modoEdicion) {
      // ACTUALIZAR
      const { error } = await supabase
        .from('servicios')
        .update(datosGuardar)
        .eq('idservicio', idServicioActual)
      errorQuery = error
    } else {
      // INSERTAR NUEVO (Añadimos el usuario que lo crea)
      datosGuardar.idusuario = idUsuarioActual || null
      const { error } = await supabase
        .from('servicios')
        .insert([datosGuardar])
      errorQuery = error
    }

    setGuardando(false)

    if (errorQuery) {
      alert('Error al guardar: ' + errorQuery.message)
    } else {
      setMostrarModal(false)
      cargarDatosIniciales()
    }
  }

  const handleGuardarLugar = async (e) => {
    e.preventDefault()
    const { data, error } = await supabase
      .from('lugarejecucion')
      .insert([{ lugarejecucion: nuevoLugar }]).select()

    if (!error && data) {
      setLugares([...lugares, data[0]])
      setIdLugar(data[0].idlugar)
      setNuevoLugar('')
      setMostrarModalLugar(false)
    }
  }

  // ================= BUSCADOR =================
  const serviciosFiltrados = listaServicios.filter(srv => {
    const term = busqueda.toLowerCase()
    return (
      srv.servicio.toLowerCase().includes(term) ||
      (srv.lugarejecucion?.lugarejecucion || '').toLowerCase().includes(term) ||
      (srv.usuario?.nombre || '').toLowerCase().includes(term) ||
      srv.estado.toLowerCase().includes(term) ||
      srv.idservicio.toString().includes(term)
    )
  })

  // Estilos
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px', color: '#555' }
  
  // Colores para estados
  const getBadgeColor = (estado) => {
    switch(estado) {
      case 'Terminado': return { bg: '#d4edda', text: '#155724' }
      case 'En Proceso': return { bg: '#fff3cd', text: '#856404' }
      case 'Cancelado': return { bg: '#f8d7da', text: '#721c24' }
      default: return { bg: '#e3f2fd', text: '#0d47a1' } // Pendiente
    }
  }

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* TOP BAR */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', padding: '10px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontWeight: 'bold' }}>
          <span>{nombreUsuarioActual}</span>
          <div style={{ width: '36px', height: '36px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', border: '2px solid #0d47a1' }}>
            👤
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ENCABEZADO Y BUSCADOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '15px', padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}>
              ← Volver al Panel
            </button>
            <h2 style={{ margin: 0, color: '#333' }}>Bandeja de Servicios</h2>
            <p style={{ margin: '5px 0 15px 0', color: '#666' }}>Gestiona y da seguimiento a todas las solicitudes.</p>
            
            <input 
              type="text" 
              placeholder="🔍 Buscar por servicio, lugar, usuario o estado..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '10px', width: '350px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
            />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', height: 'fit-content' }}>
            + Nuevo Servicio
          </button>
        </div>

        {/* TABLA PRINCIPAL */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Cargando información...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '15px' }}>ID</th>
                  <th style={{ padding: '15px' }}>Servicio</th>
                  <th style={{ padding: '15px' }}>Lugar</th>
                  <th style={{ padding: '15px' }}>Fecha / Creador</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {serviciosFiltrados.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center' }}>No se encontraron servicios.</td></tr>
                ) : (
                  serviciosFiltrados.map((srv) => {
                    const badge = getBadgeColor(srv.estado)
                    return (
                      <tr key={srv.idservicio} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#555' }}>#{srv.idservicio}</td>
                        <td style={{ padding: '15px', maxWidth: '250px' }}>
                          <div style={{ fontWeight: 'bold' }}>{srv.servicio}</div>
                          <div style={{ fontSize: '12px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.detalle || 'Sin detalle'}</div>
                        </td>
                        <td style={{ padding: '15px' }}>{srv.lugarejecucion ? srv.lugarejecucion.lugarejecucion : '---'}</td>
                        <td style={{ padding: '15px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{srv.fechasolicitud}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{srv.usuario ? srv.usuario.nombre : 'Sistema'}</div>
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <span style={{ padding: '6px 12px', backgroundColor: badge.bg, color: badge.text, borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                            {srv.estado}
                          </span>
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <button onClick={() => abrirModalEditar(srv)} style={{ marginRight: '8px', padding: '6px 12px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', color: '#444' }}>
                            Editar
                          </button>
                          <button onClick={() => navigate(`/cotizaciones/${srv.idservicio}`)} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
                            Cotizaciones
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= MODAL DE SERVICIO (NUEVO/EDITAR) ================= */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>{modoEdicion ? `Editar Servicio #${idServicioActual}` : 'Registrar Nuevo Servicio'}</h3>
              </div>
              
              <form onSubmit={handleGuardarServicio} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Nombre del Servicio *</label>
                  <input type="text" required value={nombreServicio} onChange={(e) => setNombreServicio(e.target.value)} placeholder="Ej: Mantenimiento Preventivo" style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Lugar de Ejecución</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={idLugar} onChange={(e) => setIdLugar(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
                      <option value="">-- Seleccione un lugar --</option>
                      {lugares.map(l => <option key={l.idlugar} value={l.idlugar}>{l.lugarejecucion}</option>)}
                    </select>
                    <button type="button" onClick={() => setMostrarModalLugar(true)} style={{ padding: '0 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                      + Nuevo
                    </button>
                  </div>
                </div>

                {/* Mostrar selector de ESTADO solo si estamos EDITANDO */}
                {modoEdicion && (
                  <div>
                    <label style={labelStyle}>Estado del Servicio</label>
                    <select value={estadoServicio} onChange={(e) => setEstadoServicio(e.target.value)} style={{ ...inputStyle, backgroundColor: '#f9f9f9' }}>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Terminado">Terminado</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Detalle de la solicitud</label>
                  <textarea value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} placeholder="Especificaciones requeridas..." rows="3" style={{ ...inputStyle, resize: 'vertical' }}></textarea>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '10px 15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '10px 15px', backgroundColor: modoEdicion ? '#007BFF' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: guardando ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                    {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar' : 'Guardar Servicio')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL SECUNDARIO (NUEVO LUGAR) ================= */}
        {mostrarModalLugar && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
              <h4 style={{ margin: '0 0 15px 0' }}>Añadir Lugar</h4>
              <form onSubmit={handleGuardarLugar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" required placeholder="Ej: Almacén Norte" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} style={inputStyle} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" onClick={() => setMostrarModalLugar(false)} style={{ padding: '6px 12px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Añadir</button>
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