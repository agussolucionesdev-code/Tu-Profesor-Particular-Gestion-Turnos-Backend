import Booking from "../models/Booking.js";
import { sendBookingEmail } from "../config/mailer.js";
import {
  appendBookingToSheet,
  resetBookingSheet,
  updateBookingInSheet,
} from "../services/sheetsService.js";
import {
  availabilityQuerySchema,
  cancelSchema,
  createBookingSchema,
  formatDate,
  getDefaultAvailabilityRange,
  normalizeCode,
  normalizeEmail,
  normalizePhone,
  looksLikeEmail,
  looksLikePhone,
  parseDateTimeInput,
  phoneDigitsRegex,
  rescheduleSchema,
  updateBookingSchema,
  validateContact,
  validateSlot,
} from "../utils/bookingRules.js";

const activeStatusFilter = { status: { $ne: "Cancelado" } };

const publicBooking = (booking) => ({
  _id: booking._id,
  bookingCode: booking.bookingCode,
  responsibleName: booking.responsibleName,
  studentName: booking.studentName,
  tutorName: booking.tutorName,
  phone: booking.phone,
  email: booking.email,
  school: booking.school,
  educationLevel: booking.educationLevel,
  yearGrade: booking.yearGrade,
  subject: booking.subject,
  academicSituation: booking.academicSituation,
  timeSlot: booking.timeSlot,
  endTime: booking.endTime,
  duration: booking.duration,
  status: booking.status,
  createdAt: booking.createdAt,
  updatedAt: booking.updatedAt,
});

const badRequest = (res, message, details) =>
  res.status(400).json({
    success: false,
    message,
    details,
  });

const hasConflict = async (startTime, endTime, excludeId = null) => {
  const criteria = {
    ...activeStatusFilter,
    timeSlot: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeId) criteria._id = { $ne: excludeId };

  return Booking.exists(criteria);
};

const buildClientLookupCriteria = (identifier) => {
  const trimmed = String(identifier ?? "").trim();
  const email = normalizeEmail(trimmed);
  const phoneRegex = phoneDigitsRegex(trimmed);
  const code = normalizeCode(trimmed);

  if (looksLikeEmail(trimmed)) return { email };
  if (looksLikePhone(trimmed) && phoneRegex) return { phone: phoneRegex };
  return { bookingCode: code };
};

const buildHistoryCriteria = (booking, fallbackIdentifier) => {
  const phoneRegex = phoneDigitsRegex(booking.phone);
  if (booking.phone && phoneRegex) return { phone: phoneRegex };
  if (booking.email) return { email: booking.email };
  return buildClientLookupCriteria(fallbackIdentifier);
};

const normalizeBookingPayload = (payload) => ({
  ...payload,
  email: normalizeEmail(payload.email),
  phone: normalizePhone(payload.phone),
  tutorName: payload.tutorName?.trim() || "Agustin",
});

const parseAvailabilityRange = (query) => {
  const parsed = availabilityQuerySchema.safeParse(query);
  if (!parsed.success) return null;

  const defaults = getDefaultAvailabilityRange();
  const from = parsed.data.from ? parseDateTimeInput(parsed.data.from) : defaults.from;
  const to = parsed.data.to ? parseDateTimeInput(parsed.data.to) : defaults.to;

  if (!from || !to || from > to) return null;
  return { from, to };
};

