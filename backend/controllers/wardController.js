/**
 * wardController.js — Ward Admission & Hospital Bed Management
 * Handles Issues #4, #5, #7, #8 + Hospital Bed Management (Per-Ward Capacity, Available Only, Auto-Release)
 *
 * Routes:
 *   POST   /api/ward/admit               — Doctor admits a patient (with chief complaint, meds, ward)
 *   GET    /api/ward/list                — Get all active admissions for the clinic
 *   GET    /api/ward/:id                 — Get single admission details
 *   PUT    /api/ward/:id                 — Update admission (bed allocation, status, notes, meds)
 *   POST   /api/ward/:id/vitals          — Nurse adds a daily vitals entry
 *   PUT    /api/ward/:id/discharge       — Doctor discharges patient (AUTOMATICALLY RELEASES BED)
 *   GET    /api/ward/patient/:patientId/history — Full patient history (prescriptions + admissions)
 *
 * Bed Inventory Routes:
 *   GET    /api/ward/beds                — List beds (filter by ward, availableOnly)
 *   GET    /api/ward/beds/stats          — Overall and per-ward capacity stats
 *   POST   /api/ward/beds/add            — Add single bed
 *   POST   /api/ward/beds/bulk           — Bulk add beds
 *   DELETE /api/ward/beds/:id            — Remove bed
 *   PUT    /api/ward/beds/:id/release    — Manually free/release bed
 */

const WardAdmission = require("../models/WardAdmission");
const Patient = require("../models/Patient");
const Prescription = require("../models/Prescription");
const HospitalBed = require("../models/HospitalBed");

