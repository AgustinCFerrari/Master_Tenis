// models/Usuario.js
import mongoose from 'mongoose';

const DisponibilidadSchema = new mongoose.Schema({
  dia: {
    type: String,
    enum: ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'],
    required: true
  },
  desde: { type: String, required: true }, // HH:MM
  hasta: { type: String, required: true }  // HH:MM
}, { _id: false });

const UsuarioSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['administrador','empleado','cliente'], default: 'cliente' },

  nombre:   { type: String, default: '' },
  apellido: { type: String, default: '' },
  dni:      { type: String, default: '' },
  celular:  { type: String, default: '' },
  nivel:    { type: String, default: '' },

  disponibilidad: [{
  dia:   { type: String },
  desde: { type: String },
  hasta: { type: String }
}]

}, { timestamps: true });

export default mongoose.model('Usuario', UsuarioSchema);


