import express from "express";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/user.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireActiveSubscription } from "../middleware/billing.middleware.js";

const router = express.Router();

router.get("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), listUsers);
router.post("/", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), createUser);
router.patch("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), updateUser);
router.delete("/:id", requireAuth, requireActiveSubscription, requireRole(["owner", "admin"]), deleteUser);

export default router;
