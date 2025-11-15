import mongoose from 'mongoose';

const ReservaSchema = new mongoose.Schema({
  jugadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  jugadorEmail: { type: String },
  fecha: { type: Date, required: true },
  horaInicio: { type: String, required: true },
  horaFin: { type: String, required: true },
  cancha: { type: String, required: true },
  estado: {
    type: String,
    enum: ['activa', 'pagado', 'cancelada'],
    default: 'activa',
    index: true
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

export default mongoose.model('Reserva', ReservaSchema);



