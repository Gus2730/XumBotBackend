/**
 * @file Servicio para la gestión de preguntas y respuestas en la base de conocimiento.
 * @description Proporciona operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para las preguntas,
 * así como funciones de filtrado y paginación.
 */

const { v4: uuidv4 } = require("uuid")
const databaseService = require("./databaseService")
const logger = require("../utils/logger")
const nlpService = require("./nlpService") // Importar nlpService

class QuestionService {
  /**
   * Obtiene todas las preguntas de la base de conocimiento, aplicando filtros y paginación si se especifican.
   * Las preguntas devueltas no incluyen los metadatos internos de la base de datos para el cliente.
   *
   * @param {object} [filters={}] - Objeto con los filtros a aplicar.
   * @param {string} [filters.category] - Filtra por categoría de pregunta.
   * @param {string} [filters.search] - Busca preguntas, respuestas o palabras clave que contengan el término.
   * @param {number} [filters.limit=100] - Límite de resultados por página.
   * @param {number} [filters.offset=0] - Número de elementos a saltar (para paginación).
   * @returns {Promise<object>} Un objeto que contiene el array de preguntas y la información de paginación.
   * @throws {Error} Si ocurre un error al cargar los datos de la base de datos.
   */
  async getAllQuestions(filters = {}) {
    try {
      const data = await databaseService.loadData()
      let questions = data.questions || []

      // Asegurar que las preguntas tienen keywords para una manipulación segura
      questions = questions.map((q) => ({
        ...q,
        keywords: q.keywords || [],
      }))

      // Filtrar por categoría
      if (filters.category) {
        const normalizedCategoryFilter = nlpService.normalizeText(filters.category)
        questions = questions.filter(
          (q) => q.category && nlpService.normalizeText(q.category) === normalizedCategoryFilter,
        )
      }

      // Filtrar por búsqueda
      if (filters.search) {
        const searchTerm = nlpService.normalizeText(filters.search)
        questions = questions.filter(
          (q) =>
            nlpService.normalizeText(q.question).includes(searchTerm) ||
            nlpService.normalizeText(q.response).includes(searchTerm) ||
            (q.keywords && q.keywords.some((k) => nlpService.normalizeText(k).includes(searchTerm))),
        )
      }

      // Paginación
      const total = questions.length
      const offset = filters.offset || 0
      const limit = filters.limit || 100

      questions = questions.slice(offset, offset + limit)

      return {
        questions,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total,
        },
      }
    } catch (error) {
      logger.error(`Error getting questions: ${error.message}`, { filters })
      throw error
    }
  }

  /**
   * Obtiene una lista de todas las categorías únicas presentes en las preguntas.
   * Las categorías se devuelven ordenadas alfabéticamente.
   *
   * @returns {Promise<string[]>} Un array de cadenas de texto, cada una representando una categoría única.
   * @throws {Error} Si ocurre un error al cargar los datos de la base de datos.
   */
  async getCategories() {
    try {
      const data = await databaseService.loadData()
      const categories = [...new Set(data.questions.map((q) => q.category).filter(Boolean))]

      return categories.sort()
    } catch (error) {
      logger.error(`Error getting categories: ${error.message}`)
      throw error
    }
  }

  /**
   * Obtiene una pregunta específica de la base de conocimiento por su ID.
   *
   * @param {string} id - El ID único de la pregunta a buscar.
   * @returns {Promise<object | null>} El objeto de la pregunta si se encuentra, o `null` si no existe.
   * @throws {Error} Si ocurre un error al cargar los datos de la base de datos.
   */
  async getQuestionById(id) {
    try {
      const data = await databaseService.loadData()
      return data.questions.find((q) => q.id === id) || null
    } catch (error) {
      logger.error(`Error getting question by ID ${id}: ${error.message}`)
      throw error
    }
  }

  /**
   * Crea una nueva pregunta en la base de conocimiento.
   * Asigna un ID único y marcas de tiempo de creación y actualización.
   *
   * @param {object} questionData - Los datos de la nueva pregunta.
   * @param {string} questionData.question - El texto de la pregunta.
   * @param {string} questionData.response - La respuesta asociada a la pregunta.
   * @param {string[]} [questionData.keywords=[]] - Array de palabras clave para la pregunta.
   * @param {string} [questionData.category="general"] - La categoría a la que pertenece la pregunta.
   * @returns {Promise<object>} El objeto de la nueva pregunta creada.
   * @throws {Error} Si ocurre un error al guardar los datos en la base de datos.
   */
  async createQuestion(questionData) {
    try {
      const data = await databaseService.loadData()

      const newQuestion = {
        id: uuidv4(),
        question: questionData.question.trim(),
        response: questionData.response.trim(),
        keywords: Array.isArray(questionData.keywords)
          ? questionData.keywords.map((k) => nlpService.normalizeText(k))
          : [],
        category: questionData.category ? nlpService.normalizeText(questionData.category) : "general",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        active: true, // Por defecto, una nueva pregunta está activa
      }

      data.questions.push(newQuestion)
      await databaseService.saveData(data)

      logger.info(`Question created: ${newQuestion.id}`, {
        question: newQuestion.question,
        category: newQuestion.category,
      })
      return newQuestion
    } catch (error) {
      logger.error(`Error creating question: ${error.message}`, { questionData })
      throw error
    }
  }

  /**
   * Actualiza una pregunta existente en la base de conocimiento por su ID.
   * Solo los campos proporcionados en `updateData` serán actualizados.
   * La marca de tiempo `updatedAt` se actualiza automáticamente.
   *
   * @param {string} id - El ID de la pregunta a actualizar.
   * @param {object} updateData - Un objeto con los campos a actualizar y sus nuevos valores.
   * @returns {Promise<object | null>} El objeto de la pregunta actualizada si se encuentra, o `null` si no existe.
   * @throws {Error} Si ocurre un error al guardar los datos en la base de datos.
   */
  async updateQuestion(id, updateData) {
    try {
      const data = await databaseService.loadData()
      const questionIndex = data.questions.findIndex((q) => q.id === id)

      if (questionIndex === -1) {
        return null
      }

      const existingQuestion = data.questions[questionIndex]
      const updatedQuestion = {
        ...existingQuestion,
        ...updateData,
        id: existingQuestion.id, // Asegurar que el ID no cambie
        createdAt: existingQuestion.createdAt, // Asegurar que la fecha de creación no cambie
        updatedAt: new Date().toISOString(), // Actualizar la marca de tiempo de actualización
        // Normalizar palabras clave y categoría si se actualizan
        ...(updateData.keywords && {
          keywords: Array.isArray(updateData.keywords)
            ? updateData.keywords.map((k) => nlpService.normalizeText(k))
            : existingQuestion.keywords,
        }),
        ...(updateData.category && { category: nlpService.normalizeText(updateData.category) }),
      }

      data.questions[questionIndex] = updatedQuestion
      await databaseService.saveData(data)

      logger.info(`Question updated: ${id}`, { updatedFields: Object.keys(updateData) })
      return updatedQuestion
    } catch (error) {
      logger.error(`Error updating question ${id}: ${error.message}`, { updateData })
      throw error
    }
  }

  /**
   * Elimina una pregunta de la base de conocimiento por su ID.
   *
   * @param {string} id - El ID de la pregunta a eliminar.
   * @returns {Promise<boolean>} `true` si la pregunta fue eliminada exitosamente, `false` si no se encontró.
   * @throws {Error} Si ocurre un error al guardar los datos en la base de datos.
   */
  async deleteQuestion(id) {
    try {
      const data = await databaseService.loadData()
      const initialLength = data.questions.length
      data.questions = data.questions.filter((q) => q.id !== id)

      if (data.questions.length < initialLength) {
        await databaseService.saveData(data)
        logger.info(`Question deleted: ${id}`)
        return true
      }
      logger.warn(`Question to delete not found: ${id}`)
      return false
    } catch (error) {
      logger.error(`Error deleting question ${id}: ${error.message}`)
      throw error
    }
  }
}

module.exports = new QuestionService()
