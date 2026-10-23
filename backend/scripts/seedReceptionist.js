/**
 * Seed Receptionist Script
 * ------------------------
 * Creates:
 *   1. A User with role "receptionist"
 *   2. A Staff record linked to the User + existing Clinic
 *
 * Run: node backend/scripts/seedReceptionist.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const User   = require("../models/User");
const Clinic = require("../models/Clinic");
const Staff  = require("../models/Staff");

// ── Credentials you will use to log in ──────────────────────────────────────
const RECEPTIONIST_EMAIL    = "receptionist@medassist.com";
const RECEPTIONIST_PASSWORD = "Recept@1234";
const RECEPTIONIST_NAME     = "Sarah Johnson";
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected.\n");

  // 1. Check if user already exists
  const existing = await User.findOne({ email: RECEPTIONIST_EMAIL });
  if (existing) {
    console.log(`⚠️  User "${RECEPTIONIST_EMAIL}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  // 2. Find existing clinic (created by seedAdmin)
  const clinic = await Clinic.findOne();
  if (!clinic) {
    console.log("❌  No clinic found. Please run seedAdmin.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`🏥  Using clinic: ${clinic.name} (${clinic._id})`);

  // 3. Create the User (password hashed by pre-save hook)
  const user = await User.create({
    name:     RECEPTIONIST_NAME,
    email:    RECEPTIONIST_EMAIL,
    password: RECEPTIONIST_PASSWORD,
    role:     "receptionist",
    clinicId: clinic._id,
    isActive: true,
    phone:    "9876543210",
  });
  console.log(`👤  Receptionist user created: ${user.email} (${user._id})`);

  // 4. Create corresponding Staff record
  const staff = await Staff.create({
    userId:     user._id,
    clinicId:   clinic._id,
    name:       RECEPTIONIST_NAME,
    email:      RECEPTIONIST_EMAIL,
    phone:      "9876543210",
    role:       "Receptionist",
    department: "Front Desk",
    shift:      "Morning",
    status:     "Active",
  });
  console.log(`🧑‍💼  Staff record created: ${staff.name} — ${staff.role} (${staff._id})`);

  console.log("\n─────────────────────────────────────────────");
  console.log("🎉  Receptionist seeded successfully!");
  console.log(`    Email   : ${RECEPTIONIST_EMAIL}`);
  console.log(`    Password: ${RECEPTIONIST_PASSWORD}`);
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
