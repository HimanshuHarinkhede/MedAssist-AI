const express = require("express");
const router = express.Router();
const {
  adminDashboard, doctorDashboard, receptionDashboard,
} = require("../controllers/dashboardController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/admin",     protect, authorize("platform_admin"), adminDashboard);
router.get("/doctor",    protect, authorize("doctor", "clinic_admin"), doctorDashboard);
router.get("/reception", protect, authorize("receptionist", "clinic_admin"), receptionDashboard);

module.exports = router;
