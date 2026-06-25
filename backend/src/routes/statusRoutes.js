import express from "express";
import { createStatus, getStatuses } from "../controllers/statusController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getStatuses);
router.post("/", upload.single("media"), createStatus);

export default router;
