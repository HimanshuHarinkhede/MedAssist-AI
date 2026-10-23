const express = require("express");
const router  = express.Router();
const {
  addStaff, listStaff, getStaff, updateStaff, deleteStaff,
} = require("../controllers/staffController");
const { protect, authorize } = require("../middleware/authMiddleware");

// platform_admin, clinic_admin OR doctor can add/manage staff
router.post("/add",    protect, authorize("clinic_admin", "platform_admin", "doctor"), addStaff);
router.get("/list",    protect, listStaff);
router.get("/:id",     protect, getStaff);
router.put("/:id",     protect, authorize("clinic_admin", "platform_admin", "doctor"), updateStaff);
router.delete("/:id",  protect, authorize("clinic_admin", "platform_admin", "doctor"), deleteStaff);

module.exports = router;
