import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import bcrypt from "bcryptjs";

let app;
let mongoServer;
let Booking;
let User;

const formatForApi = (date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minutes}`;
};

const tomorrowAt = (hour, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const validBookingPayload = (overrides = {}) => ({
  responsibleName: "Maria Perez",
  studentName: "Juan Perez",
  tutorName: "Agustin",
  email: "familia@example.com",
  phone: "+54 9 11-2222-3333",
  school: "Escuela Normal",
  educationLevel: "Secundaria",
  yearGrade: "3er ano",
  subject: "Matematica",
  academicSituation: "Necesita reforzar ecuaciones.",
  timeSlot: formatForApi(tomorrowAt(10)),
  duration: 1,
  ...overrides,
});

const createAdminAndLogin = async () => {
  await User.create({
    username: "admin@example.com",
    password: await bcrypt.hash("super-secret", 10),
  });

  const login = await request(app).post("/api/auth/login").send({
    username: "admin@example.com",
    password: "super-secret",
  });

  return login.body.token;
};

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = (await import("../src/app.js")).default;
  Booking = (await import("../src/models/Booking.js")).default;
  User = (await import("../src/models/User.js")).default;
}, 30000);

beforeEach(async () => {
  await Booking.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("booking flows", () => {
  it("creates a booking and exposes only calendar blocks publicly", async () => {
    const created = await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload())
      .expect(201);

    expect(created.body.data.bookingCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(created.body.data.email).toBe("familia@example.com");

    const availability = await request(app)
      .get("/api/bookings/availability")
      .expect(200);

    expect(availability.body.data).toHaveLength(1);
    expect(availability.body.data[0]).toHaveProperty("timeSlot");
    expect(availability.body.data[0]).not.toHaveProperty("studentName");
    expect(availability.body.data[0]).not.toHaveProperty("email");
    expect(availability.body.data[0]).not.toHaveProperty("phone");
  });

  it("lets clients find active turns by code, email or WhatsApp", async () => {
    const created = await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload())
      .expect(201);

    const bookingCode = created.body.data.bookingCode;

    const byCode = await request(app)
      .get(`/api/bookings/${bookingCode}`)
      .expect(200);
    expect(byCode.body.data[0].bookingCode).toBe(bookingCode);

    const byEmail = await request(app)
      .get("/api/bookings/familia@example.com")
      .expect(200);
    expect(byEmail.body.data[0].bookingCode).toBe(bookingCode);

    const byPhone = await request(app)
      .get("/api/bookings/1122223333")
      .expect(200);
    expect(byPhone.body.data[0].bookingCode).toBe(bookingCode);
  });

  it("rejects invalid public booking requests and overlapping turns", async () => {
    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload({ email: "", phone: "" }))
      .expect(400);

    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload())
      .expect(201);

    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload({ studentName: "Pedro Perez" }))
      .expect(400);
  });

  it("allows adjacent bookings right after an occupied block ends", async () => {
    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload({ timeSlot: formatForApi(tomorrowAt(15)), duration: 3 }))
      .expect(201);

    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload({
        studentName: "Lucia Perez",
        email: "lucia@example.com",
        timeSlot: formatForApi(tomorrowAt(18)),
        duration: 1,
      }))
      .expect(201);

    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload({
        studentName: "Martin Perez",
        email: "martin@example.com",
        timeSlot: formatForApi(tomorrowAt(17, 30)),
        duration: 1,
      }))
      .expect(400);
  });

  it("protects admin routes with a bearer token", async () => {
    await request(app).get("/api/bookings").expect(401);

    const token = await createAdminAndLogin();
    await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload())
      .expect(201);

    const adminList = await request(app)
      .get("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(adminList.body.data).toHaveLength(1);
    expect(adminList.body.data[0].email).toBe("familia@example.com");
  });

  it("lets a client reschedule and cancel with the booking code", async () => {
    const created = await request(app)
      .post("/api/bookings/reserve")
      .send(validBookingPayload())
      .expect(201);

    const bookingCode = created.body.data.bookingCode;
    const newDate = tomorrowAt(12);

    const rescheduled = await request(app)
      .post("/api/bookings/reschedule")
      .send({
        bookingCode,
        newTimeSlot: formatForApi(newDate),
        newDuration: 1.5,
      })
      .expect(200);

    expect(rescheduled.body.data.duration).toBe(1.5);

    const cancelled = await request(app)
      .post("/api/bookings/cancel")
      .send({ bookingCode })
      .expect(200);

    expect(cancelled.body.data.status).toBe("Cancelado");
  });
});
