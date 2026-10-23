const Staff = require("../models/Staff");
const User = require("../models/User");
const Clinic = require("../models/Clinic");

// ── POST /api/staff/add ────────────────────────────────────────────────────────
exports.addStaff = async (req, res) => {
  try {
    const { name, email, phone, role, department, shift, qualification, experience, clinicId: bodyClinicId } = req.body;

    if (!name || !email || !role || !department)
      return res.status(400).json({ success: false, message: "Name, email, role, and department are required." });

    // platform_admin: always use the body's clinicId
    // clinic_admin: prefer req.user.clinic_id, fall back to body clinicId
    const clinicId = req.user.role === "platform_admin"
      ? bodyClinicId
      : (req.user.clinic_id || bodyClinicId);

    console.log(`[addStaff] user role=${req.user.role}, user.clinic_id=${req.user.clinic_id}, body.clinicId=${bodyClinicId}, resolved clinicId=${clinicId}`);

    if (!clinicId)
      return res.status(400).json({ success: false, message: "A clinic must be associated with this staff member. Ensure your account has a clinic assigned." });

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ success: false, message: `Clinic not found (id: ${clinicId}).` });

    const existingStaff = await Staff.findOne({ email: email.toLowerCase(), clinicId });
    if (existingStaff)
      return res.status(400).json({ success: false, message: "Staff with this email already exists in this clinic." });

    const roleMap = {
      Doctor: "doctor",
      Nurse: "nurse",
      Receptionist: "receptionist",
      Admin: "clinic_admin",
      Pharmacist: "pharmacist",
      "Lab Technician": "lab_technician",
    };
    const userRole = roleMap[role] || "nurse";

    let userAccount = await User.findOne({ email: email.toLowerCase() });
    if (!userAccount) {
      userAccount = await User.create({
        name, email, password: "pass123",
        role: userRole, clinicId,
        phone: phone || "", mustResetPassword: true, isActive: true,
      });
    } else {
      await User.findByIdAndUpdate(userAccount.id, { clinicId, role: userRole, mustResetPassword: true });
    }

    const staff = await Staff.create({
      userId: userAccount.id, clinicId, name,
      email: email.toLowerCase(), phone: phone || "",
      role, department, shift: shift || "Morning",
      qualification: qualification || "", experience: experience || 0,
    });

    res.status(201).json({
      success: true,
      message: `${role} added. Login: ${email} / Password: pass123 (must reset on first login)`,
      data: { staff, loginEmail: email, defaultPassword: "pass123" },
    });
  } catch (err) {
    console.error("addStaff error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/staff/list ────────────────────────────────────────────────────────
exports.listStaff = async (req, res) => {
  try {
    const isPlatformAdmin = req.user.role === "platform_admin";
    // platform_admin: return all staff (or filter by query clinicId)
    // everyone else: return only their clinic's staff
    let clinicId = isPlatformAdmin
      ? (req.query.clinicId || null)
      : req.user.clinic_id;

    const { role, department, shift, status } = req.query;
    const filter = {};
    if (clinicId) filter.clinicId = clinicId;
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (shift) filter.shift = shift;
    if (status) filter.status = status;

    const staff = await Staff.findAll(filter);
    res.json({ success: true, count: staff.length, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/staff/:id ─────────────────────────────────────────────────────────
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found." });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/staff/:id ─────────────────────────────────────────────────────────
exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found." });
    res.json({ success: true, message: "Staff updated", data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/staff/:id ──────────────────────────────────────────────────────
exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found." });

    if (staff.user_id) {
      await User.findByIdAndUpdate(staff.user_id, { isActive: false });
    }

    res.json({ success: true, message: "Staff member removed and login deactivated." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
