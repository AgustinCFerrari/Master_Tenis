export const requerirLogin = (req, res, next) => {
  if (!req.session?.usuario) return res.redirect('/');
  next();
};

export const autorizar = (rolesPermitidos = []) => (req, res, next) => {
  const rol = req.session?.usuario?.rol;
  if (!rol || (rolesPermitidos.length && !rolesPermitidos.includes(rol))) {
    return res.status(403).render('error-autorizacion', { mensaje: 'No tenés permisos.' });
  }
  next();
};
