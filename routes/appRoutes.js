import express from 'express';
import { mostrarLogin, login, logout } from '../controllers/usuarioController.js';
import { mostrarPanel } from '../controllers/panelController.js';
import { requerirLogin, autorizar } from '../middlewares/autorizar.js';

const router = express.Router();

// Login
router.get('/', mostrarLogin);
router.post('/login', login);
router.post('/logout', logout);

// Panel: sólo cliente , empleado y administrador
router.get('/panel', requerirLogin, autorizar(['cliente', 'empleado', 'administrador']), mostrarPanel);

export default router;
