# 🎾 Tenis Master – Sistema de Gestión de Reservas

## Descripción general

Aplicación web para la gestión de reservas de canchas de tenis, pagos y administración de clientes/jugadores.

Permite:

- Registro y login de personas usuarias con distintos roles (`administrador`, `empleado`, `cliente`).
- Gestión de clientes (alta, edición, baja).
- Reserva de canchas con control de solapamientos y horarios válidos.
- Panel de reservas diferenciado para clientes vs. administración.
- Registro de pagos asociados a una reserva.
- Macheo de jugadores según nivel y disponibilidad horaria.---

## Integrantes del equipo Redsoft

- **Diego Arias**  
- **Agustín Ferrari**  
- **Sergio Godoy**

---

## Enlaces del proyecto

- **Repositorio GitHub:**  
  [https://github.com/AgustinCFerrari/Tenis_Master](https://github.com/AgustinCFerrari/Tenis_Master)

- **Deploy en Render**  
  [https://master-tenis.onrender.com/](https://master-tenis.onrender.com/)

---

## Roles y credenciales de acceso

| Rol | Correo electrónico | Contraseña |
|-----|--------------------|-------------|
| Administrador | `admin@mail.com` | `12345` |
| Empleado | `usuario@mail.com` | `12345` |
| Cliente | `nombre_del_cliente@mail.com` | `12345` |

> Los nuevos clientes pueden **autoregistrarse** desde la opción **“Crear cuenta”**.

---

## Estructura del proyecto

```text
.
├─ readme.md               # Este archivo
├─ index.js                # Punto de entrada de la app
├─ .env                    # Variables de entorno (NO subir al repo)
├─ package.json            # Dependencias y scripts npm
├─ controllers/            # Controladores (lógica de negocio)
│  ├─ panelController.js
│  ├─ reservaController.js
│  └─ usuarioController.js
├─ middlewares/
│  └─ autorizar.js         # Middleware de login + autorización por rol
├─ models/                 # Modelos de Mongoose
│  ├─ Pago.js
│  ├─ Reserva.js
│  └─ Usuario.js
├─ routes/                 # Definición de rutas Express
│  ├─ appRoutes.js
│  ├─ macheoRoutes.js
│  ├─ reservaRoutes.js
│  └─ usuarioRoutes.js
├─ public/                 # Archivos estáticos (imágenes, CSS, etc.)
└─ views/                  # Vistas Pug
   ├─ login.pug
   ├─ registro.pug
   ├─ panel.pug
   ├─ usuarios.pug
   ├─ reservar.pug
   ├─ historial-reservas-admin.pug
   ├─ panel-reservas-admin.pug
   ├─ panel-reservas-cliente.pug
   ├─ pago.pug
   ├─ macheo.pug
   ├─ error-autorizacion.pug
   └─ error-login.pug

---

## Funcionalidades por rol

### Rol Administrador y Empleado

- CRUD de clientes.
- Registro, edición y cancelación de reservas.
- Registro de pagos.
- Macheo de jugadores.
- Historial de reservas (reservas con fecha anterior a hoy).
- Visualización de reservas futuras del sistema.

### Rol Cliente

- Autoregistro.
- Reserva y pago de turnos.
- Cancelación de reservas propias.
- Macheo según nivel.
- Visualización de sus próximas reservas.

---

## Tecnologías utilizadas

- Node.js + Express
- MongoDB Atlas + Mongoose
- Pug (motor de plantillas)
- express-session
- connect-mongo (almacenamiento de sesiones en MongoDB)
- dotenv (variables de entorno)
- bcrypt (hash de contraseñas)
- TailwindCSS CDN para estilos

---

## Cómo ejecutar el proyecto en forma local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/AgustinCFerrari/Master_Tenis.git
   ```
2. Ejecutar en el bash:
   ```bash
   npm start
   ```
3. Utilizar las credenciales de prueba según el rol deseado.

---

## Licencia
© Redsoft – 2025.
