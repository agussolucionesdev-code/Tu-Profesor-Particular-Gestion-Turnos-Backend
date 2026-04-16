import nodemailer from "nodemailer";
import {
  ADULT_RELATIONSHIP_VALUE,
  formatDate,
  formatResponsibleRelationshipLabel,
} from "../utils/bookingRules.js";

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
        title: "Turno reprogramado",
        intro: "Tú clase particular ha sido reprogramada. Hemos ajustado la fecha para que sea más cómoda para vos.",
        ownerLabel: "📅 Turno Reprogramado",
      };
    case "cancelled":
      return {
        title: "Turno cancelado",
        intro: "Tu clase particular ha sido cancelada. No te preocupes, podés reservar un nuevo espacio cuando lo necesites.",
        ownerLabel: "❌ Turno Cancelado",
      };
    case "created":
    default:
      return {
        title: "Reserva confirmada",
        intro: "¡Todo listo! Tu clase particular ha quedado agendada. Estoy ansioso por empezar a trabajar juntos en tus objetivos.",
        ownerLabel: "✨ Nueva Reserva",
      };
  }
};

const buildRelationshipLabel = (booking) =>
  formatResponsibleRelationshipLabel(
    booking?.responsibleRelationship,
    booking?.responsibleRelationshipOther,
  );

const getGreetingName = ({ studentName, responsibleName, responsibleRelationship }) =>
  responsibleRelationship === ADULT_RELATIONSHIP_VALUE ? studentName : responsibleName;

const applyNeurocopyPrinciples = (text, context = {}) => {
  const {
    tone = "warm",
    emphasizeReassurance = true,
    includeProgressCues = true,
  } = context;
  
  let enhanced = text;
  
  if (emphasizeReassurance) {
    enhanced = enhanced
      .replace(/preocup(es|és)/gi, "tranquilo")
      .replace(/problema/gi, "oportunidad")
      .replace(/error/gi, "ajuste");
  }
  
  if (includeProgressCues) {
    enhanced = enhanced
      .replace(/(confirmado|listo|reservado)/gi, "✨ $1 ✨")
      .replace(/(próximo|siguiente)/gi, "👉 $1");
  }
  
  return enhanced;
};

