import express from "express";
import { login, logout, me, refreshToken, registerOwner } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerOwner);
router.post("/login", login);
router.post("/refresh", refreshToken);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;