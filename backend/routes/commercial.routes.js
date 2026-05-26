import express from "express";
import { getCommercialGrowth } from "../controllers/commercial.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/growth",
  requireAuth,
  requireRole(["owner", "admin"]),
  getCommercialGrowth
);

export default router;
