const express = require("express")
const questionController = require("../controllers/questionController")
const { validateQuestion } = require("../middleware/validation")

const router = express.Router()

router.get("/", questionController.getAllQuestions)
router.get("/categories", questionController.getCategories)
router.get("/:id", questionController.getQuestionById)
router.post("/", validateQuestion, questionController.createQuestion)
router.put("/:id", validateQuestion, questionController.updateQuestion)
router.delete("/:id", questionController.deleteQuestion)

module.exports = router
