/**
 * @file Módulo de Utilidades Generales.
 * @description Contiene funciones auxiliares diversas que pueden ser usadas en toda la aplicación.
 */

const crypto = require("crypto")

class Helpers {
  /**
   * Genera un hash MD5 de una cadena de texto.
   * Útil para crear IDs consistentes o para verificaciones de integridad simples.
   *
   * @param {string} text - La cadena de texto de la cual generar el hash.
   * @returns {string} El hash MD5 en formato hexadecimal.
   */
  generateHash(text) {
    if (typeof text !== "string") {
      throw new Error("Input must be a string to generate hash.")
    }
    return crypto.createHash("md5").update(text).digest("hex")
  }

  /**
   * Sanitiza una cadena de texto para remover posibles inyecciones XSS básicas.
   * Remueve etiquetas HTML potencialmente peligrosas y atributos de evento.
   *
   * @param {string} text - La cadena de texto a sanitizar.
   * @returns {string} La cadena de texto sanitizada.
   */
  sanitizeText(text) {
    if (typeof text !== "string") return ""

    return text
      .trim()
      .replace(/[<>]/g, "") // Remover < y >
      .replace(/javascript:/gi, "") // Remover javascript:
      .replace(/on\w+=/gi, "") // Remover event handlers (ej. onclick=)
  }

  /**
   * Valida si una cadena de texto es un formato de email válido.
   *
   * @param {string} email - La cadena de texto a validar como email.
   * @returns {boolean} `true` si es un email válido, `false` en caso contrario.
   */
  isValidEmail(email) {
    if (typeof email !== "string") return false
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Formatea un objeto Date o una cadena de fecha en un formato específico.
   *
   * @param {Date | string} date - La fecha a formatear. Puede ser un objeto Date o una cadena parseable.
   * @param {string} [format="YYYY-MM-DD HH:mm:ss"] - El formato de salida deseado.
   *   Tokens disponibles: YYYY (año), MM (mes), DD (día), HH (horas), mm (minutos), ss (segundos).
   * @returns {string} La fecha formateada.
   */
  formatDate(date, format = "YYYY-MM-DD HH:mm:ss") {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return "Invalid Date" // Retornar un string claro si la fecha es inválida
    }

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    const seconds = String(d.getSeconds()).padStart(2, "0")

    return format
      .replace("YYYY", String(year))
      .replace("MM", month)
      .replace("DD", day)
      .replace("HH", hours)
      .replace("mm", minutes)
      .replace("ss", seconds)
  }

  /**
   * Genera un ID único combinando un timestamp y un string aleatorio.
   *
   * @param {string} [prefix=""] - Un prefijo opcional para el ID.
   * @returns {string} El ID único generado.
   */
  generateId(prefix = "") {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 5)
    return `${prefix}${timestamp}${random}`
  }

  /**
   * Crea una promesa que se resuelve después de un número de milisegundos especificado.
   * Útil para pausas asíncronas.
   *
   * @param {number} ms - El número de milisegundos a esperar.
   * @returns {Promise<void>} Una promesa que se resuelve después del tiempo especificado.
   */
  sleep(ms) {
    if (typeof ms !== "number" || ms < 0) {
      throw new Error("Delay time must be a non-negative number.")
    }
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Capitaliza la primera letra de una cadena de texto y convierte el resto a minúsculas.
   *
   * @param {string} text - La cadena de texto a capitalizar.
   * @returns {string} La cadena de texto con la primera letra capitalizada.
   */
  capitalize(text) {
    if (typeof text !== "string" || text.length === 0) return ""
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }

  /**
   * Trunca una cadena de texto si excede una longitud máxima, añadiendo un sufijo.
   *
   * @param {string} text - La cadena de texto a truncar.
   * @param {number} [maxLength=100] - La longitud máxima deseada para la cadena.
   * @param {string} [suffix="..."] - El sufijo a añadir si la cadena es truncada.
   * @returns {string} La cadena de texto truncada o la original si es más corta.
   */
  truncate(text, maxLength = 100, suffix = "...") {
    if (typeof text !== "string") return ""
    if (text.length <= maxLength) return text
    return text.substr(0, maxLength - suffix.length) + suffix
  }
}

module.exports = new Helpers()
