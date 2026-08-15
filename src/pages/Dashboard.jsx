import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar'

function Dashboard() {
  const navigate = useNavigate()
  
  const [datosGrafico, setDatosGrafico] = useState([])
  const [totalServicios, setTotalServicios] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [nombreUsuarioActual, setNombreUsuarioActual] = useState('Administrador') // Simulado por ahora

  // Colores exactos para replicar tu Excel
  const COLORES_ESTADO = {
    'EN ESPERA': '#0284C7', // Azul
    '2. COTIZACIÓN': '#EAB308', // Amarillo/Naranja
    '2.1 REQUERIMIENTO EN ESPERA DE APROBACION': '#FDBA74', // Melón/Naranja claro
    '6. EN EJECUCIÓN': '#16A34A', // Verde
    '8. COMPLETADO': '#1E3A8A', // Azul Oscuro (o Verde oscuro)
    'CANCELADO': '#1F2937', // Negro/Gris oscuro
    'REQUERIMIENTO CANCELADO': '#9CA3AF' // Gris
  }

  const cargarEstadisticas = async () => {
    setCargando(true)
    
    // 1. Traer todos los servicios
    const { data: servicios, error } = await supabase.from('servicios').select('estado')
    
    if (error) {
      console.error(error)
      setCargando(false)
      return
    }

    // 2. Procesar la data para agruparla y contarla
    const conteo = {}
    let total = 0

    servicios.forEach(srv => {
      const estado = srv.estado || 'EN ESPERA'
      conteo[estado] = (conteo[estado] || 0) + 1
      total++
    })

    // 3. Formatear para Recharts y la Tabla
    const dataFormateada = Object.keys(conteo).map(estado => ({
      name: estado,
      value: conteo[estado],
      porcentaje: ((conteo[estado] / total) * 100).toFixed(0) // Sin decimales como en tu Excel
    }))

    // Ordenar de mayor a menor cantidad
    dataFormateada.sort((a, b) => b.value - a.value)

    setDatosGrafico(dataFormateada)
    setTotalServicios(total)
    setCargando(false)
  }

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  // ================= DISEÑO (VARIABLES CSS) =================
  const theme = {
    bgApp: '#F8FAFC', bgCard: '#FFFFFF', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0',
    primary: '#2563EB'
  }

  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }
  const thStyle = { padding: '12px 16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}`, textAlign: 'left' }
  const tdStyle = { padding: '12px 16px', fontSize: '14px', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }

  // Tooltip personalizado para el gráfico
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '10px', border: `1px solid ${theme.border}`, borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: theme.textMain }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: theme.primary }}>Cantidad: {payload[0].value} ({payload[0].payload.porcentaje}%)</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* TOP BAR */}
      <TopBar />

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: theme.textMain, fontSize: '28px', fontWeight: '800' }}>Panel de Control Principal</h2>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: '16px' }}>Estado general de los trabajos y servicios activos.</p>
        </div>

        {/* MENÚ RÁPIDO DE MÓDULOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <button onClick={() => navigate('/servicios')} style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'transform 0.2s', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '32px' }}>🛠️</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Servicios</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Bandeja de requerimientos</div>
            </div>
          </button>
          
          <button onClick={() => navigate('/proveedores')} style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'transform 0.2s', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '32px' }}>🏢</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Proveedores</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Directorio y contactos</div>
            </div>
          </button>

          <button style={{ ...cardStyle, opacity: 0.7, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '32px' }}>👥</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Usuarios</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Próximamente</div>
            </div>
          </button>

          <button style={{ ...cardStyle, opacity: 0.7, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '32px' }}>⚙️</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Configuración</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Próximamente</div>
            </div>
          </button>
        </div>

        {/* ÁREA DE ESTADÍSTICAS */}
        {cargando ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '60px', color: theme.textMuted }}>Cargando métricas...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* GRÁFICO DE PASTEL */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 20px 0', color: theme.textMain, width: '100%', textAlign: 'left' }}>Estado de Trabajos</h3>
              
              {datosGrafico.length === 0 ? (
                <div style={{ padding: '60px', color: theme.textMuted }}>No hay servicios registrados.</div>
              ) : (
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosGrafico}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, porcentaje }) => `${name} (${porcentaje}%)`}
                        outerRadius={130}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {datosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORES_ESTADO[entry.name] || '#CBD5E1'} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* TABLA RESUMEN */}
            <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '24px' }}>
                <h3 style={{ margin: 0, color: theme.textMain }}>Resumen General</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Estado</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {datosGrafico.map((row, index) => (
                    <tr key={index}>
                      <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORES_ESTADO[row.name] || '#CBD5E1' }}></div>
                        {row.name}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{row.value}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{row.porcentaje}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: '#F8FAFC' }}>
                    <td style={{ padding: '16px', fontWeight: '800', color: theme.textMain }}>Total General</td>
                    <td style={{ padding: '16px', fontWeight: '800', color: theme.textMain, textAlign: 'right' }}>{totalServicios}</td>
                    <td style={{ padding: '16px', fontWeight: '800', color: theme.textMain, textAlign: 'right' }}>100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default Dashboard