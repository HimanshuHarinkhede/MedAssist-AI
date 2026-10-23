const express = require("express");
const router = express.Router();
const {
  admitPatient, listAdmissions, getAdmission, updateAdmission,
  addVitals, dischargePatient, getPatientHistory,
  listBeds, getBedStats, addBed, addBulkBeds, deleteBed, releaseBed,
} = require("../controllers/wardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const ALL_CLINICAL_ROLES = ["doctor", "nurse", "clinic_admin", "platform_admin", "receptionist"];

// ── Hospital Bed Inventory Routes (Must be before /:id) ────────────────────────
// List beds (filter by ?ward=ICU&availableOnly=true)
router.get("/beds",
  protect,
  authorize(...ALL_CLINICAL_ROLES),
  listBeds
);

// Hospital bed stats & capacity breakdown
router.get("/beds/stats",
  protect,
  authorize(...ALL_CLINICAL_ROLES),
  getBedStats
);

// Doctor or Admin adds a single bed
router.post("/beds/add",
  protect,
  authorize("doctor", "clinic_admin", "platform_admin"),
  addBed
);

// Doctor or Admin adds bulk beds
router.post("/beds/bulk",
  protect,
  authorize("doctor", "clinic_admin", "platform_admin"),
  addBulkBeds
);

// Doctor or Admin deletes a bed
router.delete("/beds/:id",
  protect,
  authorize("doctor", "clinic_admin", "platform_admin"),
  deleteBed
);

// Manually free / release a bed
router.put("/beds/:id/release",
  protect,
  authorize("doctor", "nurse", "clinic_admin", "platform_admin"),
  releaseBed
);

// ── Ward Admission Operations ──────────────────────────────────────────────────
// Doctor admits a patient (Issues #4, #8)
router.post("/admit",
  protect,
  authorize("doctor", "clinic_admin", "platform_admin"),
  admitPatient
);

// List all active ward admissions — visible to all clinical staff (Issues #4, #5)
router.get("/list",
  protect,
  authorize(...ALL_CLINICAL_ROLES),
  listAdmissions
);

// Full patient medical history — prescriptions + admissions (Issue #7)
router.get("/patient/:patientId/history",
  protect,
  authorize(...ALL_CLINICAL_ROLES),
  getPatientHistory
);

// Get single admission full details
router.get("/:id",
  protect,
  authorize(...ALL_CLINICAL_ROLES),
  getAdmission
);

// Nurse or Doctor updates bed number / notes / medications (Issue #4)
router.put("/:id",
  protect,
  authorize("nurse", "doctor", "clinic_admin", "platform_admin"),
  updateAdmission
);

// Nurse adds daily vitals entry (Issue #4)
router.post("/:id/vitals",
  protect,
  authorize("nurse", "doctor", "clinic_admin"),
  addVitals
);

// Doctor discharges patient (Issue #4, #5) — AUTOMATICALLY RELEASES BED
router.put("/:id/discharge",
  protect,
  authorize("doctor", "clinic_admin", "platform_admin"),
  dischargePatient
);

module.exports = router;
