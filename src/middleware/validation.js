const { AppError } = require("./errorHandler")
const config = require("../config/config")

function validateChatMessage(req, res, next) {
  const { message, sessionId } = req.body

  // Validar mensaje
  if (!message) {
    return next(new AppError("Message is required", 400))
  }

  if (typeof message !== "string") {
    return next(new AppError("Message must be a string", 400))
  }

  if (message.trim().length === 0) {
    return next(new AppError("Message cannot be empty", 400))
  }

  if (message.length > config.CHATBOT.maxMessageLength) {
    return next(new AppError(`Message too long. Maximum ${config.CHATBOT.maxMessageLength} characters`, 400))
  }

  // Validar sessionId (opcional)
  if (sessionId && typeof sessionId !== "string") {
    return next(new AppError("SessionId must be a string", 400))
  }

  next()
}

function validateQuestion(req, res, next) {
  const { question, response, keywords, category } = req.body

  if (!question || !response) {
    return next(new AppError("Question and response are required", 400))
  }

  if (typeof question !== "string" || typeof response !== "string") {
    return next(new AppError("Question and response must be strings", 400))
  }

  if (question.trim().length === 0 || response.trim().length === 0) {
    return next(new AppError("Question and response cannot be empty", 400))
  }

  if (keywords && !Array.isArray(keywords)) {
    return next(new AppError("Keywords must be an array", 400))
  }

  if (category && typeof category !== "string") {
    return next(new AppError("Category must be a string", 400))
  }

  next()
}

module.exports = {
  validateChatMessage,
  validateQuestion,
}
