const express = require("express");
const router  = express.Router();
const {
  registerClinic, getClinic, getAllClinics,
  getPublicClinics, updateClinic, deleteClinic,
} = require("../controllers/clinicController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Public — used by landing page to show hospitals/clinics
router.get("/public", getPublicClinics);

// Protected
router.post("/register", protect, authorize("platform_admin"), registerClinic);
router.get("/",          protect, authorize("platform_admin"), getAllClinics);
router.get("/:id",       protect, getClinic);
router.put("/:id",       protect, authorize("platform_admin"), updateClinic);
router.delete("/:id",    protect, authorize("platform_admin"), deleteClinic);

module.exports = router;
