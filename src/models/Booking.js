import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // --- DATOS PERSONALES ---
    studentName: { type: String, required: true, trim: true },
    responsibleName: { type: String, required: true, trim: true },
    tutorName: { type: String, required: true, trim: true },

    // Contacto
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },

    // --- DATOS ACADÉMICOS ---
    school: { type: String, trim: true, default: "" },
    educationLevel: { type: String, required: true },
    yearGrade: { type: String, required: true },
    subject: { type: String, required: true },
    academicSituation: { type: String, trim: true, default: "" },

    // --- TIEMPO ---
    timeSlot: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true, index: true },
    duration: { type: Number, required: true, default: 1 },

    // --- GESTIÓN ---
    price: { type: Number, default: 0 },
    notes: { type: String, trim: true },

    // Al poner unique: true, Mongoose YA crea el índice automáticamente.
    bookingCode: { type: String, unique: true, uppercase: true },

    status: {
      type: String,
      enum: ["Confirmado", "Pendiente", "Cancelado", "Finalizado"],
      default: "Pendiente",
    },
  },
  { timestamps: true }
);

// GENERADOR DE CÓDIGO ÚNICO
bookingSchema.pre("save", async function () {
  if (this.isNew && !this.bookingCode) {
    const characters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    this.bookingCode = result;
  }
});

// ÍNDICES
// Solo dejamos el compuesto de tiempo/estado.
// Eliminamos la línea de bookingCode porque ya está definido arriba como unique.
bookingSchema.index({ timeSlot: 1, status: 1 });
bookingSchema.index({ email: 1 });
bookingSchema.index({ phone: 1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
