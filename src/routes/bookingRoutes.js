import express from "express";
import {
  createBooking,
  getAvailability,
  getBookingByCode,
  getAllBookings,
  deleteBooking,
  updateBooking,
  deleteAllBookings,
  rescheduleBooking,
  cancelBookingClient,
} from "../controllers/bookingController.js";
import { requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/reserve", createBooking);
router.get("/availability", getAvailability);
router.post("/reschedule", rescheduleBooking);
router.post("/cancel", cancelBookingClient);

router.get("/", requireAdmin, getAllBookings);
router.delete("/all", requireAdmin, deleteAllBookings);
router.delete("/:id", requireAdmin, deleteBooking);
router.put("/:id", requireAdmin, updateBooking);

router.get("/:code", getBookingByCode);

export default router;
