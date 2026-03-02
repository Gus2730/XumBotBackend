const express = require("express")
const config = require("./src/config/config")
const { setupMiddleware } = require("./src/middleware")
const routes = require("./src/routes")
const { errorHandler } = require("./src/middleware/errorHandler")
const logger = require("./src/utils/logger")
const databaseService = require("./src/services/databaseService")

const app = express()

// Iniciar servidor
async function startServer() {
  try {
    // Configurar middleware
    setupMiddleware(app)

    // Configurar rutas
    app.use("/api", routes)

    // Middleware de manejo de errores (debe ir al final)
    app.use(errorHandler)

    // Inicializar base de datos
    await databaseService.initializeDatabase()

    // Iniciar servidor
    app.listen(config.PORT, () => {
      logger.info(`🚀 Chatbot API running on port ${config.PORT}`)
      logger.info(`📚 Knowledge base initialized`)
      logger.info(`🔒 Security middleware enabled`)
      logger.info(`🌍 Environment: ${config.NODE_ENV}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error)
  process.exit(1)
})

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})

startServer()
