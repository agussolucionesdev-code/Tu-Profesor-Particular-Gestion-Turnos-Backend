import nodemailer from "nodemailer";
import { formatDate } from "../utils/bookingRules.js";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const canSendEmail = () =>
  process.env.NODE_ENV !== "test" &&
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const getNotificationCopy = (event) => {
  switch (event) {
    case "rescheduled":
      return {
        title: "Turno Reprogramado",
        intro: "Tu clase particular fue reprogramada correctamente.",
        ownerLabel: "Turno reprogramado",
      };
    case "cancelled":
      return {
        title: "Turno Cancelado",
        intro: "Tu clase particular fue cancelada correctamente.",
        ownerLabel: "Turno cancelado",
      };
    case "created":
    default:
      return {
        title: "Reserva Confirmada",
        intro: "La clase particular ha sido agendada exitosamente.",
        ownerLabel: "Nueva reserva",
      };
  }
};

export const sendBookingEmail = async (
  studentName,
  toEmail,
  dateStr,
  code,
  extraData = {},
) => {
  if (!toEmail || !canSendEmail()) return false;

  try {
    const {
      responsibleName = "-",
      subject = "Particular",
      educationLevel = "-",
      yearGrade = "-",
      school = "-",
      title = "Reserva Confirmada",
      intro = "La clase particular ha sido agendada exitosamente.",
    } = extraData;

    const nameToGreet =
      responsibleName === "Mayor de edad / Responsable"
        ? studentName
        : responsibleName;

    const safe = {
      title: escapeHtml(title),
      intro: escapeHtml(intro),
      nameToGreet: escapeHtml(nameToGreet),
      studentName: escapeHtml(studentName),
      dateStr: escapeHtml(dateStr),
      subject: escapeHtml(subject),
      educationLevel: escapeHtml(educationLevel),
      yearGrade: escapeHtml(yearGrade),
      school: escapeHtml(school),
      code: escapeHtml(code),
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 0; font-family: Helvetica, Arial, sans-serif; background-color: #f1f5f9; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
          .header { background-color: #1e293b; padding: 30px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 40px 30px; color: #334155; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: #1e293b; font-weight: 600; }
          .text { font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
          .card { background-color: #f8fafc; border-left: 5px solid #10b981; padding: 20px; border-radius: 6px; margin: 25px 0; }
          .card-row { margin-bottom: 10px; font-size: 15px; }
          .card-row strong { color: #1e293b; width: 140px; display: inline-block; }
          .code-badge { background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: 700; color: #1e293b; font-size: 16px; }
          .address-box { background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-top: 30px; text-align: center; }
          .address-title { color: #047857; font-weight: 800; text-transform: uppercase; font-size: 14px; margin-bottom: 10px; }
          .address-text { color: #065f46; font-size: 15px; line-height: 1.5; font-weight: 500; }
          .footer { background-color: #1e293b; padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
          .signature { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .sig-name { font-size: 18px; font-weight: 700; color: #1e293b; font-family: Georgia, serif; font-style: italic; }
          .sig-title { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${safe.title}</h1></div>
          <div class="content">
            <p class="greeting">Hola ${safe.nameToGreet},</p>
            <p class="text">${safe.intro} A continuacion encontraras los detalles del turno para <strong>${safe.studentName}</strong>.</p>
            <div class="card">
              <div class="card-row"><strong>Fecha y hora:</strong> ${safe.dateStr}</div>
              <div class="card-row"><strong>Materia:</strong> ${safe.subject}</div>
              <div class="card-row"><strong>Nivel:</strong> ${safe.educationLevel} (${safe.yearGrade})</div>
              <div class="card-row"><strong>Escuela:</strong> ${safe.school}</div>
              <div class="card-row" style="margin-top: 15px;">
                <strong>Codigo Gestion:</strong> <span class="code-badge">${safe.code}</span>
              </div>
            </div>
            <div class="address-box">
              <div class="address-title">Ubicacion de la clase</div>
              <div class="address-text">
                Jujuy 414 (entre Juan de Garay y Las Golondrinas)<br>
                Temperley, Lomas de Zamora, Bs. As.<br>
                <span style="font-size: 13px; display: block; margin-top: 5px;">Ref: Porton blanco. A 1 cuadra del C.C. Salta y 4 de Av. Eva Peron</span>
              </div>
            </div>
            <div class="signature">
              <div class="sig-name">Agustin Sosa</div>
              <div class="sig-title">Profesor Particular</div>
            </div>
          </div>
          <div class="footer">
            <p>Guarda este email. Podes gestionar tu turno en el portal web usando tu codigo.</p>
            <p>&copy; ${new Date().getFullYear()} Clases Particulares Agustin Sosa.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await getTransporter().sendMail({
      from: `"Clases Agustin" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${safe.title}: ${safe.subject} - ${safe.dateStr}`,
      html: htmlContent,
    });

    console.log("Email sent to:", toEmail);
    return true;
  } catch (error) {
    console.error("Email error:", error.message);
    return false;
  }
};

export const sendBookingNotifications = async ({ booking, event = "created" }) => {
  const copy = getNotificationCopy(event);
  const formattedDate = formatDate(booking.timeSlot);

  const clientEmailSent = booking.email
    ? await sendBookingEmail(
        booking.studentName,
        booking.email,
        formattedDate,
        booking.bookingCode,
        {
          responsibleName: booking.responsibleName,
          subject: booking.subject,
          educationLevel: booking.educationLevel,
          yearGrade: booking.yearGrade,
          school: booking.school,
          title: copy.title,
          intro: copy.intro,
        },
      )
    : false;

  const ownerEmail = String(process.env.OWNER_NOTIFICATION_EMAIL ?? "").trim();
  if (!ownerEmail || !canSendEmail()) {
    return {
      clientEmailSent,
      ownerEmailSent: false,
    };
  }

  try {
    const safe = {
      ownerLabel: escapeHtml(copy.ownerLabel),
      studentName: escapeHtml(booking.studentName),
      responsibleName: escapeHtml(booking.responsibleName),
      subject: escapeHtml(booking.subject),
      date: escapeHtml(formattedDate),
      phone: escapeHtml(booking.phone || "-"),
      email: escapeHtml(booking.email || "-"),
      code: escapeHtml(booking.bookingCode),
    };

    await getTransporter().sendMail({
      from: `"Clases Agustin" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: `${safe.ownerLabel}: ${safe.studentName} - ${safe.date}`,
      html: `
        <div style="font-family: Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin-bottom: 8px;">${safe.ownerLabel}</h2>
          <p><strong>Alumno:</strong> ${safe.studentName}</p>
          <p><strong>Responsable:</strong> ${safe.responsibleName}</p>
          <p><strong>Materia:</strong> ${safe.subject}</p>
          <p><strong>Fecha:</strong> ${safe.date}</p>
          <p><strong>WhatsApp:</strong> ${safe.phone}</p>
          <p><strong>Email:</strong> ${safe.email}</p>
          <p><strong>Codigo:</strong> ${safe.code}</p>
        </div>
      `,
    });

    return {
      clientEmailSent,
      ownerEmailSent: true,
    };
  } catch (error) {
    console.error("Owner notification error:", error.message);
    return {
      clientEmailSent,
      ownerEmailSent: false,
    };
  }
};
