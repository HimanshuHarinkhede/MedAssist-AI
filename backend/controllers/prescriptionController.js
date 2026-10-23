const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const Reminder = require("../models/Reminder");
const { generateSchedule } = require("../services/reminderService");

// ── POST /api/prescription/create ─────────────────────────────────────────────
/**
 * Fix Issue #9: Prescription save was broken because doctorId/patientId lookup
 * was using Mongoose-style findById (not compatible with Supabase model).
 * Now uses req.user for doctor info and verifies patient exists via Supabase model.
 */
exports.createPrescription = async (req, res) => {
  try {
    const {
      patientId, medicines,
      diagnosis, instructions, aiInstructions,
      transcript, entities, validationWarnings, followUpDate,
      autoCreateReminders,
    } = req.body;

    if (!patientId || !medicines || medicines.length === 0)
      return res.status(400).json({ success: false, message: "Patient ID and at least one medicine are required." });

    // Fetch patient using Supabase model
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });

    const clinicId = req.user.clinic_id || patient.clinic_id;
    if (!clinicId) return res.status(400).json({ success: false, message: "Clinic context required." });

    // Normalize medicines array — support both {name, ...} and {medicine, ...} formats
    const normalizedMedicines = medicines.map((m) => ({
      name: m.name || m.medicine || "Unknown",
      dosage: m.dosage || "As prescribed",
      frequency: m.frequency || "As directed",
      duration: m.duration || "As directed",
      notes: m.notes || "",
    }));

    const prescription = await Prescription.create({
      patientId,
      patientName: patient.name,
      doctorId: req.user.staff_id || null,
      doctorName: req.user.name || "",
      clinicId,
      medicines: normalizedMedicines,
      diagnosis: diagnosis || "",
      instructions: instructions || "Follow the prescribed medication schedule.",
      aiInstructions: aiInstructions || "",
      transcript: transcript || "",
      entities: entities || {},
      validationWarnings: validationWarnings || [],
      followUpDate: followUpDate || null,
    });

    // Update patient status to Completed
    await Patient.findByIdAndUpdate(patientId, { status: "Completed" });

    // Auto-create reminders for each medicine
    if (autoCreateReminders && normalizedMedicines.length > 0) {
      const reminderPromises = normalizedMedicines.map((med) => {
        const daysMatch = (med.duration || "").match(/(\d+)\s*days?/i);
        const weeksMatch = (med.duration || "").match(/(\d+)\s*weeks?/i);
        const monthsMatch = (med.duration || "").match(/(\d+)\s*months?/i);
        let endDate = null;
        const startDate = new Date();
        if (daysMatch) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + parseInt(daysMatch[1]));
        } else if (weeksMatch) {
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + parseInt(weeksMatch[1]) * 7);
        } else if (monthsMatch) {
          endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + parseInt(monthsMatch[1]));
        }

        return Reminder.create({
          patientId,
          prescriptionId: prescription.id,
          medicine: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          schedule: generateSchedule(med.frequency),
          startDate,
          endDate,
          notes: med.notes || "",
        });
      });

      try {
        await Promise.all(reminderPromises);
      } catch (reminderErr) {
        // Non-critical — prescription is saved; reminder creation failure shouldn't block response
        console.warn("⚠️ Reminder creation partially failed:", reminderErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Prescription saved successfully",
      data: prescription,
    });
  } catch (err) {
    console.error("Create prescription error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/prescription/:patientId ──────────────────────────────────────────
exports.getPrescriptionsByPatient = async (req, res) => {
  try {
    const prescriptions = await Prescription.findByPatient(req.params.patientId);
    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/prescription/clinic/all ──────────────────────────────────────────
exports.getClinicPrescriptions = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [prescriptions, total] = await Promise.all([
      Prescription.findByClinic(clinicId, skip, Number(limit)),
      Prescription.countByClinic(clinicId),
    ]);

    res.json({ success: true, count: prescriptions.length, total, data: prescriptions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/prescription/single/:id ──────────────────────────────────────────
exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ success: false, message: "Prescription not found." });
    res.json({ success: true, data: prescription });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
