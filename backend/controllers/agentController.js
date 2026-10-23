const { processConsultation } = require("../ai/agent");

// ── POST /api/agent/process ────────────────────────────────────────────────────
/**
 * Core AI agent endpoint.
 * Input:  { text: "doctor speech text" }
 * Output: { entities, validation, instructions }
 */
exports.processText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Text input is required (minimum 5 characters).",
      });
    }

    const result = await processConsultation(text.trim());

    res.json({
      success: true,
      message: "AI agent processing complete",
      data: result,
    });
  } catch (err) {
    console.error("Agent process error:", err);
    res.status(500).json({ success: false, message: "Agent processing failed", error: err.message });
  }
};
