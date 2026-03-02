/**
 * @file Módulo de Logging.
 * @description Configura un sistema de logging centralizado para la aplicación.
 * Permite registrar mensajes en la consola y en un archivo, con diferentes niveles de severidad.
 */

const fs = require("fs")
const path = require("path")
const config = require("../config/config")

class Logger {
  /**
   * @private
   * @description Niveles de log y su orden de severidad.
   */
  #logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  }

  /**
   * @private
   * @description El nivel de log actual permitido, configurado desde `config.LOGGING.level`.
   * Los mensajes con un nivel inferior a este no serán registrados.
   */
  #currentLevel = this.#logLevels[config.LOGGING.level] || this.#logLevels.info

  /**
   * @private
   * @description La ruta completa al archivo de log, configurado desde `config.LOGGING.file`.
   */
  #logFile = config.LOGGING.file

  /**
   * @constructor
   * @description Inicializa el logger. Crea el directorio de logs si no existe.
   */
  constructor() {
    const logDir = path.dirname(this.#logFile)
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true })
        console.log(`[Logger] Log directory created: ${logDir}`)
      } catch (err) {
        console.error(`[Logger] Failed to create log directory ${logDir}:`, err)
      }
    }
  }

  /**
   * Registra un mensaje de log con un nivel de severidad específico.
   * El mensaje se envía a la consola y, en producción, también a un archivo.
   *
   * @param {string} level - El nivel de severidad del log ("error", "warn", "info", "debug").
   * @param {string} message - El mensaje a registrar.
   * @param {object} [meta={}] - Un objeto opcional con metadatos adicionales para el log.
   */
  log(level, message, meta = {}) {
    if (this.#logLevels[level] > this.#currentLevel) {
      return // No registrar si el nivel es inferior al configurado
    }

    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    }

    // Log a consola
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`

    switch (level) {
      case "error":
        console.error(consoleMessage, meta)
        break
      case "warn":
        console.warn(consoleMessage, meta)
        break
      case "info":
        console.info(consoleMessage, meta)
        break
      case "debug":
        console.debug(consoleMessage, meta)
        break
      default:
        console.log(consoleMessage, meta)
    }

    // Log a archivo (solo en producción o si se especifica)
    if (config.NODE_ENV === "production" || process.env.ENABLE_FILE_LOGGING === "true") {
      // Permite habilitar en dev si es necesario
      try {
        fs.appendFileSync(this.#logFile, JSON.stringify(logEntry) + "\n")
      } catch (error) {
        console.error(`[Logger] Error writing to log file ${this.#logFile}:`, error)
      }
    }
  }

  /**
   * Registra un mensaje de error.
   * @param {string} message - El mensaje de error.
   * @param {object} [meta] - Metadatos adicionales.
   */
  error(message, meta) {
    this.log("error", message, meta)
  }

  /**
   * Registra un mensaje de advertencia.
   * @param {string} message - El mensaje de advertencia.
   * @param {object} [meta] - Metadatos adicionales.
   */
  warn(message, meta) {
    this.log("warn", message, meta)
  }

  /**
   * Registra un mensaje informativo.
   * @param {string} message - El mensaje informativo.
   * @param {object} [meta] - Metadatos adicionales.
   */
  info(message, meta) {
    this.log("info", message, meta)
  }

  /**
   * Registra un mensaje de depuración.
   * @param {string} message - El mensaje de depuración.
   * @param {object} [meta] - Metadatos adicionales.
   */
  debug(message, meta) {
    this.log("debug", message, meta)
  }
}

module.exports = new Logger()
