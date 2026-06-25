import express from "express";
import {
  addMembers,
  createGroup,
  getGroupMessages,
  getGroups,
  removeMember,
  sendGroupMessage,
  updateGroup
} from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/", getGroups);
router.post("/", upload.single("avatar"), createGroup);
router.patch("/:groupId", upload.single("avatar"), updateGroup);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:userId", removeMember);
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", upload.array("attachments", 5), sendGroupMessage);

export default router;
