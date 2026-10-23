const express = require("express");
const router = express.Router();
const { processText } = require("../controllers/agentController");
const { protect } = require("../middleware/authMiddleware");

// POST /api/agent/process
router.post("/process", protect, processText);

module.exports = router;
