import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "http"; // ✅ Import HTTP for WebSocket support
import { Server } from "socket.io";
import errorHandler from "./middlewares/errorHandler.js";
import logger from "./config/logger.js";
import teamRoutes from "./routes/teamRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import roundRoutes from "./routes/roundRoutes.js";
import routes from "./routes/index.js";


const app = express();
const server = http.createServer(app); // ✅ Corrected WebSocket Setup

// ✅ Security & Performance Middleware
app.use(
  cors({
    origin: "http://localhost:5177",
    methods: ["GET", "POST", "PUT", "DELETE"], // ✅ Allow DELETE method
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

// ✅ Use Morgan with Winston Logger
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

// ✅ Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all frontend clients to connect
    methods: ["GET", "POST", "PUT", "DELETE"], // ✅ Allow DELETE method
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// ✅ Handle WebSocket Connections
io.on("connection", (socket) => {
  console.log(`✅ New WebSocket connection: ${socket.id}`);

  // ✅ Listen for messages and broadcast to all users
  socket.on("message", (data) => {
    console.log("📩 Message Received:", data);
    io.emit("message", data); // Broadcast update to all connected clients
  });

  // ✅ Listen for transaction updates & broadcast
  socket.on("transactionUpdated", (transactionData) => {
    console.log("🔄 Transaction Updated:", transactionData);
    io.emit("transactionUpdated", transactionData);
  });

  // ✅ Listen for stock price updates & broadcast
  socket.on("stockPriceUpdated", (stockData) => {
    console.log("📈 Stock Price Updated:", stockData);
    io.emit("stockPriceUpdated", stockData);
  });

  // ✅ Handle disconnections
  socket.on("disconnect", (reason) => {
    console.log(`❌ Client Disconnected: ${socket.id} (Reason: ${reason})`);
  });
});

// ✅ Apply Rate Limiting (Prevent API Abuse)
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Max 100 requests per window per IP
  message: "⚠️ Too many requests from this IP, please try again later.",
});
app.use("/api", apiLimiter);

// ✅ API Routes
app.use("/api/teams", teamRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/round", roundRoutes);
app.use("/api", routes);

// ✅ Error Handling Middleware
app.use(errorHandler);

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});

export default app;
