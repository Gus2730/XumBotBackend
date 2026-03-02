/**
 * @file Servicio principal del Chatbot.
 * @description Maneja el procesamiento de mensajes de usuario, la búsqueda de respuestas
 * en la base de conocimiento y la generación de respuestas del bot.
 */

const { v4: uuidv4 } = require("uuid")
const questionService = require("./questionService")
const nlpService = require("./nlpService")
const sessionService = require("./sessionService") // Importar sessionService
const config = require("../config/config")
const logger = require("../utils/logger")

class ChatService {
  /**
   * Procesa un mensaje de usuario para encontrar la mejor respuesta en la base de conocimiento.
   * Utiliza una combinación de similitud de Levenshtein y coincidencia de palabras clave.
   *
   * @param {string} message - El mensaje enviado por el usuario.
   * @param {string} [sessionId=null] - El ID de la sesión del usuario.
   * @returns {Promise<object>} Un objeto con la respuesta del bot, confianza, estado de comprensión, etc.
   * @throws {Error} Si ocurre un error al procesar el mensaje.
   */
  async processMessage(message, sessionId = null) {
    const startTime = process.hrtime.bigint() // High-resolution time for performance measurement

    try {
      // 1. Normalizar el mensaje del usuario
      const normalizedUserMessage = nlpService.normalizeText(message)
      const userKeywords = nlpService.extractKeywords(normalizedUserMessage)

      // 2. Buscar la mejor coincidencia en la base de conocimiento
      const { bestMatch, matchType } = await this.#findBestMatch(normalizedUserMessage, userKeywords)

      let response

      // 3. Determinar la respuesta del bot
      if (bestMatch && bestMatch.confidence >= config.CHATBOT.confidenceThreshold) {
        response = {
          id: uuidv4(),
          message: bestMatch.response,
          confidence: bestMatch.confidence,
          timestamp: new Date().toISOString(),
          understood: true,
          category: bestMatch.category,
          matchedBy: matchType,
          originalQuestion: bestMatch.question,
        }
      } else {
        response = {
          id: uuidv4(),
          message: this.#getDefaultResponse(),
          confidence: bestMatch ? bestMatch.confidence : 0, // Si hubo un match pero bajo umbral
          timestamp: new Date().toISOString(),
          understood: false,
          suggestions: await this.#getSuggestions(),
          matchedBy: matchType,
        }
      }

      const endTime = process.hrtime.bigint()
      const processingTimeMs = Number(endTime - startTime) / 1_000_000 // Convert nanoseconds to milliseconds

      response.processingTime = Number.parseFloat(processingTimeMs.toFixed(2))

      // 4. Registrar la consulta y respuesta para fines de monitoreo y análisis
      logger.info(`Query processed for session ${sessionId || "N/A"}`, {
        query: message,
        response: response.message,
        confidence: response.confidence,
        understood: response.understood,
        processingTime: response.processingTime,
        matchedBy: response.matchedBy,
      })

      // Opcional: Persistir historial de sesión si es necesario
      // await sessionService.addToHistory(sessionId, message, response);

      return response
    } catch (error) {
      logger.error(`Error processing message: ${error.message}`, {
        originalMessage: message,
        sessionId,
        stack: error.stack,
      })
      throw error // Re-lanzar el error para que sea manejado por el errorHandler
    }
  }

  /**
   * Busca la mejor coincidencia para el mensaje del usuario en la base de conocimiento.
   * Prioriza coincidencias exactas o de muy alta similitud.
   * Si no hay coincidencias directas, combina la similitud de Levenshtein con la superposición de palabras clave.
   *
   * @private
   * @param {string} normalizedUserMessage - El mensaje del usuario normalizado.
   * @param {string[]} userKeywords - Palabras clave extraídas del mensaje del usuario.
   * @returns {Promise<{bestMatch: object | null, matchType: string}>} Un objeto que contiene la mejor coincidencia encontrada y el tipo de coincidencia.
   * @throws {Error} Si ocurre un error al cargar las preguntas.
   */
  async #findBestMatch(normalizedUserMessage, userKeywords) {
    const questionsData = await questionService.getAllQuestions()
    const questions = questionsData.questions || []

    let bestMatch = null
    let bestScore = 0
    let matchType = "no_match"

