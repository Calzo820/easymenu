import express from "express";
import {
  createPublicStripeCheckout,
  createStripeConnectDashboard,
  createStripeConnectOnboarding,
  getPublicPaymentSummary,
  getPublicReceipt,
  getStripeConnectStatus,
} from "../controllers/payment.controller.js";
import { denyImpersonatedPrivateData, requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/public/:token/summary", getPublicPaymentSummary);
router.get("/public/:token/receipt", getPublicReceipt);
router.post("/public/:token/checkout", createPublicStripeCheckout);
router.get("/connect/status", requireAuth, denyImpersonatedPrivateData, requireRole(["owner", "admin"]), getStripeConnectStatus);
router.post("/connect/onboarding", requireAuth, denyImpersonatedPrivateData, requireRole(["owner", "admin"]), createStripeConnectOnboarding);
router.post("/connect/dashboard", requireAuth, denyImpersonatedPrivateData, requireRole(["owner", "admin"]), createStripeConnectDashboard);

export default router;
