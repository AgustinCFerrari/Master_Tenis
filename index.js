// Importamos Express para crear el servidor web.
import express from 'express';
import session from 'express-session';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MongoStore from 'connect-mongo';

// Importamos las rutas definidas en otros archivos.
import appRoutes from './routes/appRoutes.js';
import reservaRoutes from './routes/reservaRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import macheoRoutes from './routes/macheoRoutes.js';

// Importamos el controlador de usuario para manejar el login.
import { login } from './controllers/usuarioController.js';

import Reserva from './models/Reserva.js';

// Cargamos las variables de entorno desde un archivo .env
dotenv.config();

// Creamos una instancia de la aplicación Express que manejará las peticiones.
const app = express();

// Definimos el puerto en el que escuchará el servidor.
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB usando Mongoose
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Conectado a MongoDB');

    // Al iniciar el servidor, cancelar reservas activas con fecha anterior a hoy
    await cancelarReservasVencidas();
  })
  .catch(err => console.error(err));

// Middleware para procesar los datos que llegan en formularios HTML 
app.use(express.urlencoded({ extended: true }));

// Middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));

// Middleware para procesar datos JSON en las peticiones HTTP.
app.use(express.json());

// Configuración del motor de vistas Pug
app.set('view engine', 'pug');
app.set('views', './views');

// Middleware de sesión
app.use(session({
  secret: 'un-secreto-seguro',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 2 // 2 horas
  }
}));

// Pasar datos del usuario logueado a todas las vistas
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario;
  next();
});

// =================
// LOGIN DEL SISTEMA
// =================

// Ruta principal: muestra login
app.get('/', (req, res) => {
  res.render('login');
});

// Procesa los datos del login y valida usuario/contraseña
app.post('/login', login);

// Middleware simple de login requerido
const requerirLogin = (req, res, next) => {
  if (!req.session?.usuario) return res.redirect('/');
  next();
};

// Define que todas las rutas 
app.use(appRoutes);
app.use(usuarioRoutes);
app.use(reservaRoutes);
app.use(macheoRoutes);

// Solo cliente y empleado 
const autorizar = (roles = []) => (req, res, next) => {
  const rol = req.session?.usuario?.rol;
  if (!rol || (roles.length && !roles.includes(rol))) {
    return res.status(403).render('error-autorizacion', { mensaje: 'No tenés permisos.' });
  }
  next();
};

// Panel (cliente/empleado/administrador) 
app.get('/panel', requerirLogin, autorizar(['cliente','empleado','administrador']), (req, res) => {
  res.render('panel', { usuario: req.session.usuario });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Tarea programada: cancelar reservas vencidas cada día a la medianoche
async function cancelarReservasVencidas() {
  try {
    // "Hoy" a las 00:00 en hora local
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const resultado = await Reserva.updateMany(
      {
        estado: 'activa',
        fecha: { $lt: hoy } // cualquier fecha anterior a hoy
      },
      {
        $set: { estado: 'cancelada' }
      }
    );
  } catch (err) {
    console.error('Error al cancelar reservas vencidas:', err);
  }
}



