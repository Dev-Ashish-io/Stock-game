import express from "express";
import {
  addTeam,
  disqualifyTeam,
  modifyFunds,
  updateStockPrice
} from "../controllers/adminController.js";
import validateRequest from "../middlewares/validateRequest.js"; // 🚀 Future validation

const router = express.Router();

// ✅ Add a new team (With validation placeholder)
router.post("/teams", validateRequest, addTeam);

// ✅ Disqualify a team by ID
router.put("/teams/:id/disqualify", disqualifyTeam);

// ✅ Modify team funds by ID (With validation)
router.put("/teams/:id/funds", validateRequest, modifyFunds);

// ✅ Update stock price by ID (With validation)
router.put("/stocks/:id/price", validateRequest, updateStockPrice);

export default router;
