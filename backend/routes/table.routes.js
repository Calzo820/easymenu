import express from "express";
import { createTable, getPublicTableMenu, getTables, getTablesStatus, updateTable } from "../controllers/table.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get("/public/:slug/:tableToken", getPublicTableMenu);

router.get("/status", requireAuth, requireActiveSubscription, requireRole(["owner", "admin", "cashier", "kitchen", "bar"]), getTablesStatus);
router.get("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin", "cashier"]), getTables);
router.post("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), createTable);
router.patch("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), updateTable);
router.put("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), updateTable);

export default router;
