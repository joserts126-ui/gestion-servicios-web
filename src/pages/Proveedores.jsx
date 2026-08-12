import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Proveedores() {
  const navigate = useNavigate()
  
  const [listaProveedores, setListaProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Campos del formulario
  const [ruc, setRuc] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [direccion, setDireccion] = useState('')

  const cargarProveedores = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('proveedor')
      .select('*')
      .order('razonsocial', { ascending: true })
    
    if (data) setListaProveedores(data)
    setCargando(false)
  }

  useEffect(() => {
    cargarProveedores()
  }, [])

  const handleGuardarProveedor = async (e) => {
    e.preventDefault()
    setGuardando(true)

    // Validar RUC (debe tener 11 dígitos en Perú)
    if (ruc.length !== 11) {
      alert("El RUC debe tener exactamente 11 dígitos.")
      setGuardando(false)
      return
    }

    const { error } = await supabase
      .from('proveedor')
      .insert([{ 
        ruc: ruc, 
        razonsocial: razonSocial, 
        direccion: direccion 
      }])

    setGuardando(false)

    if (error) {
      alert('Error al guardar: ' + (error.code === '23505' ? 'Este RUC ya existe.' : error.message))
    } else {
      setRuc('')
      setRazonSocial('')
      setDireccion('')
      setMostrarModal(false)
      cargarProveedores()
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#333' }}>Directorio de Proveedores</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Gestiona las empresas que cotizan tus servicios.</p>
        </div>
        <div>
          <button onClick={() => navigate('/dashboard')} style={{ marginRight: '10px', padding: '10px 15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' }}>
            Volver al Panel
          </button>
          <button onClick={() => setMostrarModal(true)} style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            + Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando información...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '15px' }}>RUC</th>
                <th style={{ padding: '15px' }}>Razón Social</th>
                <th style={{ padding: '15px' }}>Dirección</th>
                <th style={{ padding: '15px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {listaProveedores.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>No hay proveedores.</td></tr>
              ) : (
                listaProveedores.map((prov) => (
                  <tr key={prov.ruc} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{prov.ruc}</td>
                    <td style={{ padding: '15px' }}>{prov.razonsocial}</td>
                    <td style={{ padding: '15px' }}>{prov.direccion || '-'}</td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ padding: '5px 10px', backgroundColor: prov.activo ? '#d4edda' : '#f8d7da', color: prov.activo ? '#155724' : '#721c24', borderRadius: '20px', fontSize: '12px' }}>
                        {prov.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nuevo Proveedor */}
      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', width: '400px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Registrar Proveedor</h3>
            <form onSubmit={handleGuardarProveedor} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>RUC *</label>
                <input type="number" required value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="Ej: 20123456789" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Razón Social *</label>
                <input type="text" required value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Ej: Importaciones SAC" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Dirección (Opcional)</label>
                <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Ej: Av. Principal 123" style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setMostrarModal(false)} style={{ padding: '8px 15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={guardando} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: guardando ? 'wait' : 'pointer' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Proveedores