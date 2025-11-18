// tests/reservas.test.js
import { buildDateTime, calcularImporteReserva, haySolapamiento } from '../helpers/reservas.js';

describe('buildDateTime()', () => {
  test('combina correctamente fecha y hora en un objeto Date', () => {
    // Qué se prueba: que la función arme bien la fecha/hora.
    const dt = buildDateTime('2025-11-18', '10:30');

    // Resultado esperado:
    expect(dt.getFullYear()).toBe(2025);
    expect(dt.getMonth()).toBe(10); // noviembre es 10 (0-based)
    expect(dt.getDate()).toBe(18);
    expect(dt.getHours()).toBe(10);
    expect(dt.getMinutes()).toBe(30);
  });
});

describe('calcularImporteReserva()', () => {
  const PRECIO_POR_HORA = 24000;

  test('calcula correctamente una reserva de 1 hora (10:00–11:00)', () => {
    // Qué se prueba: duración exacta de 1 hora.
    const importe = calcularImporteReserva('10:00', '11:00', PRECIO_POR_HORA);

    // Resultado esperado: 1 hora = 24000
    expect(importe).toBe(24000);
  });

  test('calcula correctamente una reserva de 1 hora y media (10:00–11:30)', () => {
    // Qué se prueba: duración de 1h30 → 3 bloques de 30 min.
    const importe = calcularImporteReserva('10:00', '11:30', PRECIO_POR_HORA);

    // 1h30 = 3 bloques de 30 min, cada bloque = 12000 → total 36000
    expect(importe).toBe(36000);
  });

  test('lanza error si la hora de fin es menor o igual a la hora de inicio', () => {
    // Qué se prueba: validación básica de rango horario
    expect(() => {
      calcularImporteReserva('11:00', '10:30', PRECIO_POR_HORA);
    }).toThrow('La hora de fin debe ser mayor a la hora de inicio');
  });
});

describe('haySolapamiento()', () => {
  const reservasExistentes = [
    { horaInicio: '10:00', horaFin: '11:00' }, // reserva A
    { horaInicio: '12:00', horaFin: '13:00' }  // reserva B
  ];

  test('detecta que NO hay solapamiento cuando la nueva reserva está antes', () => {
    // Nueva reserva: 08:00–09:00
    const nueva = { horaInicio: '08:00', horaFin: '09:00' };

    const resultado = haySolapamiento(nueva, reservasExistentes);

    // Esperado: false (no se superpone con A ni con B)
    expect(resultado).toBe(false);
  });

  test('detecta solapamiento con una reserva existente (10:30–11:30)', () => {
    // Nueva reserva: se cruza con la A (10:00–11:00)
    const nueva = { horaInicio: '10:30', horaFin: '11:30' };

    const resultado = haySolapamiento(nueva, reservasExistentes);

    // Esperado: true
    expect(resultado).toBe(true);
  });

  test('detecta solapamiento exacto en el mismo rango (12:00–13:00)', () => {
    // Nueva reserva: mismo horario que la B
    const nueva = { horaInicio: '12:00', horaFin: '13:00' };

    const resultado = haySolapamiento(nueva, reservasExistentes);

    // Esperado: true
    expect(resultado).toBe(true);
  });
});
