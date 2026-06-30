import redisClient from "../config/redis.js";
import { db } from "../config/db.js";

/**
 * ✅ Check if a Stock Exists by ID (Uses Cache)
 * @param {number} stockId - The stock ID
 * @returns {Promise<boolean>} - True if stock exists, else false
 */
export const stockExists = async (stockId) => {
  try {
    const cacheKey = `stock:exists:${stockId}`;

    // 1️⃣ Check Redis Cache First
    const cachedStock = await redisClient.get(cacheKey);
    if (cachedStock) return JSON.parse(cachedStock);

    // 2️⃣ Fetch from Database if Not Cached
    const stock = await db.oneOrNone("SELECT id FROM stocks WHERE id = $1", [stockId]);

    if (stock) {
      // 3️⃣ Store in Cache for Faster Future Access (Expires in 10 mins)
      await redisClient.set(cacheKey, JSON.stringify(true), { EX: 600 });
      return true;
    }

    return false;
  } catch (error) {
    console.error("❌ Error checking stock existence:", error);
    return false;
  }
};

/**
 * ✅ Get Latest Stock Price (Uses Redis Cache)
 * @param {number} stockId - The stock ID
 * @returns {Promise<number|null>} - Stock price or null if not found
 */
export const getStockPrice = async (stockId) => {
  try {
    const cacheKey = `stock:price:${stockId}`;

    // 1️⃣ Check Redis Cache First
    const cachedPrice = await redisClient.get(cacheKey);
    if (cachedPrice) return parseFloat(cachedPrice);

    // 2️⃣ Fetch from Database if Not Cached
    const stock = await db.oneOrNone("SELECT price FROM stocks WHERE id = $1", [stockId]);

    if (stock) {
      // 3️⃣ Store in Cache (Expires in 60 seconds)
      await redisClient.set(cacheKey, stock.price, { EX: 60 });
      return stock.price;
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching stock price:", error);
    throw new Error("Failed to fetch stock price");
  }
};

/**
 * ✅ Update Stock Price (Updates Cache Too)
 * @param {number} stockId - The stock ID
 * @param {number} newPrice - The new price of the stock
 * @returns {Promise<void>}
 */
export const updateStockPrice = async (stockId, newPrice) => {
  try {
    await db.none("UPDATE stocks SET price = $1 WHERE id = $2", [newPrice, stockId]);

    // 1️⃣ Update Redis Cache (Instant Update)
    const cacheKey = `stock:price:${stockId}`;
    await redisClient.set(cacheKey, newPrice, { EX: 60 });

    return;
  } catch (error) {
    console.error("❌ Error updating stock price:", error);
    throw new Error("Failed to update stock price");
  }
};
