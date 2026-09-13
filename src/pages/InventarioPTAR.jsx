import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'

function InventarioPTAR() {
  const navigate = useNavigate()
  
  const [materiales, setMateriales] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [proyectosActivos, setProyectosActivos] = useState([]) 
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  
  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [rolUsuarioActual, setRolUsuarioActual] = useState('ADMIN')
  const esVisor = rolUsuarioActual === 'VISOR'

  const [mostrarModalMaterial, setMostrarModalMaterial] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idMaterialEditar, setIdMaterialEditar] = useState(null)
  const [formMaterial, setFormMaterial] = useState({
    codigo: '', descripcion: '', categoria: '', unidad_medida: '', stock_minimo: 0,
    presentacion_compra: '', factor_conversion: 1, url_msds: ''
  })

  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false)
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false)
  const [busquedaMaterial, setBusquedaMaterial] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [formMovimiento, setFormMovimiento] = useState({
    tipo: 'ENTRADA', idmaterial: '', cantidad: '', responsable: '', 
    referencia: '', lote: '', fecha_caducidad: '',
    idalmacen_origen: '', idalmacen_destino: '', equipo_destino: '', idservicio: '', fecha_historica: ''
  })

  const [mostrarModalKardex, setMostrarModalKardex] = useState(false)
  const [cargandoKardex, setCargandoKardex] = useState(false)
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null)
  const [historialBruto, setHistorialBruto] = useState([])
  
  // NUEVO: Estado para el filtro de Almacén en el Kárdex
  const [kardexAlmacenFiltro, setKardexAlmacenFiltro] = useState('TODOS')
  
  const fechaHoy = new Date()
  const primerDiaMes = new Date(fechaHoy.getFullYear(), fechaHoy.getMonth(), 1).toISOString().split('T')[0]
  const diaActualStr = fechaHoy.toISOString().split('T')[0]
  
  const [fechaInicioKardex, setFechaInicioKardex] = useState(primerDiaMes)
  const [fechaFinKardex, setFechaFinKardex] = useState(diaActualStr)

  const cargarDatosPrincipales = async () => {
    setCargando(true)
    const usuarioGuardado = localStorage.getItem('usuarioApp')
    if (usuarioGuardado) {
      const userObj = JSON.parse(usuarioGuardado)
      setIdUsuarioActual(userObj.idusuario)
      setRolUsuarioActual(userObj.rol || 'ADMIN')
    } else {
      navigate('/')
      return
    }

    const [resMat, resAlm, resSrv] = await Promise.all([
      supabase.from('ptar_materiales').select('*').order('descripcion', { ascending: true }),
      supabase.from('ptar_almacenes').select('*').eq('activo', true),
      supabase.from('servicios').select('idservicio, servicio').not('estado', 'in', '("CANCELADO","REQUERIMIENTO CANCELADO")').order('idservicio', { ascending: false })
    ])

    if (resMat.data) setMateriales(resMat.data)
    if (resAlm.data) setAlmacenes(resAlm.data)
    if (resSrv.data) setProyectosActivos(resSrv.data)
    setCargando(false)
  }

  useEffect(() => { cargarDatosPrincipales() }, [])

  const renderStockAvanzado = (mat) => {
    const stock = parseFloat(mat.stock_actual) || 0
    const factor = parseFloat(mat.factor_conversion) || 1
    const pres = mat.presentacion_compra
    const um = mat.unidad_medida

    if (!pres || factor <= 1) return <span style={{fontSize:'16px', fontWeight:'800'}}>{stock} {um}</span>

    const enteros = Math.floor(stock / factor)
    const resto = stock % factor
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '15px', fontWeight: '800', color: theme.primary }}>{stock.toFixed(2)} {um}</span>
        <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '600', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
          {enteros > 0 ? `${enteros} ${pres}s` : ''} {enteros > 0 && resto > 0 ? '+' : ''} {resto > 0 ? `${resto.toFixed(1)} ${um}` : ''}
          {enteros === 0 && resto === 0 ? '0' : ''}
        </span>
      </div>
    )
  }

  const abrirModalNuevoMaterial = async () => {
    setModoEdicion(false); setIdMaterialEditar(null)
    const { data } = await supabase.from('ptar_materiales').select('codigo').order('idmaterial', { ascending: false }).limit(1)
    let sigNum = 1
    if (data?.length > 0 && data[0].codigo) {
      const numPrev = data[0].codigo.replace(/\D/g, '')
      if (numPrev) sigNum = parseInt(numPrev, 10) + 1
    }
    setFormMaterial({ codigo: `MAT-${String(sigNum).padStart(4, '0')}`, descripcion: '', categoria: '', unidad_medida: '', stock_minimo: 0, presentacion_compra: '', factor_conversion: 1, url_msds: '' })
    setMostrarModalMaterial(true)
  }

  const abrirModalEditarMaterial = (mat) => {
    setModoEdicion(true); setIdMaterialEditar(mat.idmaterial)
    setFormMaterial({
      codigo: mat.codigo || '', descripcion: mat.descripcion || '', categoria: mat.categoria || '',
      unidad_medida: mat.unidad_medida || '', stock_minimo: mat.stock_minimo || 0,
      presentacion_compra: mat.presentacion_compra || '', factor_conversion: mat.factor_conversion || 1, url_msds: mat.url_msds || ''
    })
    setMostrarModalMaterial(true)
  }

  const handleGuardarMaterial = async (e) => {
    e.preventDefault()
    setGuardando(true)
    let errorQuery = null
    if (modoEdicion) {
      const { error } = await supabase.from('ptar_materiales').update(formMaterial).eq('idmaterial', idMaterialEditar)
      errorQuery = error
    } else {
      const { error } = await supabase.from('ptar_materiales').insert([formMaterial])
      errorQuery = error
    }
    setGuardando(false)
    if (errorQuery) alert('Error al guardar: ' + errorQuery.message)
    else { setMostrarModalMaterial(false); cargarDatosPrincipales() }
  }

  const obtenerFechaLocalISO = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  }

  const abrirModalMovimiento = () => {
    setFormMovimiento({ tipo: 'ENTRADA', idmaterial: '', cantidad: '', responsable: '', referencia: '', lote: '', fecha_caducidad: '', idalmacen_origen: '', idalmacen_destino: '', equipo_destino: '', idservicio: '', fecha_historica: obtenerFechaLocalISO() })
    setBusquedaMaterial('')
    setMostrarSugerencias(false)
    setMostrarModalMovimiento(true)
  }

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault()
    if (!formMovimiento.idmaterial) return alert('Debes seleccionar un material válido.')
    if (formMovimiento.cantidad <= 0) return alert('La cantidad debe ser mayor a 0.')
    
    if (formMovimiento.tipo === 'ENTRADA' && !formMovimiento.idalmacen_destino) return alert('Selecciona el almacén de destino.')
    if (formMovimiento.tipo === 'SALIDA' && !formMovimiento.idalmacen_origen) return alert('Selecciona el almacén de origen.')
    if (formMovimiento.tipo === 'TRASLADO' && (!formMovimiento.idalmacen_origen || !formMovimiento.idalmacen_destino)) return alert('Selecciona el almacén de origen y destino.')

    setGuardandoMovimiento(true)

    const payload = {
      idmaterial: formMovimiento.idmaterial,
      tipo: formMovimiento.tipo,
      cantidad: parseFloat(formMovimiento.cantidad),
      responsable: formMovimiento.responsable || null,
      referencia: formMovimiento.referencia || null,
      lote: formMovimiento.lote || null,
      fecha_caducidad: formMovimiento.fecha_caducidad || null,
      idalmacen_origen: formMovimiento.idalmacen_origen || null,
      idalmacen_destino: formMovimiento.idalmacen_destino || null,
      equipo_destino: formMovimiento.equipo_destino || null,
      idservicio: formMovimiento.idservicio || null,
      idusuario: idUsuarioActual || null
    }

    if (rolUsuarioActual === 'ADMIN' && formMovimiento.fecha_historica) {
      payload.fecha_hora = new Date(formMovimiento.fecha_historica).toISOString()
    }

    const { error } = await supabase.from('ptar_movimientos').insert([payload])
    setGuardandoMovimiento(false)

    if (error) alert('Error al registrar: ' + error.message)
    else { setMostrarModalMovimiento(false); cargarDatosPrincipales() }
  }

  const cargarKardex = async (mat) => {
    if (mat) setMaterialSeleccionado(mat)
    const currentMat = mat || materialSeleccionado
    if (!currentMat) return

    setMostrarModalKardex(true)
    setCargandoKardex(true)
    setKardexAlmacenFiltro('TODOS') // Reseteamos el filtro al abrir un material nuevo

    const { data, error } = await supabase
      .from('ptar_movimientos')
      .select('*, origen:ptar_almacenes!idalmacen_origen(nombre), destino:ptar_almacenes!idalmacen_destino(nombre), servicios(servicio)')
      .eq('idmaterial', currentMat.idmaterial)
      .order('fecha_hora', { ascending: true }) 

    if (error) console.error("Error historial:", error)
    else setHistorialBruto(data || [])
    setCargandoKardex(false)
  }

  // LÓGICA MEJORADA: Cálculo de Kardex inteligente según el filtro de Almacén
  const generarFilasKardex = () => {
    if (!fechaInicioKardex || !fechaFinKardex) return []
    
    const fInicio = new Date(`${fechaInicioKardex}T00:00:00`)
    const fFin = new Date(`${fechaFinKardex}T23:59:59`)
    
    let saldoAcumulado = 0
    const filasParaMostrar = []

    historialBruto.forEach(mov => {
      const fechaMov = new Date(mov.fecha_hora)
      let ingreso = 0, salida = 0
      let involucrado = false

      if (kardexAlmacenFiltro === 'TODOS') {
        involucrado = true
        // Vista global: Entradas suman, Salidas restan, Traslados se ignoran matemáticamente
        if (mov.tipo === 'ENTRADA' || (mov.tipo === 'AJUSTE' && mov.cantidad > 0)) ingreso = parseFloat(mov.cantidad)
        else if (mov.tipo === 'SALIDA' || (mov.tipo === 'AJUSTE' && mov.cantidad < 0)) salida = Math.abs(parseFloat(mov.cantidad))
      } else {
        const idFiltro = parseInt(kardexAlmacenFiltro)
        // Vista por Almacén: Evaluamos si el almacén seleccionado es el origen o el destino
        if (mov.tipo === 'ENTRADA' && mov.idalmacen_destino === idFiltro) {
          involucrado = true; ingreso = parseFloat(mov.cantidad);
        } else if (mov.tipo === 'SALIDA' && mov.idalmacen_origen === idFiltro) {
          involucrado = true; salida = parseFloat(mov.cantidad);
        } else if (mov.tipo === 'AJUSTE' && mov.idalmacen_destino === idFiltro) {
          involucrado = true; 
          if (mov.cantidad > 0) ingreso = parseFloat(mov.cantidad);
          else salida = Math.abs(parseFloat(mov.cantidad));
        } else if (mov.tipo === 'TRASLADO') {
          if (mov.idalmacen_destino === idFiltro) {
            involucrado = true; ingreso = parseFloat(mov.cantidad);
          } else if (mov.idalmacen_origen === idFiltro) {
            involucrado = true; salida = parseFloat(mov.cantidad);
          }
        }
      }

      // Si el movimiento afecta la vista actual (Global o Almacén específico), lo calculamos
      if (involucrado) {
        if (fechaMov < fInicio) {
          saldoAcumulado = saldoAcumulado + ingreso - salida
        } 
        else if (fechaMov >= fInicio && fechaMov <= fFin) {
          const cargaInicialFila = saldoAcumulado
          saldoAcumulado = saldoAcumulado + ingreso - salida
          
          filasParaMostrar.push({
            ...mov,
            cargaInicialFila,
            ingreso,
            salida,
            saldoFinalFila: saldoAcumulado
          })
        }
      }
    })

    return filasParaMostrar.reverse() 
  }

  const filasKardexVisibles = generarFilasKardex()
  const cargaInicialPeriodo = historialBruto.length > 0 && filasKardexVisibles.length > 0 ? filasKardexVisibles[filasKardexVisibles.length - 1].cargaInicialFila : 0

  const materialesFiltrados = materiales.filter(m => `${m.codigo} ${m.descripcion} ${m.categoria}`.toLowerCase().includes(busqueda.toLowerCase()))
  
  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', danger: '#DC2626' }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: theme.textMain }
  const thStyle = { padding: '12px', fontSize: '11px', textTransform: 'uppercase', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '12px', fontSize: '13px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar />
      <div style={{ maxWidth: '1500px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            {!esVisor && <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '12px', padding: '6px 12px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, fontSize: '13px' }}>← Volver al Dashboard</button>}
            <h2 style={{ margin: '0 0 8px 0', color: theme.textMain, fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>📦 Centro Logístico PTAR</h2>
            <input type="text" placeholder="🔍 Buscar por código, descripción o categoría..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '10px 16px', width: '400px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {rolUsuarioActual === 'ADMIN' && (
              <button onClick={abrirModalNuevoMaterial} style={{ padding: '12px 20px', backgroundColor: 'white', color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Crear Catálogo</button>
            )}
            <button onClick={abrirModalMovimiento} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>⇄ Registrar Movimiento</button>
          </div>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Sincronizando inventario con almacenes...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Descripción del Material</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Alarma Mín.</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Stock Total Planta</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materialesFiltrados.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>Catálogo vacío.</td></tr>
                ) : (
                  materialesFiltrados.map((mat) => (
                    <tr key={mat.idmaterial} style={{ transition: 'background 0.2s', ':hover': { backgroundColor: '#F8FAFC' } }}>
                      <td style={{ ...tdStyle, fontWeight: '700', color: theme.primary }}>{mat.codigo}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '700' }}>{mat.descripcion}</div>
                        {mat.url_msds && <a href={mat.url_msds} target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: theme.success, textDecoration: 'none', fontWeight: 'bold' }}>📄 Ver Hoja de Seguridad</a>}
                      </td>
                      <td style={{ ...tdStyle, color: theme.textMuted }}>{mat.categoria || '---'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: theme.danger, fontWeight: '600' }}>{mat.stock_minimo} {mat.unidad_medida}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: mat.stock_actual <= mat.stock_minimo ? '#FEF2F2' : 'transparent' }}>
                        {renderStockAvanzado(mat)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button onClick={() => cargarKardex(mat)} title="Kárdex" style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: theme.primary, fontWeight: '700', fontSize: '12px' }}>📋 Kárdex</button>
                          {rolUsuarioActual === 'ADMIN' && (
                            <button onClick={() => abrirModalEditarMaterial(mat)} title="Editar" style={{ background: 'white', border: `1px solid ${theme.border}`, padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>✏️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {mostrarModalMovimiento && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '650px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontWeight: '800' }}>Transacción de Inventario</h3>
                <button onClick={() => setMostrarModalMovimiento(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: theme.textMuted }}>×</button>
              </div>
              
              <form onSubmit={handleGuardarMovimiento} style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {['ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE'].map(t => (
                    <button key={t} type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: t})} style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '12px', border: formMovimiento.tipo === t ? `2px solid ${t==='SALIDA'?theme.danger:t==='ENTRADA'?theme.success:theme.primary}` : `1px solid ${theme.border}`, backgroundColor: formMovimiento.tipo === t ? (t==='SALIDA'?'#FEF2F2':t==='ENTRADA'?'#F0FDF4':'#EFF6FF') : 'white', color: formMovimiento.tipo === t ? (t==='SALIDA'?theme.danger:t==='ENTRADA'?theme.success:theme.primary) : theme.textMuted }}>
                      {t}
                    </button>
                  ))}
                </div>

                {rolUsuarioActual === 'ADMIN' && (
                  <div style={{ marginBottom: '16px', backgroundColor: '#FFFBEB', padding: '12px', border: '1px dashed #F59E0B', borderRadius: '8px' }}>
                    <label style={{...labelStyle, color: '#B45309'}}>⚠️ (Solo Admin) Fecha y Hora del Movimiento Histórico</label>
                    <input type="datetime-local" value={formMovimiento.fecha_historica} onChange={(e) => setFormMovimiento({...formMovimiento, fecha_historica: e.target.value})} style={{...inputStyle, borderColor: '#FDE68A', backgroundColor: 'white'}} />
                  </div>
                )}

                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <label style={labelStyle}>Material / Insumo *</label>
                  <input type="text" required={!formMovimiento.idmaterial} value={busquedaMaterial} onChange={(e) => { setBusquedaMaterial(e.target.value); setMostrarSugerencias(true); if (formMovimiento.idmaterial) setFormMovimiento({...formMovimiento, idmaterial: ''}); }} onFocus={() => setMostrarSugerencias(true)} onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} placeholder="🔍 Escribe para buscar código o nombre..." style={{...inputStyle, borderColor: formMovimiento.idmaterial ? theme.success : theme.border, backgroundColor: formMovimiento.idmaterial ? '#F0FDF4' : 'white' }} />
                  {mostrarSugerencias && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                      {materiales.filter(m => `${m.codigo} ${m.descripcion}`.toLowerCase().includes(busquedaMaterial.toLowerCase())).map(m => (
                        <div key={m.idmaterial} onMouseDown={(e) => { e.preventDefault(); setFormMovimiento({...formMovimiento, idmaterial: m.idmaterial}); setBusquedaMaterial(`[${m.codigo}] ${m.descripcion}`); setMostrarSugerencias(false); }} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}><span style={{color:theme.primary}}>{m.codigo}</span> {m.descripcion}</span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.textMuted }}>Total: {m.stock_actual} {m.unidad_medida}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {['SALIDA', 'TRASLADO'].includes(formMovimiento.tipo) && (
                    <div>
                      <label style={labelStyle}>Almacén Origen (Sale de) *</label>
                      <select required value={formMovimiento.idalmacen_origen} onChange={(e) => setFormMovimiento({...formMovimiento, idalmacen_origen: e.target.value})} style={inputStyle}>
                        <option value="">Seleccionar Almacén...</option>
                        {almacenes.map(a => <option key={a.idalmacen} value={a.idalmacen}>{a.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  {['ENTRADA', 'TRASLADO', 'AJUSTE'].includes(formMovimiento.tipo) && (
                    <div>
                      <label style={labelStyle}>Almacén Destino (Entra a) *</label>
                      <select required value={formMovimiento.idalmacen_destino} onChange={(e) => setFormMovimiento({...formMovimiento, idalmacen_destino: e.target.value})} style={inputStyle}>
                        <option value="">Seleccionar Almacén...</option>
                        {almacenes.map(a => <option key={a.idalmacen} value={a.idalmacen}>{a.nombre}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {formMovimiento.tipo === 'SALIDA' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                    <div>
                      <label style={labelStyle}>Equipo/Máquina Destino</label>
                      <input type="text" placeholder="Ej: Bomba Lodos 01" value={formMovimiento.equipo_destino} onChange={(e) => setFormMovimiento({...formMovimiento, equipo_destino: e.target.value})} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Asociar a Proyecto / Servicio</label>
                      <select value={formMovimiento.idservicio} onChange={(e) => setFormMovimiento({...formMovimiento, idservicio: e.target.value})} style={inputStyle}>
                        <option value="">-- Consumo General --</option>
                        {proyectosActivos.map(p => <option key={p.idservicio} value={p.idservicio}>#{p.idservicio} - {p.servicio.substring(0,30)}...</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Cantidad (U. Base) *</label><input type="number" required min="0.01" step="any" value={formMovimiento.cantidad} onChange={(e) => setFormMovimiento({...formMovimiento, cantidad: e.target.value})} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Referencia / Motivo</label><input type="text" placeholder="Ej: OC-004 o Mantenimiento" value={formMovimiento.referencia} onChange={(e) => setFormMovimiento({...formMovimiento, referencia: e.target.value})} style={inputStyle} /></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${theme.border}`, paddingTop: '20px' }}>
                  <button type="button" onClick={() => setMostrarModalMovimiento(false)} style={{ padding: '10px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Cancelar</button>
                  <button type="submit" disabled={guardandoMovimiento} style={{ padding: '10px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: guardandoMovimiento ? 'wait' : 'pointer', fontWeight: '800' }}>{guardandoMovimiento ? 'Procesando...' : `Confirmar ${formMovimiento.tipo}`}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL KÁRDEX CONTABLE/LOGÍSTICO */}
        {mostrarModalKardex && materialSeleccionado && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              
              <div style={{ backgroundColor: theme.bgCard, padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: theme.primary, fontSize: '20px', fontWeight: '800' }}>Kárdex Analítico de Material</h3>
                  <p style={{ margin: 0, color: theme.textMain, fontSize: '14px', fontWeight: '600' }}>[{materialSeleccionado.codigo}] {materialSeleccionado.descripcion}</p>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#F1F5F9', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  
                  {/* NUEVO: SELECTOR DE ALMACÉN */}
                  <span style={{ fontSize: '12px', fontWeight: '700', color: theme.textMuted }}>VISTA:</span>
                  <select value={kardexAlmacenFiltro} onChange={(e) => setKardexAlmacenFiltro(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none', fontWeight: '600', color: theme.primary }}>
                    <option value="TODOS">Todos los almacenes (Global)</option>
                    {almacenes.map(a => <option key={a.idalmacen} value={a.idalmacen}>{a.nombre}</option>)}
                  </select>

                  <div style={{ height: '24px', width: '1px', backgroundColor: theme.border, margin: '0 8px' }}></div>

                  <span style={{ fontSize: '12px', fontWeight: '700', color: theme.textMuted }}>DEL:</span>
                  <input type="date" value={fechaInicioKardex} onChange={(e) => setFechaInicioKardex(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }} />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: theme.textMuted }}>AL:</span>
                  <input type="date" value={fechaFinKardex} onChange={(e) => setFechaFinKardex(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }} />
                  
                </div>

                <button onClick={() => setMostrarModalKardex(false)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: theme.textMuted }}>×</button>
              </div>
              
              <div style={{ padding: '0', overflowY: 'auto', flex: 1, backgroundColor: 'white' }}>
                {cargandoKardex ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted, fontWeight: '700' }}>Calculando saldos contables...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ backgroundColor: '#F8FAFC' }}>
                        <th style={{...thStyle, width: '130px'}}>Fecha de Mov.</th>
                        <th style={thStyle}>Documento / Concepto</th>
                        <th style={thStyle}>Operación</th>
                        <th style={{...thStyle, textAlign: 'right', backgroundColor: '#F1F5F9'}}>Carga Inicial</th>
                        <th style={{...thStyle, textAlign: 'right', backgroundColor: '#F0FDF4', color: theme.success}}>Ingresos (+)</th>
                        <th style={{...thStyle, textAlign: 'right', backgroundColor: '#FEF2F2', color: theme.danger}}>Salidas (-)</th>
                        <th style={{...thStyle, textAlign: 'right', backgroundColor: '#EFF6FF', color: theme.primary}}>Stock Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }}>
                        <td colSpan="3" style={{ padding: '10px 16px', fontSize: '12px', fontWeight: '700', color: theme.textMuted, textAlign: 'right' }}>SALDO ACUMULADO AL {fechaInicioKardex}:</td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '800', textAlign: 'right' }}>---</td>
                        <td colSpan="2"></td>
                        <td style={{ padding: '10px 16px', fontSize: '15px', fontWeight: '800', color: theme.primary, textAlign: 'right' }}>{cargaInicialPeriodo.toFixed(2)}</td>
                      </tr>

                      {filasKardexVisibles.length === 0 ? (
                        <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No hay movimientos en esta vista.</td></tr>
                      ) : (
                        filasKardexVisibles.map(mov => (
                          <tr key={mov.idmovimiento} style={{ borderBottom: `1px solid ${theme.border}`, transition: '0.2s', ':hover': {backgroundColor: '#F8FAFC'} }}>
                            <td style={{ ...tdStyle, fontSize: '12px', fontWeight: '600' }}>{new Date(mov.fecha_hora).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                            <td style={tdStyle}>
                              <div style={{ fontWeight: '700', fontSize: '12px' }}>{mov.referencia || 'Sin Doc.'}</div>
                              {mov.tipo === 'SALIDA' && mov.equipo_destino && <div style={{ fontSize: '10px', color: theme.primary }}>Destino: {mov.equipo_destino}</div>}
                              {mov.tipo === 'SALIDA' && mov.servicios?.servicio && <div style={{ fontSize: '10px', color: theme.success }}>Proyecto: {mov.servicios.servicio.substring(0,35)}...</div>}
                              {mov.tipo === 'TRASLADO' && <div style={{ fontSize: '10px', color: '#8B5CF6' }}>De {mov.origen?.nombre || 'Origen'} a {mov.destino?.nombre || 'Destino'}</div>}
                            </td>
                            <td style={tdStyle}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', backgroundColor: mov.tipo === 'ENTRADA' ? '#DCFCE7' : (mov.tipo === 'SALIDA' ? '#FEE2E2' : (mov.tipo === 'TRASLADO' ? '#F3E8FF' : '#F1F5F9')), color: mov.tipo === 'ENTRADA' ? '#166534' : (mov.tipo === 'SALIDA' ? '#991B1B' : (mov.tipo === 'TRASLADO' ? '#6B21A8' : '#475569')) }}>{mov.tipo}</span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: theme.textMuted, backgroundColor: '#F8FAFC' }}>{mov.cargaInicialFila.toFixed(2)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: mov.ingreso > 0 ? theme.success : 'transparent', backgroundColor: '#F0FDF4' }}>{mov.ingreso > 0 ? mov.ingreso.toFixed(2) : ''}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: mov.salida > 0 ? theme.danger : 'transparent', backgroundColor: '#FEF2F2' }}>{mov.salida > 0 ? mov.salida.toFixed(2) : ''}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: theme.textMain, backgroundColor: '#EFF6FF' }}>{mov.saldoFinalFila.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL MATERIAL */}
        {mostrarModalMaterial && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '550px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, color: theme.textMain }}>{modoEdicion ? 'Editar Ficha Técnica' : 'Nuevo Material'}</h3>
                <button onClick={() => setMostrarModalMaterial(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleGuardarMaterial} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Código</label><input type="text" disabled value={formMaterial.codigo} style={{...inputStyle, backgroundColor:'#F1F5F9', fontWeight:'bold'}} /></div>
                  <div><label style={labelStyle}>Categoría</label><input list="lista-cat" value={formMaterial.categoria} onChange={(e) => setFormMaterial({...formMaterial, categoria: e.target.value})} style={inputStyle} /><datalist id="lista-cat"><option value="Químicos" /><option value="Repuestos Mecánicos" /><option value="Consumibles" /><option value="EPP" /></datalist></div>
                </div>
                <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Descripción del Insumo / Repuesto *</label><input type="text" required value={formMaterial.descripcion} onChange={(e) => setFormMaterial({...formMaterial, descripcion: e.target.value})} style={inputStyle} /></div>
                
                <h5 style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px', color: theme.primary, marginBottom: '12px', marginTop: '20px' }}>Parámetros Logísticos</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div><label style={labelStyle}>Unidad de Medida (U. Base)</label><input list="lista-um" required value={formMaterial.unidad_medida} onChange={(e) => setFormMaterial({...formMaterial, unidad_medida: e.target.value})} style={inputStyle} placeholder="Ej: Kg, Lt, Gal..." /><datalist id="lista-um"><option value="Kg"/><option value="Lt"/><option value="Gal"/><option value="Und"/></datalist></div>
                  <div><label style={labelStyle}>Stock Mínimo (Alarma)</label><input type="number" value={formMaterial.stock_minimo} onChange={(e) => setFormMaterial({...formMaterial, stock_minimo: parseFloat(e.target.value) || 0})} style={inputStyle} /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                  <div><label style={labelStyle}>Pres. Compra (Opcional)</label><input list="lista-pres" value={formMaterial.presentacion_compra} onChange={(e) => setFormMaterial({...formMaterial, presentacion_compra: e.target.value})} style={inputStyle} placeholder="Ej: Bidón, Saco..." /><datalist id="lista-pres"><option value="Bidón"/><option value="Saco"/><option value="Caja"/><option value="Cilindro"/></datalist></div>
                  <div><label style={labelStyle}>Factor (¿Cuánta U.Base trae?)</label><input type="number" min="1" step="any" value={formMaterial.factor_conversion} onChange={(e) => setFormMaterial({...formMaterial, factor_conversion: parseFloat(e.target.value) || 1})} style={inputStyle} /></div>
                </div>

                <div style={{ marginBottom: '24px' }}><label style={{...labelStyle, color: theme.success}}>Enlace a MSDS / Ficha (Opcional)</label><input type="url" placeholder="https://..." value={formMaterial.url_msds} onChange={(e) => setFormMaterial({...formMaterial, url_msds: e.target.value})} style={inputStyle} /></div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setMostrarModalMaterial(false)} style={{ padding: '10px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '10px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', fontWeight: '800', cursor: guardando ? 'wait' : 'pointer' }}>{guardando ? 'Guardando...' : 'Guardar Ficha'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default InventarioPTAR