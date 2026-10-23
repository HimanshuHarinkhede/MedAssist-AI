const { generateChatResponse } = require("../ai/genai");

// ── POST /api/ai/chat ──────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, role } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message is required." });
    }

    const reply = await generateChatResponse(message.trim(), role || req.user?.role || "patient");

    res.json({
      success: true,
      data: {
        question: message,
        answer: reply,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(500).json({ success: false, message: "Chat failed", error: err.message });
  }
};
