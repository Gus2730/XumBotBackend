const questionService = require("../services/questionService")
const logger = require("../utils/logger")

class QuestionController {
  async getAllQuestions(req, res, next) {
    try {
      const { category, search, limit = 100, offset = 0 } = req.query

      const filters = {
        category,
        search,
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      }

      const questions = await questionService.getAllQuestions(filters)

      res.json({
        success: true,
        data: questions,
      })
    } catch (error) {
      next(error)
    }
  }

  async getCategories(req, res, next) {
    try {
      const categories = await questionService.getCategories()

      res.json({
        success: true,
        data: categories,
      })
    } catch (error) {
      next(error)
    }
  }

  async getQuestionById(req, res, next) {
    try {
      const { id } = req.params

      const question = await questionService.getQuestionById(id)

      if (!question) {
        return res.status(404).json({
          success: false,
          error: "Question not found",
        })
      }

      res.json({
        success: true,
        data: question,
      })
    } catch (error) {
      next(error)
    }
  }

  async createQuestion(req, res, next) {
    try {
      const questionData = req.body

      const newQuestion = await questionService.createQuestion(questionData)

      logger.info(`New question created: ${newQuestion.id}`, {
        requestId: req.id,
        questionId: newQuestion.id,
        category: newQuestion.category,
      })

      res.status(201).json({
        success: true,
        data: newQuestion,
        message: "Question created successfully",
      })
    } catch (error) {
      next(error)
    }
  }

  async updateQuestion(req, res, next) {
    try {
      const { id } = req.params
      const updateData = req.body

      const updatedQuestion = await questionService.updateQuestion(id, updateData)

      if (!updatedQuestion) {
        return res.status(404).json({
          success: false,
          error: "Question not found",
        })
      }

      logger.info(`Question updated: ${id}`, {
        requestId: req.id,
        questionId: id,
      })

      res.json({
        success: true,
        data: updatedQuestion,
        message: "Question updated successfully",
      })
    } catch (error) {
      next(error)
    }
  }

  async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params

      const deleted = await questionService.deleteQuestion(id)

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Question not found",
        })
      }

      logger.info(`Question deleted: ${id}`, {
        requestId: req.id,
        questionId: id,
      })

      res.json({
        success: true,
        message: "Question deleted successfully",
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new QuestionController()
