const express = require("express");
const router = express.Router();
const {
  createReminder, getRemindersByPatient, markTaken,
} = require("../controllers/reminderController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create",            protect, createReminder);
router.get("/:patientId",         protect, getRemindersByPatient);
router.put("/:id/taken",          protect, markTaken);

module.exports = router;
