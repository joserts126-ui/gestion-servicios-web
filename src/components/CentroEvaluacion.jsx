import React, { useState } from 'react';
import PanelAgrupacion from './PanelAgrupacion';
import MatrizComparativa from './MatrizComparativa';
import { exportarExcelMatriz } from '../utils/exportadorExcel';
import { useEvaluacion } from '../hooks/useEvaluacion'; // Asegúrate de que la ruta coincida
import '../styles/centroEvaluacion.css'; // <-- NUEVO: Importamos los estilos limpios

function CentroEvaluacion({ servicio, onClose, onActualizado }) {
  const {
    cargando, categoriasHomologacion, nuevaCategoria, setNuevaCategoria, itemsSeleccionados, itemsCotizaciones,
    edicionMatriz, puntajesEvaluacion, guardandoMatriz, handleCrearCategoria, handleEliminarCategoria,
    toggleSeleccionItem, asignarItemsACategoria, desasignarItem, handleEdicionMatriz, handlePuntajeChange,
    calcularNotaIntegral, guardarMatrizEvaluacion
  } = useEvaluacion(servicio, onActualizado);

  const [pestanaHomologacion, setPestañaHomologacion] = useState('agrupar');

  const handleImprimir = () => window.print();
  const handleExportarExcel = () => exportarExcelMatriz(servicio.idservicio, servicio.cotizaciones?.length || 1);

  if (cargando) {
    return (
      <div className="ce-modal-overlay">
        <div className="ce-loading-text">Cargando Centro de Evaluación...</div>
      </div>
    );
  }
  
  const itemsPendientes = itemsCotizaciones.filter(i => !i.idcategoria);
  
  // Filtro que agregamos previamente
  const cotizacionesParticipantes = (servicio.cotizaciones || []).filter(
    cot => cot.estado !== 'Rechazada' && cot.estado !== 'De Baja'
  );
  
  let maxNota = -1; let idGanador = null;
  cotizacionesParticipantes.forEach(cot => { 
    const nota = parseFloat(calcularNotaIntegral(cot.idcotizacion)); 
    if (nota > maxNota && nota > 0) { maxNota = nota; idGanador = cot.idcotizacion; } 
  });

  const N = cotizacionesParticipantes.length || 1;
  const minContainerWidth = Math.max(1400, N * 400 + 400);

  return (
    <div className="ce-modal-overlay">
      <div className="ce-modal-cuerpo">
        
        {/* CABECERA (Oculta al imprimir) */}
        <div className="ce-header no-print">
          <div>
            <h2 className="ce-title">⚖️ Centro de Homologación y Evaluación</h2>
            <p className="ce-subtitle">Servicio #{servicio.idservicio} - {servicio.servicio}</p>
            <div className="ce-tabs-container">
              <button 
                className={`ce-btn-tab ${pestanaHomologacion === 'agrupar' ? 'active' : ''}`}
                onClick={() => setPestañaHomologacion('agrupar')}
              >
                Paso 1: Agrupar Canastas
              </button>
              <button 
                className={`ce-btn-tab ${pestanaHomologacion === 'evaluar' ? 'active' : ''}`}
                onClick={() => setPestañaHomologacion('evaluar')} 
                disabled={itemsPendientes.length > 0} 
              >
                Paso 2: Matriz Comparativa
              </button>
            </div>
          </div>
          <button onClick={onClose} className="ce-btn-close">Cerrar Panel</button>
        </div>

        {/* PESTAÑA 1: AGRUPACIÓN */}
        {pestanaHomologacion === 'agrupar' && (
          <PanelAgrupacion itemsPendientes={itemsPendientes} itemsSeleccionados={itemsSeleccionados} toggleSeleccionItem={toggleSeleccionItem} categoriasHomologacion={categoriasHomologacion} nuevaCategoria={nuevaCategoria} setNuevaCategoria={setNuevaCategoria} handleCrearCategoria={handleCrearCategoria} handleEliminarCategoria={handleEliminarCategoria} asignarItemsACategoria={asignarItemsACategoria} itemsCotizaciones={itemsCotizaciones} desasignarItem={desasignarItem} />
        )}
        
        {/* PESTAÑA 2: EVALUACIÓN Y MATRIZ */}
        {pestanaHomologacion === 'evaluar' && (
          <div className="ce-matriz-wrapper">
            
            <MatrizComparativa servicio={servicio} cotizacionesParticipantes={cotizacionesParticipantes} categoriasHomologacion={categoriasHomologacion} itemsCotizaciones={itemsCotizaciones} edicionMatriz={edicionMatriz} handleEdicionMatriz={handleEdicionMatriz} puntajesEvaluacion={puntajesEvaluacion} handlePuntajeChange={handlePuntajeChange} calcularNotaIntegral={calcularNotaIntegral} idGanador={idGanador} N={N} wItem={4} wDesc={28} wPres={8} wProv={60/N} minContainerWidth={minContainerWidth} />
            
            {/* BOTONES INFERIORES (Ocultos al imprimir) */}
            <div className="ce-footer no-print">
              <div className="ce-action-buttons">
                <button onClick={handleImprimir} className="ce-btn-action ce-btn-print">
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button onClick={handleExportarExcel} className="ce-btn-action ce-btn-excel">
                  📊 Descargar Excel
                </button>
              </div>
              <button 
                onClick={guardarMatrizEvaluacion} 
                disabled={guardandoMatriz} 
                className="ce-btn-action ce-btn-save"
              >
                {guardandoMatriz ? 'Guardando...' : '💾 Confirmar Evaluación'}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default CentroEvaluacion;