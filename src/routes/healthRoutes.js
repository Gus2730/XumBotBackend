const express = require("express")
const healthController = require("../controllers/healthController")

const router = express.Router()

router.get("/", healthController.getHealth)
router.get("/detailed", healthController.getDetailedHealth)

module.exports = router
