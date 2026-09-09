import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom' 
import { supabase } from '../supabase' 

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensajeError, setMensajeError] = useState('') 
  
  const navigate = useNavigate() 

  const handleLogin = async (e) => {
    e.preventDefault() 
    setMensajeError('') 

    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('correo', email)
      .eq('clave', password)
      .eq('activo', true) 

    if (error) {
      setMensajeError('Error de conexión con el servidor.')
      return
    }

    if (data && data.length > 0) {
      const usuarioLogueado = data[0]
      
      // NUEVO: Guardamos la "credencial" en la memoria del navegador
      localStorage.setItem('usuarioApp', JSON.stringify({
        idusuario: usuarioLogueado.idusuario,
        nombre: usuarioLogueado.nombre, // <-- Minúscula corregida
        rol: usuarioLogueado.rol || 'ADMIN'
      }))

      // Minúscula corregida aquí también
      alert('¡Bienvenido, ' + usuarioLogueado.nombre + '!') 
      
      navigate('/dashboard')
    } else {
      setMensajeError('Correo o contraseña incorrectos.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2>Gestión de Servicios</h2>
      <p>Ingresa tus credenciales para continuar</p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '15px', marginTop: '20px' }}>
        <input type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
        <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
        
        {mensajeError && (
          <span style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{mensajeError}</span>
        )}

        <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Iniciar Sesión
        </button>
      </form>
    </div>
  )
}

export default Login