import express from "express";
import { login, logout, me, register } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.post("/register", upload.single("avatar"), register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;
