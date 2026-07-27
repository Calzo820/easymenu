import express from "express";
import { getDetailedSystemHealth, getSystemOverview } from "../controllers/system.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", requireAuth, getDetailedSystemHealth);
router.get("/overview", requireAuth, getSystemOverview);

export default router;
