/**
 * seed.js — Seeds database with demo data for development/testing
 * Run: node config/seed.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

// Load all models
const User     = require("../models/User");
const Clinic   = require("../models/Clinic");
const Staff    = require("../models/Staff");
const Patient  = require("../models/Patient");
const Prescription = require("../models/Prescription");
const Reminder = require("../models/Reminder");
const { generateSchedule } = require("../services/reminderService");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/medassist";

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB:", MONGO_URI);

    // ── Clear existing data ────────────────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}), Clinic.deleteMany({}), Staff.deleteMany({}),
      Patient.deleteMany({}), Prescription.deleteMany({}), Reminder.deleteMany({}),
    ]);
    console.log("🗑️ Cleared existing data");

    // ── Create Platform Admin ──────────────────────────────────────────────────
    const platformAdmin = await User.create({
      name: "Platform Administrator",
      email: "admin@medassist.ai",
      password: "Admin@123",
      role: "platform_admin",
    });
    console.log("👑 Created platform admin: admin@medassist.ai / Admin@123");

    // ── Create Clinic ──────────────────────────────────────────────────────────
    const clinicAdminUser = await User.create({
      name: "Dr. Suresh Gupta",
      email: "clinic@medassist.ai",
      password: "Clinic@123",
      role: "clinic_admin",
    });

    const clinic = await Clinic.create({
      name: "MedAssist City Clinic",
      address: "123, Medical Quarter, Mumbai",
      city: "Mumbai",
      phone: "022-12345678",
      email: "info@medassistclinic.com",
      ownerId: clinicAdminUser._id,
      departments: ["General", "Cardiology", "Neurology", "Pulmonology", "Endocrinology", "Orthopedics"],
      licenseNo: "MH-2024-CLINIC-001",
    });

    await User.findByIdAndUpdate(clinicAdminUser._id, { clinicId: clinic._id });
    console.log("🏥 Created clinic:", clinic.name);

    // ── Create Staff ───────────────────────────────────────────────────────────
    const staffData = [
      { name: "Dr. Anand Mehta",  email: "anand@medassist.ai",  role: "Doctor",       department: "Cardiology",    shift: "Morning",   qualification: "MBBS, MD Cardiology",   experience: 12 },
      { name: "Dr. Sana Khan",    email: "sana@medassist.ai",   role: "Doctor",       department: "Pulmonology",   shift: "Morning",   qualification: "MBBS, MD Pulmonology",  experience: 8  },
      { name: "Dr. Ravi Verma",   email: "ravi@medassist.ai",   role: "Doctor",       department: "Neurology",     shift: "Evening",   qualification: "MBBS, DM Neurology",    experience: 15 },
      { name: "Dr. Priya Singh",  email: "priya.doc@medassist.ai", role: "Doctor",    department: "General",       shift: "Morning",   qualification: "MBBS",                  experience: 5  },
      { name: "Neha Sharma",      email: "neha@medassist.ai",   role: "Nurse",        department: "General",       shift: "Morning",   qualification: "BSc Nursing",            experience: 3  },
      { name: "Pooja Rao",        email: "reception@medassist.ai", role: "Receptionist", department: "Front Desk", shift: "Morning",   qualification: "Graduate",               experience: 2  },
      { name: "Ramesh Yadav",     email: "ramesh@medassist.ai", role: "Nurse",        department: "Emergency",     shift: "Night",     qualification: "GNM Nursing",            experience: 6  },
    ];

    const staffMembers = await Staff.insertMany(
      staffData.map((s) => ({ ...s, clinicId: clinic._id }))
    );
    console.log(`👩‍⚕️ Created ${staffMembers.length} staff members`);

    // ── Create Users for staff ─────────────────────────────────────────────────
    const doctorUser = await User.create({
      name: "Dr. Anand Mehta",
      email: "doctor@medassist.ai",
      password: "Doctor@123",
      role: "doctor",
      clinicId: clinic._id,
    });

    const receptionUser = await User.create({
      name: "Pooja Rao",
      email: "reception@medassist.ai",
      password: "Reception@123",
      role: "receptionist",
      clinicId: clinic._id,
    });

    const patientUser = await User.create({
      name: "Rahul Sharma",
      email: "patient@medassist.ai",
      password: "Patient@123",
      role: "patient",
      clinicId: clinic._id,
    });
    console.log("👤 Created demo users (doctor, reception, patient)");

    // ── Create Patients ────────────────────────────────────────────────────────
    const doctorStaff = staffMembers[0]; // Dr. Anand Mehta

    const patientsData = [
      { name: "Rahul Sharma",  age: 45, gender: "Male",   phone: "9876543210", address: "Mumbai",     symptoms: "Headache, Fatigue",         medicalHistory: "Hypertension, Diabetes", department: "Cardiology",   doctorName: "Dr. Anand Mehta", status: "Completed" },
      { name: "Priya Patel",   age: 32, gender: "Female", phone: "9876543211", address: "Pune",       symptoms: "Breathlessness",             medicalHistory: "Asthma",                 department: "Pulmonology",  doctorName: "Dr. Sana Khan",   status: "Completed" },
      { name: "Amit Kumar",    age: 58, gender: "Male",   phone: "9876543212", address: "Delhi",      symptoms: "Chest pain, Palpitations",   medicalHistory: "Cardiac Arrhythmia",     department: "Cardiology",   doctorName: "Dr. Anand Mehta", status: "Consulting"},
      { name: "Sneha Desai",   age: 27, gender: "Female", phone: "9876543213", address: "Ahmedabad",  symptoms: "Severe headache, Nausea",    medicalHistory: "Migraine",              department: "Neurology",    doctorName: "Dr. Ravi Verma",  status: "Waiting"   },
      { name: "Vikram Singh",  age: 63, gender: "Male",   phone: "9876543214", address: "Jaipur",     symptoms: "Cough, Fatigue, Fever",      medicalHistory: "COPD, Hypertension",     department: "Pulmonology",  doctorName: "Dr. Sana Khan",   status: "Waiting"   },
      { name: "Anjali Gupta",  age: 41, gender: "Female", phone: "9876543215", address: "Lucknow",    symptoms: "Weight gain, Fatigue",       medicalHistory: "Thyroid disorder",       department: "Endocrinology",doctorName: "Dr. Anand Mehta", status: "Waiting"   },
    ];

    const patients = await Patient.insertMany(
      patientsData.map((p, i) => ({
        ...p,
        clinicId: clinic._id,
        doctorAssigned: doctorStaff._id,
        registeredBy: receptionUser._id,
        queueNumber: i + 1,
        patientId: `P-DEMO${String(i + 1).padStart(2, "0")}`,
      }))
    );
    console.log(`🧑‍🤝‍🧑 Created ${patients.length} demo patients`);

    // ── Create Prescriptions ───────────────────────────────────────────────────
    const patient1 = patients[0]; // Rahul Sharma
    const patient2 = patients[1]; // Priya Patel

    const prescription1 = await Prescription.create({
      patientId: patient1._id,
      patientName: patient1.name,
      doctorId: doctorStaff._id,
      doctorName: "Dr. Anand Mehta",
      clinicId: clinic._id,
      medicines: [
        { name: "Amlodipine", dosage: "5 mg",  frequency: "Once daily",  duration: "30 days", notes: "Take in the morning" },
        { name: "Metformin",  dosage: "500 mg", frequency: "Twice daily", duration: "90 days", notes: "Take after meals" },
      ],
      diagnosis: "Hypertension with Type 2 Diabetes",
      instructions: "Monitor blood pressure and blood sugar daily.",
      aiInstructions: "Take Amlodipine 5mg every morning with water to control your blood pressure. Take Metformin 500mg after breakfast and dinner to manage your blood sugar. Avoid salty foods and sugary drinks. Monitor your readings daily and visit if readings are abnormal.",
      transcript: "Patient has hypertension and diabetes. Prescribing Amlodipine 5mg once daily and Metformin 500mg twice daily for 90 days.",
    });

    const prescription2 = await Prescription.create({
      patientId: patient2._id,
      patientName: patient2.name,
      doctorId: staffMembers[1]._id,
      doctorName: "Dr. Sana Khan",
      clinicId: clinic._id,
      medicines: [
        { name: "Salbutamol Inhaler", dosage: "100 mcg", frequency: "As needed", duration: "Ongoing", notes: "Use during breathlessness" },
        { name: "Budesonide Inhaler", dosage: "200 mcg", frequency: "Twice daily", duration: "30 days", notes: "Rinse mouth after use" },
      ],
      diagnosis: "Bronchial Asthma",
      instructions: "Use reliever inhaler during attacks. Use preventer inhaler daily.",
      aiInstructions: "Use Salbutamol inhaler (2 puffs) whenever you feel breathless — shake well before use. Use Budesonide inhaler every morning and evening — rinse your mouth after each use. Avoid dusty environments and cold air. Carry your reliever inhaler at all times.",
    });

    console.log("📋 Created demo prescriptions");

    // ── Create Reminders ───────────────────────────────────────────────────────
    await Reminder.create({
      patientId: patient1._id,
      prescriptionId: prescription1._id,
      medicine: "Amlodipine",
      dosage: "5 mg",
      frequency: "Once daily",
      duration: "30 days",
      schedule: generateSchedule("Once daily", "Amlodipine"),
    });

    await Reminder.create({
      patientId: patient1._id,
      prescriptionId: prescription1._id,
      medicine: "Metformin",
      dosage: "500 mg",
      frequency: "Twice daily",
      duration: "90 days",
      schedule: generateSchedule("Twice daily", "Metformin"),
    });

    console.log("⏰ Created demo reminders");

    console.log("\n🎉 Seed complete! Demo credentials:");
    console.log("─────────────────────────────────────────────");
    console.log("👑 Platform Admin: admin@medassist.ai       / Admin@123");
    console.log("🏥 Clinic Admin:   clinic@medassist.ai      / Clinic@123");
    console.log("🩺 Doctor:         doctor@medassist.ai      / Doctor@123");
    console.log("📋 Receptionist:   reception@medassist.ai   / Reception@123");
    console.log("👤 Patient:        patient@medassist.ai     / Patient@123");
    console.log("─────────────────────────────────────────────");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
