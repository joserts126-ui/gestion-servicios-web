import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom' // Herramienta para cambiar de ruta
import { supabase } from '../supabase' // Importamos tu conexión a la base de datos

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensajeError, setMensajeError] = useState('') // Para mostrar si se equivoca de clave
  
  const navigate = useNavigate() // Inicializamos el navegador de páginas

  const handleLogin = async (e) => {
    e.preventDefault() 
    setMensajeError('') // Limpiamos errores anteriores

    // 1. Hacemos la consulta a la tabla 'Usuario' en Supabase
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('correo', email)
      .eq('clave', password)
      .eq('activo', true) // Regla de negocio: Solo entran usuarios activos

    // 2. Evaluamos la respuesta
    if (error) {
      setMensajeError('Error de conexión con el servidor.')
      return
    }

    if (data && data.length > 0) {
      // Si la base de datos devuelve un registro, el usuario existe
      const usuarioLogueado = data[0]
      
      // (Opcional) Más adelante guardaremos los datos en el navegador, por ahora confirmamos:
      alert('¡Bienvenido, ' + usuarioLogueado.Nombre + '!')
      
      // 3. Redirigimos al Módulo 2 (Panel de Control)
      navigate('/dashboard')
    } else {
      // Si el array está vacío, la clave o correo están mal
      setMensajeError('Correo o contraseña incorrectos.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2>Gestión de Servicios</h2>
      <p>Ingresa tus credenciales para continuar</p>
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', gap: '15px', marginTop: '20px' }}>
        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        
        {/* Si hay un error, mostramos este texto en rojo */}
        {mensajeError && (
          <span style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>
            {mensajeError}
          </span>
        )}

        <button type="submit" style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Iniciar Sesión
        </button>
      </form>
    </div>
  )
}

export default Login