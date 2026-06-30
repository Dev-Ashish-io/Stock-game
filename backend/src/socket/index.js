import { Server } from "socket.io";
import { db } from "../config/db.js";

const socketSetup = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("🔗 New WebSocket Connection:", socket.id);

    // ✅ Emit Initial Data
    const sendStockUpdates = async () => {
      const stocks = await db.any("SELECT * FROM stocks");
      io.emit("stocks:update", stocks);
    };

    sendStockUpdates();

    // ✅ Listen for Stock Updates
    socket.on("stock:update", async (data) => {
      await db.none("UPDATE stocks SET price = $1 WHERE id = $2", [data.price, data.id]);
      sendStockUpdates();
    });

    socket.on("disconnect", () => {
      console.log("❌ WebSocket Disconnected:", socket.id);
    });
  });
};

export default socketSetup;
