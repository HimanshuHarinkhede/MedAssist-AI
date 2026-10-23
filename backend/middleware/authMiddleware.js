const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Protect routes — verifies JWT token from Authorization header
 */
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token)
      return res.status(401).json({ success: false, message: "Not authorized — no token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ success: false, message: "User not found" });
    if (!user.is_active)
      return res.status(401).json({ success: false, message: "Account is deactivated" });

    // Attach the user row (without password) to req.user
    const { password, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized — invalid token" });
  }
};

/**
 * Restrict access to specific roles
 * Usage: authorize("doctor", "clinic_admin")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
