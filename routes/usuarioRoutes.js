import express from 'express';
import {
  crearUsuario,
  obtenerUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  mostrarFormularioEditarUsuario,
  registrarCliente,
} from '../controllers/usuarioController.js';

import { autorizar } from '../middlewares/autorizar.js';

const router = express.Router();

// Para vista PUG

router.get('/usuarios', autorizar(['administrador','empleado']), obtenerUsuarios);
router.post('/usuarios', autorizar(['administrador','empleado']), crearUsuario);
router.get('/usuarios/:id/editar', autorizar(['administrador','empleado']), mostrarFormularioEditarUsuario);
router.post('/usuarios/:id/editar', autorizar(['administrador','empleado']), actualizarUsuario);
router.post('/usuarios/:id/eliminar', autorizar(['administrador']), eliminarUsuario);

// --- Registrar cliente ---
router.get('/registro', (req, res) => res.render('registro')); // renderiza la vista Pug
router.post('/registro', registrarCliente);                    // alta pública (rol=cliente)

export default router;
