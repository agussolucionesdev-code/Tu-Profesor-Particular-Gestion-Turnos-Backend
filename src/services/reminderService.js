import axios from "axios";
import { formatDate } from "../utils/bookingRules.js";

/**
 * ReminderService handles the logic for notifying students and professors
 * about upcoming appointments.
 */
export const ReminderService = {
  async sendWhatsAppReminder(booking) {
    if (!booking.phone) return { success: false, error: "No phone number provided" };

    const dateStr = formatDate(booking.timeSlot);
    const studentName = booking.studentName;
    const subject = booking.subject;
    
    // Message constructed based on consumer psychology: warm, professional, and helpful.
    const message = `Hola ${studentName}, soy Agustín Sosa. Te escribo para recordarte nuestra clase de ${subject} programada para mañana ${dateStr}. ¡Nos vemos pronto!`;
    
    const phone = String(booking.phone).replace(/\D/g, "");
    const formattedPhone = phone.length === 10 ? `549${phone}` : phone;
    
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    // Note: Real automation requires a WhatsApp Business API. 
    // For now, we provide the link or log the intention.
    console.log(`Reminder prepared for ${studentName}: ${url}`);
    
    return { success: true, url };
  },

  async processDailyReminders(bookings) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    const remindersToSend = bookings.filter(booking => {
      const bookingDate = new Date(booking.timeSlot);
      return bookingDate.toDateString() === tomorrow.toDateString() && booking.status === "Confirmado";
    });
    
    const results = [];
    for (const booking of remindersToSend) {
      const res = await this.sendWhatsAppReminder(booking);
      results.push({ bookingId: booking._id, ...res });
    }
    
    return results;
  }
};
