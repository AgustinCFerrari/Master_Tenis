// controllers/reservaController.js
import Reserva from '../models/Reserva.js';
import Usuario from '../models/Usuario.js';
import Pago from '../models/Pago.js';
import dotenv from 'dotenv';
dotenv.config();

const PRECIO_CANCHA_POR_HORA = Number(process.env.CANCHA_PRECIO_POR_HORA) || 0;

// Util: compone Date a partir de dateString (YYYY-MM-DD) + "HH:MM"
function buildDateTime(dateStr, hm) {
  if (!dateStr) return new Date('Invalid');
  const [h, m] = (hm || '00:00').split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  // Construimos en hora local
  return new Date(year, month - 1, day, h, m || 0, 0, 0);
}

// Util: calcula el importe de una reserva según duración y precio por hora
function calcularImporteReserva(reserva) {
  const precio = PRECIO_CANCHA_POR_HORA;
  if (!precio) return 0;

  if (!reserva || !reserva.fecha || !reserva.horaInicio || !reserva.horaFin) {
    // Si falta algo, al menos cobramos 1 hora
    return precio;
  }

  const fechaObj = new Date(reserva.fecha);
  if (isNaN(fechaObj.getTime())) return precio;

  const year  = fechaObj.getFullYear();
  const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
  const day   = String(fechaObj.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const dtInicio = buildDateTime(dateStr, reserva.horaInicio);
  const dtFin    = buildDateTime(dateStr, reserva.horaFin);

  if (isNaN(dtInicio.getTime()) || isNaN(dtFin.getTime()) || dtFin <= dtInicio) {
    return precio;
  }

  // Diferencia en minutos
  const diffMs     = dtFin - dtInicio;
  const minutos    = diffMs / (1000 * 60);

  // Bloques de 30 minutos, siempre redondeando para arriba
  const bloquesMediaHora = Math.ceil(minutos / 30);  
  const horasCobradas    = bloquesMediaHora / 2;    

  return horasCobradas * precio;
}

// ---------- FORMULARIO ----------
export const mostrarFormularioReserva = async (req, res) => {
  try {
    const sesion = req.session?.usuario;
    if (!sesion) return res.redirect('/');

    // Si el rol es cliente, cargamos el usuario completo desde BD
    let usuarioCompleto = sesion;
    if (sesion.rol === 'cliente') {
      usuarioCompleto = await Usuario.findById(sesion.id).lean();
    }

    const { jugadorId, nombre, apellido, dia, horaDesde, horaHasta } = req.query;

    let jugadorPreseleccionado = null;

    // Si viene desde macheo con jugadorId y rol admin/empleado, lo buscamos
    if (jugadorId && (sesion.rol === 'administrador' || sesion.rol === 'empleado')) {
      jugadorPreseleccionado = await Usuario.findOne({
        _id: jugadorId,
        rol: 'cliente'
      }).lean();
    }

    // Para admin/empleado siempre se carga apellidos
    let apellidosUnicos = [];
    if (sesion.rol !== 'cliente') {
      const apellidos = await Usuario.aggregate([
        { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
        { $group: { _id: '$apellido' } },
        { $sort: { _id: 1 } }
      ]);
      apellidosUnicos = apellidos.map(a => a._id);
    }

    // Datos para prellenar fecha/horarios desde macheo
    const macheo = {
      diaSemana: dia || '', 
      horaInicio: horaDesde || '',
      horaFin: horaHasta || '',
      nombre: nombre || (jugadorPreseleccionado?.nombre || ''),
      apellido: apellido || (jugadorPreseleccionado?.apellido || '')
    };


    // Sugerencia para admin/empleado (grisada junto al selector)
    const sugerido = {
      apellido: macheo.apellido || '',
      nombre: macheo.nombre || ''
    };

    return res.render('reservar', {
      usuario: usuarioCompleto,
      apellidos: apellidosUnicos,
      jugadorPreseleccionado,       
      macheo,
      sugerido,
      vieneDeMacheo: Boolean(jugadorId || nombre || apellido || dia || horaDesde || horaHasta),
      mensaje: null
    });

  } catch (err) {
    console.error('Error mostrarFormularioReserva:', err);
    return res.render('reservar', {
      usuario: req.session?.usuario,
      apellidos: [],
      jugadorPreseleccionado: null,
      macheo: {},
      sugerido: {},
      vieneDeMacheo: false,
      mensaje: 'No se pudo cargar el formulario de reserva.'
    });
  }
};



// ---------- API auxiliares para selects ----------
export const apiApellidos = async (req, res) => {
  const apellidos = await Usuario.aggregate([
    { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
    { $group: { _id: '$apellido' } },
    { $sort: { _id: 1 } }
  ]);
  res.json(apellidos.map(a => a._id));
};

export const apiNombresPorApellido = async (req, res) => {
  const { apellido } = req.query;
  if (!apellido) return res.json([]);
  const usuarios = await Usuario.find({ rol: 'cliente', apellido }).select('_id nombre apellido username').sort({ nombre: 1 }).lean();
  // devolvemos solo lo necesario
  res.json(usuarios.map(u => ({ id: u._id, nombre: u.nombre, apellido: u.apellido, email: u.username })));
};

// ---------- CREAR ----------
export const crearReserva = async (req, res) => {
  try {
    const { fecha, horaInicio, horaFin, cancha, jugadorId: jugadorIdForm, apellido, nombre } = req.body;
    const sesion = req.session?.usuario;
    if (!sesion) return res.redirect('/');

    if (!fecha || !horaInicio || !horaFin || !cancha) {
      return res.status(400).render('reservar', {
        usuario: sesion,
        apellidos: [],
        mensaje: 'Completá fecha, hora de inicio, hora de fin y cancha.'
      });
    }

    // Resolución del jugador según rol (cliente se autoasigna, admin/empleado elige)
    let jugador;
    if (sesion.rol === 'cliente') {
      jugador = await Usuario.findById(sesion.id).lean();
      if (!jugador) throw new Error('Tu usuario no existe.');
    } else {
      if (jugadorIdForm) {
        jugador = await Usuario.findOne({ _id: jugadorIdForm, rol: 'cliente' }).lean();
      } else if (apellido && nombre) {
        jugador = await Usuario.findOne({ rol: 'cliente', apellido, nombre }).lean();
      }
      if (!jugador) {
        const apell = await Usuario.aggregate([
          { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
          { $group: { _id: '$apellido' } },
          { $sort: { _id: 1 } }
        ]);
        return res.status(400).render('reservar', {
          usuario: sesion,
          apellidos: apell.map(a => a._id),
          mensaje: 'Seleccioná un cliente válido.'
        });
      }
    }

    // Construcción de Date/hora
    const ahora = new Date();
    const dtInicio = buildDateTime(fecha, horaInicio);
    const dtFin    = buildDateTime(fecha, horaFin);

    // Fecha/hora inválidas o fin anterior a inicio
    if (isNaN(dtInicio.getTime()) || isNaN(dtFin.getTime()) || dtFin <= dtInicio) {
      const apell = await Usuario.aggregate([
        { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
        { $group: { _id: '$apellido' } },
        { $sort: { _id: 1 } }
      ]);
      return res.status(400).render('reservar', {
        usuario: sesion,
        apellidos: apell.map(a => a._id),
        mensaje: 'Horario inválido (fin debe ser posterior al inicio).'
      });
    }

    // No permite horarios pasados
    if (dtInicio <= ahora) {
      const apell = await Usuario.aggregate([
        { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
        { $group: { _id: '$apellido' } },
        { $sort: { _id: 1 } }
      ]);
      return res.status(400).render('reservar', {
        usuario: sesion,
        apellidos: apell.map(a => a._id),
        mensaje: 'No podés reservar en fechas/horarios pasados.'
      });
    }

    // Normalizamos "fecha" como día en horario local
    const [year, month, day] = fecha.split('-').map(Number);
    const dia = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Validación de solapamiento por cancha (mismo día)
    const overlap = await Reserva.findOne({
      fecha: { $gte: dia, $lt: new Date(dia.getTime()+24*60*60*1000) },
      cancha,
      estado: 'activa',
      // comprobamos solape comparando strings HH:MM: el truco anterior sirve si mantenemos formato 2 dígitos
      $or: [
        { horaInicio: { $lt: horaFin  }, horaFin: { $gt: horaInicio } }
      ]
    }).lean();

    if (overlap) {
      const apell = await Usuario.aggregate([
        { $match: { rol: 'cliente', apellido: { $exists: true, $ne: '' } } },
        { $group: { _id: '$apellido' } },
        { $sort: { _id: 1 } }
      ]);
      return res.status(409).render('reservar', {
        usuario: sesion,
        apellidos: apell.map(a => a._id),
        mensaje: 'Ya existe una reserva que se superpone en esa cancha y horario.'
      });
    }

    // Crear
    await Reserva.create({
      jugadorId: (sesion.rol === 'cliente') ? sesion.id : jugador._id,
      jugadorEmail: (sesion.rol === 'cliente') ? sesion.username : jugador.username,
      fecha: dia,
      horaInicio,
      horaFin,
      cancha,
      createdBy: sesion.id
    });

    return res.redirect('/panel-reservas');
  } catch (err) {
    console.error('Error crearReserva:', err);
    return res.status(500).render('reservar', { usuario: req.session.usuario, apellidos: [], mensaje: 'No se pudo crear la reserva.' });
  }
};

// ---------- LISTAR ----------
export const listarReservas = async (req, res) => {
  try {
    const rol = req.session?.usuario?.rol;
    const userId = req.session?.usuario?.id;
    const filtro = (rol === 'cliente') ? { jugadorId: userId } : {};

    // Mostrar solo reservas CON FECHA HOY O FUTURA
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let query = Reserva.find({
      ...filtro,
      fecha: { $gte: hoy }
    }).sort({ fecha: 1, horaInicio: 1 });

    // Para admin / empleado: se necesitan los datos del cliente
    if (rol !== 'cliente') {
      query = query.populate('jugadorId', 'nombre apellido username');
    }

    const reservas = await query.lean();

    return res.render('panel-reservas-admin', {
      reservas,
      usuario: req.session.usuario
    });
  } catch (err) {
    console.error('Error listarReservas:', err);
    return res
      .status(500)
      .render('error-autorizacion', { mensaje: 'No se pudo cargar el listado.' });
  }
};


// ---------- ACTUALIZAR ----------
export const actualizarReserva = async (req, res) => {
  try {
    const rol = req.session?.usuario?.rol;
    const userId = req.session?.usuario?.id;
    const filtro = { _id: req.params.id };
    if (rol === 'cliente') filtro.jugadorId = userId;

    const { fecha, horaInicio, horaFin, cancha, estado } = req.body;
    const set = {};
    if (fecha) {
      const d = new Date(fecha); d.setHours(0,0,0,0);
      set.fecha = d;
    }
    if (horaInicio) set.horaInicio = horaInicio;
    if (horaFin) set.horaFin = horaFin;
    if (cancha) set.cancha = cancha;
    if (estado) set.estado = estado;

    await Reserva.updateOne(filtro, { $set: set });
    return res.redirect('/panel-reservas');
  } catch (err) {
    console.error('Error actualizarReserva:', err);
    return res.status(400).render('error-autorizacion', { mensaje: 'No se pudo actualizar.' });
  }
};

// ---------- ELIMINAR ----------
export const eliminarReserva = async (req, res) => {
  try {
    const rol = req.session?.usuario?.rol;
    const userId = req.session?.usuario?.id;
    const filtro = { _id: req.params.id };
    if (rol === 'cliente') filtro.jugadorId = userId;

    await Reserva.deleteOne(filtro);
    return res.redirect('/panel-reservas');
  } catch (err) {
    console.error('Error eliminarReserva:', err);
    return res.status(400).render('error-autorizacion', { mensaje: 'No se pudo eliminar.' });
  }
};

// ---------- PANEL DE RESERVAS ----------
export const panelReservas = async (req, res) => {
  try {
    if (!req.session?.usuario) {
      return res.redirect('/');
    }

    const { id, rol } = req.session.usuario;

    // cliente: panel propio con solo sus reservas
    if (rol === 'cliente') {
      const usuarioDB = await Usuario.findById(id).lean();

      const reservas = await Reserva.find({ jugadorId: id })
        .sort({ fecha: 1, horaInicio: 1 })
        .lean();

      return res.render('panel-reservas-cliente', {
        usuario: usuarioDB || req.session.usuario,
        reservas
      });
    }

    // Administrador y empleado-> ve todas las reservas
      if (rol === 'administrador' || rol === 'empleado') {
      return listarReservas(req, res);
    }

    // Rol desconocido / sin permiso
    return res
      .status(403)
      .render('error-autorizacion', { mensaje: 'No tenés acceso al panel de reservas.' });

  } catch (err) {
    console.error('Error en panelReservas:', err);
    return res
      .status(500)
      .render('error-autorizacion', { mensaje: 'No se pudo cargar el panel de reservas.' });
  }
};

// ---------- MOSTRAR PAGO ----------
export const mostrarPago = async (req, res) => {
  try {
    const sesion = req.session.usuario;
    if (!sesion) return res.redirect('/');

    // Traemos la reserva y populamos el cliente
    const reserva = await Reserva.findById(req.params.id)
      .populate('jugadorId', 'nombre apellido username')
      .lean();

    if (!reserva) return res.status(404).send("Reserva no encontrada");

    // Formatear fecha en español: "lunes 11 de noviembre de 2025"
    let fechaDisplay = '';
    if (reserva.fecha) {
      const d = new Date(reserva.fecha);
      fechaDisplay = d.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }

    // Nombre y mail del cliente al que se aplica el pago
    let clienteNombreCompleto = '';
    let clienteEmail = '';

    if (sesion.rol === 'cliente') {
      const ape = sesion.apellido || (reserva.jugadorId && reserva.jugadorId.apellido) || '';
      const nom = sesion.nombre   || (reserva.jugadorId && reserva.jugadorId.nombre)   || '';
      clienteNombreCompleto = `${ape} ${nom}`.trim();

      clienteEmail =
        sesion.username ||
        (reserva.jugadorId && reserva.jugadorId.username) ||
        reserva.jugadorEmail ||
        '';
    } else {
      const ape = reserva.jugadorId && reserva.jugadorId.apellido ? reserva.jugadorId.apellido : '';
      const nom = reserva.jugadorId && reserva.jugadorId.nombre   ? reserva.jugadorId.nombre   : '';
      clienteNombreCompleto = `${ape} ${nom}`.trim();

      clienteEmail =
        (reserva.jugadorId && reserva.jugadorId.username) ||
        reserva.jugadorEmail ||
        '';
    }

    const importe = calcularImporteReserva(reserva);

    return res.render('pago', {
      usuario: sesion,
      reserva,
      fechaDisplay,
      clienteNombreCompleto,
      clienteEmail,
      importe,
      precioPorHora: PRECIO_CANCHA_POR_HORA,
      mensaje: null,
      mensajeExito: null,
      pago: null
    });
  } catch (err) {
    console.error("Error mostrarPago:", err);
    res.status(500).send("Error interno.");
  }
};

// ---------- HISTORIAL DE RESERVAS (ADMIN/EMPLEADO) ----------
export const historialReservas = async (req, res) => {
  try {
    const rol = req.session?.usuario?.rol;
    if (rol !== 'administrador' && rol !== 'empleado') {
      return res.status(403).render('error-autorizacion', { mensaje: "No tenés acceso al historial." });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const reservasPasadas = await Reserva.find({
      fecha: { $lt: hoy }
    })
      .populate('jugadorId', 'nombre apellido username')
      .sort({ fecha: -1, horaInicio: 1 })
      .lean();

    return res.render('historial-reservas-admin', {
      usuario: req.session.usuario,
      reservas: reservasPasadas
    });

  } catch (err) {
    console.error("Error historialReservas:", err);
    return res.status(500).render('error-autorizacion', {
      mensaje: "Error al cargar el historial."
    });
  }
};

// ---------- PAGAR RESERVA ----------
export const pagarReserva = async (req, res) => {
  try {
    const sesion = req.session?.usuario;
    if (!sesion) return res.redirect('/');

    const { metodo, titular, numero, vencimiento, cvv } = req.body;

    // Traemos la reserva con el cliente populado
    let reserva = await Reserva.findById(req.params.id)
      .populate('jugadorId', 'nombre apellido username')
      .exec();

    if (!reserva) return res.status(404).send("Reserva no encontrada");

    // Si no está activa, no dejamos pagar
    if (reserva.estado !== 'activa') {
      const d = reserva.fecha ? new Date(reserva.fecha) : null;
      const fechaDisplay = d
        ? d.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })
        : '';

      const ape = reserva.jugadorId?.apellido || '';
      const nom = reserva.jugadorId?.nombre || '';
      const clienteNombreCompleto = `${ape} ${nom}`.trim();
      const clienteEmail =
        reserva.jugadorId?.username ||
        reserva.jugadorEmail ||
        '';

      const importe = calcularImporteReserva(reserva);

      return res.render('pago', {
        usuario: sesion,
        reserva: reserva.toObject(),
        fechaDisplay,
        clienteNombreCompleto,
        clienteEmail,
        importe,
        precioPorHora: PRECIO_CANCHA_POR_HORA,
        mensaje: "Solo se pueden pagar reservas activas.",
        mensajeExito: null,
        pago: null
      });
    }

    // --- Guardar registro de pago ---
    let ultimos4 = null;
    let venc = null;
    if (metodo === 'tarjeta') {
      const limpio = (numero || '').replace(/\s+/g, '');
      ultimos4 = limpio ? limpio.slice(-4) : null;
      venc = vencimiento || null;
    }

    const importe = calcularImporteReserva(reserva);

    const pago = await Pago.create({
      reservaId: reserva._id,
      clienteId: reserva.jugadorId ? reserva.jugadorId._id : null,
      metodo,
      titular,
      ultimos4,
      vencimiento: venc,
      importe,
      fechaPago: new Date(),
      registradoPor: sesion.id
    });

    // --- Marcar reserva como pagada ---
    reserva.estado = 'pagado';
    await reserva.save();

    // Datos para mostrar en la vista
    const d = reserva.fecha ? new Date(reserva.fecha) : null;
    const fechaDisplay = d
      ? d.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : '';

    const ape = reserva.jugadorId?.apellido || '';
    const nom = reserva.jugadorId?.nombre || '';
    const clienteNombreCompleto = `${ape} ${nom}`.trim();
    const clienteEmail =
      reserva.jugadorId?.username ||
      reserva.jugadorEmail ||
      '';

    const mensajeExito = `El pago se registró correctamente y se envió el comprobante al correo ${clienteEmail}.`;

    return res.render('pago', {
      usuario: sesion,
      reserva: reserva.toObject(),
      fechaDisplay,
      clienteNombreCompleto,
      clienteEmail,
      importe,
      precioPorHora: PRECIO_CANCHA_POR_HORA,
      mensaje: null,
      mensajeExito,
      pago: pago.toObject()
    });

  } catch (err) {
    console.error("Error pagarReserva:", err);
    return res.status(500).render('pago', {
      usuario: req.session?.usuario || null,
      reserva: null,
      fechaDisplay: '',
      clienteNombreCompleto: '',
      clienteEmail: '',
      importe: 0,
      precioPorHora: PRECIO_CANCHA_POR_HORA,
      mensaje: 'Ocurrió un error al procesar el pago.',
      mensajeExito: null,
      pago: null
    });
  }
};