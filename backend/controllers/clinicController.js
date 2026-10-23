const Clinic = require("../models/Clinic");

// ── POST /api/clinic/register ─────────────────────── (platform_admin only) ──
exports.registerClinic = async (req, res) => {
  try {
    if (req.user.role !== "platform_admin")
      return res.status(403).json({ success: false, message: "Only the website admin can register clinics or hospitals." });

    const { name, type, address, city, state, phone, email, departments, licenseNo, description, latitude, longitude } = req.body;

    if (!name || !address) {
      return res.status(400).json({ success: false, message: "Clinic name and address are required." });
    }

    const clinic = await Clinic.create({
      name,
      type:        type || "Clinic",
      address,
      city:        city  || "",
      state:       state || "",
      phone:       phone || "",
      email:       email || "",
      ownerId:     req.user._id,
      departments: departments || ["General"],
      licenseNo:   licenseNo   || "",
      description: description || "",
      latitude:    latitude    ?? null,
      longitude:   longitude   ?? null,
    });

    res.status(201).json({ success: true, message: `${type || "Clinic"} registered successfully`, data: clinic });
  } catch (err) {
    console.error("registerClinic error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/clinic ───────────────────────────────────────────────────────────
exports.getAllClinics = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.type) filter.type = req.query.type;
    const clinics = await Clinic.findAll(filter);
    res.json({ success: true, count: clinics.length, data: clinics });
  } catch (err) {
    console.error("getAllClinics error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/clinic/public ────────────────────────── (no auth) ───────────────
exports.getPublicClinics = async (req, res) => {
  try {
    const clinics = await Clinic.findPublic();
    res.json({ success: true, count: clinics.length, data: clinics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/clinic/:id ────────────────────────────────────────────────────────
exports.getClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found." });
    res.json({ success: true, data: clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/clinic/:id ────────────────────────────────────────────────────────
exports.updateClinic = async (req, res) => {
  try {
    if (req.user.role !== "platform_admin")
      return res.status(403).json({ success: false, message: "Only the website admin can update clinics." });
    const clinic = await Clinic.findByIdAndUpdate(req.params.id, req.body);
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found." });
    res.json({ success: true, message: "Clinic updated", data: clinic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/clinic/:id ─────────────────────────────────────────────────────
exports.deleteClinic = async (req, res) => {
  try {
    if (req.user.role !== "platform_admin")
      return res.status(403).json({ success: false, message: "Only the website admin can delete clinics." });
    await Clinic.findByIdAndSoftDelete(req.params.id);
    res.json({ success: true, message: "Clinic deactivated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
