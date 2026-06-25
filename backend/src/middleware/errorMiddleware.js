import { env } from "../config/env.js";

const handleDuplicateKey = (error) => {
  const field = Object.keys(error.keyValue || {})[0] || "field";
  return {
    statusCode: 409,
    message: `${field[0].toUpperCase()}${field.slice(1)} already exists`
  };
};

const handleValidation = (error) => ({
  statusCode: 400,
  message: Object.values(error.errors)
    .map((item) => item.message)
    .join(", ")
});

export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorMiddleware = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Something went wrong";

  if (error.code === 11000) {
    const duplicateError = handleDuplicateKey(error);
    statusCode = duplicateError.statusCode;
    message = duplicateError.message;
  }

  if (error.name === "ValidationError") {
    const validationError = handleValidation(error);
    statusCode = validationError.statusCode;
    message = validationError.message;
  }

  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Please sign in again";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Please sign in again";
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: env.nodeEnv === "production" ? undefined : error.stack
  });
};
