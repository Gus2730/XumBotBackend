const config = require("../config/config")
const { getDatabaseStats } = require("../services/databaseService")

class HealthController {
  async getHealth(req, res) {
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      version: require("../../package.json").version,
    })
  }

  async getDetailedHealth(req, res) {
    try {
      const dbStats = await getDatabaseStats()

      res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        version: require("../../package.json").version,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: dbStats,
        config: {
          port: config.PORT,
          rateLimit: config.RATE_LIMIT.max,
          confidenceThreshold: config.CHATBOT.confidenceThreshold,
        },
      })
    } catch (error) {
      res.status(500).json({
        status: "ERROR",
        message: "Health check failed",
        error: error.message,
      })
    }
  }
}

module.exports = new HealthController()
