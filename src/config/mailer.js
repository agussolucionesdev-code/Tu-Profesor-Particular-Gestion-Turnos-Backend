import nodemailer from "nodemailer";
import {
  ADULT_RELATIONSHIP_VALUE,
  formatDate,
  formatResponsibleRelationshipLabel,
} from "../utils/bookingRules.js";

const BRAND = {
  teacher: "Agustín Elías Sosa",
  name: "Tu Profesor Particular",
  blue: "#204060",
  blueDark: "#183858",
  green: "#589860",
  page: "#f6f8fb",
  border: "#d8e2ea",
  text: "#17324d",
  muted: "#5d7184",
};

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

const getFrontendUrl = () =>
  String(process.env.FRONTEND_URL || "https://tu-profesor-particular.com").replace(
    /\/$/,
    "",
  );

const getManagementUrl = (code) =>
  `${getFrontendUrl()}/portal?code=${encodeURIComponent(code || "")}`;

const getContactPhone = () =>
  String(process.env.CONTACT_PHONE || "+54 9 11 6423-6675").trim();

const getNotificationCopy = (event) => {
  switch (event) {
    case "rescheduled":
      return {
        title: "Tu turno fue reprogramado",
        ownerTitle: "Turno reprogramado",
        intro:
          "Ya ajusté el turno. Te dejo el nuevo detalle para que lo tengas claro y puedas volver a gestionarlo cuando lo necesites.",
        nextAction:
          "Guardá este mensaje. Si algo no coincide, podés entrar a Mis Turnos o escribirme.",
      };
    case "cancelled":
      return {
        title: "Tu turno fue cancelado",
        ownerTitle: "Turno cancelado",
        intro:
          "El turno quedó cancelado. No hace falta que respondas este correo; si necesitás otro horario, podés reservar nuevamente cuando quieras.",
        nextAction:
          "El código queda como referencia de gestión. Para una nueva clase, reservá otro horario desde la web.",
      };
    case "created":
    default:
      return {
        title: "Tu turno quedó reservado",
        ownerTitle: "Nueva reserva",
        intro:
          "Todo listo. Tu clase quedó reservada y estos son los datos importantes para llegar sin vueltas.",
        nextAction:
          "Guardá el código. Te sirve para revisar, reprogramar o cancelar el turno desde Mis Turnos.",
      };
  }
};

const buildRelationshipLabel = (booking) =>
  formatResponsibleRelationshipLabel(
    booking?.responsibleRelationship,
    booking?.responsibleRelationshipOther,
  );

const getGreetingName = ({
  studentName,
  responsibleName,
  responsibleRelationship,
}) =>
  responsibleRelationship === ADULT_RELATIONSHIP_VALUE
    ? studentName
    : responsibleName || studentName;

const buildSafeBooking = (booking = {}, dateStr = "") => {
  const code = booking.bookingCode || booking.code || "";
  return {
    code: escapeHtml(code),
    rawCode: code,
    studentName: escapeHtml(booking.studentName || "Alumno/a"),
    responsibleName: escapeHtml(booking.responsibleName || "No especificado"),
    relationshipLabel: escapeHtml(buildRelationshipLabel(booking)),
    greetingName: escapeHtml(getGreetingName(booking) || "Hola"),
    subject: escapeHtml(booking.subject || "Materia a definir"),
    educationLevel: escapeHtml(booking.educationLevel || "Nivel no cargado"),
    yearGrade: escapeHtml(booking.yearGrade || ""),
    school: escapeHtml(booking.school || "Institución no cargada"),
    phone: escapeHtml(booking.phone || "-"),
    email: escapeHtml(booking.email || "-"),
    academicSituation: escapeHtml(
      booking.academicSituation || "Sin comentarios adicionales.",
    ),
    dateStr: escapeHtml(dateStr || formatDate(booking.timeSlot)),
    managementUrl: escapeHtml(getManagementUrl(code)),
    contactPhone: escapeHtml(getContactPhone()),
  };
};

