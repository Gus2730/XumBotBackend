const chatService = require("../services/chatService")
const sessionService = require("../services/sessionService")
const logger = require("../utils/logger")

class ChatController {
  async processMessage(req, res, next) {
    try {
      const { message, sessionId } = req.body
      const clientIp = req.ip

      logger.info(`Processing message: "${message}" from session: ${sessionId}`, {
        requestId: req.id,
        sessionId,
        clientIp,
      })

      // Procesar mensaje
      const response = await chatService.processMessage(message, sessionId)

      // Guardar en historial de sesión
      if (sessionId) {
        await sessionService.addToHistory(sessionId, message, response)
      }

      logger.info(`Response generated with confidence: ${response.confidence}`, {
        requestId: req.id,
        sessionId,
        confidence: response.confidence,
        understood: response.understood,
      })

      res.json({
        success: true,
        data: response,
      })
    } catch (error) {
      next(error)
    }
  }

  async getSessionHistory(req, res, next) {
    try {
      const { sessionId } = req.params
      const { limit = 50, offset = 0 } = req.query

      const history = await sessionService.getHistory(sessionId, {
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      })

      res.json({
        success: true,
        data: history,
      })
    } catch (error) {
      next(error)
    }
  }

  async clearSession(req, res, next) {
    try {
      const { sessionId } = req.params

      await sessionService.clearSession(sessionId)

      res.json({
        success: true,
        message: "Session cleared successfully",
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ChatController()