// ── POST /api/ward/admit ────────────────────────────────────────────────────────
exports.admitPatient = async (req, res) => {
  try {
    const {
      patientId, chiefComplaint, provisionalDiagnosis,
      admissionMedications, ward, bedNumber, doctorNotes,
    } = req.body;

    if (!patientId || !chiefComplaint)
      return res.status(400).json({ success: false, message: "Patient ID and chief complaint are required." });

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });

    const clinicId = req.user.clinic_id || patient.clinic_id;

    // Check not already admitted
    const existingAdmissions = await WardAdmission.findByPatient(patientId);
    const alreadyAdmitted = existingAdmissions.find((a) => a.status !== "Discharged");
    if (alreadyAdmitted)
      return res.status(409).json({ success: false, message: "Patient is already admitted. Discharge first." });

    const chosenWard = ward || "General Ward";

    const admission = await WardAdmission.create({
      patientId,
      patientName: patient.name,
      clinicId,
      doctorId: req.user.staff_id || null,
      doctorName: req.user.name || "",
      ward: chosenWard,
      bedNumber: bedNumber || "",
      chiefComplaint,
      provisionalDiagnosis: provisionalDiagnosis || "",
      admissionMedications: admissionMedications || [],
      doctorNotes: doctorNotes || "",
    });

    // Update patient status → Admitted
    await Patient.findByIdAndUpdate(patientId, { status: "Admitted" });

    // If bed was chosen during admission, mark it occupied immediately
    if (bedNumber) {
      await HospitalBed.occupyByNumber(clinicId, chosenWard, bedNumber, {
        patientId,
        patientName: patient.name,
        admissionId: admission.id,
      });
    }

    res.status(201).json({
      success: true,
      message: `Patient ${patient.name} admitted to ${chosenWard} successfully`,
      data: admission,
    });
  } catch (err) {
    console.error("Admit patient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ward/list ──────────────────────────────────────────────────────────
exports.listAdmissions = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { status, activeOnly } = req.query;

    const filter = { clinicId };
    if (status) filter.status = status;
    if (activeOnly === "true" || !status) filter.activeOnly = true;

    const admissions = await WardAdmission.findAll(filter);
    res.json({ success: true, count: admissions.length, data: admissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ward/:id ───────────────────────────────────────────────────────────
exports.getAdmission = async (req, res) => {
  try {
    const admission = await WardAdmission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });
    res.json({ success: true, data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/ward/:id ───────────────────────────────────────────────────────────
exports.updateAdmission = async (req, res) => {
  try {
    const existing = await WardAdmission.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Admission not found." });

    const clinicId = req.user.clinic_id || existing.clinic_id;
    const newBedNumber = req.body.bedNumber;
    const newWard = req.body.ward || existing.ward;

    // Handle bed change / allocation by nurse
    if (newBedNumber && newBedNumber !== existing.bed_number) {
      // Release previous bed if any
      if (existing.bed_number) {
        await HospitalBed.releaseByBedNumber(clinicId, existing.ward, existing.bed_number);
      }
      // Occupy new bed
      await HospitalBed.occupyByNumber(clinicId, newWard, newBedNumber, {
        patientId: existing.patient_id,
        patientName: existing.patient_name,
        admissionId: existing.id,
      });
    }

    const admission = await WardAdmission.update(req.params.id, req.body);
    res.json({ success: true, message: "Admission updated", data: admission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/ward/:id/vitals ───────────────────────────────────────────────────
exports.addVitals = async (req, res) => {
  try {
    const { pulse, bp, spo2, weight, temperature, bloodInvestigation, notes } = req.body;

    if (!pulse && !bp && !spo2)
      return res.status(400).json({ success: false, message: "At least one vital sign (pulse, bp, or spo2) is required." });

    const updated = await WardAdmission.addVitalsEntry(req.params.id, {
      pulse, bp, spo2, weight, temperature,
      bloodInvestigation,
      notes,
      recordedBy: req.user.name || "Nurse",
      date: new Date().toISOString(),
    });

    res.json({ success: true, message: "Vitals recorded successfully", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/ward/:id/discharge (AUTOMATICALLY RELEASES BED) ────────────────────
exports.dischargePatient = async (req, res) => {
  try {
    if (!["doctor", "clinic_admin", "platform_admin"].includes(req.user.role))
      return res.status(403).json({ success: false, message: "Only doctors can discharge patients." });

    const admission = await WardAdmission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: "Admission not found." });

    await WardAdmission.update(req.params.id, {
      status: "Discharged",
      dischargeDate: new Date().toISOString(),
      doctorNotes: req.body.dischargeNotes || admission.doctor_notes,
    });

    // Update patient status → Discharged
    await Patient.findByIdAndUpdate(admission.patient_id, { status: "Discharged" });

    // ── AUTOMATIC BED RELEASE ──────────────────────────────────────────────────
    // Release bed by admission ID and bed number so it immediately becomes available
    const clinicId = req.user.clinic_id || admission.clinic_id;
    await HospitalBed.releaseByAdmission(admission.id);
    if (admission.bed_number) {
      await HospitalBed.releaseByBedNumber(clinicId, admission.ward, admission.bed_number);
    }

    res.json({
      success: true,
      message: `Patient ${admission.patient_name} discharged. Bed ${admission.bed_number || ""} is now available.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/ward/patient/:patientId/history ────────────────────────────────────
exports.getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });

    const [prescriptions, admissions] = await Promise.all([
      Prescription.findByPatient(patientId),
      WardAdmission.findByPatient(patientId),
    ]);

    res.json({
      success: true,
      data: {
        patient,
        prescriptions,
        admissions,
        totalVisits: prescriptions.length,
        totalAdmissions: admissions.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── BED INVENTORY MANAGEMENT CONTROLLERS ───────────────────────────────────────

// GET /api/ward/beds — List beds with filters (e.g. ward=ICU, availableOnly=true)
exports.listBeds = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { ward, availableOnly } = req.query;

    const beds = await HospitalBed.findAll({ clinicId, ward, availableOnly });
    res.json({ success: true, count: beds.length, data: beds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/ward/beds/stats — Hospital capacity summary (total, available, occupied, per-ward)
exports.getBedStats = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const stats = await HospitalBed.getStats(clinicId);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ward/beds/add — Doctor/Admin adds a single bed
exports.addBed = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { ward, bedNumber, notes } = req.body;

    if (!ward || !bedNumber) {
      return res.status(400).json({ success: false, message: "Ward and Bed Number are required." });
    }

    const bed = await HospitalBed.create({ clinicId, ward, bedNumber, notes });
    res.status(201).json({ success: true, message: `Bed ${bedNumber} added to ${ward}`, data: bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/ward/beds/bulk — Doctor/Admin adds multiple beds in bulk
exports.addBulkBeds = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { ward, prefix, count, startNumber } = req.body;

    if (!ward || !count) {
      return res.status(400).json({ success: false, message: "Ward and Count are required." });
    }

    const beds = await HospitalBed.createBulk({
      clinicId,
      ward,
      prefix: prefix || `${ward.replace(/\s+/g, "").slice(0, 3).toUpperCase()}-`,
      count,
      startNumber: startNumber || 1,
    });

    res.status(201).json({
      success: true,
      message: `${beds.length} beds created in ${ward}`,
      data: beds,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/ward/beds/:id — Remove bed
exports.deleteBed = async (req, res) => {
  try {
    const bed = await HospitalBed.findById(req.params.id);
    if (!bed) return res.status(404).json({ success: false, message: "Bed not found." });
    if (bed.is_occupied) {
      return res.status(400).json({ success: false, message: "Cannot delete an occupied bed. Discharge patient first." });
    }

    await HospitalBed.deleteBed(req.params.id);
    res.json({ success: true, message: `Bed ${bed.bed_number} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/ward/beds/:id/release — Manually release bed
exports.releaseBed = async (req, res) => {
  try {
    const bed = await HospitalBed.releaseBed(req.params.id);
    res.json({ success: true, message: "Bed released and now available.", data: bed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
