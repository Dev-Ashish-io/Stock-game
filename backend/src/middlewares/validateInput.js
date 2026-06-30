import { body, validationResult } from "express-validator";

export const validateStock = [
  body("name").isString().notEmpty().withMessage("Stock name is required"),
  body("price").isFloat({ min: 0 }).withMessage("Stock price must be a positive number"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  },
];
