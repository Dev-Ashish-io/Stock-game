import dotenv from "dotenv";
import http from "http";
import net from "net"; // ✅ Import net to check port availability
import app from "./src/server.js";
import { redisClient } from "./src/config/redis.js";
import { connectDB } from "./src/config/db.js";
import { socketSetup } from "./src/socket.js";

dotenv.config();

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const MAX_PORT_TRIES = 5; // ✅ Prevent infinite loops by limiting retries

/**
 * ✅ Function to check if a port is available
 */
const checkPortAvailability = async (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(false); // ❌ Port is in use
        } else {
          resolve(true); // ✅ Some other error, but port is likely usable
        }
      })
      .once("listening", () => {
        tester.close(() => resolve(true)); // ✅ Port is free
      })
      .listen(port);
  });
};

/**
 * ✅ Graceful Shutdown Handling
 */
const shutdown = async () => {
  console.warn("🛑 Shutting down gracefully...");

  try {
    if (redisClient.isOpen) {
      await redisClient.quit(); // ✅ Close Redis connection only if open
      console.info("✅ Redis disconnected.");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error during shutdown:", err);
    process.exit(1);
  }
};

/**
 * ✅ Handle Unexpected Errors
 */
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err);
  shutdown();
});

process.on("unhandledRejection", (err) => {
  console.error("🚨 Unhandled Rejection:", err);
  shutdown();
});

/**
 * ✅ Start Server with Port Check
 */
const startServer = async (port, tries = 0) => {
  if (tries >= MAX_PORT_TRIES) {
    console.error("❌ Max port retries reached. Could not start server.");
    process.exit(1);
  }

  const isAvailable = await checkPortAvailability(port);
  if (!isAvailable) {
    console.warn(`❌ Port ${port} is already in use. Trying port ${port + 1}...`);
    return startServer(port + 1, tries + 1); // ✅ Try next port
  }

  // ✅ Create HTTP Server for WebSockets
  const server = http.createServer(app);
  socketSetup(server);

  server.listen(port, () => {
    console.info(`🚀 Server running on port ${port}`);
  });

  // ✅ Graceful Shutdown Listeners
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// ✅ Connect Database and Start Server
(async () => {
  try {
    await connectDB();
    await startServer(DEFAULT_PORT);
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
})();
