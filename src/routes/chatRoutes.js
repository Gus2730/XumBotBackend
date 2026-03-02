const express = require("express")
const chatController = require("../controllers/chatController")
const { validateChatMessage } = require("../middleware/validation")

const router = express.Router()

router.post("/", validateChatMessage, chatController.processMessage)
router.get("/sessions/:sessionId/history", chatController.getSessionHistory)
router.delete("/sessions/:sessionId", chatController.clearSession)

module.exports = router
