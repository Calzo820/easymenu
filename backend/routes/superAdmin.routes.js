import express from "express";
import { impersonateRestaurant, listRestaurants } from "../controllers/superAdmin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole(["superadmin"]));

router.get("/restaurants", listRestaurants);
router.post("/restaurants/:restaurantId/impersonate", impersonateRestaurant);

export default router;
