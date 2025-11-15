import Usuario from '../models/Usuario.js';

export const mostrarPanel = async (req, res) => {
  try {
    // Si no hay sesión, redirige
    if (!req.session?.usuario) return res.redirect('/');

    // Buscar el usuario completo en la base
    const usuarioDB = await Usuario.findById(req.session.usuario.id).lean();

    // Renderizar panel con los datos del usuario completo
    return res.render('panel', { usuario: usuarioDB });
  } catch (err) {
    console.error('Error al cargar panel:', err);
    return res.status(500).render('error-autorizacion', { mensaje: 'No se pudo cargar el panel.' });
  }
};

