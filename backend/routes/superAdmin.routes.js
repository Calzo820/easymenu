import express from "express";
import { impersonateRestaurant, listRestaurants } from "../controllers/superAdmin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(requireAuth);
router.get("/restaurants", listRestaurants);
router.post("/restaurants/:restaurantId/impersonate", impersonateRestaurant);

export default router;
