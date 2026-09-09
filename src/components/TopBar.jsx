import React, { useState, useEffect } from 'react'

function TopBar() {
  const [nombreUsuario, setNombreUsuario] = useState('Cargando...')
  const [rolUsuario, setRolUsuario] = useState('') // NUEVO: Estado para el rol

  useEffect(() => {
    // NUEVO: En lugar de buscar en Supabase al primer usuario que aparezca, 
    // leemos los datos exactos de quien inició sesión.
    const usuarioGuardado = localStorage.getItem('usuarioApp')
    
    if (usuarioGuardado) {
      const userObj = JSON.parse(usuarioGuardado)
      setNombreUsuario(userObj.nombre)
      setRolUsuario(userObj.rol || 'ADMIN')
    } else {
      setNombreUsuario('Sesión no iniciada')
    }
  }, [])

  const theme = {
    bgCard: '#FFFFFF',
    border: '#E2E8F0',
    textMain: '#1E293B',
    textMuted: '#64748B', // Color para el texto del rol
    primary: '#2563EB'
  }

  return (
    <div style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, padding: '12px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.textMain, fontWeight: '600' }}>
        
        {/* Agregamos el Rol debajo del nombre de usuario */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: '14px', lineHeight: '1.2' }}>{nombreUsuario}</span>
          {rolUsuario && (
            <span style={{ fontSize: '11px', color: theme.textMuted, fontWeight: '700', letterSpacing: '0.5px' }}>
              {rolUsuario.toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: theme.primary, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          {nombreUsuario !== 'Cargando...' && nombreUsuario !== 'Sesión no iniciada' ? nombreUsuario.charAt(0).toUpperCase() : '?'}
        </div>
      </div>
    </div>
  )
}

export default TopBar