import { Server } from "socket.io";
import logger from "./config/logger.js"; // ✅ Import logger

let io; // ✅ WebSocket instance (accessible across the app)

/**
 * ✅ Initialize WebSocket Server
 * @param {Object} server - The HTTP server instance
 */
function socketSetup(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // ✅ Allows all origins (Restrict this in production)
      methods: ["GET", "POST"], // ✅ Restrict HTTP methods
    },
    pingTimeout: 10000, // ✅ Disconnect if no response within 10s
    pingInterval: 5000, // ✅ Check connection every 5s
  });

  /**
   * ✅ General WebSocket Connection Handling
   * - Handles stock updates, fund updates, transactions, and team status changes
   */
  io.on("connection", (socket) => {
    logger.info(`📡 New WebSocket Connection: ${socket.id}`);

    // ✅ Listen for Stock Price Updates
    socket.on("updateStockPrice", (data) => {
      io.emit("stockPriceUpdated", data);
      logger.info(`📈 Stock Price Updated: ${JSON.stringify(data)}`);
    });

    // ✅ Listen for Team Fund Updates
    socket.on("updateFunds", (data) => {
      io.emit("fundsUpdated", data);
      logger.info(`💰 Funds Updated: ${JSON.stringify(data)}`);
    });

    // ✅ Listen for New Transactions (Buy/Sell/Trade)
    socket.on("newTransaction", (data) => {
      io.emit("transactionUpdated", data);
      logger.info(`🔄 Transaction Update: ${JSON.stringify(data)}`);
    });

    // ✅ Listen for Team Disqualification/Reinstatement
    socket.on("teamStatusUpdate", (data) => {
      io.emit("teamStatusChanged", data);
      logger.info(`🚨 Team Status Updated: ${JSON.stringify(data)}`);
    });

    // ✅ Handle Disconnection
    socket.on("disconnect", (reason) => {
      logger.warn(`❌ WebSocket Disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/**
 * ✅ Helper Function to Emit WebSocket Events from Controllers
 * - Allows real-time updates to stock prices, team funds, and transactions
 * - Can be used anywhere in backend controllers to trigger UI updates
 * 
 * @param {string} event - WebSocket event name
 * @param {Object} data - Event payload
 */
export const emitWebSocketEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
    logger.info(`📢 WebSocket Event Sent: ${event} - ${JSON.stringify(data)}`);
  } else {
    logger.warn(`⚠️ WebSocket not initialized. Skipping event: ${event}`);
  }
};

export { socketSetup, io };
