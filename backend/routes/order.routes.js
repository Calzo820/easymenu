import express from "express";
import {
  addOrderExtra,
  closeOrder,
  createPublicOrder,
  getOrders,
  getServiceOrders,
  getPublicOrderByTokenOrId,
  requestPublicBill,
  requestPublicStaff,
  deleteOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { denyImpersonatedPrivateData, requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";
import { validateExtraPayload, validateOrderStatusPayload, validatePublicOrderPayload } from "../middleware/validate.js";

const router = express.Router();

router.post("/public", validatePublicOrderPayload, createPublicOrder);
router.get("/public/:token", getPublicOrderByTokenOrId);
router.post("/public/:token/request-bill", requestPublicBill);
router.post("/public/:token/call-staff", requestPublicStaff);

router.get("/", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, getOrders);
router.get("/kitchen/list", requireAuth, denyImpersonatedPrivateData, requireActiveSubscription, requireRole(["owner", "admin", "kitchen", "bar", "cashier"]), getServiceOrders);

router.patch(
  "/:id/status",
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner", "admin", "kitchen", "bar", "cashier"]),
  validateOrderStatusPayload,
  updateOrderStatus
);

router.post(
  "/:id/extra",
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner", "admin", "cashier"]),
  validateExtraPayload,
  addOrderExtra
);

router.post(
  "/:id/close",
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner", "admin", "cashier"]),
  closeOrder
);

router.delete(
  "/:id",
  requireAuth,
  denyImpersonatedPrivateData,
  requireActiveSubscription,
  requireRole(["owner", "admin"]),
  deleteOrder
);

export default router;
