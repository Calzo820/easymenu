import express from "express";
import { handleStripeWebhook } from "../controllers/payment.controller.js";

const router = express.Router();

// Legacy route kept for compatibility. The active server mounts /payments/webhook.
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

export default router;
