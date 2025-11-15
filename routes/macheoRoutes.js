import express from 'express';
import { requerirLogin } from '../middlewares/autorizar.js';
import Usuario from '../models/Usuario.js';

const router = express.Router();

router.get('/macheo', requerirLogin, async (req, res) => {
  const { nivel, q } = req.query;

  const filtro = { rol: 'cliente', disponibilidad: { $exists: true, $ne: [] } };

  if (nivel) {
    filtro.nivel = nivel.toLowerCase();
  }

  if (q) {
    filtro.$or = [
      { nombre:   { $regex: q, $options: 'i' } },
      { apellido: { $regex: q, $options: 'i' } }
    ];
  }

  const jugadores = await Usuario.find(filtro).lean();

  res.render('macheo', {
    usuario: req.session.usuario,
    jugadores,
    filtroNivel: nivel || '',
    filtroTexto: q || ''
  });
});

export default router;
