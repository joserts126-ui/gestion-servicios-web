import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Proveedores() {
  const navigate = useNavigate()
  
  const [listaProveedores, setListaProveedores] = useState([])
  const [catFormasPago, setCatFormasPago] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [direccion, setDireccion] = useState('')
  const [idFormaPago, setIdFormaPago] = useState('')
  const [activo, setActivo] = useState(true)

  const cargarDatos = async () => {
    setCargando(true)
    const { data: dataProv } = await supabase.from('proveedor').select('*, formapago(formapago)').order('razonsocial', { ascending: true })
    if (dataProv) setListaProveedores(dataProv)
    const { data: dataFP } = await supabase.from('formapago').select('*').eq('activo', true)
    if (dataFP) setCatFormasPago(dataFP)
    setCargando(false)
  }

  useEffect(() => { cargarDatos() }, [])

  const proveedoresFiltrados = listaProveedores.filter(prov => {
    const term = busqueda.toLowerCase()
    return prov.ruc.includes(term) || prov.razonsocial.toLowerCase().includes(term) || (prov.direccion || '').toLowerCase().includes(term) || (prov.formapago?.formapago || '').toLowerCase().includes(term) || (prov.activo ? 'activo' : 'inactivo').includes(term)
  })

  const abrirModalNuevo = () => {
    setModoEdicion(false); setRuc(''); setRazonSocial(''); setDireccion(''); setIdFormaPago(''); setActivo(true)
    setMostrarModal(true)
  }

  const abrirModalEditar = (prov) => {
    setModoEdicion(true); setRuc(prov.ruc); setRazonSocial(prov.razonsocial); setDireccion(prov.direccion || ''); setIdFormaPago(prov.idformapago || ''); setActivo(prov.activo)
    setMostrarModal(true)
  }

  const handleGuardarProveedor = async (e) => {
    e.preventDefault()
    if (!modoEdicion && ruc.length !== 8 && ruc.length !== 11) {
      alert("El documento debe ser un DNI (8 dígitos) o un RUC válido (11 dígitos).")
      return
    }

    setGuardando(true)
    const datosGuardar = { razonsocial: razonSocial, direccion: direccion, idformapago: idFormaPago || null, activo: activo }
    let errorQuery = null

    if (modoEdicion) {
      const { error } = await supabase.from('proveedor').update(datosGuardar).eq('ruc', ruc)
      errorQuery = error
    } else {
      datosGuardar.ruc = ruc
      const { error } = await supabase.from('proveedor').insert([datosGuardar])
      errorQuery = error
    }

    setGuardando(false)
    if (errorQuery) alert('Error al guardar: ' + (errorQuery.code === '23505' ? 'Este documento ya existe.' : errorQuery.message))
    else { setMostrarModal(false); cargarDatos() }
  }

  // ================= DISEÑO (VARIABLES CSS) =================
  const theme = {
    bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
    primary: '#2563EB', success: '#16A34A', inputBg: '#FFFFFF', danger: '#DC2626'
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: theme.textMain }
  const thStyle = { padding: '16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}` }
  const tdStyle = { padding: '16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}` }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      <div style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, padding: '12px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.textMain, fontWeight: '600' }}>
          <span>Administración</span>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: theme.primary, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>🏢</div>
        </div>
      </div>

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '16px', padding: '8px 16px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted }}>← Volver al Panel</button>
            <h2 style={{ margin: '0 0 4px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Directorio de Proveedores</h2>
            <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: '15px' }}>Gestiona los datos y condiciones de tus proveedores.</p>
            <input type="text" placeholder="🔍 Buscar por RUC, Razón Social, Forma de Pago..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '12px 16px', width: '450px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', backgroundColor: theme.bgCard }} />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '12px 24px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
            + Nuevo Proveedor
          </button>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Documento</th><th style={thStyle}>Razón Social</th><th style={thStyle}>Dirección</th>
                  <th style={thStyle}>Forma de Pago Base</th><th style={{...thStyle, textAlign: 'center'}}>Estado</th><th style={{...thStyle, textAlign: 'center'}}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedoresFiltrados.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: theme.textMuted }}>No se encontraron proveedores.</td></tr>
                ) : (
                  proveedoresFiltrados.map((prov) => (
                    <tr key={prov.ruc} style={{ transition: 'background 0.2s', backgroundColor: prov.activo ? 'transparent' : '#F8FAFC' }}>
                      <td style={{ ...tdStyle, fontWeight: '700' }}>{prov.ruc}</td>
                      <td style={{ ...tdStyle, fontWeight: '600', color: prov.activo ? theme.textMain : theme.textMuted }}>{prov.razonsocial}</td>
                      <td style={{ ...tdStyle, color: theme.textMuted }}>{prov.direccion || '---'}</td>
                      <td style={{ ...tdStyle, color: theme.primary, fontWeight: '600' }}>{prov.formapago ? prov.formapago.formapago : 'No definida'}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span style={{ padding: '6px 12px', backgroundColor: prov.activo ? '#DCFCE7' : '#FEE2E2', color: prov.activo ? '#166534' : '#991B1B', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                          {prov.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button onClick={() => abrirModalEditar(prov)} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '600', color: theme.textMain }}>Editar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: theme.bgCard, padding: '32px', borderRadius: '16px', width: '550px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '16px', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '20px', fontWeight: '700' }}>{modoEdicion ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
                {modoEdicion ? (
                  <span style={{ fontSize: '13px', backgroundColor: activo ? '#DCFCE7' : '#FEE2E2', padding: '6px 12px', borderRadius: '6px', color: activo ? '#166534' : '#991B1B', fontWeight: '700' }}>{activo ? 'Activo' : 'Inactivo'}</span>
                ) : (
                  <button onClick={() => setMostrarModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: theme.textMuted, cursor: 'pointer' }}>×</button>
                )}
              </div>
              
              <form onSubmit={handleGuardarProveedor} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>RUC o DNI *</label>
                    <input type="number" required value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="8 u 11 dígitos" style={{ ...inputStyle, backgroundColor: modoEdicion ? '#F1F5F9' : 'white', cursor: modoEdicion ? 'not-allowed' : 'text' }} disabled={modoEdicion} />
                  </div>
                  <div>
                    <label style={labelStyle}>Razón Social / Nombre *</label>
                    <input type="text" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Ej: Importaciones SAC" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Forma de Pago Predeterminada</label>
                  <select value={idFormaPago} onChange={(e) => setIdFormaPago(e.target.value)} style={inputStyle}>
                    <option value="">-- Sin forma de pago predeterminada --</option>
                    {catFormasPago.map(f => <option key={f.idformapago} value={f.idformapago}>{f.formapago}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Dirección Física</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Principal 123, Lima" style={inputStyle} />
                </div>

                {modoEdicion && (
                  <div style={{ padding: '16px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                    <label style={{ ...labelStyle, marginBottom: '12px' }}>Estado Operativo</label>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: theme.textMain, fontWeight: '500' }}>
                        <input type="radio" checked={activo === true} onChange={() => setActivo(true)} style={{ accentColor: theme.primary }} />
                        Proveedor Activo
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: theme.textMain, fontWeight: '500' }}>
                        <input type="radio" checked={activo === false} onChange={() => setActivo(false)} style={{ accentColor: theme.danger }} />
                        Dar de Baja
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '12px 24px', backgroundColor: theme.bgApp, border: `1px solid ${theme.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: theme.textMain }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '12px 24px', backgroundColor: modoEdicion ? theme.primary : theme.success, color: 'white', border: 'none', borderRadius: '8px', cursor: guardando ? 'wait' : 'pointer', fontWeight: '600' }}>
                    {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Proveedor' : 'Registrar Proveedor')}
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

export default Proveedores