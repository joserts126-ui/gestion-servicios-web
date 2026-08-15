import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase' 

function TopBar() {
  // El componente ahora maneja su propio estado
  const [nombreUsuario, setNombreUsuario] = useState('Cargando...')

  // El componente busca el usuario en Supabase por sí solo
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data } = await supabase.from('usuario').select('nombre').eq('activo', true).limit(1)
      if (data && data.length > 0) {
        setNombreUsuario(data[0].nombre)
      } else {
        setNombreUsuario('Usuario')
      }
    }
    obtenerUsuario()
  }, [])

  const theme = {
    bgCard: '#FFFFFF',
    border: '#E2E8F0',
    textMain: '#1E293B',
    primary: '#2563EB'
  }

  return (
    <div style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.border}`, padding: '12px 40px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '30px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: theme.textMain, fontWeight: '600' }}>
        <span>{nombreUsuario}</span>
        <div style={{ width: '40px', height: '40px', backgroundColor: '#EFF6FF', color: theme.primary, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          {nombreUsuario !== 'Cargando...' ? nombreUsuario.charAt(0).toUpperCase() : '?'}
        </div>
      </div>
    </div>
  )
}

export default TopBar