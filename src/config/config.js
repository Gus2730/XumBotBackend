const path = require("path")

const config = {
  // Configuración del servidor
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Configuración de CORS
  CORS: {
    origin: process.env.FRONTEND_URL || "http://localhost:4200",
    credentials: true,
  },

  // Configuración de Rate Limiting
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.RATE_LIMIT_MAX || 100, // máximo requests por ventana
    message: {
      error: "Too many requests from this IP, please try again later.",
    },
  },

  // Configuración de la base de datos
  DATABASE: {
    path: path.join(__dirname, "../../data/knowledge-base.json"),
    backupPath: path.join(__dirname, "../../data/backups"),
  },

  // Configuración del chatbot
  CHATBOT: {
    confidenceThreshold: 0.6,
    maxMessageLength: 1000,
    sessionTimeout: 30 * 60 * 1000, // 30 minutos
  },

  // Configuración de logging
  LOGGING: {
    level: process.env.LOG_LEVEL || "info",
    file: path.join(__dirname, "../../logs/app.log"),
  },
}

module.exports = config
