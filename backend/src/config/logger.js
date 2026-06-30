import winston from "winston";
import dotenv from "dotenv";

dotenv.config();

// ✅ Custom Log Format
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

// ✅ Define the Logger with Enhancements
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info", // ✅ Dynamic Log Level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // ✅ Capture stack traces
    winston.format.json(), // ✅ Store logs in JSON format for easy parsing
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // ✅ Colorize logs for easy debugging
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }), // ✅ Logs errors separately
    new winston.transports.File({ filename: "logs/combined.log" }) // ✅ All logs go here
  ],
});

// ✅ Handle Uncaught Errors Gracefully
process.on("uncaughtException", (err) => {
  logger.error(`🔥 Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.warn(`⚠️ Unhandled Rejection: ${reason}`);
});

// ✅ Remove Console Logging in Production
if (process.env.NODE_ENV === "production") {
  logger.remove(new winston.transports.Console());
}

// ✅ Export Logger as Default
export default logger;
