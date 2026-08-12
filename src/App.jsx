import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Servicios from './pages/Servicios'
import Cotizaciones from './pages/Cotizaciones' // 1. Importamos la nueva pantalla
import Proveedores from './pages/Proveedores'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/proveedores" element={<Proveedores />} />
        {/* 2. Añadimos la ruta dinámica con el parámetro :id */}
        <Route path="/cotizaciones/:id" element={<Cotizaciones />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App