import React, { useMemo } from 'react';
import logoCentenario from '../assets/logoCentenario.png';
import { thPdf, tdPdf, tdCenter, tdRight, rowBlack, rowYellow, borderPdf, inputStyleMatriz, CONFIG_PDF } from '../styles/matrizStyles.js'; 
import { PESOS_EVALUACION, getPorcentajeTexto } from '../config/reglasNegocio.js';

// ==========================================
// 1. SUB-COMPONENTE: CABECERA
// ==========================================
const CabeceraMatriz = ({ servicio, minContainerWidth }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', minWidth: `${minContainerWidth}px` }} className="impresion-width-auto">
    <div style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
      <h1 style={{ margin: '0 0 15px 0', fontSize: CONFIG_PDF.fuente.titulo, fontWeight: 'bold', textDecoration: 'underline' }}>COMPARATIVO DE PROPUESTAS</h1>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '45px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <img src={logoCentenario} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <table style={{ width: '45%', fontSize: CONFIG_PDF.fuente.subtitulo, textAlign: 'left', marginBottom: '10px' }}>
        <tbody>
          <tr><td style={{ width: '70px', fontWeight: 'bold', padding: '3px' }}>Asunto</td><td style={{ padding: '3px' }}>{servicio.servicio.toUpperCase()}</td></tr>
          <tr><td style={{ fontWeight: 'bold', padding: '3px' }}>Proyecto</td><td style={{ padding: '3px' }}>{servicio.lugarejecucion?.lugarejecucion?.toUpperCase() || '---'}</td></tr>
          <tr><td style={{ fontWeight: 'bold', padding: '3px' }}>Fecha</td><td style={{ padding: '3px' }}>{new Date().toLocaleDateString('es-PE')}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

// ==========================================
// 2. SUB-COMPONENTE: TABLA FINAL RESULTADOS
// ==========================================
const TablaResultados = ({ cotizacionesParticipantes, calcularNotaIntegral, idGanador }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <table style={{ width: '60%', borderCollapse: 'collapse', marginBottom: '15px' }}>
      <thead>
        <tr style={rowBlack}>
          {/* Filas negras con padding corto */}
          <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF', padding: '2px 4px' }}>DESCRIPCIÓN</th>
          <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF', padding: '2px 4px' }}>INCIDENCIA</th>
          <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF', padding: '2px 4px' }}>ABREVIATURA</th>
        </tr>
      </thead>
      <tbody>
        <tr><td style={tdPdf}>Propuesta Económica</td><td style={tdCenter}>{getPorcentajeTexto(PESOS_EVALUACION.economica)}</td><td style={tdCenter}>PE</td></tr>
        <tr><td style={tdPdf}>Plazos</td><td style={tdCenter}>{getPorcentajeTexto(PESOS_EVALUACION.plazo)}</td><td style={tdCenter}>PL</td></tr>
        <tr><td style={tdPdf}>Entregables y Alcances</td><td style={tdCenter}>{getPorcentajeTexto(PESOS_EVALUACION.alcance)}</td><td style={tdCenter}>EA</td></tr>
        <tr><td style={tdPdf}>Forma de Pago</td><td style={tdCenter}>{getPorcentajeTexto(PESOS_EVALUACION.pago)}</td><td style={tdCenter}>FP</td></tr>
        <tr>
          <td style={tdPdf}></td>
          <td style={{...tdCenter, fontWeight: 'bold'}}>{getPorcentajeTexto(PESOS_EVALUACION.economica + PESOS_EVALUACION.plazo + PESOS_EVALUACION.alcance + PESOS_EVALUACION.pago)}</td>
          <td style={tdPdf}></td>
        </tr>
      </tbody>
    </table>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <tbody>
        <tr>
          <td style={{ ...tdCenter, width: '30%', fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>Puntaje final</td>
          {cotizacionesParticipantes.map(cot => (
              <td key={`rfin-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>{calcularNotaIntegral(cot.idcotizacion)}</td>
          ))}
        </tr>
        <tr><td colSpan={cotizacionesParticipantes.length + 1} style={{ border: 'none', height: '6px' }}></td></tr>
        <tr>
          <td style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>POSTOR GANADOR</td>
          {cotizacionesParticipantes.map(cot => {
              const notaCalc = calcularNotaIntegral(cot.idcotizacion);
              const isWinner = (cot.idcotizacion === idGanador && idGanador !== null);
              return <td key={`rgan-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>{isWinner ? `${cot.proveedor?.razonsocial} (${notaCalc})` : ''}</td>
          })}
        </tr>
      </tbody>
    </table>
  </div>
);

// ==========================================
// COMPONENTE PRINCIPAL (ORQUESTADOR)
// ==========================================
export default function MatrizComparativa({ servicio, cotizacionesParticipantes, categoriasHomologacion, itemsCotizaciones, edicionMatriz, handleEdicionMatriz, puntajesEvaluacion, handlePuntajeChange, calcularNotaIntegral, idGanador, N, minContainerWidth }) {
  
  const getMoneda = (cot) => cot.moneda?.moneda?.toUpperCase().includes('USD') ? '$' : 'S/';

  const isCompact = N > 2; 
  
  const d_wItem = isCompact ? 3 : 5;       
  const d_wDesc = isCompact ? 17 : 25;     
  const d_wPres = isCompact ? 5 : 10;      
  const d_wProv = isCompact ? (75 / N) : (60 / N); 

  const totales = useMemo(() => {
    const diccionario = {};
    
    cotizacionesParticipantes.forEach(cot => {
      const costoDirecto = itemsCotizaciones
        .filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria)
        .reduce((acc, curr) => acc + curr.totalFila, 0);
      
      const gastosGenerales = parseFloat(cot.gastos_generales || 0);
      const utilidades = parseFloat(cot.utilidades || 0);
      const subtotal = costoDirecto + gastosGenerales + utilidades;
      const igv = subtotal * 0.18;
      const total = subtotal + igv;

      diccionario[cot.idcotizacion] = { costoDirecto, gastosGenerales, utilidades, subtotal, igv, total };
    });
    
    return diccionario;
  }, [cotizacionesParticipantes, itemsCotizaciones]);

  return (
    <div id="area-impresion" style={{ backgroundColor: 'white', width: '100%', maxWidth: '1800px', flex: 1, overflow: 'auto', padding: '30px 40px', fontFamily: 'Arial, sans-serif' }}>
      
      <style>
        {`
          @media print {
            @page {
              size: ${isCompact ? 'landscape' : 'portrait'};
              margin: ${isCompact ? '5mm' : '10mm'};
            }
          }
        `}
      </style>

      <CabeceraMatriz servicio={servicio} minContainerWidth={minContainerWidth} />

      <table id="tabla-maestra" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: `${minContainerWidth}px` }} className="impresion-width-auto">
        <colgroup>
          <col style={{ width: `${d_wItem}%` }} />
          <col style={{ width: `${d_wDesc}%` }} />
          <col style={{ width: `${d_wPres}%` }} />
          {cotizacionesParticipantes.map(c => (
            <React.Fragment key={`cg-${c.idcotizacion}`}>
              {/* Las 4 sub-columnas que suman el ancho de un proveedor */}
              <col style={{ width: `${d_wProv * 0.12}%` }} /> 
              <col style={{ width: `${d_wProv * 0.13}%` }} /> 
              <col style={{ width: `${d_wProv * 0.30}%` }} />
              <col style={{ width: `${d_wProv * 0.45}%` }} /> 
            </React.Fragment>
          ))}
        </colgroup>

        <tbody>
          {/* --- RESUMEN SUPERIOR --- */}
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ border: 'none' }}></td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => ( <td colSpan="4" key={`top-head-${cot.idcotizacion}`} style={{ ...thPdf, backgroundColor: '#D9D9D9' }}>{cot.proveedor?.razonsocial}</td> ))}
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>COSTO DIRECTO</td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`top-cd-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>{getMoneda(cot)} {totales[cot.idcotizacion].costoDirecto.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>IGV</td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`top-igv-${cot.idcotizacion}`} style={tdCenter}>{getMoneda(cot)} {totales[cot.idcotizacion].igv.toFixed(2)}</td>
            ))}
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>TOTAL</td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`top-tot-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>{getMoneda(cot)} {totales[cot.idcotizacion].total.toFixed(2)}</td>
            ))}
          </tr>

          {/* Separador más corto */}
          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '8px' }}></td></tr>

          {/* --- 1. EVALUACIÓN ECONÓMICA --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación Económica</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`eco-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th>
            <th style={thPdf}>DESCRIPCIÓN</th>
            <th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>{isCompact ? 'Pto. Obj.' : 'Presupuesto Objetivo'}</th>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`eco-head2-${cot.idcotizacion}`}>
                <th style={{ ...thPdf, fontSize: '8px', padding: '8px 1px' }}>UND</th><th style={{ ...thPdf, fontSize: '8px', padding: '8px 1px' }}>CANT</th><th style={{ ...thPdf, fontSize: '8px', padding: '8px 1px' }}>P.U.</th><th style={{ ...thPdf, fontSize: '8px', padding: '8px 1px' }}>PARCIAL</th>
              </React.Fragment>
            ))}
          </tr>
          
          {categoriasHomologacion.map((cat, idx) => (
            <tr key={`cat-${cat.idcategoria}`} style={{ pageBreakInside: 'avoid' }}>
              <td style={{ ...tdCenter, fontWeight: 'bold' }}>{idx + 1}</td>
              <td style={{ ...tdPdf, wordBreak: 'break-word', whiteSpace: 'normal' }}>{cat.nombrecategoria.toUpperCase()}</td>
              <td style={tdPdf}></td>
              {cotizacionesParticipantes.map(cot => {
                const itemsCruzados = itemsCotizaciones.filter(i => i.idcategoria === cat.idcategoria && i.idcotizacion === cot.idcotizacion)
                const parcial = itemsCruzados.reduce((acc, curr) => acc + curr.totalFila, 0)
                const keyEdicion = `${cat.idcategoria}-${cot.idcotizacion}`;
                const und = edicionMatriz[keyEdicion]?.und !== undefined ? edicionMatriz[keyEdicion].und : (itemsCruzados.length > 1 ? 'GLB' : 'UND');
                const cantInput = edicionMatriz[keyEdicion]?.cant !== undefined ? edicionMatriz[keyEdicion].cant : '1.00';
                const cantNum = parseFloat(cantInput) || 1;
                const pu = parcial > 0 ? (parcial / cantNum).toFixed(2) : '-';
                const estadoItem = edicionMatriz[keyEdicion]?.estado || '';

                return (
                  <React.Fragment key={`eco-data-${keyEdicion}`}>
                    <td style={{ ...tdCenter, padding: '2px' }}><input type="text" value={und} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'und', e.target.value.toUpperCase())} style={inputStyleMatriz} /></td>
                    <td style={{ ...tdCenter, padding: '2px' }}><input type="text" value={cantInput} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'cant', e.target.value)} style={inputStyleMatriz} /></td>
                    
                    {parcial > 0 ? (
                      <>
                        <td style={tdRight}>{`${getMoneda(cot)} ${pu}`}</td>
                        <td style={{ ...tdRight, fontWeight: 'bold' }}>{`${getMoneda(cot)} ${parcial.toFixed(2)}`}</td>
                      </>
                    ) : (
                      <td colSpan="2" style={{ ...tdCenter, padding: '2px', verticalAlign: 'middle' }}>
                        <select 
                          value={estadoItem} 
                          onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'estado', e.target.value)}
                          style={{
                            ...inputStyleMatriz,
                            cursor: 'pointer',
                            color: estadoItem === 'NO CONTEMPLA' ? '#DC2626' : (estadoItem === 'SI CONTEMPLA' ? '#16A34A' : '#64748B')
                          }}
                        >
                          <option value="">{isCompact ? '- SEL -' : '- SELECCIONAR -'}</option>
                          <option value="SI CONTEMPLA">{isCompact ? 'SÍ' : 'SI CONTEMPLA'}</option>
                          <option value="NO CONTEMPLA">{isCompact ? 'NO' : 'NO CONTEMPLA'}</option>
                        </select>
                      </td>
                    )}
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
          
          {/* Filas negras con padding reducido (2px 4px) */}
          <tr style={{ ...rowBlack, pageBreakInside: 'avoid' }}>
            <td style={{...tdCenter, padding: '2px 4px'}}>A</td><td style={{...tdPdf, padding: '2px 4px'}}>COSTO DIRECTO</td><td style={{...tdPdf, padding: '2px 4px'}}></td>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`cd-${cot.idcotizacion}`}>
                <td colSpan="3" style={{...tdPdf, padding: '2px 4px'}}></td><td colSpan="1" style={{...tdRight, padding: '2px 4px'}}>{getMoneda(cot)} {totales[cot.idcotizacion].costoDirecto.toFixed(2)}</td>
              </React.Fragment>
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>A.1</td><td style={tdPdf}>GASTOS GENERALES</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => (
               <React.Fragment key={`gg-${cot.idcotizacion}`}>
                 <td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>{getMoneda(cot)} {totales[cot.idcotizacion].gastosGenerales.toFixed(2)}</td>
               </React.Fragment> 
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>A.2</td><td style={tdPdf}>UTILIDADES</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => (
               <React.Fragment key={`ut-${cot.idcotizacion}`}>
                 <td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>{getMoneda(cot)} {totales[cot.idcotizacion].utilidades.toFixed(2)}</td>
               </React.Fragment> 
            ))}
          </tr>
          <tr style={{ ...rowBlack, pageBreakInside: 'avoid' }}>
            <td style={{...tdCenter, padding: '2px 4px'}}>B</td><td style={{...tdPdf, padding: '2px 4px'}}>SUB TOTAL</td><td style={{...tdPdf, padding: '2px 4px'}}></td>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`sb-${cot.idcotizacion}`}>
                <td colSpan="3" style={{...tdPdf, padding: '2px 4px'}}></td><td colSpan="1" style={{...tdRight, padding: '2px 4px'}}>{getMoneda(cot)} {totales[cot.idcotizacion].subtotal.toFixed(2)}</td>
              </React.Fragment>
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>B.1</td><td style={tdPdf}>IGV (18%)</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`igv-${cot.idcotizacion}`}>
                <td colSpan="2" style={tdPdf}></td><td colSpan="1" style={tdRight}>18%</td><td colSpan="1" style={tdRight}>{getMoneda(cot)} {totales[cot.idcotizacion].igv.toFixed(2)}</td>
              </React.Fragment>
            ))}
          </tr>
          <tr style={{ ...rowBlack, pageBreakInside: 'avoid' }}>
            <td style={{...tdCenter, padding: '2px 4px'}}>C</td><td style={{...tdPdf, padding: '2px 4px'}}>TOTAL</td><td style={{...tdPdf, padding: '2px 4px'}}></td>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`tot-${cot.idcotizacion}`}>
                <td colSpan="3" style={{...tdPdf, padding: '2px 4px'}}></td><td colSpan="1" style={{...tdRight, padding: '2px 4px'}}>{getMoneda(cot)} {totales[cot.idcotizacion].total.toFixed(2)}</td>
              </React.Fragment>
            ))}
          </tr>
          <tr style={{ ...rowYellow, pageBreakInside: 'avoid' }}>
            <td colSpan="2" style={tdPdf}>{isCompact ? 'PUNTAJE - EV. ECONÓMICA' : 'PUNTAJE - EVALUACIÓN ECONÓMICA'}</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`peco-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.eco} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'eco', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '8px' }}></td></tr>

          {/* --- 2. PLAZOS (REPARTIDO 2 Y 2) --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de Plazo</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`plz-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>{isCompact ? 'Plazo Obj.' : 'Plazo Objetivo y Puntaje'}</th>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`plz-head2-${cot.idcotizacion}`}>
                <th colSpan="2" style={thPdf}>PLAZO</th>
                <th colSpan="2" style={thPdf}>ENTREGABLE</th>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>2.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>PLAZOS DE ENTREGA</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`plz-data-${cot.idcotizacion}`}>
                <td colSpan="2" style={tdCenter}>{cot.plazo_dias?.toUpperCase() || '---'}</td>
                <td colSpan="2" style={{ ...tdPdf, wordBreak: 'break-word', whiteSpace: 'normal' }}>{cot.entregables || '---'}</td>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ ...rowYellow, pageBreakInside: 'avoid' }}>
            <td colSpan="2" style={tdPdf}>{isCompact ? 'PUNTAJE - EV. PLAZO' : 'PUNTAJE - EVALUACIÓN DE PLAZO'}</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`pplz-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.plazo} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'plazo', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '8px' }}></td></tr>

          {/* --- 3. ALCANCE (REPARTIDO 2 Y 2) --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación del Alcance Considerado</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`alc-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#00B050', color: 'white' }}>{isCompact ? 'Ptje Máx' : 'Puntaje Máximo'}</th>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`alc-head2-${cot.idcotizacion}`}>
                <th colSpan="2" style={thPdf}>ITEM</th>
                <th colSpan="2" style={thPdf}>DESCRIPCIÓN</th>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>3</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>ALCANCES CONSIDERADOS</td><td style={{ ...tdPdf, borderBottom: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`alc-0-${cot.idcotizacion}`}>
                <td colSpan="2" style={{...tdPdf, borderBottom: 'none'}}></td>
                <td colSpan="2" style={{...tdPdf, borderBottom: 'none'}}></td>
              </React.Fragment> 
            ))}
          </tr>
          {categoriasHomologacion.map((cat, idx) => {
            const letra = String.fromCharCode(97 + idx); 
            return (
              <tr key={`alc-cat-${cat.idcategoria}`} style={{ pageBreakInside: 'avoid' }}>
                <td style={tdCenter}>{letra}.</td><td style={{ ...tdPdf, wordBreak: 'break-word', whiteSpace: 'normal' }}>{cat.nombrecategoria}</td><td style={{ ...tdPdf, borderTop: 'none', borderBottom: 'none' }}></td>
                {cotizacionesParticipantes.map(cot => (
                   <React.Fragment key={`alc-cat-${cat.idcategoria}-${cot.idcotizacion}`}>
                     <td colSpan="2" style={tdCenter}>{letra}.</td>
                     <td colSpan="2" style={{ ...tdPdf, wordBreak: 'break-word', whiteSpace: 'normal' }}>{cat.nombrecategoria}</td>
                   </React.Fragment> 
                ))}
              </tr>
            )
          })}
          <tr style={{ ...rowYellow, pageBreakInside: 'avoid' }}>
            <td colSpan="2" style={tdPdf}>{isCompact ? 'PUNTAJE - CUMP. ALCANCES' : 'PUNTAJE - CUMPLIMIENTO DE ALCANCES'}</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`palc-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.alcance} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'alcance', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '8px' }}></td></tr>

          {/* --- 4. FORMA DE PAGO (REPARTIDO 2 Y 2) --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de forma de Pago</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`pag-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>{isCompact ? '% Obj.' : 'Porcentajes Objetivo'}</th>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`pag-head2-${cot.idcotizacion}`}>
                <th colSpan="2" style={thPdf}>%</th>
                <th colSpan="2" style={thPdf}>DESCRIPCIÓN</th>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>4.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>FORMA DE PAGO</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`pag-0-${cot.idcotizacion}`}>
                <td colSpan="2" style={tdPdf}></td>
                <td colSpan="2" style={tdPdf}></td>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td style={tdCenter}>a.</td><td style={tdPdf}>Condición del Postor</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( 
              <React.Fragment key={`pag-1-${cot.idcotizacion}`}>
                <td colSpan="2" style={tdPdf}></td>
                <td colSpan="2" style={tdCenter}>{cot.formapago?.formapago || (cot.idformapago ? 'Ver ficha' : '---')}</td>
              </React.Fragment> 
            ))}
          </tr>
          <tr style={{ ...rowYellow, pageBreakInside: 'avoid' }}>
            <td colSpan="2" style={tdPdf}>{isCompact ? 'PUNTAJE - EV. PAGO' : 'PUNTAJE - EVALUACIÓN DE FORMA DE PAGO'}</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`ppag-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.pago} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'pago', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '8px' }}></td></tr>

          {/* 3. LLAMAMOS AL SUB-COMPONENTE TABLA FINAL */}
          <tr style={{ pageBreakInside: 'avoid' }}>
            <td colSpan={2}></td><td colSpan="1" style={{ border: 'none' }}></td>
            <td colSpan={N * 4}>
              <TablaResultados cotizacionesParticipantes={cotizacionesParticipantes} calcularNotaIntegral={calcularNotaIntegral} idGanador={idGanador} />
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}