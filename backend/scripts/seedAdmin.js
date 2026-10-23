/**
 * Seed Admin Script
 * -----------------
 * Creates:
 *   1. A Clinic record (if none exists)
 *   2. A User with role "platform_admin"
 *   3. A Staff record linked to the User + Clinic
 *
 * Run: node backend/scripts/seedAdmin.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User   = require("../models/User");
const Clinic = require("../models/Clinic");
const Staff  = require("../models/Staff");

// ── Credentials you will use to log in ──────────────────────────────────────
const ADMIN_EMAIL    = "admin@medassist.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME     = "Super Admin";
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🔌  Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected.\n");

  // 1. Check if admin user already exists
  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`⚠️  User "${ADMIN_EMAIL}" already exists. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  // 2. Ensure a Clinic exists (reuse the first one, or create a default)
  let clinic = await Clinic.findOne();
  if (!clinic) {
    console.log("🏥  No clinic found – creating a default clinic first…");

    // Temporary placeholder ownerId (we'll update it after the user is created)
    const placeholder = new mongoose.Types.ObjectId();
    clinic = await Clinic.create({
      name:      "MedAssist Clinic",
      address:   "123 Health Street",
      city:      "Mumbai",
      phone:     "0000000000",
      email:     "clinic@medassist.com",
      ownerId:   placeholder,
      isActive:  true,
    });
    console.log(`   Clinic created: ${clinic.name} (${clinic._id})`);
  } else {
    console.log(`🏥  Reusing existing clinic: ${clinic.name} (${clinic._id})`);
  }

  // 3. Create the admin User (password hashed by the pre-save hook)
  const user = await User.create({
    name:     ADMIN_NAME,
    email:    ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role:     "platform_admin",
    clinicId: clinic._id,
    isActive: true,
  });
  console.log(`👤  Admin user created: ${user.email} (${user._id})`);

  // 4. If we used a placeholder ownerId, update the clinic now
  if (clinic.ownerId.toString() !== user._id.toString()) {
    await Clinic.findByIdAndUpdate(clinic._id, { ownerId: user._id });
    console.log("   Clinic ownerId updated to admin user.");
  }

  // 5. Create a Staff record for the admin
  const staff = await Staff.create({
    userId:     user._id,
    clinicId:   clinic._id,
    name:       ADMIN_NAME,
    email:      ADMIN_EMAIL,
    role:       "Admin",
    department: "Administration",
    shift:      "Morning",
    status:     "Active",
  });
  console.log(`🧑‍⚕️  Staff record created: ${staff.name} — ${staff.role} (${staff._id})`);

  console.log("\n─────────────────────────────────────────────");
  console.log("🎉  Admin seeded successfully!");
  console.log(`    Email   : ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log("─────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
