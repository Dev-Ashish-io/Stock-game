import  logger  from "../config/logger.js"; // ✅ Use centralized logger

/**
 * ✅ Request Validator Middleware
 * Ensures that all required fields exist before passing to controllers.
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            if (!schema) {
                logger.warn("⚠️ No validation schema provided. Skipping validation...");
                return next(); // ✅ If no schema is passed, proceed without validation
            }

            await schema.validateAsync(req.body, { abortEarly: false });
            logger.info("✅ Validation Passed");
            next(); // ✅ Pass to the next middleware/controller
        } catch (error) {
            const validationErrors = error.details?.map((err) => err.message) || ["Invalid data"];

            logger.error("❌ Validation Failed:", validationErrors);

            return res.status(400).json({
                success: false,
                message: "⚠️ Validation Failed",
                errors: validationErrors, // 🔹 Show detailed validation errors
            });
        }
    };
};

export default validateRequest;
