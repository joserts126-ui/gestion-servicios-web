import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'

function InventarioPTAR() {
  const navigate = useNavigate()
  
  const [materiales, setMateriales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  
  const [idUsuarioActual, setIdUsuarioActual] = useState('')
  const [rolUsuarioActual, setRolUsuarioActual] = useState('ADMIN')
  const esVisor = rolUsuarioActual === 'VISOR'

  // Estados para el Modal de Material (Catálogo)
  const [mostrarModalMaterial, setMostrarModalMaterial] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [idMaterialEditar, setIdMaterialEditar] = useState(null)
  const [formMaterial, setFormMaterial] = useState({
    codigo: '', descripcion: '', categoria: '', unidad_medida: '', stock_minimo: 0
  })

  // Estados para el Modal de Movimientos (Ingresos/Salidas)
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false)
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false)
  const [formMovimiento, setFormMovimiento] = useState({
    tipo: 'ENTRADA', idmaterial: '', cantidad: '', responsable: '', 
    referencia: '', lote: '', fecha_caducidad: ''
  })
  
  // NUEVO: Estados para el buscador inteligente de materiales en Movimientos
  const [busquedaMaterial, setBusquedaMaterial] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  // Estados para el Kárdex (Historial)
  const [mostrarModalKardex, setMostrarModalKardex] = useState(false)
  const [cargandoKardex, setCargandoKardex] = useState(false)
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null)
  const [historialMovimientos, setHistorialMovimientos] = useState([])

  const cargarMateriales = async () => {
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

    const { data, error } = await supabase
      .from('ptar_materiales')
      .select('*')
      .order('descripcion', { ascending: true })

    if (error) console.error("Error cargando materiales:", error)
    else setMateriales(data || [])
    
    setCargando(false)
  }

  useEffect(() => { cargarMateriales() }, [])

  // ABRIR MODAL: NUEVO MATERIAL
  const abrirModalNuevoMaterial = async () => {
    setModoEdicion(false)
    setIdMaterialEditar(null)
    
    const { data } = await supabase.from('ptar_materiales').select('codigo').order('idmaterial', { ascending: false }).limit(1)

    let siguienteNumero = 1
    if (data && data.length > 0 && data[0].codigo) {
      const numeroPrevio = data[0].codigo.replace(/\D/g, '')
      if (numeroPrevio) siguienteNumero = parseInt(numeroPrevio, 10) + 1
    }
    
    const nuevoCodigo = `MAT-${String(siguienteNumero).padStart(4, '0')}`
    setFormMaterial({ codigo: nuevoCodigo, descripcion: '', categoria: '', unidad_medida: '', stock_minimo: 0 })
    setMostrarModalMaterial(true)
  }

  // ABRIR MODAL: EDITAR MATERIAL
  const abrirModalEditarMaterial = (mat) => {
    setModoEdicion(true)
    setIdMaterialEditar(mat.idmaterial)
    setFormMaterial({
      codigo: mat.codigo || '', descripcion: mat.descripcion || '', categoria: mat.categoria || '',
      unidad_medida: mat.unidad_medida || '', stock_minimo: mat.stock_minimo || 0
    })
    setMostrarModalMaterial(true)
  }

  // NUEVO: Función controlada para abrir modal de Movimiento limpiando el buscador
  const abrirModalMovimiento = () => {
    setFormMovimiento({ tipo: 'ENTRADA', idmaterial: '', cantidad: '', responsable: '', referencia: '', lote: '', fecha_caducidad: '' })
    setBusquedaMaterial('')
    setMostrarSugerencias(false)
    setMostrarModalMovimiento(true)
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
    
    if (errorQuery) {
      alert('Error al guardar el material: ' + errorQuery.message)
    } else {
      setMostrarModalMaterial(false)
      cargarMateriales() 
    }
  }

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault()
    if (!formMovimiento.idmaterial) {
      alert('Debes seleccionar un material válido de la lista desplegable.')
      return
    }
    if (formMovimiento.cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0.')
      return
    }

    setGuardandoMovimiento(true)

    const payload = {
      idmaterial: formMovimiento.idmaterial,
      tipo: formMovimiento.tipo,
      cantidad: parseFloat(formMovimiento.cantidad),
      responsable: formMovimiento.responsable || null,
      referencia: formMovimiento.referencia || null,
      lote: formMovimiento.lote || null,
      fecha_caducidad: formMovimiento.fecha_caducidad || null,
      idusuario: idUsuarioActual || null
    }

    const { error } = await supabase.from('ptar_movimientos').insert([payload])

    setGuardandoMovimiento(false)

    if (error) {
      alert('Error al registrar movimiento: ' + error.message)
    } else {
      setMostrarModalMovimiento(false)
      cargarMateriales() 
    }
  }

  const abrirKardex = async (mat) => {
    setMaterialSeleccionado(mat)
    setMostrarModalKardex(true)
    setCargandoKardex(true)

    const { data, error } = await supabase
      .from('ptar_movimientos')
      .select('*')
      .eq('idmaterial', mat.idmaterial)
      .order('fecha_hora', { ascending: false })

    if (error) console.error("Error al cargar historial:", error)
    else setHistorialMovimientos(data || [])
    
    setCargandoKardex(false)
  }

  const obtenerEstadoStock = (actual, minimo) => {
    if (actual <= 0) return { texto: 'AGOTADO', bg: '#FEE2E2', color: '#991B1B' }
    if (actual <= minimo) return { texto: 'CRÍTICO', bg: '#FEF2F2', color: '#DC2626' }
    if (actual <= minimo * 1.5) return { texto: 'ALERTA', bg: '#FEF9C3', color: '#854D0E' }
    return { texto: 'ÓPTIMO', bg: '#DCFCE7', color: '#166534' }
  }

  const materialesFiltrados = materiales.filter(m => 
    (m.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) || 
    (m.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (m.categoria || '').toLowerCase().includes(busqueda.toLowerCase())
  )

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', danger: '#DC2626' }
  const thStyle = { padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '12px 16px', fontSize: '13px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar />
      <div style={{ maxWidth: '1400px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '12px', padding: '6px 12px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, fontSize: '13px' }}>← Volver</button>
            <h2 style={{ margin: '0 0 8px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>📦 Control de Inventario PTAR</h2>
            <input type="text" placeholder="🔍 Buscar por código, descripción o categoría..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '10px 16px', width: '350px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {!esVisor && (
              <>
                <button onClick={abrirModalNuevoMaterial} style={{ padding: '12px 20px', backgroundColor: theme.bgCard, color: theme.textMain, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  + Nuevo Material
                </button>
                {/* Botón ahora dispara la función controlada */}
                <button onClick={abrirModalMovimiento} style={{ padding: '12px 20px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                  ⇄ Registrar Movimiento
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando catálogo de materiales...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Descripción del Material</th>
                  <th style={thStyle}>Categoría</th>
                  <th style={thStyle}>U.M.</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Stock Mínimo</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Stock Actual</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Estado</th>
                  <th style={{...thStyle, textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materialesFiltrados.length === 0 ? (
                  <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No hay materiales registrados.</td></tr>
                ) : (
                  materialesFiltrados.map((mat) => {
                    const estado = obtenerEstadoStock(mat.stock_actual, mat.stock_minimo)
                    return (
                      <tr key={mat.idmaterial} style={{ transition: 'background 0.2s', ':hover': { backgroundColor: '#F8FAFC' } }}>
                        <td style={{ ...tdStyle, fontWeight: '600', color: theme.primary }}>{mat.codigo || 'S/C'}</td>
                        <td style={{ ...tdStyle, fontWeight: '600' }}>{mat.descripcion}</td>
                        <td style={tdStyle}>{mat.categoria || '---'}</td>
                        <td style={{ ...tdStyle, color: theme.textMuted }}>{mat.unidad_medida}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: theme.textMuted }}>{mat.stock_minimo}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '800', fontSize: '15px' }}>{mat.stock_actual}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ padding: '6px 12px', backgroundColor: estado.bg, color: estado.color, borderRadius: '20px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                            {estado.texto}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button onClick={() => abrirKardex(mat)} title="Ver Kárdex e Historial" style={{ background: '#EFF6FF', border: `1px solid #BFDBFE`, padding: '6px', borderRadius: '6px', cursor: 'pointer', color: theme.primary }}>
                            📋 
                          </button>
                          {!esVisor && (
                            <button onClick={() => abrirModalEditarMaterial(mat)} title="Editar Material" style={{ background: 'white', border: `1px solid ${theme.border}`, padding: '6px', borderRadius: '6px', cursor: 'pointer' }}>
                              ✏️
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL 1: CREAR O EDITAR MATERIAL (Catálogo)                               */}
        {/* ========================================================================= */}
        {mostrarModalMaterial && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: theme.textMain }}>{modoEdicion ? 'Editar Material' : 'Agregar Material al Catálogo'}</h3>
                <button onClick={() => setMostrarModalMaterial(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.textMuted }}>×</button>
              </div>
              <form onSubmit={handleGuardarMaterial} style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Código / SKU</label>
                    <input type="text" value={formMaterial.codigo} onChange={(e) => setFormMaterial({...formMaterial, codigo: e.target.value.toUpperCase()})} placeholder="Ej: MAT-0001" style={{...inputStyle, backgroundColor: '#F1F5F9', fontWeight: 'bold'}} />
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría</label>
                    <input list="lista-categorias" value={formMaterial.categoria} onChange={(e) => setFormMaterial({...formMaterial, categoria: e.target.value})} required placeholder="Escribe o selecciona..." style={inputStyle} />
                    <datalist id="lista-categorias"><option value="Químicos" /><option value="Repuestos Mecánicos" /><option value="Consumibles" /><option value="EPP" /><option value="Herramientas" /></datalist>
                  </div>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Descripción del Material *</label>
                  <input type="text" value={formMaterial.descripcion} onChange={(e) => setFormMaterial({...formMaterial, descripcion: e.target.value})} required placeholder="Ej: Polímero Catiónico" style={inputStyle} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={labelStyle}>Unidad de Medida *</label>
                    <input list="lista-unidades" value={formMaterial.unidad_medida} onChange={(e) => setFormMaterial({...formMaterial, unidad_medida: e.target.value})} required placeholder="Escribe o selecciona..." style={inputStyle} />
                    <datalist id="lista-unidades"><option value="Kg" /><option value="Lt" /><option value="Gal" /><option value="Und" /><option value="Sacos" /></datalist>
                  </div>
                  <div>
                    <label style={labelStyle}>Stock Mínimo (Alarma)</label>
                    <input type="number" value={formMaterial.stock_minimo} onChange={(e) => setFormMaterial({...formMaterial, stock_minimo: parseFloat(e.target.value) || 0})} min="0" step="any" style={inputStyle} />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setMostrarModalMaterial(false)} style={{ padding: '10px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '10px 16px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600' }}>{guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Material' : 'Guardar Material')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: REGISTRAR MOVIMIENTO CON BUSCADOR INTELIGENTE                    */}
        {/* ========================================================================= */}
        {mostrarModalMovimiento && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              
              <div style={{ backgroundColor: theme.bgCard, padding: '20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: theme.textMain }}>Registrar Movimiento de Stock</h3>
                <button onClick={() => setMostrarModalMovimiento(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.textMuted }}>×</button>
              </div>
              
              <form onSubmit={handleGuardarMovimiento} style={{ padding: '24px' }}>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                  <button type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: 'ENTRADA'})} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: formMovimiento.tipo === 'ENTRADA' ? `2px solid ${theme.success}` : `1px solid ${theme.border}`, backgroundColor: formMovimiento.tipo === 'ENTRADA' ? '#F0FDF4' : 'white', color: formMovimiento.tipo === 'ENTRADA' ? theme.success : theme.textMuted }}>
                    + Ingreso (Compra)
                  </button>
                  <button type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: 'SALIDA'})} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: formMovimiento.tipo === 'SALIDA' ? `2px solid ${theme.danger}` : `1px solid ${theme.border}`, backgroundColor: formMovimiento.tipo === 'SALIDA' ? '#FEF2F2' : 'white', color: formMovimiento.tipo === 'SALIDA' ? theme.danger : theme.textMuted }}>
                    - Salida (Consumo)
                  </button>
                  <button type="button" onClick={() => setFormMovimiento({...formMovimiento, tipo: 'AJUSTE'})} style={{ flex: 1, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', border: formMovimiento.tipo === 'AJUSTE' ? `2px solid #64748B` : `1px solid ${theme.border}`, backgroundColor: formMovimiento.tipo === 'AJUSTE' ? '#F1F5F9' : 'white', color: formMovimiento.tipo === 'AJUSTE' ? '#334155' : theme.textMuted }}>
                    ⚙️ Ajuste
                  </button>
                </div>

                {/* BUSCADOR INTELIGENTE DE MATERIAL */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <label style={labelStyle}>Material a Afectar *</label>
                  <input 
                    type="text" 
                    required={!formMovimiento.idmaterial}
                    value={busquedaMaterial} 
                    onChange={(e) => {
                      setBusquedaMaterial(e.target.value);
                      setMostrarSugerencias(true);
                      if (formMovimiento.idmaterial) setFormMovimiento({...formMovimiento, idmaterial: ''});
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                    placeholder="🔍 Escribe código o descripción para buscar..." 
                    style={{...inputStyle, borderColor: formMovimiento.idmaterial ? theme.success : theme.border, backgroundColor: formMovimiento.idmaterial ? '#F0FDF4' : 'white' }} 
                  />
                  
                  {mostrarSugerencias && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                      {materiales.filter(m => `${m.codigo} ${m.descripcion}`.toLowerCase().includes(busquedaMaterial.toLowerCase())).length === 0 ? (
                        <div style={{ padding: '10px', color: theme.textMuted, fontSize: '13px', textAlign: 'center' }}>No se encontraron materiales.</div>
                      ) : (
                        materiales.filter(m => `${m.codigo} ${m.descripcion}`.toLowerCase().includes(busquedaMaterial.toLowerCase())).map(m => (
                          <div
                            key={m.idmaterial}
                            onMouseDown={(e) => { 
                              e.preventDefault(); 
                              setFormMovimiento({...formMovimiento, idmaterial: m.idmaterial});
                              setBusquedaMaterial(`[${m.codigo}] ${m.descripcion}`);
                              setMostrarSugerencias(false);
                            }}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div>
                              <strong style={{ color: theme.primary, fontSize: '13px' }}>{m.codigo}</strong> - <span style={{ fontSize: '13px', color: theme.textMain }}>{m.descripcion}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMuted, backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '12px' }}>
                              Stock: {m.stock_actual}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {!formMovimiento.idmaterial && busquedaMaterial && !mostrarSugerencias && (
                    <span style={{ color: theme.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>⚠️ Selecciona un material válido de la lista.</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelStyle}>Cantidad *</label>
                    <input type="number" required min="0.01" step="any" value={formMovimiento.cantidad} onChange={(e) => setFormMovimiento({...formMovimiento, cantidad: e.target.value})} placeholder="Ej: 50" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nº Referencia (OC o Req.)</label>
                    <input type="text" value={formMovimiento.referencia} onChange={(e) => setFormMovimiento({...formMovimiento, referencia: e.target.value})} placeholder="Ej: OC-2026-004" style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{...labelStyle, color: formMovimiento.tipo === 'ENTRADA' ? theme.primary : theme.textMain}}>
                      Lote de Fabricación {formMovimiento.tipo === 'ENTRADA' && '(Recomendado)'}
                    </label>
                    <input type="text" value={formMovimiento.lote} onChange={(e) => setFormMovimiento({...formMovimiento, lote: e.target.value})} placeholder="Ej: LOTE-8941" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{...labelStyle, color: formMovimiento.tipo === 'ENTRADA' ? theme.primary : theme.textMain}}>
                      Fecha de Caducidad {formMovimiento.tipo === 'ENTRADA' && '(Recomendado)'}
                    </label>
                    <input type="date" value={formMovimiento.fecha_caducidad} onChange={(e) => setFormMovimiento({...formMovimiento, fecha_caducidad: e.target.value})} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Responsable (Quién retira o entrega)</label>
                  <input type="text" value={formMovimiento.responsable} onChange={(e) => setFormMovimiento({...formMovimiento, responsable: e.target.value})} placeholder="Nombre del operario" style={inputStyle} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${theme.border}`, paddingTop: '20px' }}>
                  <button type="button" onClick={() => setMostrarModalMovimiento(false)} style={{ padding: '10px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoMovimiento} style={{ padding: '10px 16px', backgroundColor: formMovimiento.tipo === 'SALIDA' ? theme.danger : (formMovimiento.tipo === 'AJUSTE' ? '#475569' : theme.success), color: 'white', border: 'none', borderRadius: '6px', cursor: guardandoMovimiento ? 'wait' : 'pointer', fontWeight: '600' }}>
                    {guardandoMovimiento ? 'Procesando...' : `Confirmar ${formMovimiento.tipo}`}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: KÁRDEX / HISTORIAL DE MOVIMIENTOS                                */}
        {/* ========================================================================= */}
        {mostrarModalKardex && materialSeleccionado && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgApp, borderRadius: '12px', width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              
              <div style={{ backgroundColor: theme.bgCard, padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '18px' }}>📋 Kárdex de Movimientos</h3>
                  <p style={{ margin: 0, color: theme.textMuted, fontSize: '14px' }}>
                    <strong>{materialSeleccionado.codigo}</strong> - {materialSeleccionado.descripcion}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: theme.textMuted, display: 'block' }}>Stock Actual:</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: theme.primary }}>{materialSeleccionado.stock_actual} {materialSeleccionado.unidad_medida}</span>
                  </div>
                  <button onClick={() => setMostrarModalKardex(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: theme.textMuted }}>×</button>
                </div>
              </div>
              
              <div style={{ padding: '0', overflowY: 'auto', flex: 1, backgroundColor: 'white' }}>
                {cargandoKardex ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando historial...</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th style={thStyle}>Fecha / Hora</th>
                        <th style={thStyle}>Tipo</th>
                        <th style={{...thStyle, textAlign: 'right'}}>Cant.</th>
                        <th style={thStyle}>Referencia</th>
                        <th style={thStyle}>Responsable</th>
                        <th style={thStyle}>Lote / Caducidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialMovimientos.length === 0 ? (
                        <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>Este material no tiene movimientos registrados.</td></tr>
                      ) : (
                        historialMovimientos.map(mov => (
                          <tr key={mov.idmovimiento} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{new Date(mov.fecha_hora).toLocaleString('es-PE')}</td>
                            <td style={tdStyle}>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                                backgroundColor: mov.tipo === 'ENTRADA' ? '#DCFCE7' : (mov.tipo === 'SALIDA' ? '#FEE2E2' : '#F1F5F9'),
                                color: mov.tipo === 'ENTRADA' ? '#166534' : (mov.tipo === 'SALIDA' ? '#991B1B' : '#475569')
                              }}>
                                {mov.tipo}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: mov.tipo === 'ENTRADA' ? theme.success : (mov.tipo === 'SALIDA' ? theme.danger : theme.textMain) }}>
                              {mov.tipo === 'ENTRADA' ? '+' : (mov.tipo === 'SALIDA' ? '-' : '')}{mov.cantidad}
                            </td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{mov.referencia || '-'}</td>
                            <td style={{ ...tdStyle, fontSize: '12px' }}>{mov.responsable || '-'}</td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: theme.primary }}>{mov.lote ? `Lote: ${mov.lote}` : '-'}</div>
                              <div style={{ fontSize: '11px', color: theme.textMuted }}>{mov.fecha_caducidad ? `Cad: ${mov.fecha_caducidad}` : ''}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setMostrarModalKardex(false)} style={{ padding: '10px 20px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cerrar Kárdex</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default InventarioPTAR