import express from "express";
import { getRoundStatus, startRound, endRound } from "../controllers/roundController.js"; // ✅ Import controller functions

const router = express.Router();

// ✅ GET Current Round Status
router.get("/status", getRoundStatus);

// ✅ POST Start a New Round
router.post("/start", startRound);

// ✅ POST End the Current Round
router.post("/end", endRound);

export default router;
