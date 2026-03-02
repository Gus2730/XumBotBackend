const config = require("../config/config")
const logger = require("../utils/logger")

class SessionService {
  constructor() {
    this.sessions = new Map()

    // Limpiar sesiones expiradas cada 10 minutos
    setInterval(
      () => {
        this.cleanExpiredSessions()
      },
      10 * 60 * 1000,
    )
  }

  async addToHistory(sessionId, userMessage, botResponse) {
    try {
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, {
          id: sessionId,
          history: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        })
      }

      const session = this.sessions.get(sessionId)

      session.history.push({
        timestamp: new Date(),
        userMessage,
        botResponse,
      })

      session.lastActivity = new Date()

      // Limitar historial a últimos 100 mensajes
      if (session.history.length > 100) {
        session.history = session.history.slice(-100)
      }

      logger.debug(`Added to session history: ${sessionId}`)
    } catch (error) {
      logger.error("Error adding to session history:", error)
      throw error
    }
  }

  async getHistory(sessionId, options = {}) {
    try {
      const session = this.sessions.get(sessionId)

      if (!session) {
        return {
          sessionId,
          history: [],
          total: 0,
        }
      }

      const { limit = 50, offset = 0 } = options
      const history = session.history.slice(offset, offset + limit)

      return {
        sessionId,
        history,
        total: session.history.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
      }
    } catch (error) {
      logger.error("Error getting session history:", error)
      throw error
    }
  }

  async clearSession(sessionId) {
    try {
      const deleted = this.sessions.delete(sessionId)

      if (deleted) {
        logger.info(`Session cleared: ${sessionId}`)
      }

      return deleted
    } catch (error) {
      logger.error("Error clearing session:", error)
      throw error
    }
  }

  cleanExpiredSessions() {
    const now = new Date()
    const expiredSessions = []

    for (const [sessionId, session] of this.sessions) {
      const timeSinceLastActivity = now - session.lastActivity

      if (timeSinceLastActivity > config.CHATBOT.sessionTimeout) {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach((sessionId) => {
      this.sessions.delete(sessionId)
      logger.debug(`Expired session removed: ${sessionId}`)
    })

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned ${expiredSessions.length} expired sessions`)
    }
  }

  getSessionStats() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        (session) => new Date() - session.lastActivity < 5 * 60 * 1000, // Activas en últimos 5 minutos
      ).length,
    }
  }
}

module.exports = new SessionService()
