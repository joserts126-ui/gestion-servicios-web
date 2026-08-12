import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Cotizaciones() {
  const { id } = useParams() 
  const navigate = useNavigate()
  
  // ================= UTILIDADES =================
  const getFechaHoy = () => {
    const d = new Date()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mes}-${dia}`
  }

  // ================= ESTADOS DE LA PÁGINA =================
  const [servicioActual, setServicioActual] = useState(null)
  const [listaCotizaciones, setListaCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Estados para Búsqueda y Ordenamiento
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

  // ================= ESTADOS DEL FORMULARIO =================
  const [rucProveedor, setRucProveedor] = useState('')
  const [idFormaPago, setIdFormaPago] = useState('')
  const [idMoneda, setIdMoneda] = useState('')
  
  const [fechaRecepcion, setFechaRecepcion] = useState(getFechaHoy())
  const [fechaAceptacion, setFechaAceptacion] = useState('') 
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const [detalles, setDetalles] = useState([])

  const [archivoUrl, setArchivoUrl] = useState('') 
  const [archivoDesc, setArchivoDesc] = useState('') 
  const [comentarioTexto, setComentarioTexto] = useState('')
  const [listaComentariosNuevos, setListaComentariosNuevos] = useState([])

  // ================= CARGA DE DATOS =================
  const cargarDatos = async () => {
    setCargando(true)
    
    const { data: dataSrv } = await supabase.from('servicios').select('servicio').eq('idservicio', id).single()
    if (dataSrv) setServicioActual(dataSrv.servicio)

    // AÑADIDO: Traemos también el "detallecotizacion" anidado para poder sumar el total en la tabla principal
    const { data: dataCot } = await supabase
      .from('cotizaciones')
      .select('*, proveedor(razonsocial), moneda(moneda), detallecotizacion(cantidad, preciounitario, idimpuestos)')
      .eq('idservicio', id)
      
    if (dataCot) setListaCotizaciones(dataCot)

    const [resProv, resMon, resFPago, resUni, resImp, resUsu] = await Promise.all([
      supabase.from('proveedor').select('*').eq('activo', true),
      supabase.from('moneda').select('*'),
      supabase.from('formapago').select('*').eq('activo', true),
      supabase.from('unidadmedida').select('*').eq('activo', true),
      supabase.from('impuestos').select('*'),
      supabase.from('usuario').select('*').eq('activo', true) 
    ])
    
    if (resProv.data) setCatProveedores(resProv.data)
    if (resMon.data) setCatMonedas(resMon.data)
    if (resFPago.data) setCatFormasPago(resFPago.data)
    if (resUni.data) setCatUnidades(resUni.data)
    if (resImp.data) setCatImpuestos(resImp.data)
    
    let dUni = '', dImp = ''
    if (resUni.data) {
      const u = resUni.data.find(x => x.unidadmedida === 'UND - Unidad')
      if (u) { dUni = u.idunidad; setDefUnidadId(dUni) }
    }
    if (resImp.data) {
      const i = resImp.data.find(x => x.impuesto === 'Incluido IGV')
      if (i) { dImp = i.idimpuestos; setDefImpuestoId(dImp) }
    }

    setDetalles([{ item: '', cantidad: 1, idUnidad: dUni, precioUnitario: 0, idImpuestos: dImp }])

    if (resUsu.data && resUsu.data.length > 0) {
      setIdUsuarioActual(resUsu.data[0].idusuario)
      setNombreUsuarioActual(resUsu.data[0].nombre)
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  // ================= MATEMÁTICA Y TABLA PRINCIPAL =================
  
  // Calcula el total de una cotización ya guardada (usado para la tabla de visualización)
  const calcularTotalGuardado = (detallesCotizacion) => {
    if (!detallesCotizacion || detallesCotizacion.length === 0) return 0
    let totalFinal = 0
    detallesCotizacion.forEach(fila => {
      const baseFila = fila.cantidad * fila.preciounitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idimpuestos)?.impuesto
      
      if (tipoImpuesto === 'Incluido IGV') {
        totalFinal += baseFila
      } else if (tipoImpuesto === '+ IGV') {
        totalFinal += (baseFila * 1.18)
      } else {
        totalFinal += baseFila
      }
    })
    return totalFinal
  }

  // Filtrado (Buscador)
  let cotizacionesFiltradas = listaCotizaciones.filter(cot => {
    const term = busqueda.toLowerCase()
    const prov = (cot.proveedor?.razonsocial || cot.ruc || '').toLowerCase()
    const est = (cot.estado || '').toLowerCase()
    const mon = (cot.moneda?.moneda || '').toLowerCase()
    return prov.includes(term) || est.includes(term) || mon.includes(term) || cot.idcotizacion.toString().includes(term)
  })

  // Ordenamiento interactivo
  cotizacionesFiltradas.sort((a, b) => {
    let valA = a[configOrden.clave]
    let valB = b[configOrden.clave]

    // Ajustes para campos anidados o calculados
    if (configOrden.clave === 'proveedor') {
      valA = a.proveedor?.razonsocial || a.ruc
      valB = b.proveedor?.razonsocial || b.ruc
    } else if (configOrden.clave === 'moneda') {
      valA = a.moneda?.moneda || ''
      valB = b.moneda?.moneda || ''
    } else if (configOrden.clave === 'total') {
      valA = calcularTotalGuardado(a.detallecotizacion)
      valB = calcularTotalGuardado(b.detallecotizacion)
    }

    if (valA < valB) return configOrden.direccion === 'asc' ? -1 : 1
    if (valA > valB) return configOrden.direccion === 'asc' ? 1 : -1
    return 0
  })

  const cambiarOrden = (clave) => {
    let direccion = 'asc'
    if (configOrden.clave === clave && configOrden.direccion === 'asc') direccion = 'desc'
    setConfigOrden({ clave, direccion })
  }

  const RenderSortIcon = ({ clave }) => {
    if (configOrden.clave !== clave) return <span style={{ color: '#ccc', marginLeft: '5px' }}>↕</span>
    return <span style={{ marginLeft: '5px', color: '#0d47a1' }}>{configOrden.direccion === 'asc' ? '▲' : '▼'}</span>
  }


  // ================= LÓGICA DEL DETALLE (FORMULARIO) =================
  const agregarFila = () => setDetalles([...detalles, { item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])
  const actualizarFila = (index, campo, valor) => {
    const nuevas = [...detalles]
    nuevas[index][campo] = valor
    setDetalles(nuevas)
  }
  const eliminarFila = (index) => { if(detalles.length > 1) setDetalles(detalles.filter((_, i) => i !== index)) }
  
  const calcularTotalesContables = () => {
    let subtotalNeto = 0, igvTotal = 0, totalFinal = 0
    detalles.forEach(fila => {
      const baseFila = fila.cantidad * fila.precioUnitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idImpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') {
        totalFinal += baseFila; subtotalNeto += (baseFila / 1.18); igvTotal += baseFila - (baseFila / 1.18)
      } else if (tipoImpuesto === '+ IGV') {
        subtotalNeto += baseFila; igvTotal += (baseFila * 0.18); totalFinal += (baseFila * 1.18)
      } else {
        subtotalNeto += baseFila; totalFinal += baseFila
      }
    })
    return { subtotal: subtotalNeto, igv: igvTotal, total: totalFinal }
  }
  const totales = calcularTotalesContables()

  const agregarComentarioALista = () => {
    if (comentarioTexto.trim() !== '') {
      setListaComentariosNuevos([...listaComentariosNuevos, comentarioTexto])
      setComentarioTexto('')
    }
  }
  const eliminarComentarioDeLista = (index) => setListaComentariosNuevos(listaComentariosNuevos.filter((_, i) => i !== index))

  // ================= GUARDAR TODO =================
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
      const { data: nuevaCotizacion, error: errCotizacion } = await supabase
        .from('cotizaciones')
        .insert([{
          idservicio: id, ruc: rucProveedor, idformapago: idFormaPago, idmoneda: idMoneda,
          idusuario: idUsuarioActual || null, fecharecepcion: fechaRecepcion || null,
          fechaaceptacion: fechaAceptacion || null, fechainicio: fechaInicio || null, fechafin: fechaFin || null
        }]).select()

      if (errCotizacion) throw errCotizacion
      const idNuevaCotizacion = nuevaCotizacion[0].idcotizacion

      const detallesFormateados = detalles.map(d => ({
        idcotizacion: idNuevaCotizacion, item: d.item, cantidad: d.cantidad,
        idunidad: d.idUnidad || null, preciounitario: d.precioUnitario, idimpuestos: d.idImpuestos || null
      }))
      const { error: errDetalles } = await supabase.from('detallecotizacion').insert(detallesFormateados)
      if (errDetalles) throw errDetalles

      const todosLosComentarios = [...listaComentariosNuevos]
      if (comentarioTexto.trim() !== '') todosLosComentarios.push(comentarioTexto)
      if (todosLosComentarios.length > 0) {
        const comentariosInsert = todosLosComentarios.map(texto => ({
          idcotizacion: idNuevaCotizacion, comentario: texto, idusuario: idUsuarioActual || null
        }))
        await supabase.from('comentario').insert(comentariosInsert)
      }

      if (archivoUrl.trim() !== '') {
        await supabase.from('archivocot').insert([{
          idcotizacion: idNuevaCotizacion, descripcion: archivoDesc || 'Documento',
          archivo: archivoUrl, idusuario: idUsuarioActual || null
        }])
      }

      setMostrarModal(false)
      cargarDatos()
      
      setRucProveedor(''); setIdFormaPago(''); setIdMoneda(''); 
      setFechaRecepcion(getFechaHoy()); setFechaAceptacion(''); setFechaInicio(''); setFechaFin('');
      setArchivoUrl(''); setArchivoDesc(''); setComentarioTexto(''); setListaComentariosNuevos([]);
      setDetalles([{ item: '', cantidad: 1, idUnidad: defUnidadId, precioUnitario: 0, idImpuestos: defImpuestoId }])

    } catch (error) {
      alert("Error al guardar: " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '13px' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px', color: '#444' }
  const cardStyle = { backgroundColor: '#fcfcfc', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '15px', marginBottom: '20px' }

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

      <div style={{ fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* ENCABEZADO Y BUSCADOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <button onClick={() => navigate('/servicios')} style={{ marginBottom: '15px', padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}>
              ← Volver a Servicios
            </button>
            <h2 style={{ margin: 0, color: '#333' }}>Cotizaciones del Servicio #{id}</h2>
            <p style={{ margin: '5px 0 15px 0', color: '#007BFF', fontWeight: 'bold' }}>{cargando ? 'Cargando...' : servicioActual}</p>
            
            {/* Barra de Búsqueda */}
            <input 
              type="text" 
              placeholder="🔍 Buscar por proveedor, estado, moneda..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '10px', width: '350px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}
            />
          </div>
          <button onClick={() => setMostrarModal(true)} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(40,167,69,0.3)', height: 'fit-content' }}>
            + Nueva Cotización
          </button>
        </div>

        {/* TABLA PRINCIPAL CON ORDENAMIENTO */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Cargando información...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th onClick={() => cambiarOrden('idcotizacion')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none' }}>ID <RenderSortIcon clave="idcotizacion" /></th>
                  <th onClick={() => cambiarOrden('fecharecepcion')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none' }}>Fecha Rec. <RenderSortIcon clave="fecharecepcion" /></th>
                  <th onClick={() => cambiarOrden('proveedor')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none' }}>Proveedor <RenderSortIcon clave="proveedor" /></th>
                  <th onClick={() => cambiarOrden('moneda')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none' }}>Moneda <RenderSortIcon clave="moneda" /></th>
                  <th onClick={() => cambiarOrden('total')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}>Total Final <RenderSortIcon clave="total" /></th>
                  <th onClick={() => cambiarOrden('estado')} style={{ padding: '15px', cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>Estado <RenderSortIcon clave="estado" /></th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No hay resultados.</td></tr>
                ) : (
                  cotizacionesFiltradas.map((cot) => (
                    <tr key={cot.idcotizacion} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#444' }}>#{cot.idcotizacion}</td>
                      <td style={{ padding: '15px', color: '#555' }}>{cot.fecharecepcion || '---'}</td>
                      <td style={{ padding: '15px' }}>{cot.proveedor ? cot.proveedor.razonsocial : cot.ruc}</td>
                      <td style={{ padding: '15px', color: '#666' }}>{cot.moneda ? cot.moneda.moneda : '---'}</td>
                      <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                        {calcularTotalGuardado(cot.detallecotizacion).toFixed(2)}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}><span style={{ padding: '5px 10px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{cot.estado}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* MODAL */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>Registro de Cotización</h3>
                <span style={{ fontSize: '12px', backgroundColor: '#e3f2fd', padding: '6px 12px', borderRadius: '4px', color: '#0d47a1', fontWeight: 'bold' }}>Estado: Solicitada</span>
              </div>
              
              <form onSubmit={handleGuardarTodo}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>1. Datos Generales</h4>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={labelStyle}>Proveedor *</label>
                      <select required value={rucProveedor} onChange={(e) => setRucProveedor(e.target.value)} style={inputStyle}>
                        <option value="">-- Seleccione Proveedor --</option>
                        {catProveedores.map(p => <option key={p.ruc} value={p.ruc}>{p.ruc} - {p.razonsocial}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={labelStyle}>Forma de Pago *</label>
                        <select required value={idFormaPago} onChange={(e) => setIdFormaPago(e.target.value)} style={inputStyle}>
                          <option value="">-- Seleccione --</option>
                          {catFormasPago.map(f => <option key={f.idformapago} value={f.idformapago}>{f.formapago}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Moneda *</label>
                        <select required value={idMoneda} onChange={(e) => setIdMoneda(e.target.value)} style={inputStyle}>
                          <option value="">-- Seleccione --</option>
                          {catMonedas.map(m => <option key={m.idmoneda} value={m.idmoneda}>{m.moneda}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>2. Plazos y Fechas</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <label style={labelStyle}>Fecha Recepción</label>
                        <input type="date" required value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Fecha Aceptación</label>
                        <input type="date" value={fechaAceptacion} onChange={(e) => setFechaAceptacion(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={labelStyle}>Fecha Inicio</label>
                        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Fecha Fin</label>
                        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ ...cardStyle, overflowX: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, color: '#555' }}>3. Detalle de Cotización</h4>
                    <button type="button" onClick={agregarFila} style={{ padding: '5px 12px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      + Añadir Ítem
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '10px', marginBottom: '5px', padding: '0 5px' }}>
                    <div style={labelStyle}>Ítem / Descripción *</div>
                    <div style={labelStyle}>Unidad</div>
                    <div style={labelStyle}>Impuesto</div>
                    <div style={labelStyle}>Cant. *</div>
                    <div style={labelStyle}>P. Unit. *</div>
                    <div style={{...labelStyle, textAlign: 'right'}}>Total Fila</div>
                    <div></div>
                  </div>

                  {detalles.map((fila, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1.5fr 1.5fr 1fr 1.5fr 1.5fr 40px', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                      <input type="text" required placeholder="Descripción..." value={fila.item} onChange={(e) => actualizarFila(index, 'item', e.target.value)} style={inputStyle} />
                      <select value={fila.idUnidad} onChange={(e) => actualizarFila(index, 'idUnidad', e.target.value)} style={inputStyle}>
                        {catUnidades.map(u => <option key={u.idunidad} value={u.idunidad}>{u.unidadmedida}</option>)}
                      </select>
                      <select value={fila.idImpuestos} onChange={(e) => actualizarFila(index, 'idImpuestos', e.target.value)} style={inputStyle}>
                        {catImpuestos.map(i => <option key={i.idimpuestos} value={i.idimpuestos}>{i.impuesto}</option>)}
                      </select>
                      <input type="number" required min="1" step="1" value={fila.cantidad} onChange={(e) => actualizarFila(index, 'cantidad', parseFloat(e.target.value) || 0)} style={inputStyle} />
                      <input type="number" required min="0.01" step="0.01" value={fila.precioUnitario} onChange={(e) => actualizarFila(index, 'precioUnitario', parseFloat(e.target.value) || 0)} style={inputStyle} />
                      
                      <div style={{ padding: '8px', backgroundColor: '#e9ecef', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: '#444' }}>
                        {(fila.cantidad * fila.precioUnitario).toFixed(2)}
                      </div>
                      
                      <button type="button" onClick={() => eliminarFila(index)} disabled={detalles.length === 1} style={{ padding: '8px', backgroundColor: detalles.length > 1 ? '#dc3545' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: detalles.length > 1 ? 'pointer' : 'not-allowed' }}>X</button>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #ddd' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '10px', textAlign: 'right', fontSize: '14px', color: '#555', marginBottom: '5px' }}>
                      <div>Subtotal:</div>
                      <div>S/ {totales.subtotal.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '10px', textAlign: 'right', fontSize: '14px', color: '#555', marginBottom: '10px' }}>
                      <div>IGV (18%):</div>
                      <div>S/ {totales.igv.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 150px', gap: '10px', textAlign: 'right', fontSize: '18px', fontWeight: 'bold', color: '#28a745', backgroundColor: '#e8f5e9', padding: '10px', borderRadius: '4px' }}>
                      <div>Total Final:</div>
                      <div>S/ {totales.total.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>4. Archivo Adjunto (Opcional)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                    <div>
                      <label style={labelStyle}>URL / Link del Documento (Drive, Dropbox, etc.)</label>
                      <input type="url" placeholder="Ej: https://drive.google.com/..." value={archivoUrl} onChange={(e) => setArchivoUrl(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Descripción del Archivo</label>
                      <input type="text" placeholder="Ej: Proforma en PDF" value={archivoDesc} onChange={(e) => setArchivoDesc(e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>

                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>5. Comentarios Adicionales</h4>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <textarea value={comentarioTexto} onChange={(e) => setComentarioTexto(e.target.value)} rows="2" placeholder="Escribe una observación aquí..." style={{ ...inputStyle, flex: 1, resize: 'vertical' }} />
                    <button type="button" onClick={agregarComentarioALista} style={{ padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      + Añadir Comentario
                    </button>
                  </div>

                  {listaComentariosNuevos.length > 0 && (
                    <div style={{ backgroundColor: '#f4f6f8', padding: '10px', borderRadius: '4px', border: '1px dashed #ccc' }}>
                      <h5 style={{ margin: '0 0 10px 0', color: '#666' }}>Comentarios por guardar:</h5>
                      {listaComentariosNuevos.map((com, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: '1px solid #eee' }}>
                          <span style={{ fontSize: '13px', color: '#333' }}>- {com}</span>
                          <button type="button" onClick={() => eliminarComentarioDeLista(index)} style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Eliminar</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '10px 25px', backgroundColor: '#f8f9fa', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardando} style={{ padding: '10px 25px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: guardando ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                    {guardando ? 'Guardando...' : 'Guardar Cotización'}
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