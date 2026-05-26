import express from "express";
import { getAnalyticsSummary } from "../controllers/analytics.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole(["owner", "admin", "cashier"]),
  getAnalyticsSummary
);

export default router;
