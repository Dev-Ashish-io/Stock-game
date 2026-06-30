import express from "express";
import { 
  buyStock, 
  sellStock, 
  tradeStock, 
  undoLastTransaction, 
  getTransactions,
  getLastTransaction
} from "../controllers/transactionController.js";
import { io } from "../socket.js"; // ✅ Import WebSocket instance

const router = express.Router();

/**
 * ✅ Middleware Placeholder (e.g., Authentication, Validation)
 * - Can be replaced with actual middleware for request validation
 */
const validateTransaction = (req, res, next) => {
  // Example: Ensure required fields exist in the request
  const { teamId, stockId, quantity } = req.body;
  if (!teamId || !stockId || !quantity || isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: "⚠️ Invalid transaction data." });
  }
  next();
};

// ✅ WebSocket Event Helper Function
const emitTransactionUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  } else {
    console.warn(`⚠️ WebSocket not initialized. Skipping event: ${event}`);
  }
};

/**
 * ✅ Get All Transactions
 * - Fetches all transactions in descending order
 */
router.get("/", async (req, res, next) => {
  try {
    await getTransactions(req, res);
  } catch (error) {
    next(error);
  }
});

// ✅ New Route to Get Last Transaction of a Team
router.get("/last/:teamId", getLastTransaction);

/**
 * ✅ Buy Stock
 * - Requires: teamId, stockId, quantity
 * - Emits: "transaction" WebSocket event
 */
router.post("/buy", validateTransaction, async (req, res, next) => {
  try {
    const response = await buyStock(req, res);
    emitTransactionUpdate("transaction", response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * ✅ Sell Stock
 * - Requires: teamId, stockId, quantity
 * - Emits: "transaction" WebSocket event
 */
router.post("/sell", validateTransaction, async (req, res, next) => {
  try {
    const response = await sellStock(req, res);
    emitTransactionUpdate("transaction", response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * ✅ Trade Stock (Between Teams)
 * - Requires: sellerId, buyerId, stockId, quantity, price
 * - Emits: "transaction" WebSocket event
 */
router.post("/trade", validateTransaction, async (req, res, next) => {
  try {
    const response = await tradeStock(req, res);
    emitTransactionUpdate("transaction", response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * ✅ Undo Last Transaction for a Team
 * - Requires: teamId
 * - Emits: "transaction" WebSocket event
 */
router.post("/undo", async (req, res, next) => {
  try {
    const response = await undoLastTransaction(req, res);
    emitTransactionUpdate("transaction", response.data);
  } catch (error) {
    next(error);
  }
});

export default router;
