import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Cotizaciones() {
  const { id } = useParams() 
  const navigate = useNavigate()
  
  const getFechaHoy = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  // ================= ESTADOS DE LA PÁGINA =================
  const [servicioActual, setServicioActual] = useState(null)
  const [listaCotizaciones, setListaCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [configOrden, setConfigOrden] = useState({ clave: 'idcotizacion', direccion: 'desc' })

  // ================= CATÁLOGOS =================
  const [catProveedores, setCatProveedores] = useState([])
  const [catMonedas, setCatMonedas] = useState([])
  const [catFormasPago, setCatFormasPago] = useState([])
  const [catUnidades, setCatUnidades] = useState([])
  const [catImpuestos, setCatImpuestos] = useState([])
  
  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [nombreUsuarioActual, setNombreUsuarioActual] = useState('Cargando...')
  const [defUnidadId, setDefUnidadId] = useState('')
  const [defImpuestoId, setDefImpuestoId] = useState('')

  // ================= ESTADOS DEL MODAL Y FORMULARIO =================
  const [mostrarModal, setMostrarModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idCotizacionActual, setIdCotizacionActual] = useState(null)

  const [rucProveedor, setRucProveedor] = useState('')
  const [idFormaPago, setIdFormaPago] = useState('')
  const [idMoneda, setIdMoneda] = useState('')
  const [estadoCotizacion, setEstadoCotizacion] = useState('Solicitada')
  
  const [fechaRecepcion, setFechaRecepcion] = useState(getFechaHoy())
  const [fechaAceptacion, setFechaAceptacion] = useState('') 
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const [detalles, setDetalles] = useState([])

  const [archivoUrl, setArchivoUrl] = useState('') 
  const [archivoDesc, setArchivoDesc] = useState('') 
  const [archivosGuardados, setArchivosGuardados] = useState([]) 

  const [comentarioTexto, setComentarioTexto] = useState('')
  const [listaComentariosNuevos, setListaComentariosNuevos] = useState([])
  const [comentariosGuardados, setComentariosGuardados] = useState([]) 

  // ================= CARGA DE DATOS =================
  const cargarDatos = async () => {
    setCargando(true)
    const { data: dataSrv } = await supabase.from('servicios').select('servicio').eq('idservicio', id).single()
    if (dataSrv) setServicioActual(dataSrv.servicio)

    const { data: dataCot } = await supabase.from('cotizaciones').select('*, proveedor(razonsocial), moneda(moneda), detallecotizacion(cantidad, preciounitario, idimpuestos), usuario(nombre)').eq('idservicio', id)
    if (dataCot) setListaCotizaciones(dataCot)

    const [resProv, resMon, resFPago, resUni, resImp, resUsu] = await Promise.all([
      supabase.from('proveedor').select('*').eq('activo', true), supabase.from('moneda').select('*'),
      supabase.from('formapago').select('*').eq('activo', true), supabase.from('unidadmedida').select('*').eq('activo', true),
      supabase.from('impuestos').select('*'), supabase.from('usuario').select('*').eq('activo', true) 
    ])
    
    if (resProv.data) setCatProveedores(resProv.data)
    if (resMon.data) setCatMonedas(resMon.data)
    if (resFPago.data) setCatFormasPago(resFPago.data)
    if (resUni.data) setCatUnidades(resUni.data)
    if (resImp.data) setCatImpuestos(resImp.data)
    
    let dUni = '', dImp = ''
    if (resUni.data) { const u = resUni.data.find(x => x.unidadmedida === 'UND - Unidad'); if (u) { dUni = u.idunidad; setDefUnidadId(dUni) } }
    if (resImp.data) { const i = resImp.data.find(x => x.impuesto === 'Incluido IGV'); if (i) { dImp = i.idimpuestos; setDefImpuestoId(dImp) } }

    if (resUsu.data && resUsu.data.length > 0) { setIdUsuarioActual(resUsu.data[0].idusuario); setNombreUsuarioActual(resUsu.data[0].nombre) }
    setCargando(false)
  }

  useEffect(() => { cargarDatos() }, [id])

  // ================= MATEMÁTICA Y TABLA =================
  const calcularTotalGuardado = (detallesCotizacion) => {
    if (!detallesCotizacion || detallesCotizacion.length === 0) return 0
    let totalFinal = 0
    detallesCotizacion.forEach(fila => {
      const baseFila = fila.cantidad * fila.preciounitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idimpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') totalFinal += baseFila
      else if (tipoImpuesto === '+ IGV') totalFinal += (baseFila * 1.18)
      else totalFinal += baseFila
    })
    return totalFinal
  }

  let cotizacionesFiltradas = listaCotizaciones.filter(cot => {
    const term = busqueda.toLowerCase()
    const prov = (cot.proveedor?.razonsocial || cot.ruc || '').toLowerCase()
    const est = (cot.estado || '').toLowerCase()
    const usu = (cot.usuario?.nombre || '').toLowerCase()
    return prov.includes(term) || est.includes(term) || usu.includes(term) || cot.idcotizacion.toString().includes(term)
  })

  cotizacionesFiltradas.sort((a, b) => {
    let valA = a[configOrden.clave], valB = b[configOrden.clave]
    if (configOrden.clave === 'proveedor') { valA = a.proveedor?.razonsocial || a.ruc; valB = b.proveedor?.razonsocial || b.ruc } 
    else if (configOrden.clave === 'moneda') { valA = a.moneda?.moneda || ''; valB = b.moneda?.moneda || '' }
    else if (configOrden.clave === 'usuario') { valA = a.usuario?.nombre || ''; valB = b.usuario?.nombre || '' }
    else if (configOrden.clave === 'total') { valA = calcularTotalGuardado(a.detallecotizacion); valB = calcularTotalGuardado(b.detallecotizacion) }
    if (valA < valB) return configOrden.direccion === 'asc' ? -1 : 1
    if (valA > valB) return configOrden.direccion === 'asc' ? 1 : -1
    return 0
  })

  const cambiarOrden = (clave) => {
    let direccion = 'asc'
    if (configOrden.clave === clave && configOrden.direccion === 'asc') direccion = 'desc'
    setConfigOrden({ clave, direccion })
  }
  
  const RenderSortIcon = ({ clave }) => configOrden.clave !== clave ? <span style={{ color: '#CBD5E1', marginLeft: '5px', fontSize:'10px' }}>▼</span> : <span style={{ marginLeft: '5px', color: '#2563EB', fontSize:'10px' }}>{configOrden.direccion === 'asc' ? '▲' : '▼'}</span>

  // ================= CONTROL DE MODALES =================
  const abrirModalNuevo = () => {
    setModoEdicion(false); setIdCotizacionActual(null); setRucProveedor(''); setIdFormaPago(''); setIdMoneda(''); setEstadoCotizacion('Solicitada')
    setFechaRecepcion(getFechaHoy()); setFechaAceptacion(''); setFechaInicio(''); setFechaFin('')
    setDetalles([{ item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
    setComentarioTexto(''); setListaComentariosNuevos([]); setComentariosGuardados([]); setArchivoUrl(''); setArchivoDesc(''); setArchivosGuardados([])
    setMostrarModal(true)
  }

  const abrirModalEditar = async (cot) => {
    setModoEdicion(true); setIdCotizacionActual(cot.idcotizacion)
    setRucProveedor(cot.ruc || ''); setIdFormaPago(cot.idformapago || ''); setIdMoneda(cot.idmoneda || ''); setEstadoCotizacion(cot.estado || 'Solicitada')
    setFechaRecepcion(cot.fecharecepcion || ''); setFechaAceptacion(cot.fechaaceptacion || ''); setFechaInicio(cot.fechainicio || ''); setFechaFin(cot.fechafin || '')

    const { data: dataDetalles } = await supabase.from('detallecotizacion').select('*').eq('idcotizacion', cot.idcotizacion)
    setDetalles(dataDetalles?.length > 0 ? dataDetalles.map(d => ({ item: d.item, cantidad: d.cantidad, idUnidad: d.idunidad, precioUnitario: d.preciounitario, idImpuestos: d.idimpuestos })) : [])

    const { data: dataComentarios } = await supabase.from('comentario').select('*, usuario(nombre)').eq('idcotizacion', cot.idcotizacion).order('fecha', { ascending: false })
    setComentariosGuardados(dataComentarios || []); setListaComentariosNuevos([]); setComentarioTexto('')

    const { data: dataArchivos } = await supabase.from('archivocot').select('*, usuario(nombre)').eq('idcotizacion', cot.idcotizacion)
    setArchivosGuardados(dataArchivos || []); setArchivoUrl(''); setArchivoDesc('')
    setMostrarModal(true)
  }

  // ================= LÓGICA DEL DETALLE DINÁMICO =================
  const agregarFila = () => setDetalles([...detalles, { item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
  const actualizarFila = (index, campo, valor) => { const nuevas = [...detalles]; nuevas[index][campo] = valor; setDetalles(nuevas) }
  const eliminarFila = (index) => { if(detalles.length > 1) setDetalles(detalles.filter((_, i) => i !== index)) }
  
  const calcularTotalesContables = () => {
    let subtotalNeto = 0, igvTotal = 0, totalFinal = 0
    detalles.forEach(fila => {
      const baseFila = fila.cantidad * fila.precioUnitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idImpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') { totalFinal += baseFila; subtotalNeto += (baseFila / 1.18); igvTotal += baseFila - (baseFila / 1.18) } 
      else if (tipoImpuesto === '+ IGV') { subtotalNeto += baseFila; igvTotal += (baseFila * 0.18); totalFinal += (baseFila * 1.18) } 
      else { subtotalNeto += baseFila; totalFinal += baseFila }
    })
    return { subtotal: subtotalNeto, igv: igvTotal, total: totalFinal }
  }
  const totales = calcularTotalesContables()

  const agregarComentarioALista = () => { if (comentarioTexto.trim() !== '') { setListaComentariosNuevos([...listaComentariosNuevos, comentarioTexto]); setComentarioTexto('') } }
  const eliminarComentarioDeLista = (index) => setListaComentariosNuevos(listaComentariosNuevos.filter((_, i) => i !== index))

  // ================= GUARDAR / ACTUALIZAR =================
  const handleGuardarTodo = async (e) => {
    e.preventDefault()
    if (!rucProveedor || !idFormaPago || !idMoneda) { alert("Complete todos los campos de Datos Generales."); return }
    if (detalles.length === 0) { alert("Debe tener al menos un ítem."); return }
    for (let i = 0; i < detalles.length; i++) {
      if (!detalles[i].item || detalles[i].item.trim() === '') { alert(`Fila ${i+1}: Descripción vacía.`); return }
      if (detalles[i].cantidad <= 0) { alert(`Fila ${i+1}: Cantidad inválida.`); return }
      if (detalles[i].precioUnitario <= 0) { alert(`Fila ${i+1}: Precio inválido.`); return }
    }

    setGuardando(true)
    try {
      let idCotizacionFinal = idCotizacionActual
      if (modoEdicion) {
        const { error: errUpdate } = await supabase.from('cotizaciones').update({
          ruc: rucProveedor, idformapago: idFormaPago, idmoneda: idMoneda, estado: estadoCotizacion,
          fecharecepcion: fechaRecepcion || null, fechaaceptacion: fechaAceptacion || null, fechainicio: fechaInicio || null, fechafin: fechaFin || null
        }).eq('idcotizacion', idCotizacionFinal)
        if (errUpdate) throw errUpdate
        await supabase.from('detallecotizacion').delete().eq('idcotizacion', idCotizacionFinal)
      } else {
        const { data: nuevaCotizacion, error: errCotizacion } = await supabase.from('cotizaciones').insert([{
          idservicio: id, ruc: rucProveedor, idformapago: idFormaPago, idmoneda: idMoneda, estado: 'Solicitada',
          idusuario: idUsuarioActual || null, fecharecepcion: fechaRecepcion || null, fechaaceptacion: fechaAceptacion || null, fechainicio: fechaInicio || null, fechafin: fechaFin || null
        }]).select()
        if (errCotizacion) throw errCotizacion
        idCotizacionFinal = nuevaCotizacion[0].idcotizacion
      }

      const detallesFormateados = detalles.map(d => ({
        idcotizacion: idCotizacionFinal, item: d.item, cantidad: d.cantidad, idunidad: d.idUnidad || null, preciounitario: d.precioUnitario, idimpuestos: d.idImpuestos || null
      }))
      const { error: errDetalles } = await supabase.from('detallecotizacion').insert(detallesFormateados)
      if (errDetalles) throw errDetalles

      const todosLosComentarios = [...listaComentariosNuevos]
      if (comentarioTexto.trim() !== '') todosLosComentarios.push(comentarioTexto)
      if (todosLosComentarios.length > 0) {
        const comentariosInsert = todosLosComentarios.map(texto => ({ idcotizacion: idCotizacionFinal, comentario: texto, idusuario: idUsuarioActual || null }))
        await supabase.from('comentario').insert(comentariosInsert)
      }

      if (archivoUrl.trim() !== '') {
        await supabase.from('archivocot').insert([{ idcotizacion: idCotizacionFinal, descripcion: archivoDesc || 'Adjunto', archivo: archivoUrl, idusuario: idUsuarioActual || null }])
      }

      setMostrarModal(false)
      cargarDatos()
    } catch (error) { alert("Error al guardar: " + error.message) } finally { setGuardando(false) }
  }

  // ================= NUEVO SISTEMA DE DISEÑO (VARIABLES CSS) =================
  const theme = {
    bgApp: '#F8FAFC', // Gris muy claro de fondo general
    bgCard: '#FFFFFF',
    textMain: '#1E293B', // Texto principal (casi negro pero suave)
    textMuted: '#64748B', // Texto secundario
    border: '#E2E8F0',
    primary: '#2563EB', // Azul corporativo moderno
    success: '#16A34A', // Verde exito
    inputBg: '#FFFFFF', // Sobreescribimos el fondo oscuro
    danger: '#DC2626'
  }

  // Estilos limpios y estandarizados
  const inputStyle = { 
    width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, 
    backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', 
    boxSizing: 'border-box', transition: 'border 0.2s ease' 
  }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }
  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, cursor: 'pointer', userSelect: 'none', backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }
  
  const badgeStyle = (estado) => {
    switch (estado) {
      case 'Aprobada': return { bg: '#DCFCE7', text: '#166534' }
      case 'Rechazada': return { bg: '#FEE2E2', text: '#991B1B' }
      case 'De Baja': return { bg: '#F1F5F9', text: '#475569' }
      default: return { bg: '#DBEAFE', text: '#1E40AF' } // Solicitada
    }
  }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* TOP BAR MODERNA */}
      <div style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, padding: '12px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.textMain, fontWeight: '600' }}>
          <span>{nombreUsuarioActual}</span>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: theme.primary, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
            {nombreUsuarioActual.charAt(0)}
          </div>
        </div>
      </div>

      {/* CONTENEDOR EXPANDIDO A 95% o 1600px */}
      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        {/* ENCABEZADO Y BUSCADOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/servicios')} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ← Volver a Servicios
            </button>
            <h2 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Cotizaciones del Servicio #{id}</h2>
            <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: '15px' }}>{cargando ? 'Cargando detalle...' : servicioActual}</p>
            
            {/* Buscador más claro y sutil */}
            <input 
              type="text" 
              placeholder="🔍 Buscar por proveedor, estado, moneda o creador..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '12px 16px', width: '450px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgCard, color: theme.textMain, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)', transition: '0.2s' }}>
            + Nueva Cotización
          </button>
        </div>

        {/* TABLA PRINCIPAL CLEAN */}
        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => cambiarOrden('idcotizacion')}>ID <RenderSortIcon clave="idcotizacion" /></th>
                  <th style={thStyle} onClick={() => cambiarOrden('fecharecepcion')}>Fecha Rec. <RenderSortIcon clave="fecharecepcion" /></th>
                  <th style={thStyle} onClick={() => cambiarOrden('proveedor')}>Proveedor <RenderSortIcon clave="proveedor" /></th>
                  <th style={thStyle} onClick={() => cambiarOrden('usuario')}>Creado Por <RenderSortIcon clave="usuario" /></th>
                  <th style={{...thStyle, textAlign: 'right'}} onClick={() => cambiarOrden('total')}>Total Final <RenderSortIcon clave="total" /></th>
                  <th style={{...thStyle, textAlign: 'center'}} onClick={() => cambiarOrden('estado')}>Estado <RenderSortIcon clave="estado" /></th>
                  <th style={{...thStyle, textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.length === 0 ? (
                  <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No hay resultados.</td></tr>
                ) : (
                  cotizacionesFiltradas.map((cot) => {
                    const statusStyle = badgeStyle(cot.estado)
                    return (
                      <tr key={cot.idcotizacion} style={{ transition: 'background 0.2s' }}>
                        <td style={{ ...tdStyle, fontWeight: '700' }}>#{cot.idcotizacion}</td>
                        <td style={{ ...tdStyle, color: theme.textMuted }}>{cot.fecharecepcion || '---'}</td>
                        <td style={{ ...tdStyle, fontWeight: '500' }}>{cot.proveedor ? cot.proveedor.razonsocial : cot.ruc}</td>
                        <td style={{ ...tdStyle, color: theme.textMuted }}>{cot.usuario ? cot.usuario.nombre : 'Sistema'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>
                          {cot.moneda?.moneda.includes('USD') ? '$' : 'S/'} {calcularTotalGuardado(cot.detallecotizacion).toFixed(2)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ padding: '6px 12px', backgroundColor: statusStyle.bg, color: statusStyle.text, borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                            {cot.estado}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => abrirModalEditar(cot)} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', color: theme.textMain, transition: '0.2s' }}>
                            Ver Detalle
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

        {/* ================= MODAL MAESTRO-DETALLE ================= */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '16px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              {/* Header Modal Fijo */}
              <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', fontWeight: '700' }}>
                  {modoEdicion ? `Gestión de Cotización #${idCotizacionActual}` : 'Nueva Cotización'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: theme.textMuted }}>Estado de la propuesta:</span>
                  {modoEdicion ? (
                     <select value={estadoCotizacion} onChange={(e) => setEstadoCotizacion(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: theme.inputBg, color: theme.textMain, cursor: 'pointer' }}>
                       <option value="Solicitada">Solicitada</option>
                       <option value="Aprobada">Aprobada</option>
                       <option value="Rechazada">Rechazada</option>
                       <option value="De Baja">De Baja</option>
                     </select>
                  ) : (
                    <span style={{ fontSize: '13px', backgroundColor: '#DBEAFE', padding: '8px 16px', borderRadius: '8px', color: '#1E40AF', fontWeight: '700' }}>Solicitada</span>
                  )}
                  <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer', marginLeft: '10px' }}>×</button>
                </div>
              </div>
              
              <form onSubmit={handleGuardarTodo} style={{ padding: '24px' }}>
                
                {/* 1 y 2. DATOS GENERALES Y FECHAS (Flexbox) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>1. Proveedor y Finanzas</h4>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Proveedor Autorizado *</label>
                      <select required value={rucProveedor} onChange={(e) => setRucProveedor(e.target.value)} style={inputStyle}>
                        <option value="">-- Seleccionar --</option>
                        {catProveedores.map(p => <option key={p.ruc} value={p.ruc}>{p.ruc} - {p.razonsocial}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={labelStyle}>Condición de Pago *</label>
                        <select required value={idFormaPago} onChange={(e) => setIdFormaPago(e.target.value)} style={inputStyle}>
                          <option value="">-- Seleccionar --</option>
                          {catFormasPago.map(f => <option key={f.idformapago} value={f.idformapago}>{f.formapago}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Moneda de Facturación *</label>
                        <select required value={idMoneda} onChange={(e) => setIdMoneda(e.target.value)} style={inputStyle}>
                          <option value="">-- Seleccionar --</option>
                          {catMonedas.map(m => <option key={m.idmoneda} value={m.idmoneda}>{m.moneda}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>2. Cronograma</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Recepción de Doc.</label><input type="date" required value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Aceptación (Aprobación)</label><input type="date" value={fechaAceptacion} onChange={(e) => setFechaAceptacion(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div><label style={labelStyle}>Inicio de Servicio</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Fin Estimado</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} /></div>
                    </div>
                  </div>
                </div>

                {/* 3. DETALLE DE ÍTEMS */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, color: theme.textMain, fontSize: '16px' }}>3. Estructura de Costos (Desglose)</h4>
                    <button type="button" onClick={agregarFila} style={{ padding: '8px 16px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>+ Añadir Fila</button>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '12px', padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '8px', marginBottom: '12px' }}>
                      <div style={labelStyle}>Ítem / Descripción *</div><div style={labelStyle}>Unidad de Medida</div><div style={labelStyle}>Afectación IGV</div>
                      <div style={labelStyle}>Cant. *</div><div style={labelStyle}>Precio Unitario *</div><div style={{...labelStyle, textAlign: 'right'}}>Subtotal Fila</div><div></div>
                    </div>

                    {detalles.map((fila, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                        <input type="text" required placeholder="Describe el material o servicio..." value={fila.item} onChange={(e) => actualizarFila(index, 'item', e.target.value)} style={inputStyle} />
                        <select value={fila.idUnidad} onChange={(e) => actualizarFila(index, 'idUnidad', e.target.value)} style={inputStyle}>{catUnidades.map(u => <option key={u.idunidad} value={u.idunidad}>{u.unidadmedida}</option>)}</select>
                        <select value={fila.idImpuestos} onChange={(e) => actualizarFila(index, 'idImpuestos', e.target.value)} style={inputStyle}>{catImpuestos.map(i => <option key={i.idimpuestos} value={i.idimpuestos}>{i.impuesto}</option>)}</select>
                        <input type="number" required min="1" step="1" value={fila.cantidad} onChange={(e) => actualizarFila(index, 'cantidad', parseFloat(e.target.value) || 0)} style={inputStyle} />
                        <input type="number" required min="0.01" step="0.01" value={fila.precioUnitario} onChange={(e) => actualizarFila(index, 'precioUnitario', parseFloat(e.target.value) || 0)} style={inputStyle} />
                        <div style={{ padding: '10px 12px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '6px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: theme.textMain }}>
                          {(fila.cantidad * fila.precioUnitario).toFixed(2)}
                        </div>
                        <button type="button" onClick={() => eliminarFila(index)} disabled={detalles.length === 1} style={{ padding: '10px', backgroundColor: detalles.length > 1 ? theme.danger : '#E2E8F0', color: 'white', border: 'none', borderRadius: '6px', cursor: detalles.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Totales Resaltados */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: `1px dashed ${theme.border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', color: theme.textMuted, marginBottom: '8px' }}><div>Subtotal Grabado:</div><div style={{color: theme.textMain, fontWeight: '600'}}>{totales.subtotal.toFixed(2)}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', color: theme.textMuted, marginBottom: '16px' }}><div>IGV (18%):</div><div style={{color: theme.textMain, fontWeight: '600'}}>{totales.igv.toFixed(2)}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '16px', textAlign: 'right', fontSize: '20px', fontWeight: '800', color: theme.success, backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '8px' }}>
                      <div>TOTAL FINAL:</div><div>{totales.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* 4 Y 5. ARCHIVOS Y COMENTARIOS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 16px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>4. Repositorio de Documentos</h4>
                    
                    {archivosGuardados.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        {archivosGuardados.map(arch => (
                          <div key={arch.idarchivo} style={{ padding: '12px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textMain }}>📎 {arch.descripcion}</span>
                            <a href={arch.archivo} target="_blank" rel="noreferrer" style={{ color: theme.primary, textDecoration: 'none', fontSize: '13px', fontWeight: '600', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '4px' }}>Abrir</a>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><label style={labelStyle}>URL del PDF (Drive/Dropbox)</label><input type="url" placeholder="https://..." value={archivoUrl} onChange={(e) => setArchivoUrl(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Nombre del Documento</label><input type="text" placeholder="Ej: Proforma final firmada" value={archivoDesc} onChange={(e) => setArchivoDesc(e.target.value)} style={inputStyle} /></div>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 16px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>5. Historial de Observaciones</h4>
                    
                    {comentariosGuardados.length > 0 && (
                      <div style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                        {comentariosGuardados.map(c => (
                          <div key={c.idcomentario} style={{ marginBottom: '12px', padding: '12px', backgroundColor: theme.bgApp, borderRadius: '8px', borderLeft: `3px solid ${theme.primary}` }}>
                            <div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', marginBottom: '4px' }}>{c.usuario?.nombre || 'Sistema'} • {new Date(c.fecha).toLocaleDateString()}</div>
                            <div style={{ fontSize: '13px', color: theme.textMain, lineHeight: '1.4' }}>{c.comentario}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <textarea value={comentarioTexto} onChange={(e) => setComentarioTexto(e.target.value)} rows="3" placeholder="Redacta una nueva nota aquí..." style={{ ...inputStyle, resize: 'none' }} />
                      <button type="button" onClick={agregarComentarioALista} style={{ padding: '10px 16px', backgroundColor: theme.bgApp, color: theme.primary, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', alignSelf: 'flex-start' }}>
                        + Encolar Comentario
                      </button>
                    </div>

                    {listaComentariosNuevos.length > 0 && (
                      <div style={{ marginTop: '16px', backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '8px', border: '1px dashed #93C5FD' }}>
                        <h5 style={{ margin: '0 0 12px 0', color: '#1E40AF', fontSize: '13px' }}>Borradores por guardar:</h5>
                        {listaComentariosNuevos.map((com, index) => (
                          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '10px 12px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
                            <span style={{ fontSize: '13px', color: theme.textMain }}>{com}</span>
                            <button type="button" onClick={() => eliminarComentarioDeLista(index)} style={{ padding: '6px 10px', backgroundColor: theme.danger, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Descartar</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTONES FIJOS AL FINAL */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '12px 24px', backgroundColor: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    Descartar Cambios
                  </button>
                  <button type="submit" disabled={guardando} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                    {guardando ? 'Sincronizando con base de datos...' : (modoEdicion ? 'Actualizar Cotización' : 'Guardar Nueva Cotización')}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Cotizaciones