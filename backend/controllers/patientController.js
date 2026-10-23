const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Clinic = require("../models/Clinic");
const User = require("../models/User");
const Staff = require("../models/Staff");
const mailer = require("../services/mailer");
const crypto = require("crypto");
const supabase = require("../config/supabase");

// ── POST /api/patient/register ─────────────────────────────────────────────
exports.registerPatient = async (req, res) => {
  try {
    const {
      name, age, gender, phone, address, email,
      bloodGroup, symptoms, medicalHistory, allergies,
      department, doctorName, doctorAssigned,
      isReturningPatient, existingPatientId,
      // Reception initial vitals
      weight, temperature, bp, pulse, spo2,
    } = req.body;

    if (!name || !age || !gender || !symptoms)
      return res.status(400).json({ success: false, message: "Name, age, gender, and symptoms are required." });

    let clinicId = req.user.clinic_id;
    if (!clinicId) {
      const allClinics = await Clinic.findAll();
      if (allClinics && allClinics.length > 0) clinicId = allClinics[0].id;
    }
    if (!clinicId)
      return res.status(400).json({ success: false, message: "No clinic associated with your account." });

    // Format vitals summary note
    const vitalsList = [];
    if (bp) vitalsList.push(`BP: ${bp}`);
    if (pulse) vitalsList.push(`Pulse: ${pulse} bpm`);
    if (temperature) vitalsList.push(`Temp: ${temperature}°F`);
    if (spo2) vitalsList.push(`SpO2: ${spo2}%`);
    if (weight) vitalsList.push(`Wt: ${weight} kg`);

    const vitalsStr = vitalsList.length > 0
      ? `[Initial Vitals (${new Date().toLocaleDateString("en-IN")}): ${vitalsList.join(" | ")}]`
      : "";

    const combinedHistory = medicalHistory
      ? (vitalsStr ? `${medicalHistory}\n${vitalsStr}` : medicalHistory)
      : vitalsStr;

    let patient;

    // ── CASE 1: RETURNING / ALREADY REGISTERED PATIENT ────────────────────────
    if (isReturningPatient && existingPatientId) {
      const existing = await Patient.findById(existingPatientId);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Existing patient record not found." });
      }

      const nextQueue = await Patient.getNextQueueNumber(clinicId);
      patient = await Patient.findByIdAndUpdate(existingPatientId, {
        status: "Waiting",
        queue_number: nextQueue,
        symptoms,
        department: department || existing.department || "General",
        doctor_assigned: doctorAssigned || existing.doctor_assigned,
        doctor_name: doctorName || existing.doctor_name,
        medical_history: combinedHistory || existing.medical_history,
        allergies: allergies || existing.allergies || [],
        phone: phone || existing.phone,
        email: email || existing.email,
        address: address || existing.address,
      });

      console.log(`📋 Returning patient ${patient.name} re-queued as #${nextQueue}`);
    } else {
      // ── CASE 2: NEW PATIENT REGISTRATION ────────────────────────────────────
      patient = await Patient.create({
        name,
        age: Number(age),
        gender,
        phone: phone || "",
        address: address || "",
        email: email ? email.toLowerCase() : "",
        bloodGroup: bloodGroup || "",
        symptoms,
        medicalHistory: combinedHistory,
        allergies: allergies || [],
        department: department || "General",
        doctorName: doctorName || "",
        doctorAssigned: doctorAssigned || null,
        clinicId,
        registeredBy: req.user.id,
      });

      console.log(`📋 New patient ${patient.name} registered with Queue #${patient.queue_number}`);

      // ── Auto-create User account & send credentials if email is provided ────
      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        try {
          const existingUser = await User.findOne({ email: cleanEmail });
          if (!existingUser) {
            // Generate a secure random password unique for every patient
            const tempPassword = "Med@" + crypto.randomBytes(3).toString("hex") + Math.floor(100 + Math.random() * 900);

            await User.create({
              name,
              email: cleanEmail,
              password: tempPassword,
              role: "patient",
              clinicId,
              phone: phone || "",
              age: Number(age),
              gender,
              bloodGroup: bloodGroup || "",
              address: address || "",
              mustResetPassword: true, // Must reset password on first login
            });

            console.log(`👤 Created patient portal account for ${cleanEmail} (temp password generated)`);

            // Send Welcome Email with Brevo
            mailer.sendPatientWelcomeEmail({
              patientName: name,
              email: cleanEmail,
              tempPassword,
              loginUrl: process.env.FRONTEND_URL || "http://localhost:8080",
            }).catch(e => console.error("Welcome email error:", e.message));
          }
        } catch (uErr) {
          console.warn("Could not create patient login user:", uErr.message);
        }
      }
    }

    // ── Calculate AI Estimated Consultation Turn Time ────────────────────────
    let estimatedTurnTime = "";
    let patientsAhead = 0;
    try {
      const { count: waitingCount } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .in("status", ["Waiting", "Consulting"]);
      patientsAhead = Math.max(0, (waitingCount || 1) - 1);
      const waitMinutes = patientsAhead * 12; // 12 minutes average consultation time
      const estDate = new Date(Date.now() + waitMinutes * 60 * 1000);
      estimatedTurnTime = estDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
    } catch (e) {
      console.warn("Could not calculate estimated turn time:", e.message);
    }

    // ── Send Visit Confirmation Email to Patient ─────────────────────────────
    if (email && email.trim()) {
      mailer.sendAppointmentConfirmationEmail({
        patientName: name,
        email: email.trim().toLowerCase(),
        doctorName,
        department,
        queueNumber: patient.queue_number,
        symptoms,
        vitals: { weight, temperature, bp, pulse, spo2 },
        date: new Date().toLocaleDateString("en-IN"),
        estimatedTurnTime,
      }).catch(e => console.error("Confirmation email error:", e.message));
    }

    // ── Notify Assigned Doctor via Email ─────────────────────────────────────
    if (doctorAssigned || doctorName) {
      (doctorAssigned
        ? Staff.findOne({ id: doctorAssigned, clinicId })
        : Staff.findOne({ name: doctorName, clinicId })
      )
        .then((doc) => {
          const docEmail = doc?.email;
          if (docEmail) {
            mailer.sendDoctorNewPatientNotification({
              doctorEmail: docEmail,
              doctorName: doc.name || doctorName,
              patientName: name,
              patientAge: age,
              patientGender: gender,
              symptoms,
              queueNumber: patient.queue_number,
              vitals: { weight, temperature, bp, pulse, spo2 },
            }).catch(e => console.error("Doctor notify email error:", e.message));
          }
        })
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: isReturningPatient
        ? `Returning patient ${patient.name} re-queued (Queue #${patient.queue_number})`
        : `Patient ${patient.name} registered (Queue #${patient.queue_number})`,
      data: {
        ...patient,
        estimatedTurnTime,
        patientsAhead,
      },
    });
  } catch (err) {
    console.error("registerPatient error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/list ──────────────────────────────────────────────────────
exports.listPatients = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const { status, department, search, page = 1, limit = 20 } = req.query;

    const filter = { clinicId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) filter.search = search;

    const skip = (Number(page) - 1) * Number(limit);
    const patients = await Patient.findAll(filter, { skip, limit: Number(limit) });
    const total = await Patient.countDocuments({ clinicId });

    res.json({
      success: true, count: patients.length, total, page: Number(page),
      pages: Math.ceil(total / Number(limit)), data: patients,
    });
  } catch (err) {
    console.error("listPatients error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/:id ───────────────────────────────────────────────────────
exports.getPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
    res.json({ success: true, data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/patient/:id ───────────────────────────────────────────────────────
exports.updatePatient = async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found." });
    res.json({ success: true, message: "Patient updated", data: patient });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/queue ─────────────────────────────────────────────────────
exports.getQueue = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patients = await Patient.findAll(
      { clinicId, status: { $in: ["Waiting", "Consulting"] }, createdAt: { $gte: today } },
      { sortQueueNumber: true }
    );

    res.json({ success: true, count: patients.length, data: patients });
  } catch (err) {
    console.error("getQueue error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/patient/book-appointment ────────────────────────────────────────
exports.bookAppointment = async (req, res) => {
  try {
    const { clinicId, symptoms, department, appointmentDate, age, gender, phone } = req.body;
    if (!clinicId || !symptoms || !appointmentDate)
      return res.status(400).json({ success: false, message: "Clinic, symptoms, and appointment date are required." });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic || !clinic.is_active)
      return res.status(404).json({ success: false, message: "Clinic not found." });

    const patientUser = req.user;
    if (patientUser.role !== "patient")
      return res.status(403).json({ success: false, message: "Only patients can book appointments." });

    const patientAge = age || patientUser.age || 25;
    const patientGender = gender || patientUser.gender || "Male";
    const patientPhone = phone || patientUser.phone || "";

    // If profile was incomplete, update user record in background
    if (!patientUser.age || !patientUser.gender) {
      User.findByIdAndUpdate(patientUser.id, { age: Number(patientAge), gender: patientGender, phone: patientPhone }).catch(() => {});
    }

    const appointment = await Appointment.create({
      clinicId,
      patientUserId: patientUser.id,
      patientName: patientUser.name,
      patientPhone,
      patientAge: Number(patientAge),
      patientGender,
      symptoms,
      department: department || "General",
      appointmentDate,
      status: "Scheduled",
    });

    // Calculate AI estimated time based on queue position
    const waitMinutes = Math.max(0, ((appointment.queue_number || 1) - 1)) * 12;
    const apptDateObj = new Date(appointmentDate);
    const estTime = new Date(apptDateObj.getTime() + waitMinutes * 60 * 1000);
    const estimatedTurnTime = estTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

    // Send appointment confirmation email to patient with estimated turn time
    if (patientUser.email) {
      mailer.sendAppointmentConfirmationEmail({
        patientName: patientUser.name,
        email: patientUser.email,
        department: department || "General",
        doctorName: "Attending Physician",
        queueNumber: appointment.queue_number,
        symptoms,
        date: new Date(appointmentDate).toLocaleDateString("en-IN"),
        estimatedTurnTime,
      }).catch(e => console.warn("Booking confirmation email error:", e.message));
    }

    res.status(201).json({
      success: true,
      message: `Appointment booked at ${clinic.name}! Your queue token is #${appointment.queue_number}. Estimated time: ${estimatedTurnTime}`,
      data: {
        ...appointment,
        clinicName: clinic.name,
        estimatedTurnTime,
      },
    });
  } catch (err) {
    console.error("bookAppointment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/my-appointments ─────────────────────────────────────────
exports.myAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.findAll({ patientUserId: req.user.id });
    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/clinic-appointments ─────────────────────────────────────
exports.clinicAppointments = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.findAll({
      clinicId,
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $nin: ["Cancelled"] },
    });

    res.json({ success: true, count: appointments.length, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/patient/appointment/:id ──────────────────────────────────────────
exports.updateAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body);
    if (!appt) return res.status(404).json({ success: false, message: "Appointment not found." });
    res.json({ success: true, message: "Appointment updated", data: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/my-status ───────────────────────────────────────────────
// Real-time status for patient dashboard: active queue, turn time, appointments
exports.getMyPatientStatus = async (req, res) => {
  try {
    const user = req.user;

    // Find matching records in patients table (by email, phone, or name)
    let patientQuery = supabase
      .from("patients")
      .select("*, clinic:clinics(name, type, city, address, phone)")
      .order("created_at", { ascending: false });

    const orClauses = [];
    if (user.email) orClauses.push(`email.ilike.${user.email}`);
    if (user.phone) orClauses.push(`phone.eq.${user.phone}`);
    if (user.name) orClauses.push(`name.ilike.${user.name}`);
    if (orClauses.length > 0) patientQuery = patientQuery.or(orClauses.join(","));

    const { data: patientRecords } = await patientQuery;

    // Check for active visit (Waiting or Consulting)
    let activeQueue = null;
    const activePatient = (patientRecords || []).find(p => p.status === "Waiting" || p.status === "Consulting");

    if (activePatient) {
      // Count how many patients ahead with status Waiting or Consulting and lower queue
      const { count: aheadCount } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", activePatient.clinic_id)
        .in("status", ["Waiting", "Consulting"])
        .lt("queue_number", activePatient.queue_number);

      const patientsAhead = aheadCount || 0;
      const waitMinutes = patientsAhead * 12; // 12 mins average
      const estDate = new Date(Date.now() + waitMinutes * 60 * 1000);
      const estimatedTurnTime = estDate.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

      activeQueue = {
        id: activePatient.id,
        patientId: activePatient.patient_id,
        queueNumber: activePatient.queue_number,
        status: activePatient.status,
        department: activePatient.department || "General",
        doctorName: activePatient.doctor_name || "",
        symptoms: activePatient.symptoms || "",
        medicalHistory: activePatient.medical_history || "",
        clinic: activePatient.clinic || { name: "Clinic" },
        patientsAhead,
        waitMinutes,
        estimatedTurnTime,
      };
    }

    // Check upcoming/latest appointment
    const appointments = await Appointment.findAll({ patientUserId: user.id });
    const latestAppointment = (appointments || []).find(a => a.status === "Scheduled") || appointments?.[0] || null;

    // Registered clinic
    let registeredClinic = null;
    if (user.clinic_id) {
      registeredClinic = await Clinic.findById(user.clinic_id);
    } else if (patientRecords?.[0]?.clinic) {
      registeredClinic = patientRecords[0].clinic;
    } else {
      const publicClinics = await Clinic.findPublic();
      registeredClinic = publicClinics?.[0] || null;
    }

    res.json({
      success: true,
      data: {
        activeQueue,
        latestAppointment,
        registeredClinic,
        totalVisits: (patientRecords || []).length,
      },
    });
  } catch (err) {
    console.error("getMyPatientStatus error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/my-prescriptions ─────────────────────────────────────────
// Real-time prescriptions assigned by doctors to this patient
exports.getMyPrescriptions = async (req, res) => {
  try {
    const user = req.user;

    // Find all matching patient records
    let patientQuery = supabase.from("patients").select("id");
    const orClauses = [];
    if (user.email) orClauses.push(`email.ilike.${user.email}`);
    if (user.phone) orClauses.push(`phone.eq.${user.phone}`);
    if (user.name) orClauses.push(`name.ilike.${user.name}`);
    if (orClauses.length > 0) patientQuery = patientQuery.or(orClauses.join(","));

    const { data: matchedPatients } = await patientQuery;
    const patientIds = (matchedPatients || []).map(p => p.id);

    let rxQuery = supabase
      .from("prescriptions")
      .select("*, clinic:clinics(name, address, phone)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (patientIds.length > 0 && user.name) {
      rxQuery = rxQuery.or(`patient_id.in.(${patientIds.join(",")}),patient_name.ilike.${user.name}`);
    } else if (patientIds.length > 0) {
      rxQuery = rxQuery.in("patient_id", patientIds);
    } else if (user.name) {
      rxQuery = rxQuery.ilike("patient_name", user.name);
    }

    const { data: prescriptions, error } = await rxQuery;
    if (error) throw error;

    res.json({ success: true, count: prescriptions.length, data: prescriptions || [] });
  } catch (err) {
    console.error("getMyPrescriptions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/my-schedule ──────────────────────────────────────────────
// Real-time medicine schedule parsed from doctor's assigned prescriptions
exports.getMyMedicineSchedule = async (req, res) => {
  try {
    const user = req.user;

    let patientQuery = supabase.from("patients").select("id");
    const orClauses = [];
    if (user.email) orClauses.push(`email.ilike.${user.email}`);
    if (user.phone) orClauses.push(`phone.eq.${user.phone}`);
    if (user.name) orClauses.push(`name.ilike.${user.name}`);
    if (orClauses.length > 0) patientQuery = patientQuery.or(orClauses.join(","));

    const { data: matchedPatients } = await patientQuery;
    const patientIds = (matchedPatients || []).map(p => p.id);

    let rxQuery = supabase
      .from("prescriptions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (patientIds.length > 0 && user.name) {
      rxQuery = rxQuery.or(`patient_id.in.(${patientIds.join(",")}),patient_name.ilike.${user.name}`);
    } else if (patientIds.length > 0) {
      rxQuery = rxQuery.in("patient_id", patientIds);
    } else if (user.name) {
      rxQuery = rxQuery.ilike("patient_name", user.name);
    }

    const { data: prescriptions } = await rxQuery;

    // Group medicines into slots
    const morning = [];
    const afternoon = [];
    const night = [];

    (prescriptions || []).forEach(rx => {
      (rx.medicines || []).forEach((m, idx) => {
        const name = m.name || m.medicine || "Medicine";
        const dosage = m.dosage || "1 dose";
        const freq = (m.frequency || "").toLowerCase();
        const instructions = m.notes || rx.instructions || "After meals";
        const item = {
          id: `${rx.id}-${idx}`,
          prescriptionId: rx.id,
          name,
          dosage,
          instructions,
          frequency: m.frequency || "As directed",
          doctorName: rx.doctor_name ? `Dr. ${rx.doctor_name}` : "Doctor",
          diagnosis: rx.diagnosis || "",
        };

        // Morning (8:00 AM)
        if (freq.includes("morning") || freq.includes("od") || freq.includes("once") || freq.includes("twice") || freq.includes("two") || freq.includes("three") || freq.includes("tds") || freq.includes("bd") || !freq) {
          morning.push({ ...item, time: "8:00 AM" });
        }
        // Afternoon (2:00 PM)
        if (freq.includes("afternoon") || freq.includes("three") || freq.includes("tds") || freq.includes("lunch") || freq.includes("noon")) {
          afternoon.push({ ...item, time: "2:00 PM" });
        }
        // Night (8:00 PM)
        if (freq.includes("night") || freq.includes("evening") || freq.includes("twice") || freq.includes("two") || freq.includes("three") || freq.includes("tds") || freq.includes("bd") || freq.includes("hs") || freq.includes("bedtime")) {
          night.push({ ...item, time: "8:00 PM" });
        }
      });
    });

    res.json({
      success: true,
      data: {
        morning,
        afternoon,
        night,
        totalMedicines: (prescriptions || []).reduce((acc, rx) => acc + (rx.medicines?.length || 0), 0),
        totalDoses: morning.length + afternoon.length + night.length,
      },
    });
  } catch (err) {
    console.error("getMyMedicineSchedule error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/patient/my-history ───────────────────────────────────────────────
// Real-time medical consultation and visit history
exports.getMyHealthHistory = async (req, res) => {
  try {
    const user = req.user;

    // 1. All patient visit records
    let patientQuery = supabase.from("patients").select("*, clinic:clinics(name)");
    const orClauses = [];
    if (user.email) orClauses.push(`email.ilike.${user.email}`);
    if (user.phone) orClauses.push(`phone.eq.${user.phone}`);
    if (user.name) orClauses.push(`name.ilike.${user.name}`);
    if (orClauses.length > 0) patientQuery = patientQuery.or(orClauses.join(","));

    const { data: patientRecords } = await patientQuery.order("created_at", { ascending: false });
    const patientIds = (patientRecords || []).map(p => p.id);

    // 2. All prescriptions
    let rxQuery = supabase.from("prescriptions").select("*, clinic:clinics(name)").eq("is_active", true);
    if (patientIds.length > 0 && user.name) {
      rxQuery = rxQuery.or(`patient_id.in.(${patientIds.join(",")}),patient_name.ilike.${user.name}`);
    } else if (patientIds.length > 0) {
      rxQuery = rxQuery.in("patient_id", patientIds);
    } else if (user.name) {
      rxQuery = rxQuery.ilike("patient_name", user.name);
    }
    const { data: prescriptions } = await rxQuery.order("created_at", { ascending: false });

    // 3. Appointments
    const appointments = await Appointment.findAll({ patientUserId: user.id });

    // Build timeline
    const timeline = [];

    (patientRecords || []).forEach(p => {
      const rxForVisit = (prescriptions || []).filter(rx => rx.patient_id === p.id);
      timeline.push({
        id: p.id,
        type: "visit",
        date: new Date(p.created_at).toLocaleDateString("en-IN"),
        rawDate: p.created_at,
        doctor: p.doctor_name ? `Dr. ${p.doctor_name}` : "Attending Doctor",
        department: p.department || "General",
        clinicName: p.clinic?.name || "MedAssist AI Clinic",
        symptoms: p.symptoms || "Consultation",
        status: p.status,
        vitals: p.medical_history || "",
        prescriptionsCount: rxForVisit.length,
        prescriptions: rxForVisit,
      });
    });

    (appointments || []).forEach(apt => {
      timeline.push({
        id: apt.id,
        type: "appointment",
        date: new Date(apt.appointment_date).toLocaleDateString("en-IN"),
        rawDate: apt.appointment_date,
        doctor: "General Consultation",
        department: apt.department || "General",
        clinicName: apt.clinic?.name || "MedAssist AI Clinic",
        symptoms: apt.symptoms || "Scheduled visit",
        status: apt.status,
        prescriptionsCount: 0,
      });
    });

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    res.json({
      success: true,
      count: timeline.length,
      data: timeline,
    });
  } catch (err) {
    console.error("getMyHealthHistory error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