    for (const questionItem of questions) {
      const normalizedQuestion = nlpService.normalizeText(questionItem.question)
      // Asegurarse de que questionItem.keywords sea un array de strings normalizados
      const questionKeywords = Array.isArray(questionItem.keywords)
        ? questionItem.keywords.map((k) => nlpService.normalizeText(k.trim())) // Normalizar cada keyword si ya es un array
        : typeof questionItem.keywords === "string" && questionItem.keywords.length > 0
          ? questionItem.keywords.split(",").map((k) => nlpService.normalizeText(k.trim()))
          : []

      // 1. Coincidencia directa (Levenshtein muy alta)
      const levenshteinScore = nlpService.calculateSimilarity(normalizedUserMessage, normalizedQuestion)
      if (levenshteinScore > bestScore) {
        bestScore = levenshteinScore
        bestMatch = { ...questionItem, confidence: levenshteinScore }
        matchType = "levenshtein_direct"
      }

      // 2. Coincidencia de palabras clave (solo si el Levenshtein no es perfecto)
      // Solo consideramos la coincidencia de palabras clave si hay keywords en la pregunta y en el mensaje del usuario
      if (userKeywords.length > 0 && questionKeywords.length > 0) {
        const keywordOverlapScore = nlpService.calculateKeywordOverlapScore(userKeywords, questionKeywords)

        // Ponderar la coincidencia de palabras clave.
        // Damos un peso mayor a las palabras clave si hay buena superposición
        // y combinamos con un porcentaje del score de Levenshtein
        // Ajuste de pesos: más peso a las palabras clave
        const combinedScore = levenshteinScore * 0.3 + keywordOverlapScore * 0.7

        // Si hay una coincidencia de palabras clave relevante Y es mejor que el bestScore actual
        // El umbral para keywordOverlapScore se maneja dentro de la función calculateKeywordOverlapScore
        if (combinedScore > bestScore) {
          bestScore = combinedScore
          bestMatch = { ...questionItem, confidence: combinedScore }
          matchType = "keyword_combined"
        }
      }
    }

    // Asignar el tipo de coincidencia final basado en el score
    if (bestMatch && bestScore >= config.CHATBOT.confidenceThreshold) {
      matchType = bestScore >= 0.95 ? "exact_match" : matchType // Si es casi perfecto, es exacto
    } else if (bestMatch) {
      matchType = "below_threshold" // Hubo un match, pero la confianza es baja
    } else {
      matchType = "no_match" // No se encontró ningún match relevante
    }

    return { bestMatch, matchType }
  }

  /**
   * Proporciona una respuesta por defecto cuando el bot no puede comprender la consulta del usuario.
   *
   * @private
   * @returns {string} Un mensaje de respuesta por defecto.
   */
  #getDefaultResponse() {
    const responses = [
      "Lo siento, no he podido comprender tu consulta. ¿Podrías reformularla?",
      "No estoy seguro de entender tu pregunta. ¿Puedes ser más específico?",
      "Disculpa, no tengo información sobre eso. ¿Hay algo más en lo que pueda ayudarte?",
      "Mi conocimiento es limitado. Intenta con preguntas sobre: servicios, precios, contacto, o soporte técnico.",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * Obtiene una lista de sugerencias de temas para el usuario, basadas en categorías existentes.
   *
   * @private
   * @returns {Promise<string[]>} Un array de cadenas de texto con sugerencias.
   * @throws {Error} Si ocurre un error al obtener las categorías.
   */
  async #getSuggestions() {
    try {
      const categories = await questionService.getCategories()
      // Tomar un subconjunto de categorías populares para sugerir
      const topCategories = categories
        .filter((cat) => ["servicios", "precios", "contacto", "horarios", "soporte"].includes(cat))
        .slice(0, 3)

      if (topCategories.length > 0) {
        return topCategories.map((cat) => `¿Qué tal si preguntamos sobre ${cat}?`)
      }

      // Si no hay categorías populares, dar sugerencias generales
      return [
        "Pregúntame sobre nuestros servicios",
        "Consulta nuestros horarios",
        "Información de contacto",
        "Precios y tarifas",
      ]
    } catch (error) {
      logger.warn(`Error getting suggestions, returning defaults: ${error.message}`)
      return [
        "Pregúntame sobre nuestros servicios",
        "Consulta nuestros horarios",
        "Información de contacto",
        "Precios y tarifas",
      ]
    }
  }
}

module.exports = new ChatService()
