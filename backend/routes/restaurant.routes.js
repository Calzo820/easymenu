import express from "express";
import {
  getMyRestaurant,
  updateMyRestaurant,
} from "../controllers/restaurant.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMyRestaurant);
router.patch("/me", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), updateMyRestaurant);

export default router;