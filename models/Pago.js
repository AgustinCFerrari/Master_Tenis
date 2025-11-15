// models/Pago.js
import mongoose from 'mongoose';

const PagoSchema = new mongoose.Schema(
  {
    reservaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reserva',
      required: true
    },
    clienteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    metodo: {
      type: String,
      enum: ['tarjeta', 'transferencia', 'mercado_pago', 'efectivo'],
      required: true
    },
    titular: { type: String },

    // Por seguridad solo guardamos los últimos 4 dígitos, NO el número completo ni el CVV
    ultimos4: { type: String },
    vencimiento: { type: String },

    importe: {
      type: Number,
      required: true,
      default: 24000
    },

    fechaPago: {
      type: Date,
      default: Date.now
    },

    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Pago', PagoSchema);
