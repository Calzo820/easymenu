import express from "express";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItems,
  getPublicMenu,
  updateMenuItem,
} from "../controllers/menu.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get("/", requireAuth, requireActiveSubscription, getMenuItems);
router.post("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), createMenuItem);
router.patch("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), updateMenuItem);
router.delete("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), deleteMenuItem);

router.get("/public/:slug", getPublicMenu);

export default router;