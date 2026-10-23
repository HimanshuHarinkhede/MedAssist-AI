const express = require("express");
const router = express.Router();
const {
  createPrescription, getPrescriptionsByPatient,
  getClinicPrescriptions, getPrescription,
} = require("../controllers/prescriptionController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/create",         protect, authorize("doctor", "clinic_admin"), createPrescription);
router.get("/clinic/all",      protect, getClinicPrescriptions);
router.get("/single/:id",      protect, getPrescription);
router.get("/:patientId",      protect, getPrescriptionsByPatient);

module.exports = router;