export const createBooking = async (req, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Revisa los datos de la reserva.", parsed.error.flatten());
    }

    const payload = normalizeBookingPayload(parsed.data);
    const contactError = validateContact(payload);
    if (contactError) return badRequest(res, contactError);

    const startTime = parseDateTimeInput(payload.timeSlot);
    const duration = Number(payload.duration);
    const slotError = validateSlot(startTime, duration);
    if (slotError) return badRequest(res, slotError);

    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    const conflict = await hasConflict(startTime, endTime);
    if (conflict) return badRequest(res, "Horario ocupado.");

    const newBooking = await Booking.create({
      responsibleName: payload.responsibleName,
      studentName: payload.studentName,
      tutorName: payload.tutorName,
      email: payload.email,
      phone: payload.phone,
      school: payload.school,
      educationLevel: payload.educationLevel,
      yearGrade: payload.yearGrade,
      subject: payload.subject,
      academicSituation: payload.academicSituation,
      timeSlot: startTime,
      endTime,
      duration,
      notes: "",
      status: "Confirmado",
    });

    await appendBookingToSheet(newBooking);

    if (newBooking.email) {
      await sendBookingEmail(
        newBooking.studentName,
        newBooking.email,
        formatDate(startTime),
        newBooking.bookingCode,
        {
          responsibleName: newBooking.responsibleName,
          subject: newBooking.subject,
          educationLevel: newBooking.educationLevel,
          yearGrade: newBooking.yearGrade,
          school: newBooking.school,
        },
      );
    }

    res.status(201).json({
      success: true,
      message: "Reserva confirmada con exito.",
      data: publicBooking(newBooking),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "No se pudo generar un codigo unico. Intenta nuevamente.",
      });
    }
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAvailability = async (req, res, next) => {
  try {
    const range = parseAvailabilityRange(req.query);
    if (!range) return badRequest(res, "Rango de disponibilidad invalido.");

    const bookings = await Booking.find({
      ...activeStatusFilter,
      timeSlot: { $lte: range.to },
      endTime: { $gte: range.from },
    })
      .select("timeSlot endTime duration status")
      .sort({ timeSlot: 1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings.map((booking) => ({
        _id: booking._id,
        timeSlot: booking.timeSlot,
        endTime: booking.endTime,
        duration: booking.duration,
        status: booking.status,
      })),
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ timeSlot: -1 });
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingByCode = async (req, res, next) => {
  try {
    const identifier = String(req.params.code ?? "").trim();
    const isValidLookup =
      normalizeCode(identifier).length >= 6 ||
      looksLikeEmail(identifier) ||
      looksLikePhone(identifier);

    if (!isValidLookup) {
      return badRequest(res, "Ingresa un codigo, email o WhatsApp valido.");
    }

    const keyBooking = await Booking.findOne(buildClientLookupCriteria(identifier));
    if (!keyBooking) {
      return res.status(404).json({
        success: false,
        message: "No encontramos ninguna reserva.",
      });
    }

    const searchCriteria = buildHistoryCriteria(keyBooking, identifier);

    const history = await Booking.find(searchCriteria).sort({ timeSlot: -1 });
    res.status(200).json({
      success: true,
      data: history.map(publicBooking),
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const parsed = updateBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Datos de actualizacion invalidos.", parsed.error.flatten());
    }

    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada." });
    }

    await updateBookingInSheet(updatedBooking);
    res.status(200).json({ success: true, data: updatedBooking });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBooking = async (req, res, next) => {
  try {
    const deletedBooking = await Booking.findByIdAndDelete(req.params.id);
    if (!deletedBooking) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada." });
    }
    res.status(200).json({ success: true, message: "Reserva eliminada." });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAllBookings = async (req, res, next) => {
  try {
    await Booking.deleteMany({});
    await resetBookingSheet();

    res.status(200).json({
      success: true,
      message: "Sistema reiniciado completamente.",
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rescheduleBooking = async (req, res, next) => {
  try {
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Datos de reprogramacion invalidos.", parsed.error.flatten());
    }

    const cleanCode = normalizeCode(parsed.data.bookingCode);
    const booking = await Booking.findOne({ bookingCode: cleanCode });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Codigo no encontrado." });
    }

    if (booking.status === "Cancelado") {
      return badRequest(res, "No se puede reprogramar un turno cancelado.");
    }

    const startTime = parseDateTimeInput(parsed.data.newTimeSlot);
    const duration = Number(parsed.data.newDuration);
    const slotError = validateSlot(startTime, duration);
    if (slotError) return badRequest(res, slotError);

    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);
    const conflict = await hasConflict(startTime, endTime, booking._id);
    if (conflict) return badRequest(res, "Horario ocupado.");

    booking.timeSlot = startTime;
    booking.endTime = endTime;
    booking.duration = duration;
    booking.status = "Confirmado";
    await booking.save();

    await updateBookingInSheet(booking);

    if (booking.email) {
      await sendBookingEmail(
        booking.studentName,
        booking.email,
        formatDate(startTime),
        booking.bookingCode,
        {
          responsibleName: booking.responsibleName,
          subject: booking.subject,
          educationLevel: booking.educationLevel,
          yearGrade: booking.yearGrade,
          school: booking.school,
          title: "Turno Reprogramado",
          intro: "Tu clase particular fue reprogramada correctamente.",
        },
      );
    }

    res.status(200).json({
      success: true,
      message: "Turno reprogramado.",
      data: publicBooking(booking),
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelBookingClient = async (req, res, next) => {
  try {
    const parsed = cancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "Codigo de cancelacion invalido.", parsed.error.flatten());
    }

    const booking = await Booking.findOne({
      bookingCode: normalizeCode(parsed.data.bookingCode),
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "No encontrado." });
    }

    booking.status = "Cancelado";
    await booking.save();
    await updateBookingInSheet(booking);

    res.status(200).json({
      success: true,
      message: "Turno cancelado.",
      data: publicBooking(booking),
    });
  } catch (error) {
    if (typeof next === "function") return next(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
