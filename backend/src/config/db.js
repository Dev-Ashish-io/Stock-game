import pgPromise from "pg-promise";
import dotenv from "dotenv";
import logger from "./logger.js"; // ✅ Import logger

dotenv.config();

const pgp = pgPromise({
  query: (event) => logger.info(`📌 Executing Query: ${event.query}`),
  error: (err) => logger.error("❌ PostgreSQL Error:", err.message), // ✅ Removed unused `e`
});

// ✅ Database Connection Configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 30, // ✅ Max concurrent clients for pooling
  allowExitOnIdle: true, // ✅ Auto cleanup idle connections
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
};

// ✅ Initialize Database Connection
const db = pgp(dbConfig);

// ✅ Function to Test DB Connection
const connectDB = async () => {
  try {
    await db.connect();
    logger.info("✅ PostgreSQL Connected!");
  } catch (error) {
    logger.error("❌ Database Connection Error:", error.message);
    process.exit(1); // ❌ Exit process on failure
  }
};

// ✅ Event Listener for Connection Errors
db.$pool.on("error", (err) => {
  logger.error("❌ Unexpected PostgreSQL Connection Error:", err.message);
});

export { connectDB, db };
