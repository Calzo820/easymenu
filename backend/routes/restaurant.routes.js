import express from "express";
import {
  createRestaurantForSuperAdmin,
  getMyRestaurant,
  impersonateRestaurantForSuperAdmin,
  listRestaurantsForSuperAdmin,
  updateMyRestaurant,
  updateRestaurantForSuperAdmin,
} from "../controllers/restaurant.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/super-admin", requireAuth, listRestaurantsForSuperAdmin);
router.post("/super-admin", requireAuth, createRestaurantForSuperAdmin);
router.patch("/super-admin/:restaurantId", requireAuth, updateRestaurantForSuperAdmin);
router.post("/super-admin/:restaurantId/impersonate", requireAuth, impersonateRestaurantForSuperAdmin);

router.get("/me", requireAuth, getMyRestaurant);
router.patch("/me", requireAuth, requireRole(["owner", "admin"]), updateMyRestaurant);

export default router;
