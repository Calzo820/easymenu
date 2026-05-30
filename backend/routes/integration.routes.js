import { Router } from "express";
import { listIntegrations } from "../controllers/integration.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, requireRole(["owner", "admin"]), listIntegrations);

export default router;
