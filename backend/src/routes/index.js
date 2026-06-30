import express from "express";
import teamRoutes from "./teamRoutes.js";
import stockRoutes from "./stockRoutes.js";
import transactionRoutes from "./transactionRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = express.Router();

// ✅ Root Route (Health Check)
router.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "✅ API is working!" });
});

// ✅ Modular Route Imports
router.use("/teams", teamRoutes);
router.use("/stocks", stockRoutes);
router.use("/transactions", transactionRoutes);
router.use("/admin", adminRoutes);

export default router;
