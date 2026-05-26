import express from "express";
import { createPublicStripeCheckout, getPublicPaymentSummary, getPublicReceipt } from "../controllers/payment.controller.js";

const router = express.Router();

router.get("/public/:token/summary", getPublicPaymentSummary);
router.get("/public/:token/receipt", getPublicReceipt);
router.post("/public/:token/checkout", createPublicStripeCheckout);

export default router;
