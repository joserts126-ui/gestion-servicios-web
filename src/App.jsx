import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Servicios from './pages/Servicios'
import Cotizaciones from './pages/Cotizaciones' 
import Proveedores from './pages/Proveedores'
import InventarioPTAR from './pages/InventarioPTAR'

// NUEVO: Componente Guardián de Rutas
const RutaProtegida = ({ children, rolesBloqueados = [] }) => {
  const usuarioGuardado = localStorage.getItem('usuarioApp')
  
  // Si no hay sesión, lo devuelve al Login
  if (!usuarioGuardado) {
    return <Navigate to="/" replace />
  }

  const userObj = JSON.parse(usuarioGuardado)
  const rolActual = (userObj.rol || 'ADMIN').toUpperCase()

  // Si el rol del usuario está en la lista de prohibidos para esta ruta
  if (rolesBloqueados.includes(rolActual)) {
    // Si es el almacenero intentando escapar, lo encerramos en el inventario
    if (rolActual === 'ALMACENERO') {
      return <Navigate to="/inventario" replace />
    }
    // Si fuera otro rol con acceso restringido, va al dashboard general
    return <Navigate to="/dashboard" replace />
  }

  // Si pasa todas las validaciones, le mostramos la pantalla
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Rutas bloqueadas explícitamente para el ALMACENERO */}
        <Route path="/dashboard" element={
          <RutaProtegida rolesBloqueados={['ALMACENERO']}>
            <Dashboard />
          </RutaProtegida>
        } />
        
        <Route path="/servicios" element={
          <RutaProtegida rolesBloqueados={['ALMACENERO']}>
            <Servicios />
          </RutaProtegida>
        } />
        
        <Route path="/proveedores" element={
          <RutaProtegida rolesBloqueados={['ALMACENERO']}>
            <Proveedores />
          </RutaProtegida>
        } />
        
        <Route path="/cotizaciones/:id" element={
          <RutaProtegida rolesBloqueados={['ALMACENERO']}>
            <Cotizaciones />
          </RutaProtegida>
        } />

        {/* Ruta del Inventario: Abierta para ADMIN, VISOR y ALMACENERO */}
        <Route path="/inventario" element={
          <RutaProtegida rolesBloqueados={[]}>
            <InventarioPTAR />
          </RutaProtegida>
        } />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App