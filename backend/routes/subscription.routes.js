import express from "express";
import { createBillingPortal, createSubscriptionCheckout, getBillingStatus } from "../controllers/subscription.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(["owner", "admin"]));

router.get("/status", getBillingStatus);
router.post("/checkout", createSubscriptionCheckout);
router.post("/portal", createBillingPortal);

export default router;
