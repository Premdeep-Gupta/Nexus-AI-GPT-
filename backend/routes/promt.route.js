import express from "express";
import multer from "multer";
import { sendPromt, shareChat, getSharedChat, runPythonCode } from "../controller/promt.controller.js";
import {
  saveSession,
  getSessions,
  getSession,
  deleteSession,
} from "../controller/chatSession.controller.js";
import userMiddleware from "../middleware/promt.middlware.js";

const router = express.Router();

// Multer: store file in memory as buffer (for base64 conversion)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "text/csv",
      "application/json",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ];
    if (
      file.mimetype.startsWith("image/") ||
      allowedMimes.includes(file.mimetype) ||
      file.originalname.endsWith(".csv") ||
      file.originalname.endsWith(".xlsx") ||
      file.originalname.endsWith(".xls") ||
      file.originalname.endsWith(".json")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images, PDFs, CSVs, Excel, and JSON files are allowed"), false);
    }
  },
});

// Prompt routes
router.post("/promt", userMiddleware, upload.single("image"), sendPromt);
router.post("/share", userMiddleware, shareChat);
router.get("/share/:shareId", getSharedChat);
router.post("/run-python", userMiddleware, runPythonCode);

// Chat session routes
router.post("/sessions/save", userMiddleware, saveSession);
router.get("/sessions", userMiddleware, getSessions);
router.get("/sessions/:sessionId", userMiddleware, getSession);
router.delete("/sessions/:sessionId", userMiddleware, deleteSession);

export default router;