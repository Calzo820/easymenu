import express from "express";
import {
  claimPrintJob,
  completePrintJob,
  failPrintJob,
  listPrintJobs,
  reprintOrder,
} from "../controllers/print.controller.js";
import { denyImpersonatedPrivateData, requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();
const stationRoles = requireRole(["owner", "admin", "kitchen", "bar"]);

router.get("/", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, stationRoles, listPrintJobs);
router.post("/order/:orderId", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, stationRoles, reprintOrder);
router.post("/:id/claim", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, stationRoles, claimPrintJob);
router.post("/:id/complete", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, stationRoles, completePrintJob);
router.post("/:id/fail", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, stationRoles, failPrintJob);

export default router;
