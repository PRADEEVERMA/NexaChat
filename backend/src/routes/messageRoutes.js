import express from "express";
import {
  deleteMessage,
  editMessage,
  getMessages,
  reactToMessage,
  sendMessage
} from "../controllers/messageController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/:receiverId", getMessages);
router.post("/send/:receiverId", upload.array("attachments", 5), sendMessage);
router.patch("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/reactions", reactToMessage);

export default router;
