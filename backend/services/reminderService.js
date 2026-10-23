/**
 * reminderService.js
 * Generates a medication schedule (Morning / Afternoon / Night)
 * based on the prescribed frequency string.
 */

const SCHEDULE_MAP = {
  "once daily": [
    { label: "Morning", time: "08:00 AM" },
  ],
  "twice daily": [
    { label: "Morning", time: "08:00 AM" },
    { label: "Night",   time: "08:00 PM" },
  ],
  "three times daily": [
    { label: "Morning",   time: "08:00 AM" },
    { label: "Afternoon", time: "02:00 PM" },
    { label: "Night",     time: "08:00 PM" },
  ],
  "four times daily": [
    { label: "Morning",   time: "07:00 AM" },
    { label: "Afternoon", time: "12:00 PM" },
    { label: "Evening",   time: "05:00 PM" },
    { label: "Night",     time: "10:00 PM" },
  ],
  "every 4 hours": [
    { label: "06:00 AM", time: "06:00 AM" },
    { label: "10:00 AM", time: "10:00 AM" },
    { label: "02:00 PM", time: "02:00 PM" },
    { label: "06:00 PM", time: "06:00 PM" },
    { label: "10:00 PM", time: "10:00 PM" },
    { label: "02:00 AM", time: "02:00 AM" },
  ],
  "every 6 hours": [
    { label: "06:00 AM", time: "06:00 AM" },
    { label: "12:00 PM", time: "12:00 PM" },
    { label: "06:00 PM", time: "06:00 PM" },
    { label: "12:00 AM", time: "12:00 AM" },
  ],
  "every 8 hours": [
    { label: "Morning",   time: "08:00 AM" },
    { label: "Afternoon", time: "04:00 PM" },
    { label: "Night",     time: "12:00 AM" },
  ],
  "every 12 hours": [
    { label: "Morning", time: "08:00 AM" },
    { label: "Night",   time: "08:00 PM" },
  ],
  "morning and evening": [
    { label: "Morning", time: "08:00 AM" },
    { label: "Evening", time: "06:00 PM" },
  ],
  "at bedtime": [
    { label: "Bedtime", time: "10:00 PM" },
  ],
  "as needed": [
    { label: "As Needed", time: "When required" },
  ],
  "with meals": [
    { label: "Breakfast", time: "08:00 AM" },
    { label: "Lunch",     time: "01:00 PM" },
    { label: "Dinner",    time: "08:00 PM" },
  ],
};

/**
 * Generate a schedule array from a frequency string
 * @param {string} frequency
 * @returns {{ label: string, time: string, medicine: string, taken: boolean }[]}
 */
function generateSchedule(frequency, medicineName = "") {
  const key = (frequency || "once daily").toLowerCase().trim();
  
  // Find best match
  let slots = null;
  for (const [pattern, schedule] of Object.entries(SCHEDULE_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) {
      slots = schedule;
      break;
    }
  }

  // Defaults to once daily if not matched
  if (!slots) slots = SCHEDULE_MAP["once daily"];

  return slots.map((slot) => ({
    label:    slot.label,
    time:     slot.time,
    medicine: medicineName,
    taken:    false,
  }));
}

module.exports = { generateSchedule };
