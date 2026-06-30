import { createClient } from "redis";
import dotenv from "dotenv";
import logger from "./logger.js"; // ✅ Import logger

dotenv.config();

// ✅ Initialize Redis Client with Enhanced Config
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        reconnectStrategy: (retries) => {
            logger.warn(`⚠️ Redis reconnect attempt #${retries}`);
            return Math.min(retries * 200, 5000); // ✅ Exponential backoff (up to 5 sec)
        }
    }
});

// ✅ Prevent Event Emitter Memory Leak Warning
redisClient.setMaxListeners(20); // ✅ Adjust as needed

// ✅ Redis Event Listeners for Monitoring
redisClient.on("connect", () => logger.info("✅ Redis (Memurai) Connected!"));
redisClient.on("ready", () => logger.info("⚡ Redis Ready for Operations"));
redisClient.on("error", (err) => logger.error("❌ Redis Error:", err.message));
redisClient.on("reconnecting", () => logger.warn("🔄 Redis Attempting to Reconnect..."));
redisClient.on("end", () => logger.warn("⚠️ Redis Connection Closed"));

// ✅ Graceful Shutdown Handling (Prevent Closing an Already Closed Client)
const shutdownRedis = async () => {
    if (!redisClient || !redisClient.isOpen) {
        logger.warn("⚠️ Redis Client Already Closed. Skipping shutdown.");
        return;
    }
    try {
        logger.warn("🔌 Closing Redis Connection...");
        await redisClient.quit();
        logger.info("✅ Redis Connection Closed Safely!");
    } catch (error) {
        logger.error("❌ Error during Redis shutdown:", error.message);
    }
};

// ✅ Ensure Redis Connects Before Export
const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info("🚀 Redis Connected & Ready!");
    } catch (error) {
        logger.error("❌ Redis Connection Failed:", error.message);
        process.exit(1); // ❌ Exit on failure
    }
};

// ✅ Connect Redis (Fixed ESLint "await outside async" error)
(async () => {
    await connectRedis();
})();

// ✅ Handle App Exit & Cleanup Redis Properly (Prevent Multiple Listeners)
["SIGINT", "SIGTERM"].forEach((event) => {
    process.removeAllListeners(event);
    process.on(event, shutdownRedis);
});

// ✅ Utility Functions for Caching

/**
 * ✅ Set Cache with Expiry
 * @param {string} key - Redis key
 * @param {any} value - Value to store
 * @param {number} ttl - Time to live (default: 60 seconds)
 */
const setCache = async (key, value, ttl = 60) => {
    try {
        await redisClient.set(key, JSON.stringify(value), { EX: ttl });
    } catch (error) {
        logger.error(`❌ Error setting cache for ${key}:`, error.message);
    }
};

/**
 * ✅ Get Cached Value
 * @param {string} key - Redis key
 * @returns {Promise<any>} - Parsed JSON value or null if not found
 */
const getCache = async (key) => {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`❌ Error retrieving cache for ${key}:`, error.message);
        return null;
    }
};

/**
 * ✅ Delete Cache Entry
 * @param {string} key - Redis key
 */
const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        logger.error(`❌ Error deleting cache for ${key}:`, error.message);
    }
};

// ✅ Export Redis Client and Cache Functions
export { redisClient, getCache, setCache, deleteCache };
