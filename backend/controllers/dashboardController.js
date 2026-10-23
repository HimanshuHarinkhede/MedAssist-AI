const Patient = require("../models/Patient");
const Prescription = require("../models/Prescription");
const Staff = require("../models/Staff");
const Clinic = require("../models/Clinic");
const User = require("../models/User");
const supabase = require("../config/supabase");

// ── GET /api/dashboard/admin ───────────────────────────────────────────────────
exports.adminDashboard = async (req, res) => {
  try {
    const isPlatformAdmin = req.user.role === "platform_admin";
    const clinicId = req.user.clinic_id;

    let stats;
    let clinicChartData = [];

    if (isPlatformAdmin) {
      // Global stats for platform admin
      const [
        totalClinics, activeClinics,
        totalPatients, totalStaff,
      ] = await Promise.all([
        Clinic.countDocuments(),
        Clinic.countDocuments({ isActive: true }),
        Patient.countDocuments(),
        Staff.countDocuments(),
      ]);

      // Count doctors specifically
      const { count: totalDoctors } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "doctor");

      // ── 6-month clinic registration chart ──────────────────────────────
      // Pull all clinic created_at dates and bucket them by month
      const { data: clinicRows } = await supabase
        .from("clinics")
        .select("created_at, type")
        .order("created_at", { ascending: true });

      const monthMap = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        monthMap[key] = { month: key, Clinic: 0, Hospital: 0, Telemedicine: 0, Total: 0 };
      }

      (clinicRows || []).forEach(row => {
        const d = new Date(row.created_at);
        const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (monthMap[key]) {
          const t = row.type || "Clinic";
          if (monthMap[key][t] !== undefined) monthMap[key][t]++;
          monthMap[key].Total++;
        }
      });
      clinicChartData = Object.values(monthMap);

      stats = {
        totalClinics,
        activeClinics,
        totalDoctors: totalDoctors || 0,
        totalPatients,
        totalStaff,
      };
    } else {
      // Clinic-scoped stats for clinic_admin
      const [totalStaff, totalPatients, totalPrescriptions] = await Promise.all([
        Staff.countDocuments({ clinicId }),
        Patient.countDocuments({ clinicId }),
        Prescription.countDocuments({ clinicId }),
      ]);

      // Count doctors in this clinic
      const { count: totalDoctors } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "doctor")
        .eq("clinic_id", clinicId);

      stats = { totalStaff, totalPatients, totalPrescriptions, totalDoctors: totalDoctors || 0 };
    }

    // Fetch all clinics for platform admin (paginated list)
    const allClinics = isPlatformAdmin ? await Clinic.findAll({ isActive: true }) : [];

    res.json({
      success: true,
      data: { stats, clinicChartData, allClinics },
    });
  } catch (err) {
    console.error("adminDashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ── GET /api/dashboard/doctor ──────────────────────────────────────────────────
exports.doctorDashboard = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalPatients, todayPatients,
      totalPrescriptions, todayPrescriptions,
      waitingPatients,
    ] = await Promise.all([
      Patient.countDocuments({ clinicId }),
      Patient.countDocuments({ clinicId, createdAt: { $gte: today } }),
      Prescription.countDocuments({ clinicId }),
      Prescription.countDocuments({ clinicId, createdAt: { $gte: today } }),
      Patient.countDocuments({ clinicId, status: "Waiting" }),
    ]);

    const [recentPatients, recentPrescriptions] = await Promise.all([
      Patient.findAll({ clinicId }, { limit: 5 }),
      Prescription.findRecent(clinicId, 5),
    ]);

    // Weekly consultation chart (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await Patient.countDocuments({ clinicId, createdAt: { $gte: day, $lt: nextDay } });
      weeklyData.push({ day: day.toLocaleDateString("en-US", { weekday: "short" }), patients: count });
    }

    res.json({
      success: true,
      data: {
        stats: { totalPatients, todayPatients, totalPrescriptions, todayPrescriptions, waitingPatients },
        recentPatients, recentPrescriptions, weeklyData,
      },
    });
  } catch (err) {
    console.error("doctorDashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/dashboard/reception ──────────────────────────────────────────────
exports.receptionDashboard = async (req, res) => {
  try {
    const clinicId = req.user.clinic_id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalToday, waiting, consulting, completed, admitted] = await Promise.all([
      Patient.countDocuments({ clinicId, createdAt: { $gte: today } }),
      Patient.countDocuments({ clinicId, status: "Waiting" }),
      Patient.countDocuments({ clinicId, status: "Consulting" }),
      Patient.countDocuments({ clinicId, status: "Completed" }),
      Patient.countDocuments({ clinicId, status: "Admitted" }),
    ]);

    const queue = await Patient.findAll(
      { clinicId, status: { $in: ["Waiting", "Consulting"] } },
      { sortQueueNumber: true, limit: 10 }
    );

    res.json({
      success: true,
      data: { stats: { totalToday, waiting, consulting, completed, admitted }, queue },
    });
  } catch (err) {
    console.error("receptionDashboard error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
