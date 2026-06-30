import { db } from "../config/db.js";
import logger from "../config/logger.js";
import { getCache, setCache, deleteCache } from "../config/redis.js";
import { io } from "../socket.js"; // ✅ Import WebSocket instance

// ✅ Ensure io is available before emitting events
const emitEvent = (event, data) => {
    if (io) {
      io.emit(event, data);
    } else {
      logger.warn(`⚠️ WebSocket not initialized. Skipping event: ${event}`);
    }
  };
  

/**
 * ✅ Get All Stocks with Caching & Correct Response Format
 */
export const getStocks = async (req, res) => {
  try {
    const cacheKey = "stocks";
    const cachedStocks = await getCache(cacheKey);

    if (cachedStocks) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Expires", "0"); // Prevents caching
      return res.status(200).json({
        success: true,
        message: "📈 Cached stocks retrieved successfully!",
        data: cachedStocks.map((stock) => ({
          ...stock,
          price: Number(stock.price) || 0, // ✅ Ensure price is a number
        })),
      });
    }

    const stocks = await db.any("SELECT * FROM stocks ORDER BY name ASC");

    // ✅ Convert price to number before storing in cache
    const formattedStocks = stocks.map((stock) => ({
      ...stock,
      price: Number(stock.price) || 0, // ✅ Ensure price is a number
    }));

    await setCache(cacheKey, formattedStocks, 60);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0"); // Prevents caching

    res.status(200).json({
      success: true,
      message: "📈 Stocks retrieved successfully!",
      data: formattedStocks,
    });
  } catch (error) {
    console.error("❌ Error fetching stocks:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

/**
 * ✅ Get a Stock by ID with Caching
 */
export const getStockById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: "⚠️ Invalid Stock ID" });
    }

    const cacheKey = `stock:${id}`;
    const cachedStock = await getCache(cacheKey);

    if (cachedStock) {
      return res.status(200).json({
        success: true,
        message: "📊 Cached stock retrieved successfully!",
        data: cachedStock,
      });
    }

    const stock = await db.oneOrNone("SELECT * FROM stocks WHERE id = $1", [id]);

    if (!stock) {
      return res.status(404).json({ success: false, message: "⚠️ Stock not found" });
    }

    await setCache(cacheKey, stock, 60); // ✅ Store in cache


    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Expires", "0");

    res.status(200).json({
      success: true,
      message: "📊 Stock retrieved successfully!",
      data: stock,
    });
  } catch (error) {
    logger.error("❌ Error fetching stock:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * ✅ Add a New Stock
 * - Clears the stocks cache after update
 * - Broadcasts update via WebSocket
 */
export const addStock = async (req, res) => {
  try {
    const { name, price } = req.body;

    console.log("🔍 Incoming request to addStock:", req.body); // ✅ Log the request data

    if (!name || !price || isNaN(price)) {
      console.log("⚠️ Invalid stock data:", { name, price }); // ✅ Log invalid data
      return res.status(400).json({ success: false, message: "⚠️ Invalid stock data." });
    }

    const newStock = await db.one(
      "INSERT INTO stocks (name, price, created_at) VALUES ($1, $2, NOW()) RETURNING *",
      [name, price]
    );

    console.log("✅ Stock added successfully:", newStock); // ✅ Log successful insertion

    await deleteCache("stocks"); // ✅ Clear stock cache to reflect new data
    io.emit("stockUpdated", newStock); // ✅ WebSocket update for frontend

    res.status(201).json({
      success: true,
      message: "✅ Stock added successfully!",
      data: newStock,
    });

  } catch (error) {
    console.error("❌ Error adding stock:", error); // ✅ Log database errors
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};




/**
 * ✅ Update Stock Price
 * - Clears the cache for updated stock and stock list
 * - Broadcasts price update via WebSocket
 */
export const updateStockPrice = async (req, res) => {
  try {
      const { stockId } = req.params;
      const { newPrice } = req.body;

      // ✅ Update stock price in database
      const updatedStock = await db.one(
          "UPDATE stocks SET price = $1 WHERE id = $2 RETURNING *",
          [newPrice, stockId]
      );

      // ✅ Emit WebSocket event for real-time updates
      emitWebSocketEvent("stockPriceUpdated", {
          stockId: updatedStock.id,
          price: updatedStock.price,
      });

      res.status(200).json({
          success: true,
          message: "✅ Stock price updated successfully!",
          data: updatedStock,
      });
  } catch (error) {
      console.error("❌ Error updating stock price:", error);
      res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};


/**
 * ✅ Remove a Stock
 * - Clears the cache for deleted stock and stock list
 * - Broadcasts stock removal via WebSocket
 */
export const removeStock = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, message: "⚠️ Invalid Stock ID" });
    }

    const deleted = await db.result("DELETE FROM stocks WHERE id = $1 RETURNING *", [id]);

    if (deleted.rowCount === 0) {
      return res.status(404).json({ success: false, message: "⚠️ Stock not found" });
    }

    await deleteCache("stocks"); // ✅ Clear stock list cache
    await deleteCache(`stock:${id}`); // ✅ Clear individual stock cache

     // ✅ Broadcast stock removal via WebSocket
     emitEvent("stockRemoved", { id });

    res.status(200).json({
      success: true,
      message: "❌ Stock removed successfully!",
    });
  } catch (error) {
    logger.error("❌ Error removing stock:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
