import { z } from "zod";

export const BOOKING_STATUS = [
  "Confirmado",
  "Pendiente",
  "Cancelado",
  "Finalizado",
];

export const TIME_ZONE =
  process.env.APP_TIME_ZONE || "America/Argentina/Buenos_Aires";

export const parseDateTimeInput = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/,
  );

  if (match) {
    const [, dd, mm, yyyy, hh, min] = match.map(Number);
    const date = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
    const isValid =
      date.getFullYear() === yyyy &&
      date.getMonth() === mm - 1 &&
      date.getDate() === dd &&
      date.getHours() === hh &&
      date.getMinutes() === min;

    return isValid ? date : null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (dateObj) =>
  new Date(dateObj).toLocaleString("es-AR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const normalizeEmail = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "no especificado") return "";
  return normalized;
};

export const normalizePhone = (value) => String(value ?? "").trim();

export const normalizePhoneDigits = (value) =>
  String(value ?? "").replace(/\D/g, "");

export const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase();

export const looksLikeEmail = (value) => normalizeEmail(value).includes("@");

export const looksLikePhone = (value) => normalizePhoneDigits(value).length >= 10;

export const phoneDigitsRegex = (value) => {
  const digits = normalizePhoneDigits(value);
  if (digits.length < 10) return null;
  return new RegExp(digits.split("").join("\\D*"));
};

const textField = (min, max) => z.string().trim().min(min).max(max);

export const createBookingSchema = z.object({
  responsibleName: textField(3, 80),
  studentName: textField(3, 80),
  tutorName: z.string().trim().max(80).optional().default("Agustin"),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  school: textField(2, 120),
  educationLevel: textField(3, 60),
  yearGrade: textField(2, 60),
  subject: textField(2, 120),
  academicSituation: z.string().trim().max(1200).optional().default(""),
  timeSlot: z.union([z.string(), z.date()]),
  duration: z.coerce.number(),
});

export const rescheduleSchema = z.object({
  bookingCode: textField(6, 12),
  newTimeSlot: z.union([z.string(), z.date()]),
  newDuration: z.coerce.number(),
});

export const cancelSchema = z.object({
  bookingCode: textField(6, 12),
});

export const updateBookingSchema = z
  .object({
    status: z.enum(BOOKING_STATUS).optional(),
    price: z.coerce.number().min(0).max(99999999).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export const availabilityQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export const validateContact = ({ email, phone }) => {
  if (!email && !phone) {
    return "Debes ingresar al menos un metodo de contacto: email o WhatsApp.";
  }

  if (email) {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return "El email ingresado no es valido.";
  }

  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return "El telefono debe tener entre 8 y 15 digitos.";
    }
  }

  return null;
};

export const validateSlot = (startTime, duration) => {
  if (!startTime || Number.isNaN(startTime.getTime())) {
    return "La fecha y hora del turno no es valida.";
  }

  if (!Number.isFinite(duration) || duration < 0.5 || duration > 10) {
    return "La duracion debe estar entre 0.5 y 10 horas.";
  }

  if ((duration * 60) % 30 !== 0) {
    return "La duracion debe respetar intervalos de 30 minutos.";
  }

  if (![0, 30].includes(startTime.getMinutes())) {
    return "Los turnos deben comenzar en intervalos de 30 minutos.";
  }

  const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
  const opening = new Date(startTime);
  opening.setHours(7, 0, 0, 0);
  const closing = new Date(startTime);
  closing.setHours(22, 0, 0, 0);

  if (startTime < opening || endTime > closing) {
    return "El turno debe estar dentro del horario de 07:00 a 22:00.";
  }

  const minStart = new Date(Date.now() + 60 * 60 * 1000);
  if (startTime < minStart) {
    return "Los turnos deben reservarse con al menos 60 minutos de anticipacion.";
  }

  return null;
};

export const getDefaultAvailabilityRange = () => {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 90);
  to.setHours(23, 59, 59, 999);
  return { from, to };
};
