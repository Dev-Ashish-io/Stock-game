import { db } from "../config/db.js";
import { teamModel } from "./teamModel.js";
import { stockModel } from "./stockModel.js";
import { transactionModel } from "./transactionModel.js";
import { teamStocksModel } from "./teamStocksModel.js";

const initializeDB = async () => {
  try {
    console.log("📊 Initializing Database...");
    await db.none(teamModel);
    await db.none(stockModel);
    await db.none(transactionModel);
    await db.none(teamStocksModel);
    console.log("✅ Database Initialized Successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    process.exit(1);
  }
};

export default initializeDB;
