import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function ServicioModal({ 
  visible, modoEdicion, servicioAEditar, 
  idUsuarioActual, lugares, tiposInfraestructura, tiposServicio, sistemas, subsistemas, 
  onClose, onSuccess, onAbrirNuevoLugar 
}) {
  
  const [guardando, setGuardando] = useState(false)

  // Estados del Formulario
  const [nombreServicio, setNombreServicio] = useState('')
  const [detalleServicio, setDetalleServicio] = useState('')
  const [idLugar, setIdLugar] = useState('')
  const [estadoServicio, setEstadoServicio] = useState('PENDIENTE')
  const [prioridad, setPrioridad] = useState('Media')
  const [numRequerimiento, setNumRequerimiento] = useState('')
  const [fechaRequerimiento, setFechaRequerimiento] = useState('')
  const [fechaSolicitud, setFechaSolicitud] = useState('') 
  const [ordenCompra, setOrdenCompra] = useState('')
  const [solped, setSolped] = useState('')
  const [fechaSolped, setFechaSolped] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [idTipoInfraestructura, setIdTipoInfraestructura] = useState('')
  const [idTipoServicio, setIdTipoServicio] = useState('')
  const [idSistema, setIdSistema] = useState('')
  const [idSubsistema, setIdSubsistema] = useState('')
  const [responsable, setResponsable] = useState('')

  // Cargar datos si estamos en Modo Edición
  useEffect(() => {
    if (visible) {
      if (modoEdicion && servicioAEditar) {
        setNombreServicio(servicioAEditar.servicio || '')
        setDetalleServicio(servicioAEditar.detalle || '')
        setIdLugar(servicioAEditar.idlugar || '')
        setEstadoServicio(servicioAEditar.estado || 'PENDIENTE')
        setPrioridad(servicioAEditar.prioridad || 'Media')
        setNumRequerimiento(servicioAEditar.num_requerimiento || '')
        setFechaRequerimiento(servicioAEditar.fecharequerimiento || '')
        setFechaSolicitud(servicioAEditar.fechasolicitud || '')
        setOrdenCompra(servicioAEditar.orden_compra || '')
        setSolped(servicioAEditar.solped || '')
        setFechaSolped(servicioAEditar.fechasolped || '')
        setProgreso(servicioAEditar.progreso || 0)
        setIdTipoInfraestructura(servicioAEditar.idtipo || '')
        setIdTipoServicio(servicioAEditar.idtiposervicio || '')
        setIdSistema(servicioAEditar.idsistema || '')
        setIdSubsistema(servicioAEditar.idsubsistema || '')
        setResponsable(servicioAEditar.responsable || '')
      } else {
        // Limpiar para Nuevo Servicio
        setNombreServicio(''); setDetalleServicio(''); setIdLugar(''); setEstadoServicio('PENDIENTE');
        setPrioridad('Media'); setNumRequerimiento(''); setFechaRequerimiento(''); 
        setFechaSolicitud(new Date().toISOString().split('T')[0]);
        setOrdenCompra(''); setSolped(''); setFechaSolped(''); setProgreso(0); 
        setIdTipoInfraestructura(''); setIdTipoServicio(''); setIdSistema(''); setIdSubsistema(''); setResponsable('');
      }
    }
  }, [visible, modoEdicion, servicioAEditar])

  if (!visible) return null

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (progreso < 0 || progreso > 100) { alert("El progreso debe ser un número entre 0 y 100"); return }
    setGuardando(true)
    
    const datosGuardar = { 
      servicio: nombreServicio, detalle: detalleServicio, idlugar: idLugar || null, 
      estado: estadoServicio, prioridad: prioridad, num_requerimiento: numRequerimiento || null, 
      fecharequerimiento: fechaRequerimiento || null, fechasolicitud: fechaSolicitud || null,
      orden_compra: ordenCompra || null, solped: solped || null, fechasolped: fechaSolped || null,
      progreso: parseInt(progreso), idtipo: idTipoInfraestructura || null, idtiposervicio: idTipoServicio || null,
      idsistema: idSistema || null, idsubsistema: idSubsistema || null, responsable: responsable || null
    }

    let errorQuery = null
    if (modoEdicion) {
      const { error } = await supabase.from('servicios').update(datosGuardar).eq('idservicio', servicioAEditar.idservicio)
      errorQuery = error
    } else {
      datosGuardar.idusuario = idUsuarioActual || null
      const { error } = await supabase.from('servicios').insert([datosGuardar])
      errorQuery = error
    }
    
    setGuardando(false)
    if (errorQuery) alert('Error al guardar: ' + errorQuery.message)
    else onSuccess()
  }

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', inputBg: '#FFFFFF' }
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: theme.textMain }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '12px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px', fontWeight: '700' }}>{modoEdicion ? `Gestión de Servicio #${servicioAEditar?.idservicio}` : 'Registrar Nuevo Servicio'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {modoEdicion && (
              <select value={estadoServicio} onChange={(e) => setEstadoServicio(e.target.value)} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '13px' }}>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="COTIZACIÓN">COTIZACIÓN</option>
                <option value="ESPERA DE APROBACION">ESPERA DE APROBACION</option>
                <option value="EN EJECUCIÓN">EN EJECUCIÓN</option>
                <option value="EJECUTADO">EJECUTADO</option>
                <option value="COMPLETADO">COMPLETADO</option>
                <option value="DOCUMENTACION INGRESO">DOCUMENTACION INGRESO</option>
                <option value="CANCELADO">CANCELADO</option>
                <option value="REQUERIMIENTO CANCELADO">REQ. CANCELADO</option>
              </select>
            )}
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer' }}>×</button>
          </div>
        </div>

        <form onSubmit={handleGuardar} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* COLUMNA 1: DATOS TÉCNICOS */}
            <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.primary, fontSize: '14px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>1. Identificación y Clasificación</h4>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Nombre del Servicio *</label><input type="text" required value={nombreServicio} onChange={(e) => setNombreServicio(e.target.value)} style={inputStyle} /></div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Fecha Creación</label><input type="date" value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Prioridad</label><select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={inputStyle}><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option></select></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Infraestructura</label><select value={idTipoInfraestructura} onChange={(e) => setIdTipoInfraestructura(e.target.value)} style={inputStyle}><option value="">-- Seleccionar --</option>{tiposInfraestructura.map(t => <option key={t.idtipo} value={t.idtipo}>{t.tipoinfraestructura}</option>)}</select></div>
                <div><label style={labelStyle}>Tipo de Servicio</label><select value={idTipoServicio} onChange={(e) => setIdTipoServicio(e.target.value)} style={inputStyle}><option value="">-- Seleccionar --</option>{tiposServicio.map(t => <option key={t.idtiposervicio} value={t.idtiposervicio}>{t.tiposervicio}</option>)}</select></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Sistema</label><select value={idSistema} onChange={(e) => setIdSistema(e.target.value)} style={inputStyle}><option value="">-- Seleccionar --</option>{sistemas.map(s => <option key={s.idsistema} value={s.idsistema}>{s.sistema}</option>)}</select></div>
                <div><label style={labelStyle}>Subsistema</label><select value={idSubsistema} onChange={(e) => setIdSubsistema(e.target.value)} style={inputStyle}><option value="">-- Seleccionar --</option>{subsistemas.map(s => <option key={s.idsubsistema} value={s.idsubsistema}>{s.sub_sistema}</option>)}</select></div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Lugar de Ejecución</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={idLugar} onChange={(e) => setIdLugar(e.target.value)} style={{ ...inputStyle, flex: 1 }}><option value="">-- Seleccionar --</option>{lugares.map(l => <option key={l.idlugar} value={l.idlugar}>{l.lugarejecucion}</option>)}</select>
                  <button type="button" onClick={onAbrirNuevoLugar} style={{ padding: '0 12px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>+</button>
                </div>
              </div>
              <div><label style={labelStyle}>Detalles / Alcance</label><textarea value={detalleServicio} onChange={(e) => setDetalleServicio(e.target.value)} rows="2" style={{ ...inputStyle, resize: 'none' }}></textarea></div>
            </div>

            {/* COLUMNA 2: CONTROL DOCUMENTAL */}
            <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.primary, fontSize: '14px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>2. Control Documental y Avance</h4>
              <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Responsable Asignado</label><input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} style={inputStyle} /></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Nº Requerimiento</label><input type="text" value={numRequerimiento} onChange={(e) => setNumRequerimiento(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha de Req.</label><input type="date" value={fechaRequerimiento} onChange={(e) => setFechaRequerimiento(e.target.value)} style={inputStyle} /></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div><label style={labelStyle}>Solped SAP</label><input type="text" value={solped} onChange={(e) => setSolped(e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Fecha Solped</label><input type="date" value={fechaSolped} onChange={(e) => setFechaSolped(e.target.value)} style={inputStyle} /></div>
              </div>

              <div style={{ marginBottom: '16px' }}><label style={labelStyle}>Orden de Compra (OC)</label><input type="text" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} style={inputStyle} /></div>

              <div style={{ padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', border: `1px dashed ${theme.border}` }}>
                <label style={labelStyle}>Progreso Físico de Avance (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="range" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ flex: 1, accentColor: theme.primary }} />
                  <input type="number" min="0" max="100" value={progreso} onChange={(e) => setProgreso(e.target.value)} style={{ ...inputStyle, width: '70px', textAlign: 'center', fontWeight: 'bold', padding: '6px' }} />
                  <span style={{fontWeight: 'bold', color: theme.textMuted, fontSize: '13px'}}>%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '20px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMain, fontSize: '13px' }}>Cancelar</button>
            <button type="submit" disabled={guardando} style={{ padding: '10px 20px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
              {guardando ? 'Guardando...' : (modoEdicion ? 'Guardar Cambios' : 'Registrar Servicio')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServicioModal