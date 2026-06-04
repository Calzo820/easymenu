import express from "express";
import {
  getMyRestaurant,
  listRestaurantsForSuperAdmin,
  updateMyRestaurant,
  updateRestaurantForSuperAdmin,
} from "../controllers/restaurant.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/super-admin", requireAuth, requireRole(["owner", "admin"]), listRestaurantsForSuperAdmin);
router.patch("/super-admin/:id", requireAuth, requireRole(["owner", "admin"]), updateRestaurantForSuperAdmin);

router.get("/me", requireAuth, getMyRestaurant);
router.patch("/me", requireAuth, requireRole(["owner", "admin"]), updateMyRestaurant);

export default router;