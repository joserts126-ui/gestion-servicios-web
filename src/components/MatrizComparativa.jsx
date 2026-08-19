import React from 'react';

export default function MatrizComparativa({ servicio, cotizacionesParticipantes, categoriasHomologacion, itemsCotizaciones, edicionMatriz, handleEdicionMatriz, puntajesEvaluacion, handlePuntajeChange, calcularNotaIntegral, idGanador, N, wItem, wDesc, wPres, wProv, minContainerWidth }) {
  
  const borderPdf = '1px solid #000';
  const thPdf = { border: borderPdf, backgroundColor: '#D9D9D9', padding: '10px 4px', fontSize: '10.5px', fontWeight: 'bold', textAlign: 'center', color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' };
  const tdPdf = { border: borderPdf, padding: '8px 4px', fontSize: '10.5px', color: '#000', wordWrap: 'break-word', verticalAlign: 'middle' };
  const tdCenter = { ...tdPdf, textAlign: 'center' };
  const tdRight = { ...tdPdf, textAlign: 'right', whiteSpace: 'nowrap', fontSize: '10.5px' }; 
  const rowBlack = { backgroundColor: '#000', color: '#FFF', fontWeight: 'bold' };
  const rowYellow = { backgroundColor: '#FFFF00', color: '#000', fontWeight: 'bold' };
  
  // Input con padding controlado para evitar que se corte el texto
  const inputStyleMatriz = { width: '100%', height: '22px', lineHeight: '22px', border: 'none', textAlign: 'center', fontSize: '10.5px', outline: 'none', backgroundColor: 'transparent', padding: '0', margin: '0', color: '#000', fontWeight: 'bold', boxSizing: 'border-box' };

  return (
    <div id="area-impresion" style={{ backgroundColor: 'white', width: '100%', maxWidth: '1800px', flex: 1, overflow: 'auto', padding: '30px 40px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* CABECERA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', minWidth: `${minContainerWidth}px` }} className="impresion-width-auto">
        <div style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
          <h1 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>COMPARATIVO DE PROPUESTAS</h1>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '45px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <img src="../public/logoCentenario.png" alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <table style={{ width: '45%', fontSize: '10.5px', textAlign: 'left', marginBottom: '10px' }}>
            <tbody>
              <tr><td style={{ width: '70px', fontWeight: 'bold', padding: '3px' }}>Asunto</td><td style={{ padding: '3px' }}>{servicio.servicio.toUpperCase()}</td></tr>
              <tr><td style={{ fontWeight: 'bold', padding: '3px' }}>Proyecto</td><td style={{ padding: '3px' }}>{servicio.lugarejecucion?.lugarejecucion?.toUpperCase() || '---'}</td></tr>
              <tr><td style={{ fontWeight: 'bold', padding: '3px' }}>Fecha</td><td style={{ padding: '3px' }}>{new Date().toLocaleDateString('es-PE')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLA MAESTRA */}
      <table id="tabla-maestra" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: `${minContainerWidth}px` }} className="impresion-width-auto">
        
        {/* COLGROUP PROPORCIONAL EXACTO (Evita colapsos en Unidad, Cantidad, P.U. y Parcial) */}
        <colgroup>
          <col style={{ width: `${wItem}%` }} /> 
          <col style={{ width: `${wDesc}%` }} /> 
          <col style={{ width: `${wPres}%` }} />
          {cotizacionesParticipantes.map(c => (
            <React.Fragment key={`cg-${c.idcotizacion}`}>
              <col style={{ width: `${wProv * 0.15}%` }} /> {/* Unidad (Compacta) */}
              <col style={{ width: `${wProv * 0.20}%` }} /> {/* Cantidad */}
              <col style={{ width: `${wProv * 0.30}%` }} /> {/* P.U. */}
              <col style={{ width: `${wProv * 0.35}%` }} /> {/* Parcial (Amplia para montos grandes) */}
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
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              return <td colSpan="4" key={`top-cd-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>S/ {cd.toFixed(2)}</td>
            })}
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>IGV</td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              const igv = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 0.18;
              return <td colSpan="4" key={`top-igv-${cot.idcotizacion}`} style={tdCenter}>S/ {igv.toFixed(2)}</td>
            })}
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td><td style={{ ...tdPdf, fontWeight: 'bold', borderLeft: borderPdf, borderRight: borderPdf }}>TOTAL</td><td style={{ border: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              const total = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 1.18;
              return <td colSpan="4" key={`top-tot-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold' }}>S/ {total.toFixed(2)}</td>
            })}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '25px' }}></td></tr>

          {/* --- 1. EVALUACIÓN ECONÓMICA --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación Económica</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`eco-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th>
            <th style={thPdf}>DESCRIPCIÓN</th>
            <th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Presupuesto<br/>Objetivo y</th>
            {cotizacionesParticipantes.map(cot => (
              <React.Fragment key={`eco-head2-${cot.idcotizacion}`}>
                <th style={{ ...thPdf, fontSize: '9.5px', padding: '8px 1px' }}>UNIDAD</th>
                <th style={{ ...thPdf, fontSize: '9.5px', padding: '8px 1px' }}>CANTIDAD</th>
                <th style={{ ...thPdf, fontSize: '9.5px', padding: '8px 1px' }}>P.U.</th>
                <th style={{ ...thPdf, fontSize: '9.5px', padding: '8px 1px' }}>PARCIAL</th>
              </React.Fragment>
            ))}
          </tr>
          
          {categoriasHomologacion.map((cat, idx) => (
            <tr key={`cat-${cat.idcategoria}`}>
              <td style={{ ...tdCenter, fontWeight: 'bold' }}>{idx + 1}</td>
              <td style={tdPdf}>{cat.nombrecategoria.toUpperCase()}</td>
              <td style={tdPdf}></td>
              {cotizacionesParticipantes.map(cot => {
                const itemsCruzados = itemsCotizaciones.filter(i => i.idcategoria === cat.idcategoria && i.idcotizacion === cot.idcotizacion)
                const parcial = itemsCruzados.reduce((acc, curr) => acc + curr.totalFila, 0)
                const keyEdicion = `${cat.idcategoria}-${cot.idcotizacion}`;
                const und = edicionMatriz[keyEdicion]?.und !== undefined ? edicionMatriz[keyEdicion].und : (itemsCruzados.length > 1 ? 'GLB' : 'UND');
                const cantInput = edicionMatriz[keyEdicion]?.cant !== undefined ? edicionMatriz[keyEdicion].cant : '1.00';
                const cantNum = parseFloat(cantInput) || 1;
                const pu = parcial > 0 ? (parcial / cantNum).toFixed(2) : '-';

                return (
                  <React.Fragment key={`eco-data-${keyEdicion}`}>
                    <td style={{ ...tdCenter, padding: '2px' }}><input type="text" value={und} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'und', e.target.value.toUpperCase())} style={inputStyleMatriz} /></td>
                    <td style={{ ...tdCenter, padding: '2px' }}><input type="text" value={cantInput} onChange={(e) => handleEdicionMatriz(cat.idcategoria, cot.idcotizacion, 'cant', e.target.value)} style={inputStyleMatriz} /></td>
                    <td style={tdRight}>{pu !== '-' ? `S/ ${pu}` : '-'}</td>
                    <td style={{ ...tdRight, fontWeight: 'bold' }}>{parcial > 0 ? `S/ ${parcial.toFixed(2)}` : '-'}</td>
                  </React.Fragment>
                )
              })}
            </tr>
          ))}
          
          <tr style={rowBlack}>
            <td style={tdCenter}>A</td><td style={tdPdf}>COSTO DIRECTO (S/.)</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              return <React.Fragment key={`cd-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {cd.toFixed(2)}</td></React.Fragment>
            })}
          </tr>
          <tr>
            <td style={tdCenter}>A.1</td><td style={tdPdf}>GASTOS GENERALES</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`gg-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {parseFloat(cot.gastos_generales||0).toFixed(2)}</td></React.Fragment> ))}
          </tr>
          <tr>
            <td style={tdCenter}>A.2</td><td style={tdPdf}>UTILIDADES</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`ut-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {parseFloat(cot.utilidades||0).toFixed(2)}</td></React.Fragment> ))}
          </tr>
          <tr style={rowBlack}>
            <td style={tdCenter}>B</td><td style={tdPdf}>SUB TOTAL (S/.)</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              const sub = cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0);
              return <React.Fragment key={`sb-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {sub.toFixed(2)}</td></React.Fragment>
            })}
          </tr>
          <tr>
            <td style={tdCenter}>B.1</td><td style={tdPdf}>IGV (18%)</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              const igv = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 0.18;
              return <React.Fragment key={`igv-${cot.idcotizacion}`}><td colSpan="2" style={tdPdf}></td><td colSpan="1" style={tdRight}>18%</td><td colSpan="1" style={tdRight}>S/ {igv.toFixed(2)}</td></React.Fragment>
            })}
          </tr>
          <tr style={rowBlack}>
            <td style={tdCenter}>C</td><td style={tdPdf}>TOTAL (S/.)</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => {
              const cd = itemsCotizaciones.filter(i => i.idcotizacion === cot.idcotizacion && i.idcategoria).reduce((acc, curr) => acc + curr.totalFila, 0);
              const total = (cd + parseFloat(cot.gastos_generales||0) + parseFloat(cot.utilidades||0)) * 1.18;
              return <React.Fragment key={`tot-${cot.idcotizacion}`}><td colSpan="3" style={tdPdf}></td><td colSpan="1" style={tdRight}>S/ {total.toFixed(2)}</td></React.Fragment>
            })}
          </tr>
          <tr style={rowYellow}>
            <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN ECONÓMICA</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`peco-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.eco} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'eco', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '25px' }}></td></tr>

          {/* --- 2. PLAZOS --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de Plazo</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`plz-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Plazo Objetivo<br/>y Puntaje</th>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`plz-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>PLAZO</th><th colSpan="3" style={thPdf}>ENTREGABLE</th></React.Fragment> ))}
          </tr>
          <tr>
            <td style={tdCenter}>2.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>PLAZOS DE ENTREGA</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`plz-data-${cot.idcotizacion}`}><td colSpan="1" style={tdCenter}>{cot.plazo_dias?.toUpperCase() || '---'}</td><td colSpan="3" style={tdPdf}>{cot.entregables || '---'}</td></React.Fragment> ))}
          </tr>
          <tr style={rowYellow}>
            <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN DE PLAZO</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`pplz-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.plazo} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'plazo', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '25px' }}></td></tr>

          {/* --- 3. ALCANCE --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación del Alcance Considerado</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`alc-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#00B050', color: 'white' }}>Puntaje<br/>Máximo</th>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`alc-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>ITEM</th><th colSpan="3" style={thPdf}>DESCRIPCIÓN</th></React.Fragment> ))}
          </tr>
          <tr>
            <td style={tdCenter}>3</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>ALCANCES CONSIDERADOS</td><td style={{ ...tdPdf, borderBottom: 'none' }}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`alc-0-${cot.idcotizacion}`}><td colSpan="1" style={{...tdPdf, borderBottom: 'none'}}></td><td colSpan="3" style={{...tdPdf, borderBottom: 'none'}}></td></React.Fragment> ))}
          </tr>
          {categoriasHomologacion.map((cat, idx) => {
            const letra = String.fromCharCode(97 + idx); 
            return (
              <tr key={`alc-cat-${cat.idcategoria}`}>
                <td style={tdCenter}>{letra}.</td><td style={tdPdf}>{cat.nombrecategoria}</td><td style={{ ...tdPdf, borderTop: 'none', borderBottom: 'none' }}></td>
                {cotizacionesParticipantes.map(cot => (
                   <React.Fragment key={`alc-cat-${cat.idcategoria}-${cot.idcotizacion}`}>
                     <td colSpan="1" style={tdCenter}>{letra}.</td><td colSpan="3" style={tdPdf}>{cat.nombrecategoria}</td>
                   </React.Fragment> 
                ))}
              </tr>
            )
          })}
          <tr style={rowYellow}>
            <td colSpan="2" style={tdPdf}>PUNTAJE - CUMPLIMIENTO DE ALCANCES</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`palc-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.alcance} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'alcance', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '25px' }}></td></tr>

          {/* --- 4. FORMA DE PAGO --- */}
          <tr>
            <th colSpan="3" style={{ ...thPdf, textAlign: 'center', backgroundColor: '#FFF', borderBottom: 'none' }}>Evaluación de forma de Pago</th>
            {cotizacionesParticipantes.map(cot => ( <th colSpan="4" key={`pag-head1-${cot.idcotizacion}`} style={thPdf}>{cot.proveedor?.razonsocial}</th> ))}
          </tr>
          <tr>
            <th style={thPdf}>ITEM</th><th style={thPdf}>DESCRIPCIÓN</th><th style={{ ...thPdf, backgroundColor: '#0070C0', color: 'white' }}>Porcentajes<br/>Objetivo...</th>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-head2-${cot.idcotizacion}`}><th colSpan="1" style={thPdf}>%</th><th colSpan="3" style={thPdf}>Descripción</th></React.Fragment> ))}
          </tr>
          <tr>
            <td style={tdCenter}>4.00</td><td style={{ ...tdPdf, fontWeight: 'bold' }}>FORMA DE PAGO</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-0-${cot.idcotizacion}`}><td colSpan="1" style={tdPdf}></td><td colSpan="3" style={tdPdf}></td></React.Fragment> ))}
          </tr>
          <tr>
            <td style={tdCenter}>a.</td><td style={tdPdf}>Condición del Postor</td><td style={tdPdf}></td>
            {cotizacionesParticipantes.map(cot => ( <React.Fragment key={`pag-1-${cot.idcotizacion}`}><td colSpan="1" style={tdPdf}></td><td colSpan="3" style={tdCenter}>{cot.idformapago ? 'Ver ficha' : '---'}</td></React.Fragment> ))}
          </tr>
          <tr style={rowYellow}>
            <td colSpan="2" style={tdPdf}>PUNTAJE - EVALUACIÓN DE FORMA DE PAGO</td><td style={tdCenter}>5.00</td>
            {cotizacionesParticipantes.map(cot => (
              <td colSpan="4" key={`ppag-${cot.idcotizacion}`} style={{ ...tdCenter, padding: '2px' }}>
                <input type="number" min="0" max="5" step="0.1" value={puntajesEvaluacion[cot.idcotizacion]?.pago} onChange={(e) => handlePuntajeChange(cot.idcotizacion, 'pago', e.target.value)} style={inputStyleMatriz} />
              </td>
            ))}
          </tr>

          <tr><td colSpan={3 + N*4} style={{ border: 'none', height: '35px' }}></td></tr>

          {/* --- TABLA FINAL --- */}
          <tr>
            <td colSpan={2}></td>
            <td colSpan="1" style={{ border: 'none' }}></td>
            <td colSpan={N * 4}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <table style={{ width: '60%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                  <thead>
                    <tr style={rowBlack}>
                      <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>DESCRIPCIÓN</th>
                      <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>INCIDENCIA</th>
                      <th style={{ ...thPdf, backgroundColor: '#000', color: '#FFF' }}>ABREVIATURA</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={tdPdf}>Propuesta Económica</td><td style={tdCenter}>35%</td><td style={tdCenter}>PE</td></tr>
                    <tr><td style={tdPdf}>Plazos</td><td style={tdCenter}>35%</td><td style={tdCenter}>PL</td></tr>
                    <tr><td style={tdPdf}>Entregables y Alcances</td><td style={tdCenter}>20%</td><td style={tdCenter}>EA</td></tr>
                    <tr><td style={tdPdf}>Forma de Pago</td><td style={tdCenter}>10%</td><td style={tdCenter}>FP</td></tr>
                    <tr><td style={tdPdf}></td><td style={{...tdCenter, fontWeight: 'bold'}}>100%</td><td style={tdPdf}></td></tr>
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tdCenter, width: '30%', fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>Puntaje final</td>
                      {cotizacionesParticipantes.map(cot => {
                         const notaCalc = calcularNotaIntegral(cot.idcotizacion);
                         return <td key={`rfin-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#5DADE2', color: '#000', border: borderPdf }}>{notaCalc}</td>
                      })}
                    </tr>
                    <tr><td colSpan={cotizacionesParticipantes.length + 1} style={{ border: 'none', height: '8px' }}></td></tr>
                    <tr>
                      <td style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>POSTOR GANADOR</td>
                      {cotizacionesParticipantes.map(cot => {
                         const notaCalc = calcularNotaIntegral(cot.idcotizacion);
                         const isWinner = (cot.idcotizacion === idGanador && idGanador !== null);
                         return <td key={`rgan-${cot.idcotizacion}`} style={{ ...tdCenter, fontWeight: 'bold', backgroundColor: '#A6ACAF', color: '#000', border: borderPdf }}>{isWinner ? cot.proveedor?.razonsocial : ''} {isWinner ? `(${notaCalc})` : ''}</td>
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

        </tbody>
      </table>
    </div>
  );
}