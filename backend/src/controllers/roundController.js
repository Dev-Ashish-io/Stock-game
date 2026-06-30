import{ db }from "../config/db.js"; // ✅ Import database connection
import { emitWebSocketEvent } from "../socket.js"; // ✅ WebSocket for real-time updates
import logger from "../config/logger.js"; // ✅ Import logger for better debugging

/**
 * ✅ Get Current Round Status
 */
export const getRoundStatus = async (req, res) => {
    try {
        // ✅ Fetch the most recent round
        const round = await db.oneOrNone("SELECT id, active FROM rounds ORDER BY id DESC LIMIT 1");

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Expires", "0");

        res.status(200).json({
            round: round ? round.id : 0,
            active: round ? round.active : false,
        });
    } catch (error) {
        logger.error("❌ Error fetching round status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

/**
 * ✅ Start a New Round
 */
export const startRound = async (req, res) => {
    try {
        // ✅ End previous round if any
        await db.none("UPDATE rounds SET active = FALSE WHERE active = TRUE");

        // ✅ Create and start a new round
        const newRound = await db.one("INSERT INTO rounds (active) VALUES (TRUE) RETURNING id, active, created_at");

        // ✅ Broadcast round start via WebSocket
        emitWebSocketEvent("roundStarted", { round: newRound.id, active: true });

        logger.info(`🚀 Round ${newRound.id} started at ${newRound.created_at}`);

        res.status(201).json({
            success: true,
            message: `✅ Round ${newRound.id} started successfully!`,
            round: newRound.id,
            active: true,
        });
    } catch (error) {
        logger.error("❌ Error starting round:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};

/**
 * ✅ End the Current Round
 */
export const endRound = async (req, res) => {
    try {
        // ✅ End the active round
        const result = await db.oneOrNone("UPDATE rounds SET active = FALSE WHERE active = TRUE RETURNING id");

        if (!result) {
            return res.status(400).json({ success: false, message: "⚠️ No active round to end." });
        }

        // ✅ Broadcast round end via WebSocket
        emitWebSocketEvent("roundEnded", { round: result.id, active: false });

        logger.info(`⏹ Round ${result.id} ended.`);

        res.status(200).json({
            success: true,
            message: `⏹ Round ${result.id} ended successfully!`,
            round: result.id,
            active: false,
        });
    } catch (error) {
        logger.error("❌ Error ending round:", error);
        res.status(500).json({ success: false, message: "Internal Server Error." });
    }
};
