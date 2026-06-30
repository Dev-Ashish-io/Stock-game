import { db } from "../config/db.js";
import logger from "../config/logger.js"; // ✅ Import logger

/**
 * ✅ Add a New Team
 */
export const addTeam = async (req, res) => {
  try {
      const { name, initialFunds } = req.body;

      const newTeam = await db.one(
          "INSERT INTO teams (name, funds) VALUES ($1, $2) RETURNING *",
          [name, initialFunds]
      );

      // ✅ Emit WebSocket event to update frontend
      emitWebSocketEvent("teamUpdated", newTeam);

      res.status(201).json({ success: true, data: newTeam });
  } catch (error) {
      res.status(500).json({ success: false, message: "Error adding team." });
  }
};


/**
 * ✅ Disqualify a Team
 */
export const disqualifyTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const disqualified = await db.oneOrNone(
      "UPDATE teams SET disqualified = TRUE WHERE id = $1 RETURNING *",
      [id]
    );

    if (!disqualified) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.status(200).json({
      success: true,
      data: disqualified,
      message: "❌ Team disqualified!",
    });
  } catch (error) {
    logger.error("❌ Error disqualifying team:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * ✅ Reinstate a Disqualified Team
 */
export const reinstateTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const reinstated = await db.oneOrNone(
      "UPDATE teams SET disqualified = FALSE WHERE id = $1 RETURNING *",
      [id]
    );

    if (!reinstated) {
      return res.status(404).json({
        success: false,
        message: "Team not found or already active",
      });
    }

    res.status(200).json({
      success: true,
      data: reinstated,
      message: "✅ Team reinstated successfully!",
    });
  } catch (error) {
    logger.error("❌ Error reinstating team:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * ✅ Modify Team Funds (Add/Deduct)
 */
export const modifyFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const updatedTeam = await db.oneOrNone(
      "UPDATE teams SET funds = funds + $1 WHERE id = $2 RETURNING *",
      [parseFloat(amount), id]
    );

    if (!updatedTeam) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedTeam,
      message: `💰 Team funds ${amount > 0 ? "increased" : "decreased"} successfully!`,
    });
  } catch (error) {
    logger.error("❌ Error modifying funds:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * ✅ Update Stock Price
 */
export const updateStockPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    if (price === undefined || isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid stock price is required",
      });
    }

    const updatedStock = await db.oneOrNone(
      "UPDATE stocks SET price = $1 WHERE id = $2 RETURNING *",
      [parseFloat(price), id]
    );

    if (!updatedStock) {
      return res.status(404).json({
        success: false,
        message: "Stock not found",
      });
    }

    res.status(200).json({
      success: true,
      data: updatedStock,
      message: "📈 Stock price updated successfully!",
    });
  } catch (error) {
    logger.error("❌ Error updating stock price:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
