/**
 * Clear Dummy Data Script
 * -----------------------
 * Deletes ALL records EXCEPT the platform_admin user.
 * This removes all dummy/seeded patients, staff, clinics, prescriptions, etc.
 *
 * Run: node backend/scripts/clearDummyData.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User         = require("../models/User");
const Clinic       = require("../models/Clinic");
const Staff        = require("../models/Staff");
const Patient      = require("../models/Patient");
const Prescription = require("../models/Prescription");
const Reminder     = require("../models/Reminder");

let Appointment;
try { Appointment = require("../models/Appointment"); } catch (e) { Appointment = null; }

async function clearData() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected.\n");

  // Find admin user(s) — preserve them
  const admins = await User.find({ role: "platform_admin" });
  const adminIds = admins.map((a) => a._id);

  if (adminIds.length === 0) {
    console.log("⚠️  No platform_admin found! Run seedAdmin.js first.");
    await mongoose.disconnect();
    return;
  }

  console.log(`🛡️  Preserving ${adminIds.length} admin account(s):`);
  admins.forEach((a) => console.log(`   - ${a.email}`));
  console.log();

  // Delete all non-admin users
  const usersDeleted = await User.deleteMany({ role: { $ne: "platform_admin" } });
  console.log(`🗑️  Deleted ${usersDeleted.deletedCount} non-admin users`);

  // Delete all clinics (admin has no specific clinic—they manage all)
  const clinicsDeleted = await Clinic.deleteMany({});
  console.log(`🗑️  Deleted ${clinicsDeleted.deletedCount} clinics`);

  // Delete all staff records
  const staffDeleted = await Staff.deleteMany({});
  console.log(`🗑️  Deleted ${staffDeleted.deletedCount} staff records`);

  // Delete all patients
  const patientsDeleted = await Patient.deleteMany({});
  console.log(`🗑️  Deleted ${patientsDeleted.deletedCount} patients`);

  // Delete all prescriptions
  const prescriptionsDeleted = await Prescription.deleteMany({});
  console.log(`🗑️  Deleted ${prescriptionsDeleted.deletedCount} prescriptions`);

  // Delete all reminders
  const remindersDeleted = await Reminder.deleteMany({});
  console.log(`🗑️  Deleted ${remindersDeleted.deletedCount} reminders`);

  // Delete all appointments (if model exists)
  if (Appointment) {
    const apptsDeleted = await Appointment.deleteMany({});
    console.log(`🗑️  Deleted ${apptsDeleted.deletedCount} appointments`);
  }

  // Clean admin clinicId reference (admin manages all clinics, not tied to one)
  await User.updateMany({ role: "platform_admin" }, { clinicId: null });

  console.log("\n─────────────────────────────────────────────");
  console.log("✅  Database cleared! Only admin record remains.");
  console.log("    Login: admin@medassist.com / Admin@1234");
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

clearData().catch((err) => {
  console.error("❌  Clear failed:", err.message);
  process.exit(1);
});
