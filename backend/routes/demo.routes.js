import express from "express";
import { ensureDemoAccount } from "../controllers/demo.controller.js";

const router = express.Router();

router.post("/ensure", ensureDemoAccount);

export default router;
