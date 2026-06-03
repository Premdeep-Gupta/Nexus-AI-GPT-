import express from "express";
import {
  login,
  logout,
  signup,
  updateProfile,
  getUserSettings,
  addMemory,
  deleteMemory,
  upgradePlan
} from "../controller/user.controller.js";
import userMiddleware from "../middleware/promt.middlware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logout);
router.put("/update-profile", userMiddleware, updateProfile);

// Enterprise settings & memory routes
router.get("/settings", userMiddleware, getUserSettings);
router.post("/memories", userMiddleware, addMemory);
router.delete("/memories/:memoryId", userMiddleware, deleteMemory);
router.post("/upgrade", userMiddleware, upgradePlan);

export default router;
