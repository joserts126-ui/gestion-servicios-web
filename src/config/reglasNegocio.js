// src/config/reglasNegocio.js

export const PESOS_EVALUACION = {
  economica: 0.35, // 35%
  plazo: 0.35,     // 35%
  alcance: 0.20,   // 20%
  pago: 0.10       // 10%
};

// Pequeña función para convertir los decimales a texto (ej. 0.35 -> "35%")
export const getPorcentajeTexto = (valor) => `${(valor * 100).toFixed(0)}%`;