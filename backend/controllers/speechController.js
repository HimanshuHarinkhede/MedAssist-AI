const fs = require("fs");
const path = require("path");

/**
 * Speech-to-Text Controller
 *
 * STT Priority (in order):
 *   1. Deepgram nova-2  — DEEPGRAM_API_KEY set → best multilingual support
 *                         (Marathi, Hindi, Gujarati, Tamil, English, 30+ languages)
 *   2. OpenAI Whisper   — OPENAI_API_KEY set AND is a real OpenAI key (not NVIDIA nvapi-)
 *   3. Google Cloud STT — GOOGLE_APPLICATION_CREDENTIALS points to a .json file
 *   4. Error            — No STT configured; tells doctor to use "Type Transcript" mode
 *
 * Key fixes:
 *   - NVIDIA nvapi- key is detected and Whisper is skipped (NVIDIA doesn't support STT)
 *   - Deepgram nova-2 with detect_language=true handles Marathi, Hindi, mixed speech
 *   - No fake English transcript is ever returned for non-English audio
 */

exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required." });
    }

    const audioPath = req.file.path;
    let transcript = "";
    let detectedLanguage = "";

    // ─────────────────────────────────────────────────────────────────────────
    // PRIORITY 1: Deepgram nova-2 (best multilingual: Marathi, Hindi, Gujarati)
    // ─────────────────────────────────────────────────────────────────────────
    const deepgramKey = process.env.DEEPGRAM_API_KEY;

    if (deepgramKey && deepgramKey.length > 10) {
      try {
        console.log("🎤 Trying Deepgram nova-2 (multilingual)...");
        const audioBuffer = fs.readFileSync(audioPath);

        // detect_language=true lets Deepgram auto-detect Marathi, Hindi, English etc.
        // nova-2-general is the best model for Indian languages on Deepgram
        const dgRes = await fetch(
          "https://api.deepgram.com/v1/listen?" + new URLSearchParams({
            model: "nova-2",
            detect_language: "true",
            smart_format: "true",
            punctuate: "true",
            utterances: "false",
          }).toString(),
          {
            method: "POST",
            headers: {
              "Authorization": `Token ${deepgramKey}`,
              "Content-Type": req.file.mimetype || "audio/webm",
            },
            body: audioBuffer,
          }
        );

        if (!dgRes.ok) {
          const errBody = await dgRes.text();
          throw new Error(`Deepgram HTTP ${dgRes.status}: ${errBody}`);
        }

        const dgData = await dgRes.json();
        const channel = dgData?.results?.channels?.[0];
        const alt = channel?.alternatives?.[0];

        if (alt?.transcript && alt.transcript.trim().length > 0) {
          transcript = alt.transcript.trim();
          // detected_language comes at channel level
          detectedLanguage = channel?.detected_language || "auto";
          console.log(`✅ Deepgram transcribed (lang: ${detectedLanguage}):`, transcript.slice(0, 120));
        } else {
          console.warn("⚠️ Deepgram returned empty transcript. Audio may be silent.");
          console.log("Deepgram raw response:", JSON.stringify(dgData).slice(0, 400));
        }
      } catch (dgErr) {
        console.error("⚠️ Deepgram failed:", dgErr.message);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIORITY 2: OpenAI Whisper (only for real OpenAI keys, NOT NVIDIA keys)
    // ─────────────────────────────────────────────────────────────────────────
    if (!transcript) {
      const openaiKey = process.env.OPENAI_API_KEY;
      const isNvidiaKey = openaiKey && openaiKey.startsWith("nvapi-");

      if (openaiKey && openaiKey !== "sk-your-openai-api-key-here" && !isNvidiaKey) {
        try {
          console.log("🎤 Trying OpenAI Whisper (multilingual)...");
          const OpenAI = require("openai");
          const openai = new OpenAI({ apiKey: openaiKey });

          const audioStream = fs.createReadStream(audioPath);
          const response = await openai.audio.transcriptions.create({
            file: audioStream,
            model: "whisper-1",
            // No language param → Whisper auto-detects (supports 99+ languages including Marathi)
            response_format: "verbose_json",
          });

          transcript = response.text || "";
          detectedLanguage = response.language || "auto";
          console.log(`✅ Whisper transcribed (lang: ${detectedLanguage}):`, transcript.slice(0, 120));
        } catch (whisperErr) {
          console.warn("⚠️ Whisper failed:", whisperErr.message);
        }
      } else if (openaiKey && openaiKey.startsWith("nvapi-")) {
        console.log("ℹ️ NVIDIA key detected — Whisper not supported by NVIDIA endpoint, skipping.");
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIORITY 3: Google Cloud Speech-to-Text
    // ─────────────────────────────────────────────────────────────────────────
    if (!transcript) {
      const gcCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (gcCreds && gcCreds.endsWith(".json") && fs.existsSync(gcCreds)) {
        try {
          console.log("🎤 Trying Google Cloud STT (multilingual Indian languages)...");
          const speech = require("@google-cloud/speech");
          const client = new speech.SpeechClient();
          const audioBytes = fs.readFileSync(audioPath).toString("base64");

          const [response] = await client.recognize({
            config: {
              encoding: "WEBM_OPUS",
              sampleRateHertz: 48000,
              languageCode: "en-IN",
              // Marathi, Hindi, Gujarati, Tamil, Telugu, Kannada
              alternativeLanguageCodes: ["mr-IN", "hi-IN", "gu-IN", "ta-IN", "te-IN", "kn-IN"],
              enableAutomaticPunctuation: true,
            },
            audio: { content: audioBytes },
          });

          transcript = response.results
            .map((r) => r.alternatives[0].transcript)
            .join(" ")
            .trim();
          detectedLanguage = "google-multilingual";
          console.log(`✅ Google STT transcribed:`, transcript.slice(0, 120));
        } catch (googleErr) {
          console.warn("⚠️ Google STT failed:", googleErr.message);
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cleanup uploaded audio file
    // ─────────────────────────────────────────────────────────────────────────
    try { fs.unlinkSync(audioPath); } catch (_) {}

    // ─────────────────────────────────────────────────────────────────────────
    // Manual mockTranscript override (for testing/demo only)
    // ─────────────────────────────────────────────────────────────────────────
    if (!transcript && req.body?.mockTranscript) {
      console.log("ℹ️ Using manually provided mockTranscript");
      return res.json({
        success: true,
        message: "Using provided transcript",
        data: { transcript: req.body.mockTranscript, detectedLanguage: "manual" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // All STT failed or audio was silent → return a clear actionable error
    // NEVER return a fake English transcript for non-English speech
    // ─────────────────────────────────────────────────────────────────────────
    if (!transcript) {
      return res.status(422).json({
        success: false,
        message:
          "Speech could not be transcribed. The audio may be silent, too short, or the STT service returned no result. " +
          "Please speak clearly and try again, or switch to 'Type Transcript' mode to type your notes manually.",
      });
    }

    res.json({
      success: true,
      message: "Speech transcribed successfully",
      data: {
        transcript,
        detectedLanguage,
        sttSource: deepgramKey ? `Deepgram nova-2 (${detectedLanguage})` : `Whisper (${detectedLanguage})`,
      },
    });
  } catch (err) {
    console.error("Speech transcription error:", err);
    res.status(500).json({ success: false, message: "Transcription failed: " + err.message });
  }
};
