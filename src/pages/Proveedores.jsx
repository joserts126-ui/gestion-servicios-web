import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Proveedores() {
  const navigate = useNavigate()
  
  // ================= ESTADOS PRINCIPALES =================
  const [listaProveedores, setListaProveedores] = useState([])
  const [catFormasPago, setCatFormasPago] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // ================= ESTADOS DEL MODAL =================
  const [mostrarModal, setMostrarModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Campos del Formulario
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [direccion, setDireccion] = useState('')
  const [idFormaPago, setIdFormaPago] = useState('')
  const [activo, setActivo] = useState(true)

  // ================= CARGAR DATOS =================
  const cargarDatos = async () => {
    setCargando(true)
    
    // Traemos proveedores cruzados con su forma de pago
    const { data: dataProv } = await supabase
      .from('proveedor')
      .select('*, formapago(formapago)')
      .order('razonsocial', { ascending: true })
    if (dataProv) setListaProveedores(dataProv)

    // Traemos el catálogo de formas de pago
    const { data: dataFP } = await supabase.from('formapago').select('*').eq('activo', true)
    if (dataFP) setCatFormasPago(dataFP)
    
    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // ================= BUSCADOR =================
  const proveedoresFiltrados = listaProveedores.filter(prov => {
    const term = busqueda.toLowerCase()
    const formaPagoTexto = (prov.formapago?.formapago || '').toLowerCase()
    const estadoTexto = prov.activo ? 'activo' : 'inactivo'
    
    return (
      prov.ruc.includes(term) ||
      prov.razonsocial.toLowerCase().includes(term) ||
      (prov.direccion || '').toLowerCase().includes(term) ||
      formaPagoTexto.includes(term) ||
      estadoTexto.includes(term)
    )
  })

  // ================= CONTROL DE MODALES =================
  const abrirModalNuevo = () => {
    setModoEdicion(false)
    setRuc('')
    setRazonSocial('')
    setDireccion('')
    setIdFormaPago('')
    setActivo(true)
    setMostrarModal(true)
  }

  const abrirModalEditar = (prov) => {
    setModoEdicion(true)
    setRuc(prov.ruc)
    setRazonSocial(prov.razonsocial)
    setDireccion(prov.direccion || '')
    setIdFormaPago(prov.idformapago || '')
    setActivo(prov.activo)
    setMostrarModal(true)
  }

  // ================= GUARDAR / EDITAR =================
  const handleGuardarProveedor = async (e) => {
    e.preventDefault()
    
    if (!modoEdicion && ruc.length !== 11) {
      alert("El RUC debe tener exactamente 11 dígitos.")
      return
    }

    setGuardando(true)

    const datosGuardar = {
      razonsocial: razonSocial,
      direccion: direccion,
      idformapago: idFormaPago || null,
      activo: activo
    }

    let errorQuery = null

    if (modoEdicion) {
      // ACTUALIZAR (No actualizamos el RUC porque es la llave primaria)
      const { error } = await supabase
        .from('proveedor')
        .update(datosGuardar)
        .eq('ruc', ruc)
      errorQuery = error
    } else {
      // INSERTAR NUEVO
      datosGuardar.ruc = ruc
      const { error } = await supabase
        .from('proveedor')
        .insert([datosGuardar])
      errorQuery = error
    }

    setGuardando(false)

    if (errorQuery) {
      alert('Error al guardar: ' + (errorQuery.code === '23505' ? 'Este RUC ya existe en el sistema.' : errorQuery.message))
    } else {
      setMostrarModal(false)
      cargarDatos()
    }
  }

  // Estilos
  const inputStyle = { width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '13px' }
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '12px', color: '#555' }

  return (
    <div style={{ backgroundColor: '#f4f6f8', minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* TOP BAR (Estilo consistente) */}
      <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', padding: '10px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#555', fontWeight: 'bold' }}>
          <span>Administración</span>
          <div style={{ width: '36px', height: '36px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', border: '2px solid #0d47a1' }}>🏢</div>
        </div>
      </div>

      <div style={{ padding: '0 40px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* ENCABEZADO Y BUSCADOR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '15px', padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#555' }}>
              ← Volver al Panel
            </button>
            <h2 style={{ margin: 0, color: '#333' }}>Directorio de Proveedores</h2>
            <p style={{ margin: '5px 0 15px 0', color: '#666' }}>Gestiona los datos y condiciones de tus proveedores.</p>
            
            <input 
              type="text" 
              placeholder="🔍 Buscar por RUC, Razón Social, Forma de Pago..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ padding: '10px', width: '380px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}
            />
          </div>
          <button onClick={abrirModalNuevo} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(40,167,69,0.3)', height: 'fit-content' }}>
            + Nuevo Proveedor
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
                  <th style={{ padding: '15px' }}>RUC</th>
                  <th style={{ padding: '15px' }}>Razón Social</th>
                  <th style={{ padding: '15px' }}>Dirección</th>
                  <th style={{ padding: '15px' }}>Forma de Pago Base</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedoresFiltrados.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No se encontraron proveedores.</td></tr>
                ) : (
                  proveedoresFiltrados.map((prov) => (
                    <tr key={prov.ruc} style={{ borderBottom: '1px solid #eee', backgroundColor: prov.activo ? 'transparent' : '#fafafa' }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#444' }}>{prov.ruc}</td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: prov.activo ? '#000' : '#888' }}>{prov.razonsocial}</td>
                      <td style={{ padding: '15px', color: '#555' }}>{prov.direccion || '---'}</td>
                      <td style={{ padding: '15px', color: '#0d47a1', fontWeight: 'bold', fontSize: '13px' }}>
                        {prov.formapago ? prov.formapago.formapago : 'No definida'}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ padding: '5px 10px', backgroundColor: prov.activo ? '#d4edda' : '#f8d7da', color: prov.activo ? '#155724' : '#721c24', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                          {prov.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button onClick={() => abrirModalEditar(prov)} style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', color: '#444' }}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= MODAL (NUEVO/EDITAR) ================= */}
        {mostrarModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#333' }}>{modoEdicion ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}</h3>
                {modoEdicion && (
                  <span style={{ fontSize: '12px', backgroundColor: activo ? '#d4edda' : '#f8d7da', padding: '5px 10px', borderRadius: '4px', color: activo ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                    {activo ? 'Activo' : 'Inactivo'}
                  </span>
                )}
              </div>
              
              <form onSubmit={handleGuardarProveedor} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>RUC *</label>
                    <input 
                      type="number" 
                      required 
                      value={ruc} 
                      onChange={(e) => setRuc(e.target.value)} 
                      placeholder="11 dígitos" 
                      style={{ ...inputStyle, backgroundColor: modoEdicion ? '#f0f0f0' : 'white', cursor: modoEdicion ? 'not-allowed' : 'text' }} 
                      disabled={modoEdicion} // El RUC no se edita porque es la llave primaria
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Razón Social *</label>
                    <input type="text" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Ej: Importaciones SAC" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Forma de Pago Predeterminada</label>
                  <select value={idFormaPago} onChange={(e) => setIdFormaPago(e.target.value)} style={inputStyle}>
                    <option value="">-- Sin forma de pago predeterminada --</option>
                    {catFormasPago.map(f => <option key={f.idformapago} value={f.idformapago}>{f.formapago}</option>)}
                  </select>
                  <span style={{ fontSize: '11px', color: '#888' }}>Esta opción se autocompletará al hacer cotizaciones.</span>
                </div>

                <div>
                  <label style={labelStyle}>Dirección Física</label>
                  <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Principal 123, Lima" style={inputStyle} />
                </div>

                {modoEdicion && (
                  <div style={{ padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}>
                    <label style={{ ...labelStyle, marginBottom: '10px' }}>Estado Operativo</label>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" checked={activo === true} onChange={() => setActivo(true)} />
                        Proveedor Activo
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                        <input type="radio" checked={activo === false} onChange={() => setActivo(false)} />
                        Dar de Baja (Inactivo)
                      </label>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '10px 15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                  <button type="submit" disabled={guardando} style={{ padding: '10px 15px', backgroundColor: modoEdicion ? '#007BFF' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: guardando ? 'wait' : 'pointer', fontWeight: 'bold' }}>
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