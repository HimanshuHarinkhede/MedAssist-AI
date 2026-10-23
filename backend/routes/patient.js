const express = require("express");
const router  = express.Router();
const {
  registerPatient, listPatients, getPatient, updatePatient, getQueue,
  bookAppointment, myAppointments, clinicAppointments, updateAppointment,
  getMyPatientStatus, getMyPrescriptions, getMyMedicineSchedule, getMyHealthHistory,
} = require("../controllers/patientController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Walk-in registration by reception/staff
router.post("/register",
  protect,
  authorize("clinic_admin", "platform_admin", "receptionist", "doctor", "nurse"),
  registerPatient
);

// Patient portal live endpoints — strictly for logged-in patients
router.get("/my-status",           protect, authorize("patient"), getMyPatientStatus);
router.get("/my-prescriptions",    protect, authorize("patient"), getMyPrescriptions);
router.get("/my-schedule",         protect, authorize("patient"), getMyMedicineSchedule);
router.get("/my-history",          protect, authorize("patient"), getMyHealthHistory);

// Appointment booking — patients only
router.post("/book-appointment",   protect, authorize("patient"), bookAppointment);
router.get("/my-appointments",     protect, authorize("patient"), myAppointments);

// Clinic staff views today's appointment queue
router.get("/clinic-appointments",
  protect,
  authorize("clinic_admin", "platform_admin", "doctor", "receptionist", "nurse"),
  clinicAppointments
);
router.put("/appointment/:id",
  protect,
  authorize("clinic_admin", "platform_admin", "doctor", "receptionist"),
  updateAppointment
);

// Walk-in queue
router.get("/queue",  protect, getQueue);

// General patient list & records
router.get("/list",   protect, listPatients);
router.get("/:id",    protect, getPatient);
router.put("/:id",    protect, updatePatient);

module.exports = router;
