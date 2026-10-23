const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { transcribeAudio } = require("../controllers/speechController");
const { protect } = require("../middleware/authMiddleware");

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".wav";
    cb(null, `audio_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["audio/wav", "audio/wave", "audio/mp3", "audio/mpeg", "audio/webm", "audio/ogg", "audio/x-wav"];
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(wav|mp3|webm|ogg|m4a)$/i)) {
    cb(null, true);
  } else {
    cb(new Error("Only audio files (wav, mp3, webm, ogg) are allowed."), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }); // 25 MB max

// POST /api/speech — accepts audio file OR processes without file (for demo/testing)
router.post("/", protect, upload.single("audio"), transcribeAudio);

module.exports = router;
