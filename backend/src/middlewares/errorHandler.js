import logger from "../config/logger.js";

/**
 * ✅ Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // ✅ Enhanced Logging for Debugging
    logger.error(`🔥 Error: ${message}`, {
        statusCode,
        method: req.method,
        route: req.originalUrl,
        stack: process.env.NODE_ENV === "development" ? err.stack : "🔒 Hidden in Production",
    });

    // ✅ Structured Error Response
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }), // Show stack only in development
    });
};

// ✅ Ensure `next` is used properly to avoid ESLint warnings
// Even if `next` isn't explicitly used, keep it to ensure Express middleware chain integrity
export default (err, req, res, next) => errorHandler(err, req, res, next);
