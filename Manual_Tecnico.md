
---

## MANUAL_TECNICO.md

```markdown
# Manual técnico – Tenis Master 🎾

## 1. Introducción general

Tenis Master es una aplicación web para gestionar reservas de canchas de tenis, personas usuarias (clientes/jugadores, empleados, administradores) y pagos asociados a dichas reservas.

**Objetivo principal**

- Proveer una interfaz simple para:
  - Registrar clientes.
  - Crear y administrar reservas de canchas.
  - Registrar pagos de reservas.
  - Consultar jugadores compatibles según nivel y disponibilidad (“macheo”).
  - Visualizar historial de reservas pasadas.

**Alcance**

- Uso interno por parte de empleados y administradores.
- Acceso de clientes para reservar y ver sus propias reservas.
- No incluye pasarela de pago real (los pagos se registran manualmente en el sistema).

---

## 2. Arquitectura del sistema

### 2.1 Estilo general

- Arquitectura **MVC ligera**:
  - Modelos → `/models`
  - Controladores → `/controllers`
  - Vistas → `/views`
- Routing con **Express**.
- Base de datos: **MongoDB + Mongoose**.
- Vistas: **Pug**.
- Sesiones: **express-session**.

### 2.2 Tecnologías utilizadas

- Node.js, Express 4.x
- Mongoose 8.x
- bcrypt
- dotenv
- TailwindCSS CDN para estilos
- Pug templates

### 2.3 Flujo de alto nivel

1. Login (`/`)
2. Panel según rol:
   - Cliente → `/panel-reservas`
   - Admin/Empleado → menú con:
     - Reservar
     - Macheo
     - Gestión de usuarios
     - Historial de reservas
3. Reservas → crear/pagar/cancelar.
4. Historial → ver reservas anteriores a hoy.


---

## 3. Estructura del proyecto

### 3.1 Archivos raíz

- `index.js`  
  Punto de entrada. Configura:
  - Express.
  - Sesiones.
  - Motor Pug.
  - Enrutamiento.
  - Conexión a MongoDB y tarea de limpieza de reservas vencidas.
- `.env`  
  Configuración de entorno (URI de Mongo, puerto, precio por hora, etc.).
- `package.json`  
  Dependencias y scripts.

### 3.2 Controladores

#### `controllers/usuarioController.js`

Responsabilidades:

- **Login / Logout**
  - `mostrarLogin(req, res)`  
    Renderiza formulario de login o redirige si ya hay sesión.
  - `login(req, res)`  
    - Busca usuario por `username`.
    - Compara contraseña con `bcrypt`.
    - Si es correcto, setea `req.session.usuario` con `{id, username, rol, nombre, apellido}`.
    - Renderiza error en `error-login.pug` ante credenciales incorrectas.
  - `logout(req, res)`  
    Destruye la sesión y redirige al login.

- **Gestión de clientes (rol admin/empleado)**
  - `obtenerUsuarios`  
    Lista clientes (`rol: 'cliente'`), renderiza `usuarios.pug`.
  - `crearUsuario`  
    Crea un nuevo usuario cliente (username, password hash, nivel, etc.).
  - `actualizarUsuario` / `eliminarUsuario`  
    Edición y eliminación de clientes.
  - `mostrarFormularioEditarUsuario`  
    Renderiza `usuarios.pug` con un cliente preseleccionado para edición.
  - `registrarCliente`  
    Registro público de un cliente (desde `registro.pug`).

#### `controllers/reservaController.js`

Responsabilidades:

- **Helpers internos**
  - `buildDateTime(dateStr, hm)`  
    Construye un `Date` (local) a partir de `"YYYY-MM-DD"` y `"HH:MM"`.
  - `calcularImporteReserva(reserva)`  
    - Toma `reserva.fecha`, `horaInicio`, `horaFin`.
    - Calcula minutos de diferencia.
    - Divide en bloques de 30 minutos (`bloquesMediaHora = ceil(minutos / 30)`).
    - Convierte a horas cobradas (`horasCobradas = bloquesMediaHora / 2`).
    - Multiplica por `PRECIO_CANCHA_POR_HORA` (tomado de `.env`).

- **Formulario de reserva**
  - `mostrarFormularioReserva(req, res)`  
    - Carga lista de apellidos de clientes (para selección cuando reserva admin/empleado).
    - Si viene de la pantalla de “macheo”, puede preseleccionar un jugador sugerido.

- **Creación de reserva**
  - `crearReserva(req, res)`:
    - Valida campos obligatorios: `fecha`, `horaInicio`, `horaFin`, `cancha`.
    - Determina el jugador:
      - Si rol = `cliente` → utiliza `req.session.usuario.id`.
      - Si rol = `empleado` o `administrador` → busca por `apellido` + `nombre` (o `jugadorId` específico) según lo enviado en el form.
    - Construye `Date` de inicio y fin (`dtInicio`, `dtFin`) a partir de `fecha + horas`.
    - Valida:
      - Que `dtInicio` > **ahora** (no permite reservar en fechas/horarios pasados).
      - Que no haya **solapamientos** para la misma cancha y día.
    - Normaliza `fecha` guardando sólo el día en la DB (00:00hs).
    - Crea un documento en `Reserva`.

- **Listado y actualización**
  - `listarReservas`  
    Si `rol === 'cliente'` → filtra por `jugadorId`; si no, muestra todas.
  - `actualizarReserva` / `eliminarReserva`  
    Permiten editar o eliminar una reserva existente (uso interno).

- **Panel de reservas**
  - `panelReservas(req, res)`:
    - Si `rol === 'cliente'`:
      - Carga sus reservas ordenadas por fecha + hora.
      - Renderiza `panel-reservas-cliente.pug`.
    - Si `rol === 'empleado'` o `administrador`:
      - Carga todas las reservas (con datos básicos del jugador).
      - Renderiza `panel-reservas-admin.pug`.

- **Pantalla de pago**
  - `mostrarPago(req, res)`:
    - Busca la reserva por `id`.
    - Carga datos del jugador (`jugadorId`).
    - Calcula `fechaDisplay` (en formato legible `lunes 11 de noviembre de 2025`).
    - Calcula `importe` con `calcularImporteReserva`.
    - Determina nombre completo y email de cliente.
    - Renderiza `pago.pug` con:
      - `reserva`, `fechaDisplay`, `clienteNombreCompleto`, `clienteEmail`,
      - `importe`, `precioPorHora`.

  - `pagarReserva(req, res)`:
    - Recibe datos del formulario de pago (`metodo`, `titular`, `numero`, `vencimiento`, `cvv`).
    - Vuelve a cargar la reserva:
      - Si no existe → 404.
      - Si `estado !== 'activa'` → muestra mensaje y no genera pago.
    - Valida campos mínimos según método:
      - Si tarjeta → últimos 4 dígitos y vencimiento.
    - Calcula `importe`.
    - Crea un documento `Pago`:
      - `reservaId`, `clienteId`, `metodo`, `titular`, `ultimos4`, `vencimiento`, `importe`, `fechaPago`, `registradoPor`.
    - Cambia `reserva.estado = 'pagado'` y guarda.
    - Renderiza `pago.pug` mostrando mensaje de éxito y detalles del pago.

- **APIs auxiliares**
  - `apiApellidos`  
    Devuelve lista de apellidos de clientes (para autocompletar/selección).
  - `apiNombresPorApellido`  
    Devuelve nombres por apellido seleccionado.

#### `controllers/panelController.js`

- `mostrarPanel`:
  - Obtiene el usuario actual de `req.session.usuario`.
  - Busca en la DB su documento completo.
  - Renderiza `panel.pug` con datos del usuario.

---

## 4. Base de datos

### 4.1 Usuario (`models/Usuario.js`)

Campos principales:

- `username: String` (único, indexado)
- `password: String` (hash bcrypt)
- `rol: String`  
  `['administrador','empleado','cliente']`
- `nombre, apellido`
- Datos de contacto: `email`, `celular`.
- Tenis:
  - `nivel: String` (ej. nivel de juego)
  - `disponibilidad: [ { dia, desde, hasta } ]` lista de franjas horarias.

La colección se usa tanto para:

- autenticación,
- datos de contacto,
- macheo de jugadores (nivel + disponibilidad).

### 4.2 Reserva (`models/Reserva.js`)

Campos:

- `jugadorId: ObjectId` → referencia a `Usuario`.
- `jugadorEmail: String` (redundante, útil para enviar emails / mostrar rápido).
- `fecha: Date`  
  Se guarda normalizada al día (00:00).
- `horaInicio: String` (HH:MM)
- `horaFin: String` (HH:MM)
- `cancha: String`
- `estado: String`  
  Valores: `['activa', 'pagado', 'cancelada']` (indexado).
- `createdBy: ObjectId` → usuario que creó la reserva.
- `timestamps: true` (Mongoose) para trackear `createdAt` y `updatedAt`.

Relación lógica:

- 1 usuario → N reservas.

### 4.3 Pago (`models/Pago.js`)

Campos:

- `reservaId: ObjectId` → referencia a `Reserva`.
- `clienteId: ObjectId` → referencia a `Usuario` (cliente).
- `metodo: String`  
  Ej.: `'tarjeta'`, `'efectivo'`, `'transferencia'`.
- `titular: String`
- `ultimos4: String`
- `vencimiento: String`
- `importe: Number`
- `fechaPago: Date` (default: `Date.now`)
- `registradoPor: ObjectId` → usuario del sistema que registró el pago.
- `timestamps: true`.

Relación lógica:

- 1 reserva → 0 o 1 pagos (en la práctica se registra uno por reserva).

---

## 5. Configuración e instalación

### 5.1 Requisitos previos

- Node.js (recomendado 18+)
- npm
- MongoDB (local o Atlas)
- Entorno que permita conexiones salientes a la base Mongo.

### 5.2 Variables de entorno (`.env`)

# Cadena de conexión estándar de MongoDB.
MONGO_URI=mongodb+srv://usuario:password@cluster-url/tenis_master
# Puerto donde escuchará Express.
PORT=3000
# Precio por hora de cancha (número entero, sin separadores de miles)
CANCHA_PRECIO_POR_HORA=24000

### 5.3 Instalación

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# O modo producción
npm start

Aquí tienes el contenido solicitado en formato Markdown, organizado por secciones y con la estructura clara para documentación técnica de tu proyecto:

## 6. Componentes principales

### 6.1 index.js

**Responsabilidades:**

- Crear instancia de Express.
- Configurar sesión:

```js
app.use(session({
  secret: 'un-secreto-seguro',
  resave: false,
  saveUninitialized: false
}));
```

- Pasar `req.session.usuario` a `res.locals.usuario` para todas las vistas.
- Configurar middlewares estándar:
  - `express.urlencoded({ extended: true })`
  - `express.json()`
  - `express.static('public')`
- Configurar motor de vistas Pug:
  - `app.set('view engine', 'pug');`
  - `app.set('views', './views');`
- Enrutar:
  - `app.use(appRoutes);`
  - `app.use(usuarioRoutes);`
  - `app.use(reservaRoutes);`
  - `app.use(macheoRoutes);`
- Conexión a Mongo:
  - Tras conectar, invoca `cancelarReservasVencidas()`.

### 6.2 middlewares/autorizar.js

- **requerirLogin:**  
  Si no hay `req.session.usuario`, redirige al login.
- **autorizar(rolesPermitidos):**  
  Verifica que el rol del usuario esté dentro de `rolesPermitidos`.  
  En caso contrario, responde 403 y renderiza `error-autorizacion.pug`.

### 6.3 routes

#### routes/appRoutes.js

- `GET /` → muestra login.
- `POST /login` → procesa login.
- `POST /logout` → cierra sesión.
- `GET /panel` → panel general (cliente, empleado, admin).

#### routes/usuarioRoutes.js

- CRUD de clientes bajo `/usuarios` (sólo admin/empleado).
- Registro público `/registro`.

#### routes/reservaRoutes.js

- `GET /reservar` → formulario.
- `POST /reservar` → crear reserva.
- `GET /panel-reservas` → panel de reservas (cliente / admin).
- `GET /reservas/:id/pago` → pantalla de pago.
- `POST /reservas/:id/pagar` → registrar pago.
- APIs auxiliares: `/api/clientes/apellidos`, `/api/clientes/nombres`.

#### routes/macheoRoutes.js

- `GET /macheo` → pantalla de macheo de jugadores, con filtros por nivel y texto.


## 7. Gestión de errores y validaciones

### 7.1 Validaciones en reservas

- **Campos obligatorios:**  
  fecha, horaInicio, horaFin, cancha.
- **Validación temporal:**  
  No permite reservar con fecha/hora en el pasado:  
  Se construye `dtInicio` y se compara con `Date.now()`.
- **Solapamiento:**  
  Para una misma cancha y día:
    - Busca reservas con estado: 'activa' donde el rango horario actual solape con alguna existente.
    - Comparación de strings "HH:MM" (formato 2 dígitos, lexicográfico funciona).
- **Manejo de errores:**
  - En errores de validación → se renderiza `reservar.pug` con mensaje y datos necesarios para reintentar.
  - En excepciones inesperadas → `console.error` + status 500 + vista con mensaje genérico.

### 7.2 Validaciones en pagos

- Verifica que la reserva:
  - exista,
  - esté en estado activa.
- Si no está activa → re-renderiza `pago.pug` con mensaje “Solo se pueden pagar reservas activas”.
- Si método = tarjeta:
  - sanitiza número de tarjeta,
  - extrae últimos 4 dígitos,
  - toma vencimiento.
- Ante errores inesperados → status 500 y render con mensaje “Ocurrió un error al procesar el pago”.

### 7.3 Autenticación / autorización

- Si no hay sesión:
  - `requerirLogin` redirige a `/`.
- Si el rol no está autorizado:
  - `autorizar` responde 403 con `error-autorizacion.pug`.

### 7.4 Manejo de errores de conexión / BD

- Conexión a MongoDB envuelta en `then/catch`:
  - En error de conexión → se loguea en consola.
- En controladores:
  - Uso de `try/catch` en la mayoría de las acciones.
  - En catch → log + vista de error o mensaje.

## 8. Pruebas implementadas

Actualmente el proyecto no incluye:

- Tests unitarios (Jest, Mocha, etc.).
- Tests de integración (Supertest sobre las rutas).

El testeo se realiza de forma manual a través de la interfaz web:

- Alta, login y logout de usuarios.
- Creación de reservas en distintos escenarios:
  - horarios válidos,
  - horarios pasados (deben ser rechazados),
  - reservas solapadas (deben ser rechazadas),
  - diferentes canchas.
- Registro de pago para reservas activas:
  - verificación de cambio de estado a pagado.
- Ejecución de la lógica de limpieza (al reiniciar server):
  - reservas activas con fecha < hoy pasan a cancelada.
- Macheo de jugadores:
  - filtrado por nivel y texto.

### 8.1 Recomendaciones para futuros tests

- **Unitarios:**
  - Testear helpers como `buildDateTime` y `calcularImporteReserva`.
  - Testear validaciones de `crearReserva` (horarios, solapamientos).
- **Integración:**
  - Testear rutas de login, creación de reserva y pago usando Supertest.
- **E2E (opcional):**
  - Cypress / Playwright para flujos completos: login → reservar → pagar.

## 9. Extensión / mantenimiento

Para extender o mantener la aplicación:

- Agregar nuevas rutas siempre pasando por:
  - middleware `requerirLogin`,
  - y `autorizar([...roles])` cuando aplique.
- Si se incorporan nuevas entidades en DB:
  - Crear `models/NuevaEntidad.js`.
  - Crear `controllers/nuevaEntidadController.js`.
  - Añadir las rutas en `routes/nuevaEntidadRoutes.js` y montarlas en `index.js`.
- Si se modifica el esquema de Reserva o Pago:
  - Revisar:
    - `reservaController.js`,
    - `pago.pug`,
    - `panel-reservas-*.pug`.
Conexión a Mongo:

Tras conectar, invoca cancelarReservasVencidas().

