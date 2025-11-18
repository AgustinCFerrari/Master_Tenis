// helpers/reservas.js

// Convierte "2025-11-18" + "10:30" -> Date(2025-11-18T10:30:00)
export function buildDateTime(fechaISO, horaHHMM) {
  const [year, month, day] = fechaISO.split('-').map(Number);
  const [hour, minute] = horaHHMM.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Devuelve el importe total en base a bloques de 30 minutos
export function calcularImporteReserva(horaInicio, horaFin, precioPorHora) {
  const [h1, m1] = horaInicio.split(':').map(Number);
  const [h2, m2] = horaFin.split(':').map(Number);

  const inicioMin = h1 * 60 + m1;
  const finMin = h2 * 60 + m2;

  if (finMin <= inicioMin) {
    throw new Error('La hora de fin debe ser mayor a la hora de inicio');
  }

  const duracionMin = finMin - inicioMin;
  const bloques30 = Math.ceil(duracionMin / 30);   // redondea hacia arriba
  const precioPorBloque = precioPorHora / 2;       // 30 min = 1/2 hora

  return bloques30 * precioPorBloque;
}

// Determina si una reserva se solapa con alguna existente
export function haySolapamiento(nueva, existentes) {
  const inicioNueva = nueva.horaInicio;
  const finNueva = nueva.horaFin;

  return existentes.some((r) => {
    const inicio = r.horaInicio;
    const fin = r.horaFin;
    // solapa si inicioNueva < finExistente y finNueva > inicioExistente
    return inicioNueva < fin && finNueva > inicio;
  });
}
