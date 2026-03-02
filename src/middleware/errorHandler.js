const logger = require("../utils/logger")

class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

function errorHandler(err, req, res, next) {
  let error = { ...err }
  error.message = err.message

  // Log error
  logger.error(`Error ${err.statusCode || 500}: ${err.message}`, {
    requestId: req.id,
    path: req.path,
    method: req.method,
    stack: err.stack,
  })

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found"
    error = new AppError(message, 404)
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered"
    error = new AppError(message, 400)
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ")
    error = new AppError(message, 400)
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    requestId: req.id,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = { AppError, errorHandler }
