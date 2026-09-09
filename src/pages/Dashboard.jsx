import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar'

function Dashboard() {
  const navigate = useNavigate()
  
  // ================= ESTADOS DE DATOS =================
  const [rawServicios, setRawServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [cargando, setCargando] = useState(true)
  
  // ================= ESTADOS DE FILTROS =================
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState([])
  const [filtroPrioridad, setFiltroPrioridad] = useState([])
  const [filtroLugar, setFiltroLugar] = useState([])
  
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mostrarSinFecha, setMostrarSinFecha] = useState(false)

  // ================= ESTADOS DE UI (Dropdowns y Modales) =================
  const [mostrarMenuEstado, setMostrarMenuEstado] = useState(false)
  const [mostrarMenuPrioridad, setMostrarMenuPrioridad] = useState(false)
  const [mostrarMenuLugar, setMostrarMenuLugar] = useState(false)
  const [mostrarModalCancelados, setMostrarModalCancelados] = useState(false)

  // ================= ESTADOS CALCULADOS PARA GRÁFICOS =================
  const [datosGrafico, setDatosGrafico] = useState([])
  const [totalServicios, setTotalServicios] = useState(0)
  const [detalleCancelados, setDetalleCancelados] = useState([])

  // ================= PALETA DE COLORES =================
  const theme = { bgApp: '#F4F7F9', bgCard: '#FFFFFF', textMain: '#0F172A', textMuted: '#64748B', border: '#E2E8F0', primary: '#0B2F6D', accent: '#D4AF37', danger: '#DC2626' }

  const COLORES_ESTADO = {
    'PENDIENTE': '#94A3B8', 'DOCUMENTACION INGRESO': '#64748B', 'COTIZACIÓN': '#3B82F6', 
    'ESPERA DE APROBACION': '#D4AF37', 'EN EJECUCIÓN': '#10B981', 'EJECUTADO': '#059669', 
    'COMPLETADO': '#0B2F6D', 'CANCELADOS / BAJAS': '#EF4444'
  }

  const ORDEN_PROCESO = ['COMPLETADO', 'EJECUTADO', 'EN EJECUCIÓN', 'DOCUMENTACION INGRESO', 'ESPERA DE APROBACION', 'COTIZACIÓN', 'PENDIENTE', 'CANCELADOS / BAJAS']
  const LISTA_ESTADOS_FILTRO = ['PENDIENTE', 'COTIZACIÓN', 'ESPERA DE APROBACION', 'EN EJECUCIÓN', 'EJECUTADO', 'COMPLETADO', 'DOCUMENTACION INGRESO', 'CANCELADO', 'REQUERIMIENTO CANCELADO']

  // ================= CARGA DE DATOS =================
  const cargarDatosDB = async () => {
    setCargando(true)
    const [resSrv, resLugares] = await Promise.all([
      supabase.from('servicios').select('idservicio, servicio, estado, fechasolicitud, prioridad, idlugar'),
      supabase.from('lugarejecucion').select('*').eq('activo', true)
    ])
    
    if (resSrv.data) setRawServicios(resSrv.data)
    if (resLugares.data) setLugares(resLugares.data)
    
    setCargando(false)
  }

  useEffect(() => { cargarDatosDB() }, [])

  // ================= MOTOR DE FILTRADO CENTRALIZADO =================
  const datosFiltrados = useMemo(() => {
    return rawServicios.filter(srv => {
      if (busqueda) {
        const term = busqueda.toLowerCase();
        const matchNombre = srv.servicio?.toLowerCase().includes(term);
        const matchId = srv.idservicio?.toString().includes(term);
        if (!matchNombre && !matchId) return false;
      }

      if (filtroEstado.length > 0 && !filtroEstado.includes(srv.estado)) return false;
      if (filtroPrioridad.length > 0 && !filtroPrioridad.includes(srv.prioridad)) return false;
      if (filtroLugar.length > 0 && !filtroLugar.includes(srv.idlugar?.toString())) return false;

      const tieneFecha = !!srv.fechasolicitud;
      
      if (mostrarSinFecha) return !tieneFecha;

      if (fechaInicio || fechaFin) {
        if (!tieneFecha) return false; 
        const fechaSrv = new Date(srv.fechasolicitud);
        if (fechaInicio && fechaSrv < new Date(fechaInicio)) return false;
        if (fechaFin && fechaSrv > new Date(fechaFin)) return false;
      }

      return true;
    });
  }, [rawServicios, busqueda, filtroEstado, filtroPrioridad, filtroLugar, fechaInicio, fechaFin, mostrarSinFecha]);

  const cantidadSinFecha = rawServicios.filter(s => !s.fechasolicitud).length;

  // LÓGICA MEJORADA: Ordenar filtro de lugares en el Dashboard
  const lugaresConConteo = useMemo(() => {
    const conteo = {};
    
    rawServicios.forEach(srv => {
      // Aplicamos todos los filtros EXCEPTO el de lugar
      let pasaFiltro = true;
      if (busqueda) {
        const term = busqueda.toLowerCase();
        if (!srv.servicio?.toLowerCase().includes(term) && !srv.idservicio?.toString().includes(term)) pasaFiltro = false;
      }
      if (filtroEstado.length > 0 && !filtroEstado.includes(srv.estado)) pasaFiltro = false;
      if (filtroPrioridad.length > 0 && !filtroPrioridad.includes(srv.prioridad)) pasaFiltro = false;
      
      const tieneFecha = !!srv.fechasolicitud;
      if (mostrarSinFecha && tieneFecha) pasaFiltro = false;
      if (fechaInicio || fechaFin) {
        if (!tieneFecha) pasaFiltro = false; 
        else {
          const fechaSrv = new Date(srv.fechasolicitud);
          if (fechaInicio && fechaSrv < new Date(fechaInicio)) pasaFiltro = false;
          if (fechaFin && fechaSrv > new Date(fechaFin)) pasaFiltro = false;
        }
      }

      if (pasaFiltro && srv.idlugar) {
         conteo[srv.idlugar] = (conteo[srv.idlugar] || 0) + 1;
      }
    });

    return lugares
      .map(l => ({ ...l, cantidad: conteo[l.idlugar] || 0 }))
      .filter(l => l.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad); // Orden Descendente
      
  }, [rawServicios, lugares, busqueda, filtroEstado, filtroPrioridad, fechaInicio, fechaFin, mostrarSinFecha]);

  // ================= PROCESAMIENTO PARA LOS GRÁFICOS =================
  useEffect(() => {
    const conteo = {}
    const desgloseCanceladosTemp = []
    let total = 0

    datosFiltrados.forEach(srv => {
      const estadoOriginal = srv.estado?.toUpperCase() || 'PENDIENTE'
      let estadoAgrupado = estadoOriginal

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

    const dataFormateada = Object.keys(conteo).map(estado => ({
      name: estado,
      value: conteo[estado],
      porcentaje: total > 0 ? ((conteo[estado] / total) * 100).toFixed(0) : 0
    }))

    dataFormateada.sort((a, b) => {
      const indexA = ORDEN_PROCESO.indexOf(a.name)
      const indexB = ORDEN_PROCESO.indexOf(b.name)
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })

    setDatosGrafico(dataFormateada)
    setTotalServicios(total)
  }, [datosFiltrados])


  // ================= UTILIDADES UI =================
  const toggleFiltro = (estadoActual, setEstado, valor) => {
    if (estadoActual.includes(valor)) setEstado(estadoActual.filter(item => item !== valor));
    else setEstado([...estadoActual, valor]);
  };

  const handleSelectAllLugares = () => {
    if (filtroLugar.length === lugaresConConteo.length) setFiltroLugar([])
    else setFiltroLugar(lugaresConConteo.map(l => l.idlugar.toString()))
  };

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

      {/* OVERLAY INVISIBLE PARA CERRAR MENÚS AL HACER CLIC FUERA */}
      {(mostrarMenuEstado || mostrarMenuPrioridad || mostrarMenuLugar) && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 40 }}
          onClick={() => { setMostrarMenuEstado(false); setMostrarMenuPrioridad(false); setMostrarMenuLugar(false); }}
        />
      )}

      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        {/* Cabecera Principal */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: theme.primary, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Panel de Control Estratégico</h2>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: '15px' }}>Monitoreo en tiempo real del flujo de requerimientos.</p>
        </div>

        {/* BARRA DE FILTROS AVANZADA */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '32px', backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', border: `1px solid ${theme.border}`, alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          
          {/* Buscador */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <input 
              type="text" placeholder="🔍 Buscar servicio o ID..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '13px', outline: 'none', backgroundColor: theme.bgApp, color: theme.textMain, boxSizing: 'border-box' }}
            />
          </div>

          {/* Rango de Fechas */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', borderLeft: `1px solid ${theme.border}`, borderRight: `1px solid ${theme.border}` }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textMuted }}>📅 Del:</span>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.textMuted }}>al</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }} />
          </div>

          {/* Filtro Estado */}
          <div style={{ position: 'relative', zIndex: mostrarMenuEstado ? 50 : 1 }}>
            <button onClick={() => setMostrarMenuEstado(!mostrarMenuEstado)} style={{ padding: '10px 16px', backgroundColor: filtroEstado.length > 0 ? '#EFF6FF' : 'white', border: `1px solid ${filtroEstado.length > 0 ? '#BFDBFE' : theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: filtroEstado.length > 0 ? theme.primary : theme.textMain }}>
              Estado {filtroEstado.length > 0 && `(${filtroEstado.length})`} ▼
            </button>
            {mostrarMenuEstado && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px', width: '220px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                {LISTA_ESTADOS_FILTRO.map(est => (
                  <label key={est} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px' }}>
                    <input type="checkbox" checked={filtroEstado.includes(est)} onChange={() => toggleFiltro(filtroEstado, setFiltroEstado, est)} style={{ marginRight: '8px' }} /> {est}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtro Prioridad */}
          <div style={{ position: 'relative', zIndex: mostrarMenuPrioridad ? 50 : 1 }}>
            <button onClick={() => setMostrarMenuPrioridad(!mostrarMenuPrioridad)} style={{ padding: '10px 16px', backgroundColor: filtroPrioridad.length > 0 ? '#EFF6FF' : 'white', border: `1px solid ${filtroPrioridad.length > 0 ? '#BFDBFE' : theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: filtroPrioridad.length > 0 ? theme.primary : theme.textMain }}>
              Prioridad {filtroPrioridad.length > 0 && `(${filtroPrioridad.length})`} ▼
            </button>
            {mostrarMenuPrioridad && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '8px', width: '150px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                {['Baja', 'Media', 'Alta', 'Crítica'].map(prio => (
                  <label key={prio} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px' }}>
                    <input type="checkbox" checked={filtroPrioridad.includes(prio)} onChange={() => toggleFiltro(filtroPrioridad, setFiltroPrioridad, prio)} style={{ marginRight: '8px' }} /> {prio}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtro Lugar (Actualizado) */}
          <div style={{ position: 'relative', zIndex: mostrarMenuLugar ? 50 : 1 }}>
            <button onClick={() => setMostrarMenuLugar(!mostrarMenuLugar)} style={{ padding: '10px 16px', backgroundColor: filtroLugar.length > 0 ? '#EFF6FF' : 'white', border: `1px solid ${filtroLugar.length > 0 ? '#BFDBFE' : theme.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: filtroLugar.length > 0 ? theme.primary : theme.textMain }}>
              Sede {filtroLugar.length > 0 && `(${filtroLugar.length})`} ▼
            </button>
            {mostrarMenuLugar && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', width: '250px', maxHeight: '300px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}`, marginBottom: '6px' }}>
                   <input type="checkbox" checked={filtroLugar.length === lugaresConConteo.length && lugaresConConteo.length > 0} onChange={handleSelectAllLugares} /> Seleccionar Todo
                </label>
                {lugaresConConteo.length === 0 && <div style={{ fontSize: '12px', color: theme.textMuted }}>No hay lugares.</div>}
                {lugaresConConteo.map(lug => (
                  <label key={lug.idlugar} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}>
                    <input type="checkbox" checked={filtroLugar.includes(lug.idlugar.toString())} onChange={() => toggleFiltro(filtroLugar, setFiltroLugar, lug.idlugar.toString())} style={{ marginRight: '8px' }} /> 
                    <span style={{ flex: 1 }}>{lug.lugarejecucion}</span>
                    <span style={{ color: theme.textMuted, fontSize: '11px', fontWeight: 'bold' }}>({lug.cantidad})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN MINIMALISTA DE SIN FECHA */}
          <button 
            onClick={() => setMostrarSinFecha(!mostrarSinFecha)}
            style={{ 
              padding: '10px 16px', 
              backgroundColor: mostrarSinFecha ? theme.danger : (cantidadSinFecha > 0 ? '#FEF2F2' : 'white'), 
              color: mostrarSinFecha ? 'white' : (cantidadSinFecha > 0 ? theme.danger : theme.textMain), 
              border: `1px solid ${mostrarSinFecha ? '#B91C1C' : (cantidadSinFecha > 0 ? '#FCA5A5' : theme.border)}`, 
              borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s'
            }}
          >
            {mostrarSinFecha ? 'Quitar Filtro Sin Fecha' : `⚠️ Sin Fecha (${cantidadSinFecha})`}
          </button>

          {/* Limpiar Filtros Generales */}
          {(filtroEstado.length > 0 || filtroPrioridad.length > 0 || filtroLugar.length > 0 || busqueda || fechaInicio || fechaFin) && (
            <button onClick={() => { setFiltroEstado([]); setFiltroPrioridad([]); setFiltroLugar([]); setBusqueda(''); setFechaInicio(''); setFechaFin(''); setMostrarSinFecha(false); }} style={{ padding: '10px 16px', backgroundColor: '#FEF2F2', color: theme.danger, border: '1px solid #FCA5A5', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', marginLeft: 'auto' }}>
              ✕ Limpiar
            </button>
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
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Módulo en desarrollo</div>
            </div>
          </button>

          {/* NUEVO BOTÓN: Control de Inventario PTAR */}
          <button onClick={() => navigate('/inventario')} style={{ ...cardStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', border: `1px solid ${theme.primary}`, textAlign: 'left', backgroundColor: '#F0F9FF' }}>
            <div style={{ fontSize: '36px' }}>📦</div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '18px', color: theme.primary }}>Inventario PTAR</div>
              <div style={{ color: theme.textMuted, fontSize: '13px' }}>Gestión de stock e insumos</div>
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
                <div style={{ padding: '80px', color: theme.textMuted, fontStyle: 'italic' }}>No hay resultados para los filtros seleccionados.</div>
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
                <div style={{ fontSize: '14px', fontWeight: '600' }}>SERVICIOS EN ESTA VISTA:</div>
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