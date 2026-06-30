import { db } from "../config/db.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";
import logger from "../config/logger.js";
import { io } from "../socket.js"; // ✅ Import WebSocket instance

// ✅ Ensure io is available before emitting events
const emitEvent = (event, data) => {
    if (io) {
      io.emit(event, data);
      logger.info(`📡 WebSocket Event Emitted: ${event}`, data);
    } else {
      logger.warn(`⚠️ WebSocket not initialized. Skipping event: ${event}`);
    }
  };

/**
 * ✅ Get All Teams (Excludes disqualified teams) with Caching
 */
export const getTeams = async (req, res) => {
  try {
    const cacheKey = "teams";
    const cachedTeams = await getCache(cacheKey);

    if (cachedTeams) {
      return res.status(200).json({
        success: true,
        message: "✅ Cached teams retrieved successfully!",
        data: cachedTeams,
      });
    }

    const teams = await db.any("SELECT * FROM teams WHERE disqualified = FALSE ORDER BY id ASC");
    
    // ✅ Store in cache (expires in 60 sec)
    await setCache(cacheKey, teams, 60);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0");


    res.status(200).json({
      success: true,
      message: "✅ Active teams retrieved successfully!",
      data: teams,
    });
  } catch (error) {
    logger.error("❌ Error fetching teams:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Get a Team by ID with Caching
 */
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });

    const cacheKey = `team:${id}`;
    const cachedTeam = await getCache(cacheKey);

    if (cachedTeam) {
      return res.status(200).json({
        success: true,
        message: "✅ Cached team retrieved successfully!",
        data: cachedTeam,
      });
    }

    const team = await db.oneOrNone("SELECT * FROM teams WHERE id = $1", [id]);
    if (!team) return res.status(404).json({ success: false, message: "⚠️ Team not found" });

    await setCache(cacheKey, team, 60); // ✅ Store in cache

    res.status(200).json({
      success: true,
      message: "✅ Team retrieved successfully!",
      data: team,
    });
  } catch (error) {
    logger.error("❌ Error fetching team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Add a New Team
 * - Clears the teams cache after update
 */
export const addTeam = async (req, res) => {
  try {
    const { name, funds } = req.body;

    console.log("🔍 Incoming request to addTeam:", req.body); // ✅ Log request data

    if (!name || typeof name !== "string" || name.trim() === "") {
      console.log("⚠️ Invalid team name:", name);
      return res.status(400).json({ success: false, message: "⚠️ Team name must be a non-empty string." });
    }

    if (funds === undefined || isNaN(funds) || Number(funds) < 0) {
      console.log("⚠️ Invalid team funds:", funds);
      return res.status(400).json({ success: false, message: "⚠️ Funds must be a valid positive number." });
    }

    const newTeam = await db.one(
      "INSERT INTO teams (name, funds, disqualified, created_at) VALUES ($1, $2, FALSE, NOW()) RETURNING *",
      [name.trim(), Number(funds)]
    );

    console.log("✅ Team added successfully:", newTeam); // ✅ Log successful insertion

    await deleteCache("teams"); // ✅ Clear team cache
    io.emit("teamUpdated", newTeam); // ✅ WebSocket update for frontend

    res.status(201).json({
      success: true,
      message: "✅ Team added successfully!",
      data: newTeam,
    });

  } catch (error) {
    console.error("❌ Error adding team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};



/**
 * ✅ Update Team Details
 * - Clears the cache for updated team and team list
 */
export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, funds, disqualified } = req.body;
    if (!id || isNaN(parseInt(id))) return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });

    const updatedTeam = await db.oneOrNone(
      "UPDATE teams SET name = COALESCE($1, name), funds = COALESCE($2, funds), disqualified = COALESCE($3, disqualified) WHERE id = $4 RETURNING *",
      [name ? name.trim() : null, funds, disqualified, id]
    );

    if (!updatedTeam) return res.status(404).json({ success: false, message: "⚠️ Team not found" });

    await deleteCache("teams"); // ✅ Clear team list cache
    await deleteCache(`team:${id}`); // ✅ Clear individual team cache

    res.status(200).json({
      success: true,
      message: "✅ Team updated successfully!",
      data: updatedTeam,
    });
  } catch (error) {
    logger.error("❌ Error updating team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Delete a Team
 * - Clears the cache for deleted team and team list
 */
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });

    const deleted = await db.result("DELETE FROM teams WHERE id = $1", [id]);
    if (deleted.rowCount === 0) return res.status(404).json({ success: false, message: "⚠️ Team not found" });

    await deleteCache("teams"); // ✅ Clear team list cache
    await deleteCache(`team:${id}`); // ✅ Clear individual team cache

    res.status(200).json({ success: true, message: "❌ Team deleted successfully!" });
  } catch (error) {
    logger.error("❌ Error deleting team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Assign Stock to a Team (Admin Only)
 * - Directly updates stock ownership without affecting funds.
 * - Ensures the team and stock exist before updating.
 */
export const assignStockToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { stockId, quantity } = req.body;

    if (!teamId || isNaN(parseInt(teamId)) || !stockId || isNaN(parseInt(stockId)) || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: "⚠️ Invalid input: Team ID, Stock ID, and positive quantity required." });
    }

    // ✅ Check if the team exists
    const teamExists = await db.oneOrNone("SELECT id FROM teams WHERE id = $1", [teamId]);
    if (!teamExists) {
      return res.status(404).json({ success: false, message: "⚠️ Team not found." });
    }

    // ✅ Check if the stock exists
    const stockExists = await db.oneOrNone("SELECT id FROM stocks WHERE id = $1", [stockId]);
    if (!stockExists) {
      return res.status(404).json({ success: false, message: "⚠️ Stock not found." });
    }

    // ✅ Assign stock to the team
    await db.tx(async (t) => {
      await t.none(
        `INSERT INTO team_stocks (team_id, stock_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (team_id, stock_id) DO UPDATE
         SET quantity = team_stocks.quantity + $3`,
        [teamId, stockId, quantity]
      );
    });

    await deleteCache(`team:${teamId}`); // ✅ Clear cache to reflect the update

    res.status(200).json({ success: true, message: `✅ Assigned ${quantity} of stock ID ${stockId} to team ID ${teamId}!` });
  } catch (error) {
    console.error("❌ Error assigning stock:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * ✅ Disqualify a Team
 * - Clears the cache for disqualified team and team list
 */
export const disqualifyTeam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });

    const disqualifiedTeam = await db.oneOrNone("UPDATE teams SET disqualified = TRUE WHERE id = $1 RETURNING *", [id]);
    if (!disqualifiedTeam) return res.status(404).json({ success: false, message: "⚠️ Team not found" });

    await deleteCache("teams");
    await deleteCache(`team:${id}`);

    emitEvent("teamDisqualified", disqualifiedTeam);

    res.status(200).json({
      success: true,
      message: "❌ Team disqualified successfully!",
      data: disqualifiedTeam,
    });
  } catch (error) {
    logger.error("❌ Error disqualifying team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Reinstate a Disqualified Team
 * - Clears the cache for reinstated team and team list
 */
export const allowTeam = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) return res.status(400).json({ success: false, message: "⚠️ Invalid Team ID" });

    const reinstatedTeam = await db.oneOrNone("UPDATE teams SET disqualified = FALSE WHERE id = $1 RETURNING *", [id]);
    if (!reinstatedTeam) return res.status(404).json({ success: false, message: "⚠️ Team not found" });

    await deleteCache("teams");
    await deleteCache(`team:${id}`);

    emitEvent("teamReinstated", reinstatedTeam);

    res.status(200).json({
      success: true,
      message: "✅ Team reinstated successfully!",
      data: reinstatedTeam,
    });
  } catch (error) {
    logger.error("❌ Error reinstating team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Modify Team Funds (Add/Deduct)
 * - Broadcasts live fund updates
 */
export const modifyFunds = async (req, res) => {
    try {
        const { id } = req.params;
        let { amount } = req.body;

        if (!id || isNaN(parseInt(id)) || amount === undefined || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: "⚠️ Invalid input. Provide a valid team ID and amount.",
            });
        }

        amount = parseFloat(amount); // Ensure it's a numeric value

        // ✅ Fetch current team funds
        const team = await db.oneOrNone("SELECT id, name, funds FROM teams WHERE id = $1", [id]);

        if (!team) {
            return res.status(404).json({
                success: false,
                message: "⚠️ Team not found.",
            });
        }

        const newFunds = parseFloat(team.funds) + amount; // Ensure numeric computation

        // ✅ Prevent negative funds (if deduction is too large)
        if (newFunds < 0) {
            return res.status(400).json({
                success: false,
                message: `⚠️ Insufficient funds! Cannot deduct ${Math.abs(amount)} from a balance of ${team.funds}.`,
            });
        }

        // ✅ Update funds safely
        const updatedTeam = await db.one(
            "UPDATE teams SET funds = $1 WHERE id = $2 RETURNING id, name, funds",
            [newFunds, id] // Pass parameters separately to prevent SQL concatenation issues
        );

        // ✅ Clear cache to refresh data
        await deleteCache("teams");
        await deleteCache(`team:${id}`);

        // ✅ Emit WebSocket Event for Fund Update
        emitEvent("fundsUpdated", {
            teamId: updatedTeam.id,
            name: updatedTeam.name,
            funds: updatedTeam.funds,
        });

        res.status(200).json({
            success: true,
            message: `💰 Team funds ${amount >= 0 ? "increased" : "decreased"} successfully!`,
            data: updatedTeam,
        });
    } catch (error) {
        console.error("❌ Error modifying funds:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error.",
        });
    }
};


  