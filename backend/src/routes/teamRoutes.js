import express from "express";
import {
  getTeams,
  getTeamById,
  addTeam,
  updateTeam,
  deleteTeam,
  disqualifyTeam,
  allowTeam,
  modifyFunds,
  assignStockToTeam,
} from "../controllers/teamController.js";
import  logger  from "../config/logger.js"; // ✅ Import logger

const router = express.Router();

logger.info("🚀 Team Routes Loaded!");

// ✅ Get all active teams (excludes disqualified teams)
router.get("/", getTeams);

// ✅ Get a specific team by ID
router.get("/:id", getTeamById);

// ✅ Add a new team
router.post("/", addTeam); // Ensure this exists

// ✅ Update team details
router.put("/:id", updateTeam);

// ✅ Delete a team by ID
router.delete("/:id", deleteTeam);

// ✅ Disqualify a team
router.put("/:id/disqualify", disqualifyTeam);

// ✅ Reinstate (allow) a disqualified team
router.put("/:id/allow", allowTeam);

// ✅ Assign Stock to a Team (Admin Only) - Requires Admin Authentication
router.post("/:teamId/assignStock", assignStockToTeam);

router.post("/:id/modifyFunds", modifyFunds);

export default router;
