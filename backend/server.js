const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config(); // fallback for root .env if any

// ── Validate required env vars ────────────────────────────────────────────────
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"];
required.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
const isDev = process.env.NODE_ENV !== "production";

// In development: allow ALL origins (handles localhost, LAN IPs, etc.)
// In production: restrict to FRONTEND_URL only
app.use(cors({
  origin: isDev
    ? true  // reflect the request origin — allows any origin in dev
    : (origin, cb) => {
      const allowed = [process.env.FRONTEND_URL].filter(Boolean);
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/clinic", require("./routes/clinic"));
app.use("/api/staff", require("./routes/staff"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/speech", require("./routes/speech"));
app.use("/api/agent", require("./routes/agent"));
app.use("/api/prescription", require("./routes/prescription"));
app.use("/api/reminder", require("./routes/reminder"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/ward", require("./routes/ward")); // Ward admissions — Issues #4,#5,#7,#8

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "MedAssist AI Backend is running 🚀 (Supabase)",
    timestamp: new Date(),
    database: "Supabase (PostgreSQL)",
  });
});

// ─── Test Email Endpoint ─────────────────────────────────────────────────────
app.post("/api/test-email", async (req, res) => {
  const { to } = req.body;
  const mailer = require("./services/mailer");
  try {
    const targetEmail = to || "sandeepbyadav085@gmail.com";
    const success = await mailer.sendMail({
      to: targetEmail,
      subject: "MedAssist AI — Test Email Delivery",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0284c7;">MedAssist AI Email Delivery Test</h2>
          <p>Hello! If you are reading this email, Brevo email delivery is working successfully!</p>
          <p><strong>Sent to:</strong> ${targetEmail}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString("en-IN")}</p>
        </div>
      `,
    });
    res.json({ success, message: success ? `Email dispatched to ${targetEmail}` : "Failed to dispatch email" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use("*", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ─── Server Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  // Bind on 0.0.0.0 so the server is reachable from all network interfaces
  // (localhost, LAN IP, VMs, etc.) — Supabase calls still go out the default route
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MedAssist AI Server running on http://localhost:${PORT}`);
    console.log(`📦 Database: Supabase (PostgreSQL) — ${process.env.SUPABASE_URL}`);
    console.log(`🌐 CORS: open for all origins in development mode`);
  });
}

// Required for Vercel Serverless deployment
module.exports = app;
