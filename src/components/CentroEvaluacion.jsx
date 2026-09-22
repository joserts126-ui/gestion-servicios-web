import React, { useState } from 'react';
import PanelAgrupacion from './PanelAgrupacion';
import MatrizComparativa from './MatrizComparativa';
import { exportarExcelMatriz } from '../utils/exportadorExcel';
import { useEvaluacion } from '../hooks/useEvaluacion'; 
import '../styles/centroEvaluacion.css'; 

function CentroEvaluacion({ servicio, rolUsuario, onClose, onActualizado }) {
  const {
    cargando, categoriasHomologacion, nuevaCategoria, setNuevaCategoria, itemsSeleccionados, itemsCotizaciones,
    edicionMatriz, puntajesEvaluacion, guardandoMatriz, handleCrearCategoria, handleEliminarCategoria,
    toggleSeleccionItem, asignarItemsACategoria, desasignarItem, handleEdicionMatriz, handlePuntajeChange,
    calcularNotaIntegral, guardarMatrizEvaluacion
  } = useEvaluacion(servicio, onActualizado);

  const esVisor = rolUsuario === 'VISOR';
  const [pestanaHomologacion, setPestañaHomologacion] = useState(esVisor ? 'evaluar' : 'agrupar');

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
      {/* Contenedor Maestro: Bloqueamos la altura al 95% de la pantalla para evitar que se desborde */}
      <div className="ce-modal-cuerpo" style={{ display: 'flex', flexDirection: 'column', maxHeight: '95vh', overflow: 'hidden' }}>
        
        {/* CABECERA: Se mantiene fija arriba */}
        <div className="ce-header no-print" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="ce-title">⚖️ Centro de Homologación y Evaluación</h2>
            <p className="ce-subtitle">Servicio #{servicio.idservicio} - {servicio.servicio}</p>
            <div className="ce-tabs-container">
              {!esVisor && (
                <button 
                  className={`ce-btn-tab ${pestanaHomologacion === 'agrupar' ? 'active' : ''}`}
                  onClick={() => setPestañaHomologacion('agrupar')}
                >
                  Paso 1: Agrupar Canastas
                </button>
              )}
              <button 
                className={`ce-btn-tab ${pestanaHomologacion === 'evaluar' ? 'active' : ''}`}
                onClick={() => setPestañaHomologacion('evaluar')} 
                disabled={itemsPendientes.length > 0 && !esVisor} 
              >
                {esVisor ? 'Matriz Comparativa de Propuestas' : 'Paso 2: Matriz Comparativa'}
              </button>
            </div>
          </div>
          <button onClick={onClose} className="ce-btn-close">Cerrar Panel</button>
        </div>

        {/* PESTAÑA 1: AGRUPACIÓN */}
        {pestanaHomologacion === 'agrupar' && !esVisor && (
          /* Envolvemos el panel en un contenedor flexible para que herede el límite de altura */
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <PanelAgrupacion itemsPendientes={itemsPendientes} itemsSeleccionados={itemsSeleccionados} toggleSeleccionItem={toggleSeleccionItem} categoriasHomologacion={categoriasHomologacion} nuevaCategoria={nuevaCategoria} setNuevaCategoria={setNuevaCategoria} handleCrearCategoria={handleCrearCategoria} handleEliminarCategoria={handleEliminarCategoria} asignarItemsACategoria={asignarItemsACategoria} itemsCotizaciones={itemsCotizaciones} desasignarItem={desasignarItem} />
          </div>
        )}
        
        {/* PESTAÑA 2: EVALUACIÓN Y MATRIZ */}
        {pestanaHomologacion === 'evaluar' && (
          <div className="ce-matriz-wrapper" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            <MatrizComparativa 
              servicio={servicio} 
              cotizacionesParticipantes={cotizacionesParticipantes} 
              categoriasHomologacion={categoriasHomologacion} 
              itemsCotizaciones={itemsCotizaciones} 
              edicionMatriz={edicionMatriz} 
              handleEdicionMatriz={handleEdicionMatriz} 
              puntajesEvaluacion={puntajesEvaluacion} 
              handlePuntajeChange={handlePuntajeChange} 
              calcularNotaIntegral={calcularNotaIntegral} 
              idGanador={idGanador} 
              N={N} 
              wItem={4} wDesc={28} wPres={8} wProv={60/N} 
              minContainerWidth={minContainerWidth} 
              esVisor={esVisor} 
            />
            
            <div className="ce-footer no-print" style={{ flexShrink: 0, marginTop: 'auto' }}>
              <div className="ce-action-buttons">
                <button onClick={handleImprimir} className="ce-btn-action ce-btn-print">
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button onClick={handleExportarExcel} className="ce-btn-action ce-btn-excel">
                  📊 Descargar Excel
                </button>
              </div>
              {!esVisor && (
                <button 
                  onClick={guardarMatrizEvaluacion} 
                  disabled={guardandoMatriz} 
                  className="ce-btn-action ce-btn-save"
                >
                  {guardandoMatriz ? 'Guardando...' : '💾 Confirmar Evaluación'}
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default CentroEvaluacion;