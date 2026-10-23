const Reminder = require("../models/Reminder");
const { generateSchedule } = require("../services/reminderService");

// ── POST /api/reminder/create ──────────────────────────────────────────────────
exports.createReminder = async (req, res) => {
  try {
    const { patientId, prescriptionId, medicine, dosage, frequency, duration, notes } = req.body;

    if (!patientId || !medicine || !frequency || !duration)
      return res.status(400).json({ success: false, message: "patientId, medicine, frequency, and duration are required." });

    const schedule = generateSchedule(frequency);

    const daysMatch = duration.match(/(\d+)\s*days?/i);
    const weeksMatch = duration.match(/(\d+)\s*weeks?/i);
    const monthsMatch = duration.match(/(\d+)\s*months?/i);

    let endDate = null;
    const startDate = new Date();
    if (daysMatch) { endDate = new Date(startDate); endDate.setDate(endDate.getDate() + parseInt(daysMatch[1])); }
    else if (weeksMatch) { endDate = new Date(startDate); endDate.setDate(endDate.getDate() + parseInt(weeksMatch[1]) * 7); }
    else if (monthsMatch) { endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + parseInt(monthsMatch[1])); }

    const reminder = await Reminder.create({
      patientId, prescriptionId: prescriptionId || null,
      medicine, dosage: dosage || "",
      frequency, duration, schedule,
      startDate, endDate,
      notes: notes || "",
    });

    res.status(201).json({ success: true, message: "Reminder created", data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/reminder/:patientId ───────────────────────────────────────────────
exports.getRemindersByPatient = async (req, res) => {
  try {
    const reminders = await Reminder.findByPatient(req.params.patientId);
    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/reminder/:id/taken ────────────────────────────────────────────────
exports.markTaken = async (req, res) => {
  try {
    const { scheduleIndex } = req.body;
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: "Reminder not found." });

    if (scheduleIndex !== undefined && reminder.schedule[scheduleIndex]) {
      const updatedSchedule = [...reminder.schedule];
      updatedSchedule[scheduleIndex] = { ...updatedSchedule[scheduleIndex], taken: true };
      const updated = await Reminder.updateScheduleItem(reminder.id, updatedSchedule);
      return res.json({ success: true, message: "Marked as taken", data: updated });
    }

    res.json({ success: true, message: "No changes made", data: reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