export const buildBookingEmailHtml = ({
  booking,
  event = "created",
  dateStr,
} = {}) => {
  const copy = getNotificationCopy(event);
  const safe = buildSafeBooking(booking, dateStr);

  return `<!doctype html>
<html lang="es-AR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(copy.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.page};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 22px;border-bottom:1px solid ${BRAND.border};">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.green};font-weight:700;">${BRAND.name}</p>
                <h1 style="margin:0;color:${BRAND.blue};font-size:26px;line-height:1.2;">${escapeHtml(copy.title)}</h1>
                <p style="margin:12px 0 0;color:${BRAND.muted};font-size:16px;line-height:1.65;">Hola ${safe.greetingName}. ${escapeHtml(copy.intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <div style="border:1px solid ${BRAND.border};border-left:5px solid ${BRAND.green};border-radius:12px;padding:18px;background:#fbfdff;">
                  <p style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND.muted};font-weight:700;">Datos del turno</p>
                  <p style="margin:0 0 8px;"><strong>Fecha y horario:</strong> ${safe.dateStr}</p>
                  <p style="margin:0 0 8px;"><strong>Alumno/a:</strong> ${safe.studentName}</p>
                  <p style="margin:0 0 8px;"><strong>Responsable:</strong> ${safe.responsibleName} (${safe.relationshipLabel})</p>
                  <p style="margin:0 0 8px;"><strong>Materia:</strong> ${safe.subject}</p>
                  <p style="margin:0;"><strong>Nivel:</strong> ${safe.educationLevel}${safe.yearGrade ? ` - ${safe.yearGrade}` : ""}</p>
                </div>

                <div style="text-align:center;margin:24px 0;padding:20px;border:1px solid #cfe5d2;background:#f2faf3;border-radius:12px;">
                  <p style="margin:0 0 8px;color:${BRAND.muted};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Código de gestión</p>
                  <p style="margin:0;font-family:Consolas,Menlo,monospace;font-size:28px;letter-spacing:.16em;font-weight:800;color:${BRAND.blueDark};">${safe.code}</p>
                  <p style="margin:10px 0 0;color:${BRAND.muted};font-size:14px;">${escapeHtml(copy.nextAction)}</p>
                </div>

                <p style="margin:0 0 18px;color:${BRAND.muted};font-size:15px;line-height:1.65;">Podés revisar el turno, reprogramarlo o cancelarlo desde Mis Turnos. Si necesitás ayuda, escribime y lo vemos con calma.</p>
                <p style="text-align:center;margin:0 0 24px;">
                  <a href="${safe.managementUrl}" style="display:inline-block;background:${BRAND.green};color:#ffffff;text-decoration:none;border-radius:8px;padding:13px 22px;font-weight:700;">Ir a Mis Turnos</a>
                </p>

                <div style="border-top:1px solid ${BRAND.border};padding-top:18px;">
                  <p style="margin:0;color:${BRAND.text};font-size:16px;font-weight:700;">${BRAND.teacher}</p>
                  <p style="margin:4px 0 0;color:${BRAND.muted};font-size:14px;">Profesor particular</p>
                  <p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px;">WhatsApp: ${safe.contactPhone}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.blueDark};padding:18px 28px;text-align:center;color:#d8e2ea;font-size:13px;line-height:1.6;">
                Guardá este correo como respaldo. La gestión principal se hace con el código del turno.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const buildBookingEmailText = ({
  booking,
  event = "created",
  dateStr,
} = {}) => {
  const copy = getNotificationCopy(event);
  const safe = buildSafeBooking(booking, dateStr);

  return [
    `${copy.title}`,
    "",
    `Hola ${safe.greetingName}. ${copy.intro}`,
    "",
    `Fecha y horario: ${safe.dateStr}`,
    `Alumno/a: ${safe.studentName}`,
    `Responsable: ${safe.responsibleName} (${safe.relationshipLabel})`,
    `Materia: ${safe.subject}`,
    `Código de gestión: ${safe.rawCode}`,
    "",
    `Mis Turnos: ${getManagementUrl(safe.rawCode)}`,
    "",
    `${BRAND.teacher} - ${BRAND.name}`,
  ].join("\n");
};

const buildOwnerEmailHtml = ({ booking, event, dateStr }) => {
  const copy = getNotificationCopy(event);
  const safe = buildSafeBooking(booking, dateStr);
  const whatsappDigits = String(booking?.phone || "").replace(/\D/g, "");
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(
        `Hola, te escribo por el turno ${safe.rawCode}.`,
      )}`
    : "";

  return `<!doctype html>
<html lang="es-AR">
  <body style="margin:0;padding:20px;background:${BRAND.page};font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;padding:24px;">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${BRAND.green};font-weight:700;">Agenda docente</p>
      <h1 style="margin:0 0 16px;color:${BRAND.blue};font-size:24px;">${escapeHtml(copy.ownerTitle)}</h1>
      <div style="border:1px solid ${BRAND.border};border-radius:12px;padding:16px;background:#fbfdff;">
        <p style="margin:0 0 8px;"><strong>Alumno/a:</strong> ${safe.studentName}</p>
        <p style="margin:0 0 8px;"><strong>Responsable:</strong> ${safe.responsibleName} (${safe.relationshipLabel})</p>
        <p style="margin:0 0 8px;"><strong>Materia:</strong> ${safe.subject}</p>
        <p style="margin:0 0 8px;"><strong>Fecha:</strong> ${safe.dateStr}</p>
        <p style="margin:0 0 8px;"><strong>Contacto:</strong> ${safe.phone} | ${safe.email}</p>
        <p style="margin:0 0 8px;"><strong>Código:</strong> <span style="font-family:Consolas,Menlo,monospace;font-weight:800;">${safe.code}</span></p>
        <p style="margin:0;"><strong>Contexto:</strong> ${safe.academicSituation}</p>
      </div>
      ${
        whatsappUrl
          ? `<p style="margin:20px 0 0;"><a href="${escapeHtml(whatsappUrl)}" style="display:inline-block;background:${BRAND.green};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-weight:700;">Escribir por WhatsApp</a></p>`
          : ""
      }
    </div>
  </body>
</html>`;
};

