const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Clinic = require("../models/Clinic");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// ── POST /api/auth/register ─────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, age, gender, bloodGroup, address } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const user = await User.create({ name, email, password, role: "patient", phone, age, gender, bloodGroup, address });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { token: generateToken(user.id), user: User.sanitize(user) },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Registration failed", error: err.message });
  }
};

// ── POST /api/auth/login ────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const isMatch = await User.matchPassword(password, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    if (!user.is_active)
      return res.status(403).json({ success: false, message: "Account is deactivated. Contact your admin." });

    let clinicData = null;
    if (user.clinic_id) {
      const clinic = await Clinic.findById(user.clinic_id);
      if (clinic) clinicData = { id: clinic.id, name: clinic.name, type: clinic.type, city: clinic.city, address: clinic.address };
    }

    const safeUser = User.sanitize(user);
    res.json({
      success: true,
      message: "Login successful",
      data: {
        token: generateToken(user.id),
        user: { ...safeUser, clinic: clinicData },
        mustResetPassword: user.must_reset_password,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed", error: err.message });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let clinicData = null;
    if (user?.clinic_id) {
      clinicData = await Clinic.findById(user.clinic_id);
    }
    res.json({ success: true, data: { ...User.sanitize(user), clinic: clinicData } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/auth/reset-password ───────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    if (newPassword === currentPassword)
      return res.status(400).json({ success: false, message: "New password must be different from the current password." });

    const user = await User.findById(req.user.id);
    const isMatch = await User.matchPassword(currentPassword, user.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Current password is incorrect." });

    await User.findByIdAndUpdate(user.id, { password: newPassword, mustResetPassword: false });

    res.json({ success: true, message: "Password reset successfully. You can now continue." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
