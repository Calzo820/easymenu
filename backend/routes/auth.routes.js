import express from "express";
import {
  login,
  loginWithPin,
  logout,
  me,
  refreshToken,
  registerOwner,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerOwner);
router.post("/login", login);
router.post("/pin-login", loginWithPin);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendEmailVerification);
router.get("/me", requireAuth, me);

export default router;
