const express = require("express")
const chatRoutes = require("./chatRoutes")
const questionRoutes = require("./questionRoutes")
const healthRoutes = require("./healthRoutes")

const router = express.Router()

// Rutas principales
router.use("/health", healthRoutes)
router.use("/chat", chatRoutes)
router.use("/questions", questionRoutes)

// Ruta 404 para API
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
  })
})

module.exports = router
