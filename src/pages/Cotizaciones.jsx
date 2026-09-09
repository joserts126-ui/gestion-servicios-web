import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'

function Cotizaciones() {
  const { id } = useParams() 
  const navigate = useNavigate()
  
  const getFechaHoy = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const [servicioActual, setServicioActual] = useState(null)
  const [listaCotizaciones, setListaCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [configOrden, setConfigOrden] = useState({ clave: 'idcotizacion', direccion: 'desc' })

  const [catProveedores, setCatProveedores] = useState([])
  const [catMonedas, setCatMonedas] = useState([])
  const [catFormasPago, setCatFormasPago] = useState([])
  const [catUnidades, setCatUnidades] = useState([])
  const [catImpuestos, setCatImpuestos] = useState([])
  
  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [nombreUsuarioActual, setNombreUsuarioActual] = useState('Cargando...')
  const [rolUsuarioActual, setRolUsuarioActual] = useState('ADMIN') 
  
  const [defUnidadId, setDefUnidadId] = useState('')
  const [defImpuestoId, setDefImpuestoId] = useState('')
  const [defMonedaId, setDefMonedaId] = useState('') 

  const [mostrarModal, setMostrarModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [subiendoPdf, setSubiendoPdf] = useState(false) 
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idCotizacionActual, setIdCotizacionActual] = useState(null)

  const [rucProveedor, setRucProveedor] = useState('')
  const [idFormaPago, setIdFormaPago] = useState('')
  const [idMoneda, setIdMoneda] = useState('')
  const [estadoCotizacion, setEstadoCotizacion] = useState('Solicitada')
  
  const [fechaEnvioCotizacion, setFechaEnvioCotizacion] = useState('')
  const [fechaVisitaTecnica, setFechaVisitaTecnica] = useState('')
  const [fechaRecepcion, setFechaRecepcion] = useState('')
  const [fechaAceptacion, setFechaAceptacion] = useState('') 
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const [detalles, setDetalles] = useState([])

  const [archivoPdf, setArchivoPdf] = useState(null) 
  const [archivoDesc, setArchivoDesc] = useState('') 
  const [archivosGuardados, setArchivosGuardados] = useState([]) 

  const [comentarioTexto, setComentarioTexto] = useState('')
  const [listaComentariosNuevos, setListaComentariosNuevos] = useState([])
  const [comentariosGuardados, setComentariosGuardados] = useState([]) 

  const [gastosGenerales, setGastosGenerales] = useState(0)
  const [utilidades, setUtilidades] = useState(0)
  const [plazoDias, setPlazoDias] = useState('')
  const [entregables, setEntregables] = useState('')

  const esVisor = rolUsuarioActual === 'VISOR'; 

  const cargarDatos = async () => {
    setCargando(true)
    const { data: dataSrv } = await supabase.from('servicios').select('servicio').eq('idservicio', id).single()
    if (dataSrv) setServicioActual(dataSrv.servicio)

    const { data: dataCot } = await supabase.from('cotizaciones').select('*, proveedor(razonsocial), moneda(moneda), detallecotizacion(cantidad, preciounitario, idimpuestos), usuario(nombre)').eq('idservicio', id)
    if (dataCot) setListaCotizaciones(dataCot)

    const [resProv, resMon, resFPago, resUni, resImp] = await Promise.all([
      supabase.from('proveedor').select('*').eq('activo', true), supabase.from('moneda').select('*'),
      supabase.from('formapago').select('*').eq('activo', true), supabase.from('unidadmedida').select('*').eq('activo', true),
      supabase.from('impuestos').select('*')
    ])
    
    if (resProv.data) setCatProveedores(resProv.data)
    if (resMon.data) setCatMonedas(resMon.data)
    if (resFPago.data) setCatFormasPago(resFPago.data)
    if (resUni.data) setCatUnidades(resUni.data)
    if (resImp.data) setCatImpuestos(resImp.data)
    
    if (resUni.data) { const u = resUni.data.find(x => x.unidadmedida === 'UND - Unidad'); if (u) { setDefUnidadId(u.idunidad) } }
    if (resImp.data) { const i = resImp.data.find(x => x.impuesto === '+ IGV'); if (i) { setDefImpuestoId(i.idimpuestos) } }
    if (resMon.data) { const m = resMon.data.find(x => x.moneda.toLowerCase().includes('sol') || x.moneda.includes('PEN')); if (m) setDefMonedaId(m.idmoneda); }

    const usuarioGuardado = localStorage.getItem('usuarioApp');
    if (usuarioGuardado) {
      const userObj = JSON.parse(usuarioGuardado);
      setIdUsuarioActual(userObj.idusuario);
      setNombreUsuarioActual(userObj.nombre);
      setRolUsuarioActual(userObj.rol || 'ADMIN');
    } else {
      navigate('/');
    }
    
    setCargando(false)
  }

  useEffect(() => { cargarDatos() }, [id])

  const calcularTotalGuardado = (cot) => {
    if (!cot.detallecotizacion || cot.detallecotizacion.length === 0) return 0
    let totalFinalBase = 0
    cot.detallecotizacion.forEach(fila => {
      const baseFila = fila.cantidad * fila.preciounitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idimpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') totalFinalBase += baseFila
      else if (tipoImpuesto === '+ IGV') totalFinalBase += (baseFila * 1.18)
      else totalFinalBase += baseFila
    })
    const gg = parseFloat(cot.gastos_generales || 0)
    const ut = parseFloat(cot.utilidades || 0)
    return totalFinalBase + ((gg + ut) * 1.18)
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
    else if (configOrden.clave === 'total') { valA = calcularTotalGuardado(a); valB = calcularTotalGuardado(b) }
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

  const abrirModalNuevo = () => {
    setModoEdicion(false); setIdCotizacionActual(null); setRucProveedor(''); setIdFormaPago(''); setEstadoCotizacion('Solicitada')
    setIdMoneda(defMonedaId); 
    setFechaEnvioCotizacion(getFechaHoy()); setFechaVisitaTecnica(''); setFechaRecepcion(''); setFechaAceptacion(''); setFechaInicio(''); setFechaFin('')
    setGastosGenerales(0); setUtilidades(0); setPlazoDias(''); setEntregables('');
    setDetalles([{ item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
    setComentarioTexto(''); setListaComentariosNuevos([]); setComentariosGuardados([]); 
    setArchivoPdf(null); setArchivoDesc(''); setArchivosGuardados([])
    setMostrarModal(true)
  }

  const abrirModalEditar = async (cot) => {
    setModoEdicion(true); setIdCotizacionActual(cot.idcotizacion)
    setRucProveedor(cot.ruc || ''); setIdFormaPago(cot.idformapago || ''); setIdMoneda(cot.idmoneda || ''); setEstadoCotizacion(cot.estado || 'Solicitada')
    setFechaEnvioCotizacion(cot.fecha_envio_cotizacion || ''); setFechaVisitaTecnica(cot.fecha_visita_tecnica || '')
    setFechaRecepcion(cot.fecharecepcion || ''); setFechaAceptacion(cot.fechaaceptacion || ''); setFechaInicio(cot.fechainicio || ''); setFechaFin(cot.fechafin || '')
    setGastosGenerales(cot.gastos_generales || 0); setUtilidades(cot.utilidades || 0); setPlazoDias(cot.plazo_dias || ''); setEntregables(cot.entregables || '');

    const { data: dataDetalles } = await supabase.from('detallecotizacion').select('*').eq('idcotizacion', cot.idcotizacion)
    if (dataDetalles?.length > 0) {
      setDetalles(dataDetalles.map(d => ({ item: d.item, cantidad: d.cantidad, idUnidad: d.idunidad, precioUnitario: d.preciounitario, idImpuestos: d.idimpuestos })))
    } else {
      setDetalles([{ item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
    }

    const { data: dataComentarios } = await supabase.from('comentario').select('*, usuario(nombre)').eq('idcotizacion', cot.idcotizacion).order('fecha', { ascending: false })
    setComentariosGuardados(dataComentarios || []); setListaComentariosNuevos([]); setComentarioTexto('')

    const { data: dataArchivos } = await supabase.from('archivocot').select('*, usuario(nombre)').eq('idcotizacion', cot.idcotizacion)
    setArchivosGuardados(dataArchivos || []); setArchivoPdf(null); setArchivoDesc('')
    setMostrarModal(true)
  }

  const handleEliminarArchivo = async (idArchivo, urlArchivo) => {
    const confirmacion = window.confirm('⚠️ ATENCIÓN:\n\n¿Estás completamente seguro de que deseas ELIMINAR este documento?\nEsta acción NO se puede deshacer y el archivo se perderá permanentemente.');
    if (!confirmacion) return;
    try {
      const { error: dbError } = await supabase.from('archivocot').delete().eq('idarchivo', idArchivo);
      if (dbError) throw dbError;
      const rutaArchivo = urlArchivo.split('/public/archivos_cotizaciones/')[1];
      if (rutaArchivo) await supabase.storage.from('archivos_cotizaciones').remove([rutaArchivo]);
      setArchivosGuardados(prev => prev.filter(a => a.idarchivo !== idArchivo));
    } catch (error) { alert('Error al eliminar el archivo: ' + error.message); }
  }

  const agregarFila = () => setDetalles([...detalles, { item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
  const actualizarFila = (index, campo, valor) => { const nuevas = [...detalles]; nuevas[index][campo] = valor; setDetalles(nuevas) }
  const eliminarFila = (index) => { if(detalles.length > 1) setDetalles(detalles.filter((_, i) => i !== index)) }
  
  const calcularTotalesContables = () => {
    let costoDirecto = 0, subtotalParcial = 0, igvBase = 0, totalFinalBase = 0
    detalles.forEach(fila => {
      const baseFila = fila.cantidad * fila.precioUnitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos.toString() === fila.idImpuestos?.toString() || i.impuesto === fila.idImpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') { costoDirecto += (baseFila / 1.18); igvBase += baseFila - (baseFila / 1.18); totalFinalBase += baseFila } 
      else if (tipoImpuesto === '+ IGV') { costoDirecto += baseFila; igvBase += (baseFila * 0.18); totalFinalBase += (baseFila * 1.18) } 
      else { costoDirecto += baseFila; totalFinalBase += baseFila }
    })
    const gg = parseFloat(gastosGenerales || 0); const ut = parseFloat(utilidades || 0);
    return { costoDirecto, subtotal: costoDirecto + gg + ut, igv: igvBase + ((gg + ut) * 0.18), total: totalFinalBase + gg + ut + ((gg + ut) * 0.18) }
  }
  const totales = calcularTotalesContables()

  const agregarComentarioALista = () => { if (comentarioTexto.trim() !== '') { setListaComentariosNuevos([...listaComentariosNuevos, comentarioTexto]); setComentarioTexto('') } }
  const eliminarComentarioDeLista = (index) => setListaComentariosNuevos(listaComentariosNuevos.filter((_, i) => i !== index))

  const getNombreProveedor = (val) => { const x = catProveedores.find(p => p.ruc === val?.toString()); return x ? x.razonsocial : val || ''; }
  const getNombreMoneda = (val) => { const x = catMonedas.find(m => m.idmoneda.toString() === val?.toString()); return x ? x.moneda : val || ''; }
  const getNombreFormaPago = (val) => { const x = catFormasPago.find(f => f.idformapago.toString() === val?.toString()); return x ? x.formapago : val || ''; }
  const getNombreUnidad = (val) => { const x = catUnidades.find(u => u.idunidad.toString() === val?.toString()); return x ? x.unidadmedida : val || ''; }
  const getNombreImpuesto = (val) => { const x = catImpuestos.find(i => i.idimpuestos.toString() === val?.toString()); return x ? x.impuesto : val || ''; }

  const handleGuardarTodo = async (e) => {
    e.preventDefault()
    
    const valProv = catProveedores.find(p => p.ruc === rucProveedor || p.razonsocial === rucProveedor)?.ruc;
    const valMoneda = idMoneda ? catMonedas.find(m => m.idmoneda.toString() === idMoneda.toString() || m.moneda === idMoneda)?.idmoneda : null;
    const valFPago = idFormaPago ? catFormasPago.find(f => f.idformapago.toString() === idFormaPago.toString() || f.formapago === idFormaPago)?.idformapago : null;

    if (!esVisor) {
      if (!valProv) { alert("Debe seleccionar un Proveedor válido de la lista."); return }
      const detallesValidos = detalles.filter(d => d.item && d.item.trim() !== '');
      if (estadoCotizacion !== 'Solicitada') {
        if (!valFPago || !valMoneda) { alert("Para registrar una cotización como recibida o procesada, seleccione Forma de Pago y Moneda de la lista."); return }
        if (detallesValidos.length === 0) { alert("Debe tener al menos un ítem descrito para guardar los precios."); return }
        
        // REVISIÓN DE SEGURIDAD PARA FILAS
        for (let i = 0; i < detallesValidos.length; i++) {
          if (detallesValidos[i].cantidad <= 0 || detallesValidos[i].precioUnitario <= 0) { 
            alert(`Fila con ítem "${detallesValidos[i].item}" tiene cantidad o precio inválido.`); return 
          }
          const validU = catUnidades.find(x => x.idunidad.toString() === detallesValidos[i].idUnidad?.toString() || x.unidadmedida === detallesValidos[i].idUnidad);
          if (!validU) { alert(`Fila "${detallesValidos[i].item}": Unidad de medida inválida. Selecciona de la lista.`); return; }

          const validI = catImpuestos.find(x => x.idimpuestos.toString() === detallesValidos[i].idImpuestos?.toString() || x.impuesto === detallesValidos[i].idImpuestos);
          if (!validI) { alert(`Fila "${detallesValidos[i].item}": Afectación IGV inválida. Selecciona de la lista.`); return; }
        }
      }
    }

    setGuardando(true)
    try {
      let idCotizacionFinal = idCotizacionActual

      if (!esVisor) {
        const payloadCabecera = {
          ruc: valProv, idformapago: valFPago, idmoneda: valMoneda, estado: estadoCotizacion,
          fecha_envio_cotizacion: fechaEnvioCotizacion || null, fecha_visita_tecnica: fechaVisitaTecnica || null,
          fecharecepcion: fechaRecepcion || null, fechaaceptacion: fechaAceptacion || null, fechainicio: fechaInicio || null, fechafin: fechaFin || null,
          gastos_generales: gastosGenerales, utilidades: utilidades, plazo_dias: plazoDias, entregables: entregables
        }

        if (modoEdicion) {
          const { error: errUpdate } = await supabase.from('cotizaciones').update(payloadCabecera).eq('idcotizacion', idCotizacionFinal)
          if (errUpdate) throw errUpdate
          await supabase.from('detallecotizacion').delete().eq('idcotizacion', idCotizacionFinal)
        } else {
          payloadCabecera.idservicio = id
          payloadCabecera.idusuario = idUsuarioActual || null
          const { data: nuevaCotizacion, error: errCotizacion } = await supabase.from('cotizaciones').insert([payloadCabecera]).select()
          if (errCotizacion) throw errCotizacion
          idCotizacionFinal = nuevaCotizacion[0].idcotizacion
        }

        const detallesValidos = detalles.filter(d => d.item && d.item.trim() !== '');
        if (detallesValidos.length > 0) {
          const detallesFormateados = detallesValidos.map(d => {
            const u = catUnidades.find(x => x.idunidad.toString() === d.idUnidad?.toString() || x.unidadmedida === d.idUnidad)?.idunidad || null;
            const i = catImpuestos.find(x => x.idimpuestos.toString() === d.idImpuestos?.toString() || x.impuesto === d.idImpuestos)?.idimpuestos || null;
            return {
              idcotizacion: idCotizacionFinal, item: d.item, cantidad: d.cantidad, idunidad: u, preciounitario: d.precioUnitario, idimpuestos: i
            };
          })
          const { error: errDetalles } = await supabase.from('detallecotizacion').insert(detallesFormateados)
          if (errDetalles) throw errDetalles
        }
      }

      const todosLosComentarios = [...listaComentariosNuevos]
      if (comentarioTexto.trim() !== '') todosLosComentarios.push(comentarioTexto)
      if (todosLosComentarios.length > 0) {
        const comentariosInsert = todosLosComentarios.map(texto => ({ idcotizacion: idCotizacionFinal, comentario: texto, idusuario: idUsuarioActual || null }))
        await supabase.from('comentario').insert(comentariosInsert)
      }

      if (archivoPdf) {
        setSubiendoPdf(true)
        const fileExt = archivoPdf.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `cotizacion_${idCotizacionFinal}/${fileName}` 
        const { error: uploadError } = await supabase.storage.from('archivos_cotizaciones').upload(filePath, archivoPdf)
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('archivos_cotizaciones').getPublicUrl(filePath)
        await supabase.from('archivocot').insert([{ idcotizacion: idCotizacionFinal, descripcion: archivoDesc || archivoPdf.name, archivo: publicUrlData.publicUrl, idusuario: idUsuarioActual || null }])
        setSubiendoPdf(false)
      }

      setMostrarModal(false)
      cargarDatos()
    } catch (error) { alert("Error al guardar: " + error.message); setSubiendoPdf(false) } 
    finally { setGuardando(false) }
  }

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', inputBg: '#FFFFFF', danger: '#DC2626' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: esVisor ? '#F1F5F9' : theme.inputBg, color: esVisor ? theme.textMuted : theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s ease' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }
  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, cursor: 'pointer', userSelect: 'none', backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }
  
  const badgeStyle = (estado) => {
    switch (estado) {
      case 'Aprobada': return { bg: '#DCFCE7', text: '#166534' }
      case 'Rechazada': return { bg: '#FEE2E2', text: '#991B1B' }
      case 'Entregada': return { bg: '#FEF08A', text: '#854D0E' }
      case 'De Baja': return { bg: '#F1F5F9', text: '#475569' }
      default: return { bg: '#DBEAFE', text: '#1E40AF' } 
    }
  }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar nombreUsuario={nombreUsuarioActual} />
      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/servicios')} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}>← Volver a Servicios</button>
            <h2 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Cotizaciones del Servicio #{id}</h2>
            <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: '15px' }}>{cargando ? 'Cargando detalle...' : servicioActual}</p>
            <input type="text" placeholder="🔍 Buscar por proveedor o estado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '12px 16px', width: '450px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgCard, color: theme.textMain, fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={() => navigate('/servicios')} style={{ padding: '12px 24px', backgroundColor: '#F8FAFC', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>📊 Ir a Matriz</button>
             {!esVisor && (
               <button onClick={abrirModalNuevo} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>+ Nueva Cotización</button>
             )}
          </div>
        </div>

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
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', fontSize: '15px' }}>{cot.moneda?.moneda?.includes('USD') ? '$' : 'S/'} {calcularTotalGuardado(cot).toFixed(2)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ padding: '6px 12px', backgroundColor: statusStyle.bg, color: statusStyle.text, borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>{cot.estado}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <button onClick={() => abrirModalEditar(cot)} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', color: theme.textMain }}>
                            {esVisor ? '👁️ Ver Detalle' : '✏️ Editar'}
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

        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '16px', width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', fontWeight: '700' }}>{modoEdicion ? `Cotización #${idCotizacionActual}` : 'Nueva Cotización'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: theme.textMuted }}>Estado de la propuesta:</span>
                  <select disabled={esVisor} value={estadoCotizacion} onChange={(e) => setEstadoCotizacion(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: esVisor ? '#F1F5F9' : theme.inputBg, color: theme.textMain, cursor: esVisor ? 'default' : 'pointer' }}>
                    <option value="Solicitada">Solicitada</option><option value="Entregada">Entregada / Recibida</option>
                    <option value="Aprobada">Aprobada</option><option value="Rechazada">Rechazada</option><option value="De Baja">De Baja</option>
                  </select>
                  <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer', marginLeft: '10px' }}>×</button>
                </div>
              </div>
              
              <form onSubmit={handleGuardarTodo} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>1. Proveedor y Finanzas</h4>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Proveedor (Solicitado o Contratado) *</label>
                      <input 
                        list="lista-proveedores" 
                        required 
                        disabled={esVisor} 
                        value={getNombreProveedor(rucProveedor)} 
                        onChange={(e) => {
                          const p = catProveedores.find(x => x.razonsocial === e.target.value);
                          setRucProveedor(p ? p.ruc : e.target.value);
                        }} 
                        style={inputStyle} 
                        placeholder="Escribe para buscar..."
                      />
                      <datalist id="lista-proveedores">
                        {catProveedores.map(p => <option key={p.ruc} value={p.razonsocial} />)}
                      </datalist>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={labelStyle}>Condición de Pago (Si ya cotizó)</label>
                        <input 
                          list="lista-pago" 
                          disabled={esVisor} 
                          value={getNombreFormaPago(idFormaPago)} 
                          onChange={(e) => {
                            const f = catFormasPago.find(x => x.formapago === e.target.value);
                            setIdFormaPago(f ? f.idformapago : e.target.value);
                          }} 
                          style={inputStyle} 
                          placeholder="-- Opcional --"
                        />
                        <datalist id="lista-pago">
                          {catFormasPago.map(f => <option key={f.idformapago} value={f.formapago} />)}
                        </datalist>
                      </div>
                      <div>
                        <label style={labelStyle}>Moneda de Facturación</label>
                        <input 
                          list="lista-monedas" 
                          disabled={esVisor} 
                          value={getNombreMoneda(idMoneda)} 
                          onChange={(e) => {
                            const m = catMonedas.find(x => x.moneda === e.target.value);
                            setIdMoneda(m ? m.idmoneda : e.target.value);
                          }} 
                          style={inputStyle} 
                          placeholder="-- Opcional --"
                        />
                        <datalist id="lista-monedas">
                          {catMonedas.map(m => <option key={m.idmoneda} value={m.moneda} />)}
                        </datalist>
                      </div>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 20px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>2. Cronograma y Alcance</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>F. Envío de Solicitud</label><input type="date" disabled={esVisor} value={fechaEnvioCotizacion} onChange={(e) => setFechaEnvioCotizacion(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>F. Visita Técnica</label><input type="date" disabled={esVisor} value={fechaVisitaTecnica} onChange={(e) => setFechaVisitaTecnica(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Recepción de Doc.</label><input type="date" disabled={esVisor} value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Aceptación (Aprobación)</label><input type="date" disabled={esVisor} value={fechaAceptacion} onChange={(e) => setFechaAceptacion(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div><label style={labelStyle}>Inicio de Servicio</label><input type="date" disabled={esVisor} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Fin Estimado</label><input type="date" disabled={esVisor} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div><label style={labelStyle}>Plazo Propuesto</label><input type="text" disabled={esVisor} placeholder="Ej: 7 días" value={plazoDias} onChange={(e) => setPlazoDias(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Entregables / Alcance</label><input type="text" disabled={esVisor} placeholder="Ej: Certificado" value={entregables} onChange={(e) => setEntregables(e.target.value)} style={inputStyle} /></div>
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, color: theme.textMain, fontSize: '16px' }}>3. Estructura de Costos (Desglose)</h4>
                    {!esVisor && <button type="button" onClick={agregarFila} style={{ padding: '8px 16px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>+ Añadir Fila</button>}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '12px', padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '8px', marginBottom: '12px' }}><div style={labelStyle}>Ítem / Descripción *</div><div style={labelStyle}>Unidad de Medida</div><div style={labelStyle}>Afectación IGV</div><div style={labelStyle}>Cant. *</div><div style={labelStyle}>Precio Unitario *</div><div style={{...labelStyle, textAlign: 'right'}}>Subtotal Fila</div><div></div></div>
                    {detalles.map((fila, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                        <input type="text" disabled={esVisor} placeholder="Describe el material o servicio..." value={fila.item} onChange={(e) => actualizarFila(index, 'item', e.target.value)} style={inputStyle} />
                        
                        <input 
                          list="lista-unidades" 
                          disabled={esVisor} 
                          value={getNombreUnidad(fila.idUnidad)} 
                          onChange={(e) => {
                            const u = catUnidades.find(x => x.unidadmedida === e.target.value);
                            actualizarFila(index, 'idUnidad', u ? u.idunidad : e.target.value);
                          }} 
                          style={inputStyle} 
                        />
                        <datalist id="lista-unidades">{catUnidades.map(u => <option key={u.idunidad} value={u.unidadmedida} />)}</datalist>

                        <input 
                          list="lista-impuestos" 
                          disabled={esVisor} 
                          value={getNombreImpuesto(fila.idImpuestos)} 
                          onChange={(e) => {
                            const i = catImpuestos.find(x => x.impuesto === e.target.value);
                            actualizarFila(index, 'idImpuestos', i ? i.idimpuestos : e.target.value);
                          }} 
                          style={inputStyle} 
                        />
                        <datalist id="lista-impuestos">{catImpuestos.map(i => <option key={i.idimpuestos} value={i.impuesto} />)}</datalist>

                        <input type="number" disabled={esVisor} min="0.01" step="any" value={fila.cantidad} onChange={(e) => actualizarFila(index, 'cantidad', parseFloat(e.target.value) || 0)} style={inputStyle} />
                        <input type="number" disabled={esVisor} min="0" step="0.01" value={fila.precioUnitario} onChange={(e) => actualizarFila(index, 'precioUnitario', parseFloat(e.target.value) || 0)} style={inputStyle} />
                        <div style={{ padding: '10px 12px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '6px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: theme.textMain }}>{(fila.cantidad * fila.precioUnitario).toFixed(2)}</div>
                        {!esVisor && <button type="button" onClick={() => eliminarFila(index)} disabled={detalles.length === 1} style={{ padding: '10px', backgroundColor: detalles.length > 1 ? theme.danger : '#E2E8F0', color: 'white', border: 'none', borderRadius: '6px', cursor: detalles.length > 1 ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: `1px dashed ${theme.border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', marginBottom: '8px' }}><div style={{ color: theme.textMuted, fontWeight: '600' }}>Costo Directo Neto:</div><div style={{ color: theme.textMain, fontWeight: '700' }}>{totales.costoDirecto.toFixed(2)}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', marginBottom: '8px', alignItems: 'center' }}><div style={{ color: theme.textMuted }}>+ Gastos Generales:</div><input type="number" disabled={esVisor} min="0" step="0.01" value={gastosGenerales} onChange={(e) => setGastosGenerales(parseFloat(e.target.value) || 0)} style={{...inputStyle, padding: '4px 8px', textAlign: 'right'}} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', marginBottom: '16px', alignItems: 'center' }}><div style={{ color: theme.textMuted }}>+ Utilidades:</div><input type="number" disabled={esVisor} min="0" step="0.01" value={utilidades} onChange={(e) => setUtilidades(parseFloat(e.target.value) || 0)} style={{...inputStyle, padding: '4px 8px', textAlign: 'right'}} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 150px', gap: '16px', textAlign: 'right', fontSize: '15px', marginBottom: '8px', borderTop: `1px solid ${theme.border}`, paddingTop: '8px' }}><div style={{ color: theme.textMain, fontWeight: '700' }}>SUB-TOTAL:</div><div style={{ color: theme.textMain, fontWeight: '800' }}>{totales.subtotal.toFixed(2)}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '180px 150px', gap: '16px', textAlign: 'right', fontSize: '14px', marginBottom: '16px', color: theme.textMuted }}><div>IGV (18%):</div><div>{totales.igv.toFixed(2)}</div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '16px', textAlign: 'right', fontSize: '20px', fontWeight: '800', color: theme.success, backgroundColor: '#F0FDF4', padding: '16px', borderRadius: '8px' }}><div>TOTAL FINAL:</div><div>{totales.total.toFixed(2)}</div></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 16px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>4. Repositorio de Documentos</h4>
                    {archivosGuardados.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        {archivosGuardados.map(arch => (
                          <div key={arch.idarchivo} style={{ padding: '12px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textMain }}>📎 {arch.descripcion}</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <a href={arch.archivo} target="_blank" rel="noreferrer" style={{ color: theme.primary, textDecoration: 'none', fontSize: '13px', fontWeight: '600', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '4px' }}>Abrir</a>
                              {!esVisor && <button type="button" onClick={() => handleEliminarArchivo(arch.idarchivo, arch.archivo)} style={{ color: theme.danger, backgroundColor: '#FEF2F2', border: `1px solid #FCA5A5`, padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Borrar</button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div><label style={{...labelStyle, color: theme.primary}}>📄 Adjuntar Nuevo Documento (PDF)</label><input type="file" accept="application/pdf" onChange={(e) => setArchivoPdf(e.target.files[0] || null)} style={{ ...inputStyle, padding: '4px', cursor: 'pointer' }} /></div>
                      <div><label style={labelStyle}>Nombre del Documento</label><input type="text" placeholder="Ej: Proforma final firmada o Evidencia" value={archivoDesc} onChange={(e) => setArchivoDesc(e.target.value)} style={inputStyle} /></div>
                      {archivoPdf && (
                        <div style={{ width: '100%', border: `1px solid ${theme.border}`, borderRadius: '6px', overflow: 'hidden', backgroundColor: '#E2E8F0', marginTop: '8px' }}><div style={{ padding: '6px 12px', backgroundColor: '#F1F5F9', borderBottom: `1px solid ${theme.border}`, fontSize: '11px', fontWeight: 'bold', color: theme.success }}>Vista Previa del Archivo a Subir</div><iframe src={URL.createObjectURL(archivoPdf)} style={{ width: '100%', height: '200px', border: 'none', display: 'block' }} title="Vista Previa" /></div>
                      )}
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 16px 0', color: theme.textMain, fontSize: '16px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '12px' }}>5. Historial de Observaciones</h4>
                    {comentariosGuardados.length > 0 && (
                      <div style={{ marginBottom: '20px', maxHeight: '200px', overflowY: 'auto', paddingRight: '5px' }}>
                        {comentariosGuardados.map(c => (
                          <div key={c.idcomentario} style={{ marginBottom: '12px', padding: '12px', backgroundColor: theme.bgApp, borderRadius: '8px', borderLeft: `3px solid ${theme.primary}` }}><div style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', marginBottom: '4px' }}>{c.usuario?.nombre || 'Sistema'} • {new Date(c.fecha).toLocaleDateString()}</div><div style={{ fontSize: '13px', color: theme.textMain, lineHeight: '1.4' }}>{c.comentario}</div></div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <textarea value={comentarioTexto} onChange={(e) => setComentarioTexto(e.target.value)} rows="3" placeholder="Redacta una nueva nota o pregunta aquí..." style={{ ...inputStyle, resize: 'none' }} />
                      <button type="button" onClick={agregarComentarioALista} style={{ padding: '10px 16px', backgroundColor: theme.bgApp, color: theme.primary, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', alignSelf: 'flex-start' }}>+ Encolar Comentario</button>
                    </div>
                    {listaComentariosNuevos.length > 0 && (
                      <div style={{ marginTop: '16px', backgroundColor: '#EFF6FF', padding: '16px', borderRadius: '8px', border: '1px dashed #93C5FD' }}><h5 style={{ margin: '0 0 12px 0', color: '#1E40AF', fontSize: '13px' }}>Borradores por guardar:</h5>{listaComentariosNuevos.map((com, index) => (<div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '10px 12px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #BFDBFE' }}><span style={{ fontSize: '13px', color: theme.textMain }}>{com}</span><button type="button" onClick={() => eliminarComentarioDeLista(index)} style={{ padding: '6px 10px', backgroundColor: theme.danger, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>Descartar</button></div>))}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '24px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '12px 24px', backgroundColor: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                    {esVisor ? 'Cerrar sin guardar' : 'Descartar Cambios'}
                  </button>
                  <button type="submit" disabled={guardando || subiendoPdf} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: (guardando || subiendoPdf) ? 'wait' : 'pointer', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                    {subiendoPdf ? '⏳ Subiendo Archivo...' : (guardando ? 'Sincronizando con base de datos...' : (esVisor ? 'Actualizar Comentarios / Docs' : (modoEdicion ? 'Actualizar Cotización' : 'Guardar Nueva Cotización')))}
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