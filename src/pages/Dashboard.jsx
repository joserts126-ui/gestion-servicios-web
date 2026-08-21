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
  
  // Variables para Cancelados (Modal)
  const [detalleCancelados, setDetalleCancelados] = useState([])
  const [mostrarModalCancelados, setMostrarModalCancelados] = useState(false)

  // Filtros de Tiempo interactivos (Línea de tiempo)
  const [filtroAnio, setFiltroAnio] = useState('ALL')
  const [filtroMes, setFiltroMes] = useState('ALL')
  const [aniosDisponibles, setAniosDisponibles] = useState([])
  const [rawServicios, setRawServicios] = useState([])

  // ================= PALETA DE COLORES INSTITUCIONAL (Centenario) =================
  const theme = {
    bgApp: '#F4F7F9',
    bgCard: '#FFFFFF',
    textMain: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    primary: '#0B2F6D',
    accent: '#D4AF37',
    danger: '#DC2626'
  }

  // Colores exactos vinculados a los nombres reales de la base de datos
  const COLORES_ESTADO = {
    'PENDIENTE': '#94A3B8',                 // Gris Claro
    'DOCUMENTACION INGRESO': '#64748B',      // Gris Oscuro
    'COTIZACIÓN': '#3B82F6',                 // Azul Claro
    'ESPERA DE APROBACION': '#D4AF37',       // Dorado / Ámbar
    'EN EJECUCIÓN': '#10B981',               // Verde Esmeralda
    'EJECUTADO': '#059669',                  // Verde Oscuro
    'COMPLETADO': '#0B2F6D',                 // Azul Marino Profundo (Éxito final)
    'CANCELADOS / BAJAS': '#EF4444'          // Rojo Suave (Agrupados)
  }

  // Orden estricto del proceso
  const ORDEN_PROCESO = [
    'PENDIENTE',
    'DOCUMENTACION INGRESO',
    'COTIZACIÓN',
    'ESPERA DE APROBACION',
    'EN EJECUCIÓN',
    'EJECUTADO',
    'COMPLETADO',
    'CANCELADOS / BAJAS'
  ]

  const MESES = [
    { val: '0', label: 'Ene' }, { val: '1', label: 'Feb' }, { val: '2', label: 'Mar' },
    { val: '3', label: 'Abr' }, { val: '4', label: 'May' }, { val: '5', label: 'Jun' },
    { val: '6', label: 'Jul' }, { val: '7', label: 'Ago' }, { val: '8', label: 'Sep' },
    { val: '9', label: 'Oct' }, { val: '10', label: 'Nov' }, { val: '11', label: 'Dic' }
  ]

  const cargarEstadisticasDB = async () => {
    setCargando(true)
    const { data: servicios, error } = await supabase.from('servicios').select('idservicio, estado, fechasolicitud')
    
    if (error) {
      console.error(error)
      setCargando(false)
      return
    }
    
    // Extraer años únicos para los filtros de la línea de tiempo
    const años = [...new Set(servicios.map(s => {
      if (!s.fechasolicitud) return null;
      // Tratar la fecha de manera segura
      const [year] = s.fechasolicitud.split('-');
      return year;
    }))].filter(Boolean).sort((a, b) => b - a); // Ordenar descendente (más recientes primero)
    
    setAniosDisponibles(años);
    setRawServicios(servicios || [])
    aplicarFiltrosYAgrupar(servicios || [], 'ALL', 'ALL')
    setCargando(false)
  }

  const aplicarFiltrosYAgrupar = (serviciosBase, anioSel, mesSel) => {
    let serviciosFiltrados = serviciosBase

    // 1. Filtrar por Año y Mes si no es "ALL"
    if (anioSel !== 'ALL') {
      serviciosFiltrados = serviciosBase.filter(srv => {
        if (!srv.fechasolicitud) return false
        const [y, m] = srv.fechasolicitud.split('-') // Formato YYYY-MM-DD
        if (y !== anioSel) return false
        if (mesSel !== 'ALL' && parseInt(m) - 1 !== parseInt(mesSel)) return false
        return true
      })
    }

    // 2. Contar y Agrupar
    const conteo = {}
    const desgloseCanceladosTemp = []
    let total = 0

    serviciosFiltrados.forEach(srv => {
      const estadoOriginal = srv.estado?.toUpperCase() || 'PENDIENTE'
      let estadoAgrupado = estadoOriginal

      // Agrupación de Cancelados
      if (estadoOriginal.includes('CANCELADO')) {
        estadoAgrupado = 'CANCELADOS / BAJAS'
        const idx = desgloseCanceladosTemp.findIndex(d => d.estado === estadoOriginal)
        if (idx > -1) desgloseCanceladosTemp[idx].cantidad++
        else desgloseCanceladosTemp.push({ estado: estadoOriginal, cantidad: 1 })
      }

      conteo[estadoAgrupado] = (conteo[estadoAgrupado] || 0) + 1
      total++
    })

    setDetalleCancelados(desgloseCanceladosTemp)

    // 3. Formatear y Ordenar por Flujo de Proceso
    const dataFormateada = Object.keys(conteo).map(estado => ({
      name: estado,
      value: conteo[estado],
      porcentaje: total > 0 ? ((conteo[estado] / total) * 100).toFixed(0) : 0
    }))

    // Aplicar el orden del arreglo ORDEN_PROCESO
    dataFormateada.sort((a, b) => {
      const indexA = ORDEN_PROCESO.indexOf(a.name)
      const indexB = ORDEN_PROCESO.indexOf(b.name)
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })

    setDatosGrafico(dataFormateada)
    setTotalServicios(total)
  }

  useEffect(() => { cargarEstadisticasDB() }, [])

  // Controladores de los filtros de línea de tiempo
  const cambiarAnio = (anio) => {
    setFiltroAnio(anio)
    if (anio === 'ALL') setFiltroMes('ALL') // Resetea mes si elige Todos los Años
    aplicarFiltrosYAgrupar(rawServicios, anio, anio === 'ALL' ? 'ALL' : filtroMes)
  }

  const cambiarMes = (mes) => {
    setFiltroMes(mes)
    aplicarFiltrosYAgrupar(rawServicios, filtroAnio, mes)
  }

  const cardStyle = { backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }
  const thStyle = { padding: '14px 16px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F8FAFC', borderBottom: `2px solid ${theme.border}`, textAlign: 'left' }
  const tdStyle = { padding: '14px 16px', fontSize: '13px', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, fontWeight: '600' }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'white', padding: '12px 16px', border: `1px solid ${theme.border}`, borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px 0', fontWeight: '800', color: theme.textMain, fontSize: '14px' }}>{payload[0].name}</p>
          <p style={{ margin: 0, color: payload[0].payload.fill || theme.primary, fontWeight: '600' }}>{payload[0].value} Servicios ({payload[0].payload.porcentaje}%)</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar />

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        {/* Cabecera Principal */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: theme.primary, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Panel de Control Estratégico</h2>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: '15px' }}>Monitoreo en tiempo real del flujo de requerimientos.</p>
        </div>

        {/* LÍNEA DE TIEMPO (FILTROS) */}
        <div style={{ backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', border: `1px solid ${theme.border}`, marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Selector de Años */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', width: '60px' }}>Año:</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => cambiarAnio('ALL')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: filtroAnio === 'ALL' ? theme.primary : '#F1F5F9', color: filtroAnio === 'ALL' ? 'white' : theme.textMuted }}>Histórico Total</button>
              {aniosDisponibles.map(anio => (
                <button key={anio} onClick={() => cambiarAnio(anio)} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: filtroAnio === anio ? theme.primary : '#F1F5F9', color: filtroAnio === anio ? 'white' : theme.textMuted }}>{anio}</button>
              ))}
            </div>
          </div>

          {/* Selector de Meses (Solo visible si hay un Año específico seleccionado) */}
          {filtroAnio !== 'ALL' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: `1px dashed ${theme.border}` }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: theme.textMuted, textTransform: 'uppercase', width: '60px' }}>Mes:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => cambiarMes('ALL')} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: filtroMes === 'ALL' ? theme.accent : '#F1F5F9', color: filtroMes === 'ALL' ? 'white' : theme.textMuted }}>Todos los meses</button>
                {MESES.map(mes => (
                  <button key={mes.val} onClick={() => cambiarMes(mes.val)} style={{ padding: '6px 16px', borderRadius: '20px', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', backgroundColor: filtroMes === mes.val ? theme.accent : '#F1F5F9', color: filtroMes === mes.val ? 'white' : theme.textMuted }}>{mes.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MENÚ RÁPIDO DE MÓDULOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
          <button onClick={() => navigate('/servicios')} style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left', backgroundColor: theme.primary, color: 'white' }}>
            <div style={{ fontSize: '36px', opacity: 0.9 }}>📊</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px' }}>Servicios</div>
              <div style={{ color: '#E2E8F0', fontSize: '13px' }}>Bandeja de requerimientos</div>
            </div>
          </button>
          
          <button onClick={() => navigate('/proveedores')} style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '36px' }}>🏢</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Proveedores</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Directorio y contactos</div>
            </div>
          </button>

          <button style={{ ...cardStyle, opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '36px', filter: 'grayscale(100%)' }}>👥</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Usuarios</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Módulo bloqueado</div>
            </div>
          </button>

          <button style={{ ...cardStyle, opacity: 0.6, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '16px', border: 'none', textAlign: 'left' }}>
            <div style={{ fontSize: '36px', filter: 'grayscale(100%)' }}>⚙️</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.textMain }}>Configuración</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Módulo bloqueado</div>
            </div>
          </button>
        </div>

        {/* ÁREA DE ESTADÍSTICAS */}
        {cargando ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '80px', color: theme.primary, fontWeight: 'bold' }}>Sincronizando información de la base de datos...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            {/* GRÁFICO DE PASTEL */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', borderTop: `4px solid ${theme.accent}` }}>
              <h3 style={{ margin: '0 0 24px 0', color: theme.textMain, width: '100%', textAlign: 'left', fontSize: '18px', fontWeight: '800' }}>Distribución del Flujo de Trabajo</h3>
              
              {datosGrafico.length === 0 ? (
                <div style={{ padding: '80px', color: theme.textMuted, fontStyle: 'italic' }}>No hay servicios en el periodo seleccionado.</div>
              ) : (
                <div style={{ width: '100%', height: '420px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={datosGrafico}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, porcentaje }) => `${name} (${porcentaje}%)`}
                        outerRadius={140}
                        innerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {datosGrafico.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORES_ESTADO[entry.name] || '#CBD5E1'} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={40} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* TABLA RESUMEN */}
            <div style={{ ...cardStyle, overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '24px', borderBottom: `1px solid ${theme.border}`, backgroundColor: 'white' }}>
                <h3 style={{ margin: 0, color: theme.textMain, fontSize: '18px', fontWeight: '800' }}>Métricas por Estado del Proceso</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Estado / Etapa</th>
                      <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>Cant.</th>
                      <th style={{ ...thStyle, textAlign: 'right', width: '80px' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosGrafico.map((row, index) => {
                      const isCancelado = row.name === 'CANCELADOS / BAJAS';
                      return (
                        <tr key={index} style={{ backgroundColor: isCancelado ? '#FEF2F2' : 'transparent' }}>
                          <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '14px', height: '14px', borderRadius: '4px', backgroundColor: COLORES_ESTADO[row.name] || '#CBD5E1', flexShrink: 0 }}></div>
                            <span style={{ color: isCancelado ? theme.danger : theme.textMain }}>{row.name}</span>
                            
                            {isCancelado && (
                              <button onClick={() => setMostrarModalCancelados(true)} style={{ background: 'none', border: `1px solid #FCA5A5`, borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer', color: theme.danger, fontWeight: 'bold', marginLeft: 'auto' }} title="Ver desglose">👁️ Ver</button>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: isCancelado ? theme.danger : theme.textMain }}>{row.value}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: isCancelado ? theme.danger : theme.textMain }}>{row.porcentaje}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              <div style={{ padding: '20px 24px', backgroundColor: theme.primary, display: 'flex', justifyContent: 'space-between', color: 'white', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>TOTAL DE SERVICIOS EN EL PERIODO:</div>
                <div style={{ fontSize: '24px', fontWeight: '900' }}>{totalServicios}</div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* MODAL DESGLOSE DE CANCELADOS */}
      {mostrarModalCancelados && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', padding: '0', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', backgroundColor: '#FEF2F2', borderBottom: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: theme.danger, fontSize: '18px', fontWeight: '800' }}>Desglose de Bajas / Cancelaciones</h3>
              <button onClick={() => setMostrarModalCancelados(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: theme.danger }}>×</button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {detalleCancelados.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.textMuted }}>No hay detalle disponible.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detalleCancelados.map((item, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F8FAFC', border: `1px solid ${theme.border}`, borderRadius: '8px' }}>
                      <span style={{ fontWeight: '600', color: theme.textMain, fontSize: '14px' }}>{item.estado}</span>
                      <span style={{ fontWeight: '800', color: theme.danger, fontSize: '16px' }}>{item.cantidad}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F8FAFC' }}>
              <button onClick={() => setMostrarModalCancelados(false)} style={{ padding: '8px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', fontWeight: '700', cursor: 'pointer', color: theme.textMain }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard