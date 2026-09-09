import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function ServicioModal({ 
  visible, modoEdicion, servicioAEditar, 
  idUsuarioActual, rolUsuario, lugares, tiposInfraestructura, tiposServicio, sistemas, subsistemas, 
  onClose, onSuccess, onAbrirNuevoLugar 
}) {
  
  const [guardando, setGuardando] = useState(false)
  const esVisor = rolUsuario === 'VISOR'; 

  const [formData, setFormData] = useState({
    servicio: '', detalle: '', idlugar: '', estado: 'PENDIENTE', prioridad: 'Media',
    num_requerimiento: '', fecharequerimiento: '', fechasolicitud: '', orden_compra: '',
    solped: '', fechasolped: '', progreso: 0, idtipo: '', idtiposervicio: '',
    idsistema: '', idsubsistema: '', responsable: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (visible) {
      if (modoEdicion && servicioAEditar) {
        setFormData({
          servicio: servicioAEditar.servicio || '',
          detalle: servicioAEditar.detalle || '',
          idlugar: servicioAEditar.idlugar || '',
          estado: servicioAEditar.estado || 'PENDIENTE',
          prioridad: servicioAEditar.prioridad || 'Media',
          num_requerimiento: servicioAEditar.num_requerimiento || '',
          fecharequerimiento: servicioAEditar.fecharequerimiento || '',
          fechasolicitud: servicioAEditar.fechasolicitud || '',
          orden_compra: servicioAEditar.orden_compra || '',
          solped: servicioAEditar.solped || '',
          fechasolped: servicioAEditar.fechasolped || '',
          progreso: servicioAEditar.progreso || 0,
          idtipo: servicioAEditar.idtipo || '',
          idtiposervicio: servicioAEditar.idtiposervicio || '',
          idsistema: servicioAEditar.idsistema || '',
          idsubsistema: servicioAEditar.idsubsistema || '',
          responsable: servicioAEditar.responsable || ''
        });
      } else {
        setFormData({
          servicio: '', detalle: '', idlugar: '', estado: 'PENDIENTE', prioridad: 'Media',
          num_requerimiento: '', fecharequerimiento: '', fechasolicitud: new Date().toISOString().split('T')[0], 
          orden_compra: '', solped: '', fechasolped: '', progreso: 0, idtipo: '', 
          idtiposervicio: '', idsistema: '', idsubsistema: '', responsable: ''
        });
      }
    }
  }, [visible, modoEdicion, servicioAEditar]);

  if (!visible) return null

  // Función inteligente para transformar lo que escribes a IDs de base de datos
  const resolverIdBaseDatos = (valorEscrito, lista, columnaTexto, columnaId) => {
    if (!valorEscrito) return null;
    const existeComoId = lista.find(item => item[columnaId].toString() === valorEscrito.toString());
    if (existeComoId) return existeComoId[columnaId];
    const existeComoTexto = lista.find(item => item[columnaTexto]?.toString().toLowerCase() === valorEscrito.toString().toLowerCase());
    return existeComoTexto ? existeComoTexto[columnaId] : null;
  };

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (formData.progreso < 0 || formData.progreso > 100) { alert("El progreso debe ser un número entre 0 y 100"); return }
    setGuardando(true)

    // Validamos que lo que el usuario escribió realmente exista en la base de datos
    const valInfra = resolverIdBaseDatos(formData.idtipo, tiposInfraestructura, 'tipoinfraestructura', 'idtipo');
    if (formData.idtipo && !valInfra) { alert(`❌ La Infraestructura ingresada no es válida. Selecciona una de la lista.`); setGuardando(false); return; }

    const valServ = resolverIdBaseDatos(formData.idtiposervicio, tiposServicio, 'tiposervicio', 'idtiposervicio');
    if (formData.idtiposervicio && !valServ) { alert(`❌ El Tipo de Servicio ingresado no es válido. Selecciona uno de la lista.`); setGuardando(false); return; }

    const valSis = resolverIdBaseDatos(formData.idsistema, sistemas, 'sistema', 'idsistema');
    if (formData.idsistema && !valSis) { alert(`❌ El Sistema ingresado no es válido. Selecciona uno de la lista.`); setGuardando(false); return; }

    const valSub = resolverIdBaseDatos(formData.idsubsistema, subsistemas, 'sub_sistema', 'idsubsistema');
    if (formData.idsubsistema && !valSub) { alert(`❌ El Subsistema ingresado no es válido. Selecciona uno de la lista.`); setGuardando(false); return; }
    
    // NUEVO: Validación para el Lugar de Ejecución
    const valLugar = resolverIdBaseDatos(formData.idlugar, lugares, 'lugarejecucion', 'idlugar');
    if (formData.idlugar && !valLugar) { alert(`❌ El Lugar de Ejecución ingresado no es válido. Selecciona uno de la lista o créalo con el botón '+'.`); setGuardando(false); return; }

    const datosGuardar = { 
      ...formData,
      idlugar: valLugar, // Asignamos el ID resuelto
      num_requerimiento: formData.num_requerimiento || null, 
      fecharequerimiento: formData.fecharequerimiento || null, 
      fechasolicitud: formData.fechasolicitud || null,
      orden_compra: formData.orden_compra || null, 
      solped: formData.solped || null, 
      fechasolped: formData.fechasolped || null,
      progreso: parseInt(formData.progreso) || 0, 
      idtipo: valInfra, 
      idtiposervicio: valServ,
      idsistema: valSis, 
      idsubsistema: valSub, 
      responsable: formData.responsable || null
    };

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
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: esVisor ? '#F1F5F9' : theme.inputBg, color: esVisor ? theme.textMuted : theme.textMain, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: theme.textMain }

  // Funciones para que el campo visual muestre el texto en lugar del número de ID cuando editas
  const getNombreInfraestructura = (val) => { const m = tiposInfraestructura.find(t => t.idtipo.toString() === val?.toString()); return m ? m.tipoinfraestructura : val || ''; };
  const getNombreTipoServicio = (val) => { const m = tiposServicio.find(t => t.idtiposervicio.toString() === val?.toString()); return m ? m.tiposervicio : val || ''; };
  const getNombreSistema = (val) => { const m = sistemas.find(s => s.idsistema.toString() === val?.toString()); return m ? m.sistema : val || ''; };
  const getNombreSubsistema = (val) => { const m = subsistemas.find(s => s.idsubsistema.toString() === val?.toString()); return m ? m.sub_sistema : val || ''; };
  const getNombreLugar = (val) => { const m = lugares.find(l => l.idlugar.toString() === val?.toString()); return m ? m.lugarejecucion : val || ''; };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ backgroundColor: theme.bgApp, padding: '0', borderRadius: '12px', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ position: 'sticky', top: 0, backgroundColor: theme.bgCard, zIndex: 10, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px', fontWeight: '700' }}>{modoEdicion ? `Gestión de Servicio #${servicioAEditar?.idservicio}` : 'Registrar Nuevo Servicio'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {modoEdicion && (
              <select name="estado" value={formData.estado} disabled={esVisor} onChange={handleChange} style={{ padding: '6px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontWeight: '700', backgroundColor: esVisor ? '#F1F5F9' : theme.inputBg, color: theme.textMain, fontSize: '13px' }}>
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
              
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Nombre del Servicio *</label>
                <input type="text" name="servicio" required disabled={esVisor} value={formData.servicio} onChange={handleChange} style={inputStyle} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Fecha Creación</label>
                  <input type="date" name="fechasolicitud" disabled={esVisor} value={formData.fechasolicitud} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prioridad</label>
                  <select name="prioridad" disabled={esVisor} value={formData.prioridad} onChange={handleChange} style={inputStyle}>
                    <option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Infraestructura</label>
                  <input list="lista-infraestructura" name="idtipo" placeholder="Escribe para buscar..." disabled={esVisor} value={getNombreInfraestructura(formData.idtipo)} onChange={handleChange} style={inputStyle} />
                  <datalist id="lista-infraestructura">{tiposInfraestructura.map(t => <option key={t.idtipo} value={t.tipoinfraestructura} />)}</datalist>
                </div>
                <div>
                  <label style={labelStyle}>Tipo de Servicio</label>
                  <input list="lista-tiposervicio" name="idtiposervicio" placeholder="Escribe para buscar..." disabled={esVisor} value={getNombreTipoServicio(formData.idtiposervicio)} onChange={handleChange} style={inputStyle} />
                  <datalist id="lista-tiposervicio">{tiposServicio.map(t => <option key={t.idtiposervicio} value={t.tiposervicio} />)}</datalist>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Sistema</label>
                  <input list="lista-sistemas" name="idsistema" placeholder="Escribe para buscar..." disabled={esVisor} value={getNombreSistema(formData.idsistema)} onChange={handleChange} style={inputStyle} />
                  <datalist id="lista-sistemas">{sistemas.map(s => <option key={s.idsistema} value={s.sistema} />)}</datalist>
                </div>
                <div>
                  <label style={labelStyle}>Subsistema</label>
                  <input list="lista-subsistemas" name="idsubsistema" placeholder="Escribe para buscar..." disabled={esVisor} value={getNombreSubsistema(formData.idsubsistema)} onChange={handleChange} style={inputStyle} />
                  <datalist id="lista-subsistemas">{subsistemas.map(s => <option key={s.idsubsistema} value={s.sub_sistema} />)}</datalist>
                </div>
              </div>

              {/* NUEVO: Lugar de Ejecución con Lista Inteligente */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Lugar de Ejecución</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    list="lista-lugares" 
                    name="idlugar" 
                    placeholder="Escribe para buscar..." 
                    disabled={esVisor} 
                    value={getNombreLugar(formData.idlugar)} 
                    onChange={handleChange} 
                    style={{ ...inputStyle, flex: 1 }} 
                  />
                  <datalist id="lista-lugares">
                    {lugares.map(l => <option key={l.idlugar} value={l.lugarejecucion} />)}
                  </datalist>
                  {!esVisor && (
                    <button type="button" onClick={onAbrirNuevoLugar} style={{ padding: '0 12px', backgroundColor: '#EFF6FF', color: theme.primary, border: `1px solid #BFDBFE`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }} title="Crear nueva sede">+</button>
                  )}
                </div>
              </div>
              
              <div>
                <label style={labelStyle}>Detalles / Alcance</label>
                <textarea name="detalle" disabled={esVisor} value={formData.detalle} onChange={handleChange} rows="2" style={{ ...inputStyle, resize: 'none' }}></textarea>
              </div>
            </div>

            {/* COLUMNA 2: CONTROL DOCUMENTAL */}
            <div style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.primary, fontSize: '14px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>2. Control Documental y Avance</h4>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Responsable Asignado</label>
                <input type="text" name="responsable" disabled={esVisor} value={formData.responsable} onChange={handleChange} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Nº Requerimiento</label>
                  <input type="text" name="num_requerimiento" disabled={esVisor} value={formData.num_requerimiento} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha de Req.</label>
                  <input type="date" name="fecharequerimiento" disabled={esVisor} value={formData.fecharequerimiento} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Solped SAP</label>
                  <input type="text" name="solped" disabled={esVisor} value={formData.solped} onChange={handleChange} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha Solped</label>
                  <input type="date" name="fechasolped" disabled={esVisor} value={formData.fechasolped} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Orden de Compra (OC)</label>
                <input type="text" name="orden_compra" disabled={esVisor} value={formData.orden_compra} onChange={handleChange} style={inputStyle} />
              </div>

              <div style={{ padding: '12px', backgroundColor: '#F1F5F9', borderRadius: '6px', border: `1px dashed ${theme.border}` }}>
                <label style={labelStyle}>Progreso Físico de Avance (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="range" name="progreso" disabled={esVisor} min="0" max="100" value={formData.progreso} onChange={handleChange} style={{ flex: 1, accentColor: theme.primary }} />
                  <input type="number" name="progreso" disabled={esVisor} min="0" max="100" value={formData.progreso} onChange={handleChange} style={{ ...inputStyle, width: '70px', textAlign: 'center', fontWeight: 'bold', padding: '6px' }} />
                  <span style={{fontWeight: 'bold', color: theme.textMuted, fontSize: '13px'}}>%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', padding: '20px 0 0 0', borderTop: `1px solid ${theme.border}`, marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMain, fontSize: '13px' }}>
              {esVisor ? 'Cerrar' : 'Cancelar'}
            </button>
            {!esVisor && (
              <button type="submit" disabled={guardando} style={{ padding: '10px 20px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600', fontSize: '13px' }}>
                {guardando ? 'Guardando...' : (modoEdicion ? 'Guardar Cambios' : 'Registrar Servicio')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default ServicioModal