const generateDynamicVariables = (booking, extraData = {}) => {
  const baseDate = booking?.timeSlot ? new Date(booking.timeSlot) : new Date();
  
  return {
    studentFirstName: booking?.studentName?.split(" ")[0] || "Estimado/a",
    responsibleFirstName: booking?.responsibleName?.split(" ")[0] || "",
    bookingCode: booking?.bookingCode || "ABC123",
    formattedDate: extraData.dateStr || baseDate.toLocaleDateString("es-AR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    formattedTime: booking?.timeSlot 
      ? new Date(booking.timeSlot).toLocaleTimeString("es-AR", { 
          hour: "2-digit", 
          minute: "2-digit" 
        })
      : "--:--",
    subject: booking?.subject || "Tu materia",
    educationLevel: booking?.educationLevel || "",
    yearGrade: booking?.yearGrade || "",
    school: booking?.school || "",
    location: "Jujuy 414, Temperley",
    locationDetail: "Portón blanco. A 1 cuadra del C.C. Salta y 4 de Av. Eva Perón.",
    contactPhone: process.env.CONTACT_PHONE || "+54 11 2222-3333",
    contactEmail: process.env.CONTACT_EMAIL || "clases@agustinsosa.com",
    cancellationWindow: "24 horas",
    rescheduleUrl: `${process.env.FRONTEND_URL || "https://tu-profesor.com"}/portal?code=${booking?.bookingCode}`,
    tutorSignature: "Agustín Sosa - Profesor Particular",
    brandColor: "#204060",
    successColor: "#589860",
    accentColor: "#f59e0b",
  };
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
      responsibleRelationship = ADULT_RELATIONSHIP_VALUE,
      responsibleRelationshipOther = "",
      subject = "Particular",
      educationLevel = "-",
      yearGrade = "-",
      school = "-",
      title = "Reserva confirmada",
      intro = "La clase particular quedó agendada correctamente.",
    } = extraData;

    const relationshipLabel = buildRelationshipLabel({
      responsibleRelationship,
      responsibleRelationshipOther,
    });

    const safe = {
      title: escapeHtml(title),
      intro: escapeHtml(intro),
      nameToGreet: escapeHtml(
        getGreetingName({
          studentName,
          responsibleName,
          responsibleRelationship,
        }),
      ),
      studentName: escapeHtml(studentName),
      relationshipLabel: escapeHtml(relationshipLabel),
      responsibleName: escapeHtml(responsibleName),
      dateStr: escapeHtml(dateStr),
      subject: escapeHtml(subject),
      educationLevel: escapeHtml(educationLevel),
      yearGrade: escapeHtml(yearGrade),
      school: escapeHtml(school),
      code: escapeHtml(code),
    };

    const vars = generateDynamicVariables({ ...extraData, timeSlot: extraData.dateStr }, extraData);
    const neuroCopy = applyNeurocopyPrinciples(safe.intro, { tone: "warm" });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es-AR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light only" />
        <style>
          @media (prefers-color-scheme: dark) {
            body { background-color: #0f172a !important; }
          }
          body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #334155; line-height: 1.6; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #204060, #183858); padding: 40px 32px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
          .content { padding: 34px 30px; }
          .greeting { font-size: 20px; margin-bottom: 18px; color: #0f172a; font-weight: 800; }
          .text { font-size: 16px; line-height: 1.7; margin-bottom: 24px; color: #475569; }
          .text strong { color: #204060; font-weight: 700; }
          .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 6px solid #589860; padding: 24px; border-radius: 16px; margin: 24px 0; }
          .card-row { margin-bottom: 12px; font-size: 15px; display: flex; justify-content: space-between; align-items: center; }
          .card-row strong { color: #64748b; font-weight: 600; }
          .card-row span { color: #0f172a; font-weight: 700; text-align: right; }
          .code-badge { background: linear-gradient(135deg, #edf6ee, #f0fdf4); padding: 8px 16px; border-radius: 12px; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #166534; font-size: 20px; border: 2px solid #589860; letter-spacing: 2px; display: inline-block; margin: 8px 0; }
          .address-box { background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 20px; border-radius: 16px; margin-top: 30px; text-align: center; }
          .address-title { color: #166534; font-weight: 800; text-transform: uppercase; font-size: 12px; margin-bottom: 8px; letter-spacing: 0.08em; }
          .address-text { color: #14532d; font-size: 15px; line-height: 1.6; font-weight: 500; }
          .action-buttons { margin: 24px 0; text-align: center; }
          .btn-primary { display: inline-block; background: #589860; color: #ffffff !important; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; }
          .btn-primary:hover { background: #4a8551; }
          .footer { background-color: #0f172a; padding: 24px; text-align: center; color: #94a3b8; font-size: 13px; }
          .footer a { color: #589860; text-decoration: none; }
          .signature { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
          .sig-name { font-size: 20px; font-weight: 800; color: #0f172a; }
          .sig-title { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 16px; }
            .header, .content, .footer { padding: 24px 20px; }
            .card-row { flex-direction: column; align-items: flex-start; gap: 4px; }
            .card-row span { text-align: left; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>${safe.title}</h1></div>
          <div class="content">
            <p class="greeting">Hola ${safe.nameToGreet} 👋</p>
            <p class="text">${neuroCopy} Aquí tenés los detalles de nuestro encuentro para <strong>${safe.studentName}</strong>.</p>
            <div class="card">
              <div class="card-row"><strong>📅 Fecha:</strong> <span>${safe.dateStr}</span></div>
              <div class="card-row"><strong>👤 Alumno:</strong> <span>${safe.studentName}</span></div>
              <div class="card-row"><strong>🔗 Vínculo:</strong> <span>${safe.relationshipLabel}</span></div>
              <div class="card-row"><strong>👨‍👩‍👧‍👦 Responsable:</strong> <span>${safe.responsibleName}</span></div>
              <div class="card-row"><strong>📚 Materia:</strong> <span>${safe.subject}</span></div>
              <div class="card-row"><strong>🎓 Nivel:</strong> <span>${safe.educationLevel} ${safe.yearGrade ? `(${safe.yearGrade})` : ""}</span></div>
              <div class="card-row"><strong>🏫 Institución:</strong> <span>${safe.school}</span></div>
              <div class="card-row" style="margin-top: 20px; justify-content: center;">
                <div style="text-align: center; width: 100%;">
                  <strong style="display: block; margin-bottom: 8px; color: #64748b;">🔑 Tu código de gestión</strong>
                  <span class="code-badge" aria-label="Código de reserva: ${safe.code}">${safe.code}</span>
                  <small style="display: block; margin-top: 8px; color: #64748b;">Guárdalo para gestionar tu turno</small>
                </div>
              </div>
            </div>
            <div class="address-box">
              <div class="address-title">📍 Lugar del encuentro</div>
              <div class="address-text">
                <strong>Jujuy 414</strong><br>
                Temperley, Lomas de Zamora, Bs. As.<br>
                <span style="font-size: 13px; display: block; margin-top: 8px; opacity: 0.85;">🚪 Portón blanco. A 1 cuadra del C.C. Salta y 4 de Av. Eva Perón.</span>
              </div>
            </div>
            <div class="action-buttons">
              <a href="${vars.rescheduleUrl}" class="btn-primary" style="color: #ffffff !important;">🗓️ Gestionar mi turno</a>
            </div>
            <div class="signature">
              <div class="sig-name">Agustín Sosa</div>
              <div class="sig-title">Profesor Particular</div>
            </div>
          </div>
          <div class="footer">
            <p>💡 Guarda este mensaje. Podés gestionar tu turno en <a href="${process.env.FRONTEND_URL || "#"}">la web</a> usando tu código, email o teléfono.</p>
            <p style="margin-top: 12px; font-size: 12px; opacity: 0.9;">¿Necesitás ayuda? Respondé a este email o escribinos al ${vars.contactPhone}</p>
            <p style="margin-top: 16px; border-top: 1px solid #334155; padding-top: 16px;">&copy; ${new Date().getFullYear()} Agustín Elías Sosa. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;


    await getTransporter().sendMail({
      from: `"Clases Agustín" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `${safe.title}: ${safe.subject} - ${safe.dateStr}`,
      html: htmlContent,
    });

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
          responsibleRelationship: booking.responsibleRelationship,
          responsibleRelationshipOther: booking.responsibleRelationshipOther,
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
    const safe = {
      ownerLabel: escapeHtml(copy.ownerLabel),
      studentName: escapeHtml(booking.studentName),
      responsibleName: escapeHtml(booking.responsibleName),
      relationshipLabel: escapeHtml(buildRelationshipLabel(booking)),
      subject: escapeHtml(booking.subject),
      date: escapeHtml(formattedDate),
      phone: escapeHtml(booking.phone || "-"),
      email: escapeHtml(booking.email || "-"),
      code: escapeHtml(booking.bookingCode),
    };

    await getTransporter().sendMail({
      from: `"Clases Agustín" <${process.env.EMAIL_USER}>`,
      to: ownerEmail,
      subject: `${safe.ownerLabel}: ${safe.studentName} - ${safe.date}`,
      html: `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; padding: 20px; background-color: #f8fafc; border-radius: 16px;">
          <h2 style="margin-bottom: 12px; color: #0f172a; font-weight: 800;">${safe.ownerLabel}</h2>
          <p style="margin-bottom: 20px; color: #64748b;">Se ha registrado un movimiento en tu agenda:</p>
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <p style="margin: 0 0 8px 0;"><strong>Alumno:</strong> ${safe.studentName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Responsable:</strong> ${safe.responsibleName} (${safe.relationshipLabel})</p>
            <p style="margin: 0 0 8px 0;"><strong>Materia:</strong> ${safe.subject}</p>
            <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${safe.date}</p>
            <p style="margin: 0 0 8px 0;"><strong>Contacto:</strong> ${safe.phone} | ${safe.email}</p>
            <p style="margin: 0; padding-top: 12px; border-top: 1px solid #f1f5f9;"><strong>Código:</strong> <span style="font-family: monospace; font-weight: 800; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${safe.code}</span></p>
          </div>
        </div>
      `,
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
