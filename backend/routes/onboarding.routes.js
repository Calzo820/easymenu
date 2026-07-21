import express from "express";
import { autoSetupRestaurant, createMenuItemQuick, getOnboardingStatus, getQrPayload, importMenuQuick, markOnboardingStep } from "../controllers/onboarding.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth, requireRole(["owner", "admin"]));
router.get("/status", getOnboardingStatus);
router.post("/auto-setup", autoSetupRestaurant);
router.post("/menu-item", createMenuItemQuick);
router.post("/import-menu", importMenuQuick);
router.post("/step", markOnboardingStep);
router.get("/qr-payload", getQrPayload);

export default router;
