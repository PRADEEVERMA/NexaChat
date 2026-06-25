import express from "express";
import { getCallHistory } from "../controllers/callController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getCallHistory);

export default router;
