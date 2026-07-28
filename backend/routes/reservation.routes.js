import express from "express";
import {
  cancelReservation,
  createReservation,
  listReservations,
  updateReservation,
} from "../controllers/reservation.controller.js";
import { denyImpersonatedPrivateData, requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin", "cashier", "waiter"]), listReservations);
router.post("/", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, requireRole(["owner", "admin", "cashier", "waiter"]), createReservation);
router.patch("/:id", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, requireRole(["owner", "admin", "cashier", "waiter"]), updateReservation);
router.delete("/:id", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, requireRole(["owner", "admin", "cashier", "waiter"]), cancelReservation);

export default router;
