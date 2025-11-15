// controllers/usuarioController.js
import bcrypt from 'bcrypt';
import Usuario from '../models/Usuario.js';

// ======== LOGIN & LOGOUT ========

// Muestra el formulario de login
export const mostrarLogin = (req, res) => {
  if (req.session?.usuario) {
    if (req.session.usuario.rol === 'administrador') return res.redirect('/usuarios');
    return res.redirect('/panel');
  }
  return res.render('login', { mensaje: null });
};

// Valida contra MongoDB con bcrypt
export const login = async (req, res) => {
  try {
    const { username, password, remember } = req.body;
    if (!username || !password) {
      return res.status(400).render('login', { mensaje: 'Completá usuario y contraseña.' });
    }

    const user = await Usuario.findOne({ username: username.toLowerCase().trim() });
    if (!user) {
      return res.status(401).render('login', { mensaje: 'Usuario y/o contraseña inválidos.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).render('login', { mensaje: 'Usuario y/o contraseña inválidos.' });
    }

    req.session.usuario = {
                            id: user._id.toString(),
                            username: user.username,
                            rol: user.rol,
                            nombre: user.nombre || '',
                            apellido: user.apellido || ''
                          };
    if (remember) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;

    return res.redirect('/panel');

  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).render('login', { mensaje: 'Ocurrió un error. Intentá de nuevo.' });
  }
};

export const logout = (req, res) => {
  req.session?.destroy?.(() => res.redirect('/'));
};

// ======== CRUD USUARIOS (CLIENTES) ========

export const obtenerUsuarios = async (req, res) => {
  try {
    // Solo clientes
    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    return res.render('usuarios', { usuarios, mensaje: null });
  } catch (err) {
    return res.status(500).render('error-autorizacion', { mensaje: err.message });
  }
};

export const crearUsuario = async (req, res) => {
  try {
    const { username, password, nombre = '', apellido = '', dni = '', celular = '', nivel = '' } = req.body;

    if (!username || !password) {
      const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
      return res.status(400).render('usuarios', { usuarios, mensaje: 'Usuario y contraseña son requeridos.' });
    }

    const existe = await Usuario.findOne({ username: username.toLowerCase().trim() });
    if (existe) {
      const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
      return res.status(409).render('usuarios', { usuarios, mensaje: 'El email ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Usuario.create({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      rol: 'cliente', 
      nombre: nombre?.trim() || '',
      apellido: apellido?.trim() || '',
      dni: dni?.toString().trim() || '',
      celular: celular?.toString().trim() || '',
      nivel: (nivel || '').toLowerCase()
    });

    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    return res.render('usuarios', { usuarios, mensaje: 'Cliente creado correctamente.' });
  } catch (err) {
    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    return res.status(400).render('usuarios', { usuarios, mensaje: err.message });
  }
};

export const mostrarFormularioEditarUsuario = async (req, res) => {
  try {
    const usuarioEditar = await Usuario.findById(req.params.id).lean();
    if (!usuarioEditar || usuarioEditar.rol !== 'cliente') {
      return res.status(404).render('error-autorizacion', { mensaje: 'Cliente no encontrado.' });
    }
    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    // Reutilizamos la misma vista, activando el modal con usuarioEditar
    return res.render('usuarios', { usuarios, usuarioEditar, mensaje: null });
  } catch (err) {
    return res.status(500).render('error-autorizacion', { mensaje: err.message });
  }
};

export const actualizarUsuario = async (req, res) => {
  try {
    const {
      username,
      nombre = '',
      apellido = '',
      dni = '',
      celular = '',
      nivel = '',
      dias,        
      horaDesde,
      horaHasta
    } = req.body;

    // Solo se permite editar clientes 
    const obj = await Usuario.findById(req.params.id);
    if (!obj || obj.rol !== 'cliente') {
      return res.status(404).render('error-autorizacion', { mensaje: 'Cliente no encontrado.' });
    }

    const update = {
      nombre: nombre?.trim() || '',
      apellido: apellido?.trim() || '',
      dni: dni?.toString().trim() || '',
      celular: celular?.toString().trim() || '',
      nivel: (nivel || '').toLowerCase()
    };

    if (username) {
      update.username = username.toLowerCase().trim();
    }

    // Disponibilidad (día + horarios)
    // El formulario debe mandar pares:
    // dias[]=lunes, horaDesde[]=10:00, horaHasta[]=12:00
    // dias[]=miercoles, horaDesde[]=18:00, horaHasta[]=20:00, etc.
    const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

    const diasArr   = toArr(dias);
    const desdeArr  = toArr(horaDesde);
    const hastaArr  = toArr(horaHasta);

    const disponibilidad = [];

    for (let i = 0; i < diasArr.length; i++) {
      const d  = (diasArr[i] || '').trim();
      const de = (desdeArr[i] || '').trim();
      const ha = (hastaArr[i] || '').trim();

      if (d && de && ha) {
        disponibilidad.push({ dia: d, desde: de, hasta: ha });
      }
    }

    // Asignar disponibilidad
    update.disponibilidad = disponibilidad;

    await Usuario.updateOne(
      { _id: req.params.id, rol: 'cliente' },
      { $set: update }
    );

    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    return res.render('usuarios', { usuarios, mensaje: 'Cliente actualizado.' });

  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    const usuarios = await Usuario.find({ rol: 'cliente' }).lean();
    return res
      .status(400)
      .render('usuarios', { usuarios, mensaje: err.message });
  }
};


export const eliminarUsuario = async (req, res) => {
  try {
    const obj = await Usuario.findById(req.params.id);
    if (!obj || obj.rol !== 'cliente') {
      return res.status(404).render('error-autorizacion', { mensaje: 'Cliente no encontrado o no permitido.' });
    }

    await Usuario.deleteOne({ _id: req.params.id, rol: 'cliente' });
    return res.redirect('/usuarios');
  } catch (err) {
    return res.status(500).render('error-autorizacion', { mensaje: err.message });
  }
};

// ======== REGISTRO PÚBLICO (CLIENTE) ========

export const registrarCliente = async (req, res) => {
  try {
    const {
      username,
      password,
      nombre = '',
      apellido = '',
      dni = '',
      celular = '',
      nivel = '',
    } = req.body;

    if (!username || !password) {
      return res.status(400).render('error-autorizacion', { mensaje: 'Usuario y contraseña requeridos.' });
    }

    const existe = await Usuario.findOne({ username: username.toLowerCase().trim() });
    if (existe) {
      return res.status(409).render('error-autorizacion', { mensaje: 'El usuario ya existe.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const nuevo = await Usuario.create({
      username: username.toLowerCase().trim(),
      password: hashed,
      rol: 'cliente',
      nombre: nombre?.trim() || '',
      apellido: apellido?.trim() || '',
      dni: dni?.toString().trim() || '',
      celular: celular?.toString().trim() || '',
      nivel, // '', 'inicial', 'intermedio', 'avanzado'
    });

    req.session.usuario = { id: nuevo._id.toString(), username: nuevo.username, rol: nuevo.rol };
    return res.redirect('/panel'); // directo al panel
  } catch (err) {
    console.error('Error en registrarCliente:', err);
    return res.status(500).render('error-autorizacion', { mensaje: 'No se pudo registrar.' });
  }
};
