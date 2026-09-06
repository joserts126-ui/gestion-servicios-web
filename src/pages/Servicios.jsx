import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import TopBar from '../components/TopBar'
import CentroEvaluacion from '../components/CentroEvaluacion'
import ServicioModal from '../components/ServicioModal'

function Servicios() {
  const navigate = useNavigate()
  
  const [listaServicios, setListaServicios] = useState([])
  const [lugares, setLugares] = useState([])
  const [tiposInfraestructura, setTiposInfraestructura] = useState([]) 
  const [tiposServicio, setTiposServicio] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [subsistemas, setSubsistemas] = useState([])
  const [catImpuestos, setCatImpuestos] = useState([])
  const [catUnidades, setCatUnidades] = useState([]) // NUEVO: Para traer nombres de unidades
  const [cargando, setCargando] = useState(true)
  const [idUsuarioActual, setIdUsuarioActual] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState([])
  const [filtroPrioridad, setFiltroPrioridad] = useState([])
  const [filtroLugar, setFiltroLugar] = useState([])

  const [mostrarMenuEstado, setMostrarMenuEstado] = useState(false)
  const [mostrarMenuPrioridad, setMostrarMenuPrioridad] = useState(false)
  const [mostrarMenuLugar, setMostrarMenuLugar] = useState(false)

  const [sortConfig, setSortConfig] = useState([{ key: 'idservicio', direction: 'desc' }])
  const [mostrarTooltipOrden, setMostrarTooltipOrden] = useState(false)

  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina, setRegistrosPorPagina] = useState(50)

  const [filasExpandidas, setFilasExpandidas] = useState([])
  const [menuAccionesFila, setMenuAccionesFila] = useState(null)
  const [mostrarMenuColumnas, setMostrarMenuColumnas] = useState(false)
  
  const [columnas, setColumnas] = useState({
    id: true, prioridad: true, fechaCreacion: true, servicio: true, lugar: true,
    proveedor: true, monto: true, responsable: false, docs: true, fechasNuevas: false, progreso: true, estado: true
  })

  const [colWidths, setColWidths] = useState({
    check: 40, expand: 40, id: 70, prioridad: 80, fechaCreacion: 90, servicio: 260, lugar: 100,
    proveedor: 160, monto: 110, responsable: 100, docs: 110, fechasNuevas: 90, progreso: 120, estado: 140, acciones: 50
  })

  const startResize = (e, colKey) => {
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = colWidths[colKey]

    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(50, startWidth + (moveEvent.clientX - startX))
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }))
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'default'
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
  }

  const [mostrarModalPrincipal, setMostrarModalPrincipal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null)
  const [mostrarModalHomologacion, setMostrarModalHomologacion] = useState(false)
  const [servicioHomologacion, setServicioHomologacion] = useState(null)

  // ===== ESTADOS PARA EL EXPORTADOR CSV AVANZADO =====
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState([])
  const [mostrarModalExportar, setMostrarModalExportar] = useState(false)
  
  // NIVEL 1: Datos del Requerimiento (Servicio)
  const [columnasExportar, setColumnasExportar] = useState({
    id: true, prioridad: true, fechaSolicitud: true, servicio: true, lugar: true,
    proveedorAprobado: false, montoAprobado: false, responsable: true, docs: true, progreso: true, estado: true
  })

  // NIVEL 2: Datos de la Cotización
  const [columnasCotExportar, setColumnasCotExportar] = useState({
    cot_id: false, cot_proveedor: true, cot_moneda: true, cot_estado: true, cot_monto: true, 
    cot_condicionPago: false, cot_plazo: false, cot_fechaEnvio: true, cot_fechaVisita: false, 
    cot_fechaRecepcion: true, cot_fechaAceptacion: false, cot_fechaInicio: false, cot_fechaFin: false
  })

  // NIVEL 3: Datos de los Ítems (Detalle Cotización)
  const [columnasDetExportar, setColumnasDetExportar] = useState({
    det_item: true, det_unidad: true, det_afectacion: false, det_cantidad: true, det_precio: true, det_subtotal: true
  })

  const cargarDatosIniciales = async () => {
    setCargando(true)
    const { data: dataServicios, error } = await supabase.from('servicios').select(`
      *, lugarejecucion(lugarejecucion), usuario(nombre), tipoinfraestructura(tipoinfraestructura),
      tiposervicio(tiposervicio), sistema(sistema), subsistema(sub_sistema),
      cotizaciones(
        idcotizacion, estado, fecha_envio_cotizacion, fecha_visita_tecnica, fecharecepcion, 
        fechaaceptacion, fechainicio, fechafin, gastos_generales, utilidades, plazo_dias, entregables,
        puntaje_eco, puntaje_plazo, puntaje_alcance, puntaje_pago, edicion_matriz, ruc,
        proveedor(razonsocial), moneda(moneda), formapago(formapago), detallecotizacion(*), comentario(comentario, fecha)
      )
    `);

    if (error) console.error("Error al cargar servicios:", error);
    if (dataServicios) setListaServicios(dataServicios)

    const fetchSafe = async (query) => { const { data } = await query; return data || [] }
    
    setLugares(await fetchSafe(supabase.from('lugarejecucion').select('*').eq('activo', true)))
    setTiposInfraestructura(await fetchSafe(supabase.from('tipoinfraestructura').select('*')))
    setTiposServicio(await fetchSafe(supabase.from('tiposervicio').select('*')))
    setSistemas(await fetchSafe(supabase.from('sistema').select('*')))
    setSubsistemas(await fetchSafe(supabase.from('subsistema').select('*')))
    setCatImpuestos(await fetchSafe(supabase.from('impuestos').select('*')))
    setCatUnidades(await fetchSafe(supabase.from('unidadmedida').select('*').eq('activo', true)))
    
    const dataUsuarios = await fetchSafe(supabase.from('usuario').select('*').eq('activo', true))
    if (dataUsuarios && dataUsuarios.length > 0) setIdUsuarioActual(dataUsuarios[0].idusuario)
    
    setCargando(false)
  }

  useEffect(() => { cargarDatosIniciales() }, [])
  useEffect(() => { setPaginaActual(1) }, [busqueda, filtroEstado, filtroPrioridad, filtroLugar])
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.closest('.menu-acciones-container') || e.target.closest('.filtro-dropdown-container') || e.target.closest('.modal-exportar-container')) return;
      setMenuAccionesFila(null); setMostrarMenuColumnas(false); setMostrarMenuEstado(false); setMostrarMenuPrioridad(false); setMostrarMenuLugar(false);
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const toggleFila = (id, e) => {
    e.stopPropagation()
    setFilasExpandidas(prev => prev.includes(id) ? prev.filter(filaId => filaId !== id) : [...prev, id])
  }

  const toggleAcciones = (id, e) => {
    e.stopPropagation()
    setMenuAccionesFila(prev => prev === id ? null : id)
    setMostrarMenuColumnas(false); setMostrarMenuEstado(false); setMostrarMenuPrioridad(false); setMostrarMenuLugar(false);
  }

  const handleSort = (key) => {
    setSortConfig(prev => {
      const existingIndex = prev.findIndex(item => item.key === key);
      if (existingIndex >= 0) {
        if (prev[existingIndex].direction === 'asc') {
          const newSort = [...prev]; newSort[existingIndex].direction = 'desc'; return newSort;
        } else {
          const newSort = prev.filter((_, i) => i !== existingIndex);
          return newSort.length > 0 ? newSort : [{ key: 'idservicio', direction: 'desc' }]; 
        }
      } else {
        return [...prev, { key, direction: 'asc' }];
      }
    })
  }
  
  const handleCheckboxChange = (valor, filtroActual, setFiltro) => setFiltro(filtroActual.includes(valor) ? filtroActual.filter(item => item !== valor) : [...filtroActual, valor])
  
  const handleSelectAll = (todasLasOpciones, filtroActual, setFiltro) => {
    if (filtroActual.length === todasLasOpciones.length) setFiltro([])
    else setFiltro([...todasLasOpciones])
  }

  const calcularTotalCotizacion = (cot) => {
    if (!cot.detallecotizacion || cot.detallecotizacion.length === 0) return 0
    let totalFinal = 0
    cot.detallecotizacion.forEach(fila => {
      const baseFila = fila.cantidad * fila.preciounitario
      const tipoImpuesto = catImpuestos.find(i => i.idimpuestos == fila.idimpuestos)?.impuesto
      if (tipoImpuesto === 'Incluido IGV') totalFinal += baseFila
      else if (tipoImpuesto === '+ IGV') totalFinal += (baseFila * 1.18)
      else totalFinal += baseFila
    })
    const adicionales = (parseFloat(cot.gastos_generales || 0) + parseFloat(cot.utilidades || 0)) * 1.18
    return totalFinal + adicionales
  }

  const getMontoAprobado = (srv) => {
    const cotAprobada = srv.cotizaciones?.find(c => c.estado?.toUpperCase() === 'APROBADA')
    return cotAprobada ? calcularTotalCotizacion(cotAprobada) : null
  }

  const pasaFiltros = (srv, filtroIgnorado) => {
    if (busqueda && !(srv.servicio?.toLowerCase() || '').includes(busqueda.toLowerCase()) && !(srv.lugarejecucion?.lugarejecucion || '').toLowerCase().includes(busqueda.toLowerCase()) && !(srv.orden_compra || '').toLowerCase().includes(busqueda.toLowerCase()) && !(srv.num_requerimiento || '').toLowerCase().includes(busqueda.toLowerCase()) && !srv.estado.toLowerCase().includes(busqueda.toLowerCase()) && !srv.idservicio.toString().includes(busqueda.toLowerCase()) && !(srv.responsable || '').toLowerCase().includes(busqueda.toLowerCase())) return false;
    if (filtroIgnorado !== 'estado' && filtroEstado.length > 0 && !filtroEstado.includes(srv.estado)) return false;
    if (filtroIgnorado !== 'prioridad' && filtroPrioridad.length > 0 && !filtroPrioridad.includes(srv.prioridad)) return false;
    if (filtroIgnorado !== 'lugar' && filtroLugar.length > 0 && !filtroLugar.includes(srv.idlugar?.toString())) return false;
    return true;
  }

  const estadosDisponibles = [...new Set(listaServicios.filter(s => pasaFiltros(s, 'estado')).map(s => s.estado))].filter(Boolean)
  const prioridadesDisponibles = [...new Set(listaServicios.filter(s => pasaFiltros(s, 'prioridad')).map(s => s.prioridad))].filter(Boolean)
  const lugaresIdsDisponibles = [...new Set(listaServicios.filter(s => pasaFiltros(s, 'lugar')).map(s => s.idlugar?.toString()))].filter(Boolean)
  const lugaresDisponibles = lugares.filter(l => lugaresIdsDisponibles.includes(l.idlugar.toString()))

  let datosProcesados = listaServicios.filter(s => pasaFiltros(s, null)).map(srv => ({ ...srv, montoAprobado: getMontoAprobado(srv) }))

  datosProcesados.sort((a, b) => {
    for (let i = 0; i < sortConfig.length; i++) {
      const { key, direction } = sortConfig[i];
      const getVal = (obj, k) => {
        if (k === 'lugar') return obj.lugarejecucion?.lugarejecucion || ''
        if (k === 'sistema') return obj.sistema?.sistema || obj.tipoinfraestructura?.tipoinfraestructura || ''
        if (k === 'monto') return obj.montoAprobado || 0 
        return obj[k]
      }
      let valA = getVal(a, key); let valB = getVal(b, key)
      if (valA === null || valA === undefined) valA = ''
      if (valB === null || valB === undefined) valB = ''
      
      if (key === 'idservicio' || key === 'progreso' || key === 'monto') { valA = Number(valA) || 0; valB = Number(valB) || 0; } 
      else { if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase() }

      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
    }
    return 0 
  })

  const totalPaginas = Math.ceil(datosProcesados.length / registrosPorPagina) || 1
  const indiceUltimoRegistro = paginaActual * registrosPorPagina
  const datosPaginados = datosProcesados.slice(indiceUltimoRegistro - registrosPorPagina, indiceUltimoRegistro)

  // ===== LÓGICA DE EXPORTACIÓN (NIVEL 3: ÍTEMS) =====
  const toggleSeleccionServicio = (id, e) => {
    e.stopPropagation()
    setServiciosSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleSeleccionarPagina = (e) => {
    e.stopPropagation()
    const idsPagina = datosPaginados.map(s => s.idservicio)
    const estanTodosSeleccionados = idsPagina.every(id => serviciosSeleccionados.includes(id))
    if (estanTodosSeleccionados) setServiciosSeleccionados(prev => prev.filter(id => !idsPagina.includes(id)))
    else setServiciosSeleccionados([...new Set([...serviciosSeleccionados, ...idsPagina])])
  }

  const generarCSV = () => {
    const dataAExportar = listaServicios.filter(s => serviciosSeleccionados.includes(s.idservicio));
    if (dataAExportar.length === 0) return;

    // 1. ARMAMOS LAS CABECERAS
    const cabeceras = [];
    if (columnasExportar.id) cabeceras.push("ID Servicio");
    if (columnasExportar.prioridad) cabeceras.push("Prioridad");
    if (columnasExportar.fechaSolicitud) cabeceras.push("F. Solicitud Srv");
    if (columnasExportar.servicio) cabeceras.push("Servicio/Proyecto");
    if (columnasExportar.lugar) cabeceras.push("Lugar");
    if (columnasExportar.proveedorAprobado) cabeceras.push("Prov. Ganador (Resumen)");
    if (columnasExportar.montoAprobado) cabeceras.push("Monto Ganador (Resumen)");
    if (columnasExportar.responsable) cabeceras.push("Responsable");
    if (columnasExportar.docs) { cabeceras.push("Nº Requerimiento"); cabeceras.push("Orden Compra"); }
    if (columnasExportar.progreso) cabeceras.push("Progreso (%)");
    if (columnasExportar.estado) cabeceras.push("Estado Srv.");

    const incluyeCotizaciones = Object.values(columnasCotExportar).some(v => v === true);
    if (incluyeCotizaciones) {
      if (columnasCotExportar.cot_id) cabeceras.push("ID Cot.");
      if (columnasCotExportar.cot_proveedor) cabeceras.push("Proveedor (Cotizado)");
      if (columnasCotExportar.cot_moneda) cabeceras.push("Moneda");
      if (columnasCotExportar.cot_estado) cabeceras.push("Estado (Cot)");
      if (columnasCotExportar.cot_monto) cabeceras.push("Monto (Cot)");
      if (columnasCotExportar.cot_condicionPago) cabeceras.push("Forma de Pago");
      if (columnasCotExportar.cot_plazo) cabeceras.push("Plazo (Dias)");
      if (columnasCotExportar.cot_fechaEnvio) cabeceras.push("F. Envío Cot");
      if (columnasCotExportar.cot_fechaVisita) cabeceras.push("F. Visita Tec");
      if (columnasCotExportar.cot_fechaRecepcion) cabeceras.push("F. Recepción");
      if (columnasCotExportar.cot_fechaAceptacion) cabeceras.push("F. Aprobación");
      if (columnasCotExportar.cot_fechaInicio) cabeceras.push("F. Inicio Real");
      if (columnasCotExportar.cot_fechaFin) cabeceras.push("F. Fin Real");
    }

    const incluyeDetalles = Object.values(columnasDetExportar).some(v => v === true);
    if (incluyeDetalles) {
      if (columnasDetExportar.det_item) cabeceras.push("Ítem (Detalle)");
      if (columnasDetExportar.det_unidad) cabeceras.push("Unidad");
      if (columnasDetExportar.det_cantidad) cabeceras.push("Cantidad");
      if (columnasDetExportar.det_precio) cabeceras.push("P.U. Neto");
      if (columnasDetExportar.det_afectacion) cabeceras.push("Afectación IGV");
      if (columnasDetExportar.det_subtotal) cabeceras.push("Subtotal Ítem");
    }

    let csvString = cabeceras.join(";") + "\n";

    // 2. ARMAMOS LAS FILAS (FLAT FILE 3 NIVELES)
    dataAExportar.forEach(row => {
      const limpiar = (texto) => {
        let str = String(texto || '');
        // Si el texto empieza con +, -, = o @, le inyectamos un espacio al inicio
        if (/^[+\-=@]/.test(str)) {
          str = ' ' + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };
      
      const filaServicioBase = [];
      const cotAprobada = row.cotizaciones?.find(c => c.estado?.toUpperCase() === 'APROBADA');
      const montoGanador = cotAprobada ? calcularTotalCotizacion(cotAprobada).toFixed(2) : '';
      const proveedorGanador = cotAprobada ? cotAprobada.proveedor?.razonsocial : '';

      if (columnasExportar.id) filaServicioBase.push(row.idservicio);
      if (columnasExportar.prioridad) filaServicioBase.push(limpiar(row.prioridad));
      if (columnasExportar.fechaSolicitud) filaServicioBase.push(limpiar(row.fechasolicitud));
      if (columnasExportar.servicio) filaServicioBase.push(limpiar(row.servicio));
      if (columnasExportar.lugar) filaServicioBase.push(limpiar(row.lugarejecucion?.lugarejecucion));
      if (columnasExportar.proveedorAprobado) filaServicioBase.push(limpiar(proveedorGanador));
      if (columnasExportar.montoAprobado) filaServicioBase.push(limpiar(montoGanador));
      if (columnasExportar.responsable) filaServicioBase.push(limpiar(row.responsable));
      if (columnasExportar.docs) { filaServicioBase.push(limpiar(row.num_requerimiento)); filaServicioBase.push(limpiar(row.orden_compra)); }
      if (columnasExportar.progreso) filaServicioBase.push(row.progreso || 0);
      if (columnasExportar.estado) filaServicioBase.push(limpiar(row.estado));

      const cotizacionesActivas = row.cotizaciones?.filter(c => !['Rechazada', 'De Baja'].includes(c.estado)) || [];
      
      if (incluyeCotizaciones && cotizacionesActivas.length > 0) {
        cotizacionesActivas.forEach(cot => {
          const filaCotBase = [...filaServicioBase];
          
          if (columnasCotExportar.cot_id) filaCotBase.push(cot.idcotizacion);
          if (columnasCotExportar.cot_proveedor) filaCotBase.push(limpiar(cot.proveedor?.razonsocial || cot.ruc));
          if (columnasCotExportar.cot_moneda) filaCotBase.push(limpiar(cot.moneda?.moneda));
          if (columnasCotExportar.cot_estado) filaCotBase.push(limpiar(cot.estado));
          if (columnasCotExportar.cot_monto) filaCotBase.push(limpiar(calcularTotalCotizacion(cot).toFixed(2)));
          if (columnasCotExportar.cot_condicionPago) filaCotBase.push(limpiar(cot.formapago?.formapago));
          if (columnasCotExportar.cot_plazo) filaCotBase.push(limpiar(cot.plazo_dias));
          if (columnasCotExportar.cot_fechaEnvio) filaCotBase.push(limpiar(cot.fecha_envio_cotizacion));
          if (columnasCotExportar.cot_fechaVisita) filaCotBase.push(limpiar(cot.fecha_visita_tecnica));
          if (columnasCotExportar.cot_fechaRecepcion) filaCotBase.push(limpiar(cot.fecharecepcion));
          if (columnasCotExportar.cot_fechaAceptacion) filaCotBase.push(limpiar(cot.fechaaceptacion));
          if (columnasCotExportar.cot_fechaInicio) filaCotBase.push(limpiar(cot.fechainicio));
          if (columnasCotExportar.cot_fechaFin) filaCotBase.push(limpiar(cot.fechafin));

          // Nivel 3: Ítems
          if (incluyeDetalles && cot.detallecotizacion && cot.detallecotizacion.length > 0) {
            cot.detallecotizacion.forEach(det => {
              const filaDetFinal = [...filaCotBase];
              if (columnasDetExportar.det_item) filaDetFinal.push(limpiar(det.item));
              if (columnasDetExportar.det_unidad) filaDetFinal.push(limpiar(catUnidades.find(u => u.idunidad === det.idunidad)?.unidadmedida));
              if (columnasDetExportar.det_cantidad) filaDetFinal.push(det.cantidad || 0);
              if (columnasDetExportar.det_precio) filaDetFinal.push(det.preciounitario || 0);
              if (columnasDetExportar.det_afectacion) filaDetFinal.push(limpiar(catImpuestos.find(i => i.idimpuestos === det.idimpuestos)?.impuesto));
              if (columnasDetExportar.det_subtotal) filaDetFinal.push((det.cantidad * det.preciounitario).toFixed(2));
              csvString += filaDetFinal.join(";") + "\n";
            });
          } else {
            const filaFinalVacia = [...filaCotBase];
            if (incluyeDetalles) Object.keys(columnasDetExportar).filter(k => columnasDetExportar[k]).forEach(() => filaFinalVacia.push(""));
            csvString += filaFinalVacia.join(";") + "\n";
          }
        });
      } else {
        const filaFinal = [...filaServicioBase];
        if (incluyeCotizaciones) Object.keys(columnasCotExportar).filter(k => columnasCotExportar[k]).forEach(() => filaFinal.push(""));
        if (incluyeDetalles) Object.keys(columnasDetExportar).filter(k => columnasDetExportar[k]).forEach(() => filaFinal.push(""));
        csvString += filaFinal.join(";") + "\n";
      }
    });

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Data_Servicios_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setMostrarModalExportar(false);
    setServiciosSeleccionados([]);
  };

  const renderSortIcon = (key) => {
    const index = sortConfig.findIndex(s => s.key === key);
    if (index === -1) return <span style={{ color: '#CBD5E1', marginLeft: '4px' }}>↕</span>;
    const dirIcon = sortConfig[index].direction === 'asc' ? '↑' : '↓';
    const numJerarquia = sortConfig.length > 1 ? <span style={{ fontSize: '9px', verticalAlign: 'super' }}>{index + 1}</span> : null;
    return <span style={{ color: theme.primary, marginLeft: '4px', fontWeight: 'bold' }}>{dirIcon}{numJerarquia}</span>;
  }

  const abrirModalNuevo = () => { setModoEdicion(false); setServicioSeleccionado(null); setMostrarModalPrincipal(true); }
  const abrirModalEditar = (srv) => { setModoEdicion(true); setServicioSeleccionado(srv); setMostrarModalPrincipal(true); }
  const abrirModalHomologacion = (srv) => { setServicioHomologacion(srv); setMostrarModalHomologacion(true); }

  const theme = { bgApp: '#F8FAFC', bgCard: '#FFFFFF', bgSubTable: '#F1F5F9', textMain: '#1E293B', textMuted: '#64748B', border: '#E2E8F0', primary: '#2563EB', success: '#16A34A', warning: '#F59E0B', danger: '#DC2626' }
  const thStyle = { padding: '10px 8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.textMuted, backgroundColor: '#F1F5F9', borderBottom: `2px solid ${theme.border}`, userSelect: 'none', position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '4px 8px', fontSize: '12px', color: theme.textMain, borderBottom: `1px solid ${theme.border}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

  const Resizer = ({ colKey }) => ( <div onMouseDown={(e) => startResize(e, colKey)} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', zIndex: 10, backgroundColor: 'transparent' }} title="Arrastrar ancho" /> )

  const getBadgeColor = (estado) => { 
    const est = estado?.toUpperCase() || '';
    if (est.includes('COMPLETADO') || est.includes('EJECUTADO')) return { bg: '#DCFCE7', text: '#166534' }
    if (est.includes('EJECUCIÓN')) return { bg: '#FEF9C3', text: '#854D0E' }
    if (est.includes('CANCELADO')) return { bg: '#FEE2E2', text: '#991B1B' }
    if (est.includes('COTIZACIÓN')) return { bg: '#FEF08A', text: '#713F12' }
    if (est.includes('APROBACION')) return { bg: '#FFEDD5', text: '#9A3412' }
    return { bg: '#DBEAFE', text: '#1E40AF' }
  }
  const getPrioridadColor = (prio) => { const p = prio?.toUpperCase() || ''; return p.includes('CRÍTICA') || p.includes('ALTA') ? theme.danger : p.includes('MEDIA') ? theme.primary : theme.success; }

  const controlesPaginacion = (
    <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <div style={{ fontSize: '13px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>Mostrando {datosProcesados.length === 0 ? 0 : indiceUltimoRegistro - registrosPorPagina + 1} a {Math.min(indiceUltimoRegistro, datosProcesados.length)} de {datosProcesados.length}</span>
        <div style={{ position: 'relative' }} onMouseEnter={() => setMostrarTooltipOrden(true)} onMouseLeave={() => setMostrarTooltipOrden(false)}>
          <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#DBEAFE', color: theme.primary, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', cursor: 'help' }}>i</div>
          {mostrarTooltipOrden && (
            <div style={{ position: 'absolute', bottom: '130%', left: 0, backgroundColor: '#1E293B', color: 'white', padding: '10px 14px', borderRadius: '8px', fontSize: '11px', width: '280px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', lineHeight: '1.4' }}>
              💡 <b>Ordenamiento Jerárquico Activado:</b><br/><br/>
              • <b>1 clic</b> = Ordena.<br/>• <b>2 clics</b> = Invierte orden.<br/>• <b>3 clics</b> = Quita columna del filtro.<br/><br/>
              El orden en el que hagas clic definirá la prioridad (1, 2, 3...) del desempate.
            </div>
          )}
        </div>
        {(sortConfig.length > 1 || sortConfig[0].key !== 'idservicio') && (
          <button onClick={() => setSortConfig([{ key: 'idservicio', direction: 'desc' }])} style={{ padding: '2px 8px', fontSize: '11px', backgroundColor: '#FEE2E2', color: theme.danger, border: '1px solid #FCA5A5', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Limpiar Orden</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <select value={registrosPorPagina} onChange={(e) => { setRegistrosPorPagina(Number(e.target.value)); setPaginaActual(1); }} style={{ padding: '4px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, fontSize: '12px', outline: 'none' }}>
          <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          <option value={datosProcesados.length > 0 ? datosProcesados.length : 1000}>Todos</option>
        </select>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} style={{ padding: '4px 8px', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}>Anterior</button>
          <span style={{ fontSize: '12px', fontWeight: '600' }}>Pág. {paginaActual} de {totalPaginas}</span>
          <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} style={{ padding: '4px 8px', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}>Siguiente</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ backgroundColor: theme.bgApp, minHeight: '100vh', paddingBottom: '40px', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <TopBar />
      <div style={{ maxWidth: '1600px', width: '95%', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '12px', padding: '6px 12px', backgroundColor: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: theme.textMuted, fontSize: '13px' }}>← Volver</button>
            <h2 style={{ margin: '0 0 8px 0', color: theme.textMain, fontSize: '24px', fontWeight: '700' }}>Control Maestro de Servicios</h2>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="🔍 Buscar servicio, OC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} style={{ padding: '8px 12px', width: '280px', borderRadius: '6px', border: `1px solid ${theme.border}`, outline: 'none' }} />
              
              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuEstado(!mostrarMenuEstado); setMostrarMenuPrioridad(false); setMostrarMenuLugar(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroEstado.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroEstado.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Estados {filtroEstado.length > 0 && `(${filtroEstado.length})`} ▼</button>
                {mostrarMenuEstado && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '250px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}><input type="checkbox" checked={filtroEstado.length === estadosDisponibles.length && estadosDisponibles.length > 0} onChange={() => handleSelectAll(estadosDisponibles, filtroEstado, setFiltroEstado)} /> Seleccionar Todo</label>
                    {estadosDisponibles.length === 0 && <div style={{ fontSize: '12px', color: theme.textMuted }}>No hay estados con los filtros actuales.</div>}
                    {estadosDisponibles.map(est => (<label key={est} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroEstado.includes(est)} onChange={() => handleCheckboxChange(est, filtroEstado, setFiltroEstado)} /> {est}</label>))}
                  </div>
                )}
              </div>

              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuPrioridad(!mostrarMenuPrioridad); setMostrarMenuEstado(false); setMostrarMenuLugar(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroPrioridad.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroPrioridad.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Prioridad {filtroPrioridad.length > 0 && `(${filtroPrioridad.length})`} ▼</button>
                {mostrarMenuPrioridad && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '180px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}><input type="checkbox" checked={filtroPrioridad.length === prioridadesDisponibles.length && prioridadesDisponibles.length > 0} onChange={() => handleSelectAll(prioridadesDisponibles, filtroPrioridad, setFiltroPrioridad)} /> Seleccionar Todo</label>
                    {prioridadesDisponibles.length === 0 && <div style={{ fontSize: '12px', color: theme.textMuted }}>No hay opciones.</div>}
                    {prioridadesDisponibles.map(prio => (<label key={prio} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroPrioridad.includes(prio)} onChange={() => handleCheckboxChange(prio, filtroPrioridad, setFiltroPrioridad)} /> {prio}</label>))}
                  </div>
                )}
              </div>

              <div className="filtro-dropdown-container" style={{ position: 'relative' }}>
                <button onClick={(e) => { e.stopPropagation(); setMostrarMenuLugar(!mostrarMenuLugar); setMostrarMenuEstado(false); setMostrarMenuPrioridad(false); }} style={{ padding: '8px 12px', borderRadius: '6px', border: `1px solid ${theme.border}`, backgroundColor: filtroLugar.length > 0 ? '#EFF6FF' : theme.bgCard, color: filtroLugar.length > 0 ? theme.primary : theme.textMain, cursor: 'pointer' }}>Lugares {filtroLugar.length > 0 && `(${filtroLugar.length})`} ▼</button>
                {mostrarMenuLugar && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '100%', left: 0, backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '250px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', paddingBottom: '6px', borderBottom: `1px solid ${theme.border}` }}><input type="checkbox" checked={filtroLugar.length === lugaresIdsDisponibles.length && lugaresIdsDisponibles.length > 0} onChange={() => handleSelectAll(lugaresIdsDisponibles, filtroLugar, setFiltroLugar)} /> Seleccionar Todo</label>
                    {lugaresDisponibles.length === 0 && <div style={{ fontSize: '12px', color: theme.textMuted }}>No hay lugares con los filtros actuales.</div>}
                    {lugaresDisponibles.map(l => (<label key={l.idlugar} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={filtroLugar.includes(l.idlugar.toString())} onChange={() => handleCheckboxChange(l.idlugar.toString(), filtroLugar, setFiltroLugar)} /> {l.lugarejecucion}</label>))}
                  </div>
                )}
              </div>

              {(filtroEstado.length > 0 || filtroPrioridad.length > 0 || filtroLugar.length > 0 || busqueda !== '') && (
                <button onClick={() => { setFiltroEstado([]); setFiltroPrioridad([]); setFiltroLugar([]); setBusqueda(''); }} style={{ padding: '6px 12px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '6px', color: theme.danger, cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>✕ Limpiar Filtros</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setMostrarModalExportar(true)} 
              disabled={serviciosSeleccionados.length === 0}
              style={{ padding: '10px 20px', backgroundColor: serviciosSeleccionados.length > 0 ? theme.success : '#E2E8F0', color: 'white', border: 'none', borderRadius: '8px', cursor: serviciosSeleccionados.length > 0 ? 'pointer' : 'not-allowed', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📥 Exportar Data ({serviciosSeleccionados.length})
            </button>
            <button onClick={abrirModalNuevo} style={{ padding: '10px 20px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>+ Nuevo Servicio</button>
          </div>
        </div>

        <div style={{ backgroundColor: theme.bgCard, borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ flex: 1 }}>{controlesPaginacion}</div>
            
            <div className="filtro-dropdown-container" style={{ position: 'relative', paddingRight: '16px', borderLeft: `1px solid ${theme.border}`, height: '100%', display: 'flex', alignItems: 'center', paddingLeft: '16px', backgroundColor: '#F8FAFC' }}>
              <button onClick={(e) => { e.stopPropagation(); setMostrarMenuColumnas(!mostrarMenuColumnas); }} style={{ background: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>⚙️ Columnas</button>
              {mostrarMenuColumnas && (
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 16, top: '100%', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '12px', zIndex: 50, width: '200px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  {Object.keys(columnas).map(col => (
                    <label key={col} style={{ fontSize: '13px', display: 'flex', gap: '8px', cursor: 'pointer' }}><input type="checkbox" checked={columnas[col]} onChange={() => setColumnas({...columnas, [col]: !columnas[col]})} /> Mostrar {col}</label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {cargando ? (
            <div style={{ padding: '60px', textAlign: 'center', color: theme.textMuted }}>Cargando información de la base de datos...</div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ tableLayout: 'fixed', minWidth: '1300px', width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <colgroup>
                  <col style={{ width: `${colWidths.check}px` }} />
                  <col style={{ width: `${colWidths.expand}px` }} />
                  {columnas.id && <col style={{ width: `${colWidths.id}px` }} />}
                  {columnas.prioridad && <col style={{ width: `${colWidths.prioridad}px` }} />}
                  {columnas.fechaCreacion && <col style={{ width: `${colWidths.fechaCreacion}px` }} />}
                  {columnas.servicio && <col style={{ width: `${colWidths.servicio}px` }} />}
                  {columnas.lugar && <col style={{ width: `${colWidths.lugar}px` }} />}
                  {columnas.proveedor && <col style={{ width: `${colWidths.proveedor}px` }} />}
                  {columnas.monto && <col style={{ width: `${colWidths.monto}px` }} />}
                  {columnas.responsable && <col style={{ width: `${colWidths.responsable}px` }} />}
                  {columnas.docs && <col style={{ width: `${colWidths.docs}px` }} />}
                  {columnas.fechasNuevas && <col style={{ width: `${colWidths.fechasNuevas}px` }} />}
                  {columnas.progreso && <col style={{ width: `${colWidths.progreso}px` }} />}
                  {columnas.estado && <col style={{ width: `${colWidths.estado}px` }} />}
                  <col style={{ width: `${colWidths.acciones}px` }} />
                </colgroup>

                <thead>
                  <tr>
                    <th style={{...thStyle, textAlign: 'center'}}>
                      <input 
                        type="checkbox" 
                        checked={datosPaginados.length > 0 && datosPaginados.every(s => serviciosSeleccionados.includes(s.idservicio))}
                        onChange={toggleSeleccionarPagina}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{...thStyle, textAlign: 'center', cursor: 'default'}}></th>
                    {columnas.id && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('idservicio')}>ID {renderSortIcon('idservicio')}<Resizer colKey="id" /></th>}
                    {columnas.prioridad && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('prioridad')}>Prioridad {renderSortIcon('prioridad')}<Resizer colKey="prioridad" /></th>}
                    {columnas.fechaCreacion && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('fechasolicitud')}>F. Creación {renderSortIcon('fechasolicitud')}<Resizer colKey="fechaCreacion" /></th>}
                    {columnas.servicio && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('servicio')}>Servicio {renderSortIcon('servicio')}<Resizer colKey="servicio" /></th>}
                    {columnas.lugar && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('lugar')}>Lugar {renderSortIcon('lugar')}<Resizer colKey="lugar" /></th>}
                    {columnas.proveedor && <th style={thStyle}>Proveedor <Resizer colKey="proveedor" /></th>}
                    {columnas.monto && <th style={{...thStyle, cursor: 'pointer', textAlign: 'right'}} onClick={() => handleSort('monto')}>Monto {renderSortIcon('monto')}<Resizer colKey="monto" /></th>}
                    {columnas.responsable && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('responsable')}>Responsable {renderSortIcon('responsable')}<Resizer colKey="responsable" /></th>}
                    {columnas.docs && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('num_requerimiento')}>Req / OC {renderSortIcon('num_requerimiento')}<Resizer colKey="docs" /></th>}
                    {columnas.fechasNuevas && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('solped')}>Solped {renderSortIcon('solped')}<Resizer colKey="fechasNuevas" /></th>}
                    {columnas.progreso && <th style={{...thStyle, cursor: 'pointer'}} onClick={() => handleSort('progreso')}>Progreso {renderSortIcon('progreso')}<Resizer colKey="progreso" /></th>}
                    {columnas.estado && <th style={{...thStyle, textAlign: 'center', cursor: 'pointer'}} onClick={() => handleSort('estado')}>Estado {renderSortIcon('estado')}<Resizer colKey="estado" /></th>}
                    <th style={{...thStyle, cursor: 'default'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {datosPaginados.map(srv => {
                    const badge = getBadgeColor(srv.estado)
                    const prioColor = getPrioridadColor(srv.prioridad)
                    const expandido = filasExpandidas.includes(srv.idservicio)
                    const tieneCotizaciones = srv.cotizaciones && srv.cotizaciones.length > 0
                    const seleccionado = serviciosSeleccionados.includes(srv.idservicio)
                    
                    return (
                      <React.Fragment key={srv.idservicio}>
                        <tr style={{ borderLeft: `4px solid ${prioColor}`, backgroundColor: seleccionado ? '#EFF6FF' : (expandido ? '#F8FAFC' : 'white') }}>
                          <td style={{...tdStyle, textAlign: 'center'}}>
                            <input type="checkbox" checked={seleccionado} onChange={(e) => toggleSeleccionServicio(srv.idservicio, e)} style={{ cursor: 'pointer' }} />
                          </td>
                          <td style={{...tdStyle, textAlign: 'center'}}><button onClick={(e) => toggleFila(srv.idservicio, e)} style={{ background: 'none', border: 'none', cursor: tieneCotizaciones ? 'pointer' : 'default', color: tieneCotizaciones ? theme.primary : '#CBD5E1', transform: expandido ? 'rotate(90deg)' : 'none' }}>▶</button></td>
                          
                          {columnas.id && <td style={{ ...tdStyle, fontWeight: '700' }} title={`#${srv.idservicio}`}>#{srv.idservicio}</td>}
                          {columnas.prioridad && <td style={{ ...tdStyle, color: prioColor, fontWeight: '700', fontSize: '11px' }} title={srv.prioridad?.toUpperCase()}>{srv.prioridad?.toUpperCase()}</td>}
                          
                          {columnas.fechaCreacion && <td style={tdStyle} title={srv.fechasolicitud ? new Date(srv.fechasolicitud).toLocaleDateString() : '---'}>{srv.fechasolicitud ? new Date(srv.fechasolicitud).toLocaleDateString() : '---'}</td>}
                          {columnas.servicio && <td style={{ ...tdStyle }} title={srv.servicio}>
                            <div style={{ fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.servicio}</div>
                            <div style={{ fontSize: '11px', color: theme.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{srv.sistema?.sistema || srv.tipoinfraestructura?.tipoinfraestructura}</div>
                          </td>}
                          
                          {columnas.lugar && <td style={tdStyle} title={srv.lugarejecucion?.lugarejecucion || '---'}>{srv.lugarejecucion?.lugarejecucion || '---'}</td>}
                          
                          {columnas.proveedor && (
                            <td style={{ ...tdStyle, fontSize: '11px', fontWeight: '600', color: srv.cotizaciones?.some(c => c.estado?.toUpperCase() === 'APROBADA') ? theme.primary : theme.textMuted }} title={srv.cotizaciones?.find(c => c.estado?.toUpperCase() === 'APROBADA')?.proveedor?.razonsocial || 'Por definir'}>
                              {srv.cotizaciones?.find(c => c.estado?.toUpperCase() === 'APROBADA')?.proveedor?.razonsocial || 'Por definir'}
                            </td>
                          )}

                          {columnas.monto && (
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: srv.montoAprobado ? theme.textMain : '#CBD5E1' }}>
                              {srv.montoAprobado ? `S/ ${srv.montoAprobado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                            </td>
                          )}

                          {columnas.responsable && <td style={tdStyle} title={srv.responsable || '---'}>{srv.responsable || '---'}</td>}
                          {columnas.docs && <td style={tdStyle} title={`R: ${srv.num_requerimiento || '-'}\nOC: ${srv.orden_compra || '-'}`}><div style={{fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>R: {srv.num_requerimiento || '-'}</div><div style={{fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>OC: {srv.orden_compra || '-'}</div></td>}
                          {columnas.fechasNuevas && <td style={tdStyle} title={`Sol: ${srv.solped || '-'}`}><div style={{fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>Sol: {srv.solped || '-'}</div></td>}
                          
                          {columnas.progreso && <td style={tdStyle}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '600', marginBottom: '2px' }}><span>{srv.progreso || 0}%</span></div><div style={{ width: '100%', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${srv.progreso || 0}%`, height: '100%', backgroundColor: srv.progreso === 100 ? theme.success : theme.primary }}></div></div></td>}
                          
                          {columnas.estado && <td style={{ ...tdStyle, textAlign: 'center' }}><span style={{ padding: '4px 8px', backgroundColor: badge.bg, color: badge.text, borderRadius: '12px', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>{srv.estado}</span></td>}
                          
                          <td style={{ ...tdStyle, textAlign: 'center', position: 'relative', overflow: 'visible' }}>
                            <div className="menu-acciones-container" style={{ display: 'inline-block' }}>
                              <button onClick={(e) => toggleAcciones(srv.idservicio, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: theme.textMuted }}>⋮</button>
                              {menuAccionesFila === srv.idservicio && (
                                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '8px', zIndex: 50, display: 'flex', gap: '4px', padding: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                  <button onClick={() => {abrirModalEditar(srv); setMenuAccionesFila(null)}} style={{ padding: '6px 10px', border: `1px solid ${theme.border}`, borderRadius: '6px', background: 'white', cursor: 'pointer', fontSize: '12px' }}>✏️ Editar</button>
                                  <button onClick={() => {navigate(`/cotizaciones/${srv.idservicio}`); setMenuAccionesFila(null)}} style={{ padding: '6px 10px', border: `1px solid ${theme.border}`, borderRadius: '6px', background: '#F8FAFC', color: theme.primary, cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>📄 Cotizar</button>
                                  <button onClick={() => {abrirModalHomologacion(srv); setMenuAccionesFila(null)}} disabled={!tieneCotizaciones} style={{ padding: '6px 10px', cursor: tieneCotizaciones ? 'pointer' : 'not-allowed', backgroundColor: tieneCotizaciones ? '#EFF6FF' : '#F1F5F9', color: tieneCotizaciones ? theme.primary : '#94A3B8', border: tieneCotizaciones ? '1px solid #BFDBFE' : `1px solid ${theme.border}`, borderRadius: '6px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>⚖️ Evaluar</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {expandido && (
                          <tr style={{ backgroundColor: theme.bgSubTable, borderBottom: `2px solid ${theme.border}` }}>
                            <td colSpan={3 + Object.values(columnas).filter(Boolean).length} style={{ padding: '16px 24px 24px 40px' }}>
                              <div style={{ backgroundColor: 'white', borderRadius: '8px', border: `1px solid ${theme.border}`, overflow: 'hidden' }}>
                                
                                {(() => {
                                  const cotizacionesValidas = srv.cotizaciones?.filter(c => !['Rechazada', 'De Baja'].includes(c.estado)) || [];
                                  const countSolicitadas = cotizacionesValidas.filter(c => c.estado === 'Solicitada').length;
                                  const countEntregadas = cotizacionesValidas.filter(c => ['Entregada', 'Aprobada'].includes(c.estado)).length;
                                  
                                  return cotizacionesValidas.length > 0 ? (
                                    <>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', backgroundColor: '#F8FAFC', borderBottom: `1px solid ${theme.border}` }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.textMain }}>ESTADO DE COTIZACIONES ACTIVAS:</span>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                          <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '12px', fontWeight: 'bold' }}>{countSolicitadas} Solicitadas</span>
                                          <span style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#FEF08A', color: '#854D0E', borderRadius: '12px', fontWeight: 'bold' }}>{countEntregadas} Recibidas/Entregadas</span>
                                        </div>
                                      </div>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                                        <thead>
                                          <tr>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '18%' }}>Proveedor</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '12%' }}>Estado</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>F. Envío</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>F. Visita</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>Recepción</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>Aceptación</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>Inicio</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, width: '10%' }}>Fin</th>
                                            <th style={{ padding: '8px 12px', fontSize: '10px', color: theme.textMuted, borderBottom: `1px solid ${theme.border}`, textAlign: 'right', width: '10%' }}>Total Estimado</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cotizacionesValidas.map(cot => (
                                            <tr key={cot.idcotizacion} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '600', color: theme.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cot.proveedor?.razonsocial || 'Desconocido'}>{cot.proveedor?.razonsocial || 'Desconocido'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700' }}>{cot.estado}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fecha_envio_cotizacion || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fecha_visita_tecnica || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fecharecepcion || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fechaaceptacion || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fechainicio || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', color: theme.textMuted }}>{cot.fechafin || '---'}</td>
                                              <td style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', textAlign: 'right', color: theme.primary }}>{cot.estado === 'Solicitada' ? 'Por definir' : `${cot.moneda?.moneda?.includes('USD') ? '$' : 'S/'} ${calcularTotalCotizacion(cot).toFixed(2)}`}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </>
                                  ) : (<div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: theme.textMuted }}>No hay cotizaciones activas registradas.</div>)
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {datosProcesados.length > 0 && (
                <div style={{ borderTop: `1px solid ${theme.border}` }}>
                  {controlesPaginacion}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== MODAL DEL REPORT BUILDER (EXPORTAR CSV NIVELES 1, 2 Y 3) ===== */}
        {mostrarModalExportar && (
          <div className="modal-exportar-container" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '700px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: theme.textMain }}>Generador de Reportes de Servicios</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: theme.textMuted }}>
                Se exportarán <b>{serviciosSeleccionados.length}</b> servicios. Selecciona qué nivel de detalle deseas extraer para armar tu Excel.
              </p>
              
              <h4 style={{ fontSize: '13px', color: theme.primary, marginBottom: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>1. Datos del Requerimiento (Servicio Múltiple)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                {Object.keys(columnasExportar).map(col => (
                  <label key={col} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: theme.textMain }}>
                    <input type="checkbox" checked={columnasExportar[col]} onChange={() => setColumnasExportar({...columnasExportar, [col]: !columnasExportar[col]})} /> 
                    {col === 'montoAprobado' ? 'Monto Ganador' : col === 'proveedorAprobado' ? 'Prov. Ganador' : col === 'docs' ? 'Documentos' : col.charAt(0).toUpperCase() + col.slice(1)}
                  </label>
                ))}
              </div>

              <h4 style={{ fontSize: '13px', color: theme.success, marginBottom: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>2. Datos de las Propuestas (Cotizaciones por Proveedor)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', backgroundColor: '#F0FDF4', padding: '12px', borderRadius: '8px', border: `1px solid #BBF7D0` }}>
                {Object.keys(columnasCotExportar).map(col => (
                  <label key={col} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: theme.textMain }}>
                    <input type="checkbox" checked={columnasCotExportar[col]} onChange={() => setColumnasCotExportar({...columnasCotExportar, [col]: !columnasCotExportar[col]})} /> 
                    {col.replace('cot_', '').replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                  </label>
                ))}
              </div>

              <h4 style={{ fontSize: '13px', color: '#8B5CF6', marginBottom: '10px', borderBottom: `1px solid ${theme.border}`, paddingBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>3. Desglose de Ítems (Detalle por Cotización)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px', backgroundColor: '#F5F3FF', padding: '12px', borderRadius: '8px', border: `1px solid #DDD6FE` }}>
                {Object.keys(columnasDetExportar).map(col => (
                  <label key={col} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: theme.textMain }}>
                    <input type="checkbox" checked={columnasDetExportar[col]} onChange={() => setColumnasDetExportar({...columnasDetExportar, [col]: !columnasDetExportar[col]})} /> 
                    {col.replace('det_', '').replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
                <button onClick={() => setMostrarModalExportar(false)} style={{ padding: '10px 16px', backgroundColor: 'white', border: `1px solid ${theme.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancelar</button>
                <button onClick={generarCSV} style={{ padding: '10px 16px', backgroundColor: theme.primary, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📥 Extraer y Descargar Datos
                </button>
              </div>
            </div>
          </div>
        )}

        <ServicioModal 
          visible={mostrarModalPrincipal} 
          modoEdicion={modoEdicion} 
          servicioAEditar={servicioSeleccionado}
          idUsuarioActual={idUsuarioActual}
          lugares={lugares}
          tiposInfraestructura={tiposInfraestructura}
          tiposServicio={tiposServicio}
          sistemas={sistemas}
          subsistemas={subsistemas}
          onClose={() => setMostrarModalPrincipal(false)}
          onSuccess={() => { setMostrarModalPrincipal(false); cargarDatosIniciales(); }}
        />

        {mostrarModalHomologacion && servicioHomologacion && (
          <CentroEvaluacion servicio={servicioHomologacion} onClose={() => setMostrarModalHomologacion(false)} onActualizado={() => { setMostrarModalHomologacion(false); cargarDatosIniciales() }} />
        )}

      </div>
    </div>
  )
}

export default Servicios