import { io } from "socket.io-client";

// ✅ WebSocket Server URL (Ensure it matches your backend)
const SOCKET_URL = "http://localhost:5001"; // Change for production

let socketInstance = null;

/**
 * ✅ Get or create a single WebSocket connection (Singleton Pattern)
 */
export const getSocket = () => {
  if (!socketInstance) {
    console.log("🛠 Initializing WebSocket...");

    socketInstance = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 15, // More attempts for stability in an event
      reconnectionDelay: 2000, // 2s delay before each retry
      timeout: 10000, // 10s timeout for connections
    });

    // ✅ Handle WebSocket Connection Events
    socketInstance.on("connect", () => console.log(`✅ WebSocket connected: ${socketInstance.id}`));
    socketInstance.on("disconnect", () => {
      console.warn("⚠️ WebSocket disconnected. Retrying...");
      setTimeout(() => socketInstance.connect(), 5000);
  });
    socketInstance.on("connect_error", (err) => console.error("❌ WebSocket connection error:", err.message));
    socketInstance.on("reconnect_attempt", (attempt) => console.log(`🔄 Reconnect Attempt #${attempt}`));
    socketInstance.on("reconnect_failed", () => console.error("❌ WebSocket Reconnection Failed."));
  }
  return socketInstance;
};

/**
 * ✅ Subscribe to real-time stock price updates
 */
export const subscribeToStockUpdates = (callback) => {
  const socket = getSocket();
  socket.off("stockUpdated"); // 🔥 Ensure only one listener exists
  socket.on("stockUpdated", (data) => {
    console.log("📡 Stock Updated Event Received:", data);
    callback(data);
  });
};

/**
 * ✅ Subscribe to WebSocket events (Ensures no duplicate listeners)
 */
export const subscribeToEvent = (eventName, callback) => {
  const socket = getSocket();
  socket.off(eventName); // Prevent duplicate listeners
  socket.on(eventName, callback);
};

/**
 * ✅ Unsubscribe from a WebSocket event
 */
export const unsubscribeFromEvent = (eventName) => {
  const socket = getSocket();
  socket.off(eventName);
};

/** ✅ Unsubscribe from All Events */
export const unsubscribeFromAllEvents = () => {
  const socket = getSocket();
  ["update", "stockUpdated", "fundsUpdated", "transactionUpdated"].forEach((event) => socket.off(event));
};

/** ✅ Close WebSocket Connection */
export const closeSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    console.log("❌ WebSocket Disconnected!");
  }
};



/**
 * ✅ Subscribe to real-time team funds updates
 */
export const subscribeToFundsUpdates = (callback) => subscribeToEvent("fundsUpdated", callback);

/**
 * ✅ Subscribe to real-time transaction updates
 */
export const subscribeToTransactionUpdates = (callback) => subscribeToEvent("transactionUpdated", callback);

/**
 * ✅ Subscribe to general updates
 */
export const subscribeToUpdates = (callback) => subscribeToEvent("update", callback);

// ✅ Expose `getSocket` globally for debugging (optional)
window.getSocket = getSocket;

export default getSocket;
