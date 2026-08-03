import express from "express";
import { listTranslationLanguages, translatePublicContent } from "../controllers/translation.controller.js";

const router = express.Router();

router.get("/languages", listTranslationLanguages);
router.post("/translate", translatePublicContent);

export default router;
