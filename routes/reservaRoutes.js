import express from 'express';
import { requerirLogin, autorizar } from '../middlewares/autorizar.js';
import {
  mostrarFormularioReserva,
  crearReserva,
  listarReservas,
  actualizarReserva,
  eliminarReserva,
  apiApellidos,
  apiNombresPorApellido,
  panelReservas,
  mostrarPago,
  historialReservas,
  pagarReserva

} from '../controllers/reservaController.js';

const router = express.Router();

// APIs para selects
router.get('/api/clientes/apellidos', requerirLogin, apiApellidos);
router.get('/api/clientes/nombres',   requerirLogin, apiNombresPorApellido);

// Form + acciones
router.get('/reservar', requerirLogin, mostrarFormularioReserva);
router.post('/reservar', requerirLogin, crearReserva);

router.get('/reservas', requerirLogin, listarReservas);
router.post('/reservas/:id/editar',  requerirLogin, actualizarReserva);
router.post('/reservas/:id/eliminar', requerirLogin, eliminarReserva);
// Panel de reservas (elige vista según rol)
router.get('/panel-reservas', requerirLogin, panelReservas);
router.get('/api/clientes/nombres', apiNombresPorApellido);

// Mostrar pantalla de pago (usa pago.pug)
router.get('/reservas/:id/pago', requerirLogin, autorizar(['administrador','empleado','cliente']), mostrarPago);
// Aplicar el pago a la reserva (POST)
router.post('/reservas/:id/pagar', requerirLogin, autorizar(['administrador','empleado','cliente']), pagarReserva);
// Historial de reservas del cliente
router.get('/historial-reservas', requerirLogin, autorizar(['administrador', 'empleado']), historialReservas);

export default router;

