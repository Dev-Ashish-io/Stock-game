import express from "express";
import {
  getStocks,
  getStockById,
  addStock,
  updateStockPrice,
  removeStock,
} from "../controllers/stockController.js";
//import validateRequest from "../middlewares/validateRequest.js"; // ✅ Future validation middleware

const router = express.Router();

// ✅ Get all stocks
router.get("/", getStocks);

// ✅ Get a single stock by ID
router.get("/:id", getStockById);

// ✅ Add a new stock (with basic validation)
router.post("/", addStock);

// ✅ Update stock price (only price should be updated)
router.put("/:id", updateStockPrice);

// ✅ Remove a stock
router.delete("/:id", removeStock);

export default router;
