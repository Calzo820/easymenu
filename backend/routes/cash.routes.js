import express from "express";
import {
  closeCashDay,
  getCashSummary,
  listCashClosures,
  reopenCashDay,
} from "../controllers/cash.controller.js";
import {
  denyImpersonatedPrivateData,
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();
const cashAccess = [
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner", "admin", "cashier"]),
];

router.get("/summary", ...cashAccess, getCashSummary);
router.get("/closures", ...cashAccess, listCashClosures);
router.post("/closures", ...cashAccess, closeCashDay);
router.post(
  "/closures/:id/reopen",
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner"]),
  reopenCashDay
);

export default router;
