import express from "express";
import {
  getMyRestaurant,
  listRestaurantsForSuperAdmin,
  updateMyRestaurant,
} from "../controllers/restaurant.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/super-admin", requireAuth, listRestaurantsForSuperAdmin);
router.get("/me", requireAuth, getMyRestaurant);
router.patch("/me", requireAuth, requireRole(["owner", "admin"]), updateMyRestaurant);

export default router;
