import express from "express";
import { getErrorLogs, markErrorResolved } from "../controllers/log.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();
router.get("/errors", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), getErrorLogs);
router.patch("/errors/:id/resolve", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), markErrorResolved);
export default router;
