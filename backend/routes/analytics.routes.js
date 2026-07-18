import express from "express";
import { getAnalyticsSummary } from "../controllers/analytics.controller.js";
import { getAnalyticsAdvisor } from "../controllers/advisor.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/summary",
  requireAuth,
  requireRole(["owner", "admin", "cashier"]),
  getAnalyticsSummary
);

router.get(
  "/advisor",
  requireAuth,
  requireRole(["owner", "admin", "cashier"]),
  getAnalyticsAdvisor
);

export default router;