export const sendBookingEmail = async (
  studentName,
  toEmail,
  dateStr,
  code,
  extraData = {},
) => {
  if (!toEmail || !canSendEmail()) return false;

  const event = extraData.event || "created";
  const booking = {
    ...extraData,
    studentName,
    bookingCode: code,
  };
  const copy = getNotificationCopy(event);

  try {
    await getTransporter().sendMail({
      from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${copy.title}: ${booking.subject || "Clase particular"} - ${dateStr}`,
      html: buildBookingEmailHtml({ booking, event, dateStr }),
      text: buildBookingEmailText({ booking, event, dateStr }),
    });

    return true;
  } catch (error) {
    console.error("Email error:", error.message);
    return false;
  }
};

export const sendBookingNotifications = async ({
  booking,
  event = "created",
}) => {
  const formattedDate = formatDate(booking.timeSlot);

  const clientEmailSent = booking.email
    ? await sendBookingEmail(
        booking.studentName,
        booking.email,
        formattedDate,
        booking.bookingCode,
        {
          responsibleName: booking.responsibleName,
          responsibleRelationship: booking.responsibleRelationship,
          responsibleRelationshipOther: booking.responsibleRelationshipOther,
          subject: booking.subject,
          educationLevel: booking.educationLevel,
          yearGrade: booking.yearGrade,
          school: booking.school,
          phone: booking.phone,
          academicSituation: booking.academicSituation,
          event,
        },
      )
    : false;

  const ownerEmail = String(process.env.OWNER_NOTIFICATION_EMAIL ?? "").trim();
  if (!ownerEmail || !canSendEmail()) {
    return {
      client: {
        sent: clientEmailSent,
        recipient: booking.email || "",
      },
      owner: {
        sent: false,
        recipient: ownerEmail,
      },
    };
  }

  try {
    await getTransporter().sendMail({
      from: `"${BRAND.name}" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: `${getNotificationCopy(event).ownerTitle}: ${booking.studentName} - ${formattedDate}`,
      html: buildOwnerEmailHtml({ booking, event, dateStr: formattedDate }),
      text: buildBookingEmailText({ booking, event, dateStr: formattedDate }),
    });

    return {
      client: {
        sent: clientEmailSent,
        recipient: booking.email || "",
      },
      owner: {
        sent: true,
        recipient: ownerEmail,
      },
    };
  } catch (error) {
    console.error("Owner notification error:", error.message);
    return {
      client: {
        sent: clientEmailSent,
        recipient: booking.email || "",
      },
      owner: {
        sent: false,
        recipient: ownerEmail,
      },
    };
  }
};
