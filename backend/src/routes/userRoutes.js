import express from "express";
import { getUserById, getUsers, updateProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/profile/me", upload.single("avatar"), updateProfile);

export default router;
