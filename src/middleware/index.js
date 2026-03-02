const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const config = require("../config/config")
const logger = require("../utils/logger")

function setupMiddleware(app) {
  // Middleware de seguridad
  app.use(helmet())

  // CORS
  app.use(cors(config.CORS))

  // Rate limiting
  const limiter = rateLimit(config.RATE_LIMIT)
  app.use(limiter)

  // Body parser
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf) => {
        try {
          JSON.parse(buf)
        } catch (e) {
          res.status(400).json({ error: "Invalid JSON" })
          return
        }
      },
    }),
  )

  // Logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path} - ${req.ip}`)
    next()
  })

  // Request ID middleware
  app.use((req, res, next) => {
    req.id = require("uuid").v4()
    res.setHeader("X-Request-ID", req.id)
    next()
  })
}

module.exports = { setupMiddleware }
