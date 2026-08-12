import React from 'react'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()

  // Lista de los módulos a los que el usuario tiene acceso
  const modulos = [
    { nombre: 'Servicios', ruta: '/servicios', icono: '🛠️' },
    { nombre: 'Proveedores', ruta: '/proveedores', icono: '🏢' },
    { nombre: 'Usuarios', ruta: '/usuarios', icono: '👥' },
    { nombre: 'Configuración', ruta: '/configuracion', icono: '⚙️' },
    { nombre: 'Lugares de Ejecución', ruta: '/lugares', icono: '📍' }
  ]

  // Función sencilla para simular el cierre de sesión
  const handleLogout = () => {
    // Más adelante aquí limpiaremos la sesión real de Supabase
    navigate('/')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Encabezado del Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>Panel de Control</h1>
          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Selecciona un módulo para gestionar tu información.</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Cerrar Sesión
        </button>
      </div>
      
      {/* Cuadrícula de Tarjetas (Iconos de Módulos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {modulos.map((modulo, index) => (
          <div 
            key={index} 
            onClick={() => navigate(modulo.ruta)}
            style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '12px', 
              padding: '30px 20px', 
              textAlign: 'center', 
              cursor: 'pointer',
              backgroundColor: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            // Efectos de "hover" simulados con eventos de React
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>{modulo.icono}</div>
            <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>{modulo.nombre}</h3>
          </div>
        ))}
      </div>

    </div>
  )
}

export default Dashboard