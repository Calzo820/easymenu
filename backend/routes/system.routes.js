import express from "express";
import { getDetailedSystemHealth } from "../controllers/system.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/health", requireAuth, getDetailedSystemHealth);

export default router;
