import { useState, useEffect } from 'react';
import { supabase } from '../supabase'; // Asegúrate de que la ruta sea la correcta

export const useEvaluacion = (servicio, onActualizado) => {
  const [cargando, setCargando] = useState(true);
  const [categoriasHomologacion, setCategoriasHomologacion] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
  const [itemsCotizaciones, setItemsCotizaciones] = useState([]);
  
  const [edicionMatriz, setEdicionMatriz] = useState({});
  const [puntajesEvaluacion, setPuntajesEvaluacion] = useState({});
  const [guardandoMatriz, setGuardandoMatriz] = useState(false);

  useEffect(() => {
    const inicializar = async () => {
      setCargando(true);
      const [resCat, resImp] = await Promise.all([
        supabase.from('categoriahomologacion').select('*').eq('idservicio', servicio.idservicio),
        supabase.from('impuestos').select('*')
      ]);
      
      setCategoriasHomologacion(resCat.data || []);
      const impuestos = resImp.data || [];

      let todosLosItems = [];
      let pIniciales = {};

      servicio.cotizaciones?.forEach(cot => {
        pIniciales[cot.idcotizacion] = { eco: cot.puntaje_eco || 0, plazo: cot.puntaje_plazo || 0, alcance: cot.puntaje_alcance || 0, pago: cot.puntaje_pago || 0 };
        
        if(cot.detallecotizacion) {
          cot.detallecotizacion.forEach((det) => {
            const baseFila = det.cantidad * det.preciounitario;
            const tipoImpuesto = impuestos.find(i => i.idimpuestos == det.idimpuestos)?.impuesto;
            let totalFila = baseFila;
            if (tipoImpuesto === '+ IGV') totalFila = baseFila * 1.18;
            
            todosLosItems.push({
              ...det, 
              proveedorNombre: cot.proveedor?.razonsocial || 'Desconocido', 
              moneda: cot.moneda?.moneda?.toUpperCase().includes('USD') ? '$' : 'S/',
              totalFila: totalFila, 
              idPrimaryKey: det.iddetcot, 
              idcotizacion: cot.idcotizacion
            });
          });
        }
      });
      setItemsCotizaciones(todosLosItems); 
      setPuntajesEvaluacion(pIniciales); 
      setCargando(false);
    };
    if (servicio) inicializar();
  }, [servicio]);

  const handleCrearCategoria = async () => {
    if(!nuevaCategoria.trim()) return;
    const { data } = await supabase.from('categoriahomologacion').insert([{ idservicio: servicio.idservicio, nombrecategoria: nuevaCategoria.trim() }]).select();
    if(data) { setCategoriasHomologacion([...categoriasHomologacion, data[0]]); setNuevaCategoria(''); }
  };

  const handleEliminarCategoria = async (idCategoria) => {
    if(!window.confirm("¿Seguro que deseas eliminar esta canasta? Todos sus ítems regresarán a la bandeja de pendientes.")) return;
    const { error } = await supabase.from('categoriahomologacion').delete().eq('idcategoria', idCategoria);
    if (!error) {
      setCategoriasHomologacion(categoriasHomologacion.filter(c => c.idcategoria !== idCategoria));
      setItemsCotizaciones(itemsCotizaciones.map(item => item.idcategoria === idCategoria ? { ...item, idcategoria: null } : item));
    }
  };

  const toggleSeleccionItem = (idItem) => setItemsSeleccionados(prev => prev.includes(idItem) ? prev.filter(id => id !== idItem) : [...prev, idItem]);
  
  const asignarItemsACategoria = async (idCategoria) => {
    if(itemsSeleccionados.length === 0) return;
    const { error } = await supabase.from('detallecotizacion').update({ idcategoria: idCategoria }).in('iddetcot', itemsSeleccionados);
    if(!error) {
      setItemsCotizaciones(itemsCotizaciones.map(item => itemsSeleccionados.includes(item.idPrimaryKey) ? { ...item, idcategoria: idCategoria } : item)); 
      setItemsSeleccionados([]);
    }
  };

  const desasignarItem = async (idItem) => {
    const { error } = await supabase.from('detallecotizacion').update({ idcategoria: null }).eq('iddetcot', idItem);
    if(!error) setItemsCotizaciones(itemsCotizaciones.map(item => item.idPrimaryKey === idItem ? { ...item, idcategoria: null } : item));
  };

  const handleEdicionMatriz = (idCat, idCot, campo, valor) => { setEdicionMatriz(prev => ({ ...prev, [`${idCat}-${idCot}`]: { ...(prev[`${idCat}-${idCot}`] || {}), [campo]: valor } })); };
  const handlePuntajeChange = (idCot, campo, valor) => { const num = parseFloat(valor) || 0; setPuntajesEvaluacion(prev => ({ ...prev, [idCot]: { ...prev[idCot], [campo]: num > 5 ? 5 : (num < 0 ? 0 : num) } })); };
  const calcularNotaIntegral = (idCot) => { const p = puntajesEvaluacion[idCot] || {}; return ((p.eco || 0) * 0.35 + (p.plazo || 0) * 0.35 + (p.alcance || 0) * 0.20 + (p.pago || 0) * 0.10).toFixed(2); };
  
  const guardarMatrizEvaluacion = async () => {
    setGuardandoMatriz(true);
    try {
      for (const id of Object.keys(puntajesEvaluacion)) {
        const p = puntajesEvaluacion[id];
        await supabase.from('cotizaciones').update({ puntaje_eco: p.eco, puntaje_plazo: p.plazo, puntaje_alcance: p.alcance, puntaje_pago: p.pago }).eq('idcotizacion', id);
      }
      alert("¡Evaluaciones guardadas con éxito!"); if (onActualizado) onActualizado();
    } catch (error) { alert("Error al guardar."); } finally { setGuardandoMatriz(false); }
  };

  return {
    cargando, categoriasHomologacion, nuevaCategoria, setNuevaCategoria, itemsSeleccionados, itemsCotizaciones, edicionMatriz, puntajesEvaluacion, guardandoMatriz,
    handleCrearCategoria, handleEliminarCategoria, toggleSeleccionItem, asignarItemsACategoria, desasignarItem, handleEdicionMatriz, handlePuntajeChange, calcularNotaIntegral, guardarMatrizEvaluacion
  };
};