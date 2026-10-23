/**
 * genai.js — OpenAI/NVIDIA integration for text generation tasks:
 * - Structured entity extraction from transcript/speech
 * - Patient-friendly instruction generation
 * - AI chat responses
 * Falls back gracefully if OPENAI_API_KEY is not set.
 */

const OpenAI = require("openai");

let openai = null;

function getClient() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-openai-api-key-here") {
    if (process.env.OPENAI_API_KEY.startsWith("nvapi-")) {
      openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: "https://integrate.api.nvidia.com/v1"
      });
    } else {
      openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }
  return openai;
}

function getModel() {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("nvapi-")) {
    return process.env.OPENAI_MODEL || "deepseek-ai/deepseek-r1";
  }
  return process.env.OPENAI_MODEL || "gpt-3.5-turbo";
}

function cleanResponse(text) {
  // Deepseek-R1 might return reasoning blocks <think>...</think>
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Extract structured medical entities using AI LLM
 * @param {string} transcript
 * @returns {Promise<Array<{medicine: string, dosage: string, frequency: string, duration: string, notes?: string}> | null>}
 */
async function extractEntitiesWithAI(transcript) {
  const client = getClient();
  if (!client) return null;

  // Issue #2: Multi-language support — LLM detects language and translates.
  // Issue #6: Doctor vs Patient differentiation — only extract prescriptions given BY THE DOCTOR.
  const prompt = `You are an expert clinical NLP assistant specializing in multilingual medical transcripts.

TRANSCRIPT:
"""
${transcript}
"""

CRITICAL INSTRUCTIONS:
1. The transcript may be in ANY language (Hindi, Gujarati, Marathi, Tamil, Spanish, Arabic, etc.) or a mix of languages. Understand and process it regardless of language.
2. ONLY extract medications that the DOCTOR is PRESCRIBING to the patient. Do NOT extract:
   - Medications the patient says they are currently taking (patient history)
   - Medications mentioned as allergies or past reactions
   - Medications the patient is asking about
   - Over-the-counter suggestions by patient themselves
3. If the doctor prescribes NO medications in this transcript, return an empty JSON array [].
4. Translate all medicine names to their standard English/generic names.

Return ONLY a JSON array of objects with these exact keys (no introductory text):
- "medicine": Standard English medicine name (e.g. "Paracetamol", "Augmentin 625", "Amoxicillin")
- "dosage": Exact dosage strength/amount (e.g. "500 mg", "650 mg", "10 ml", "1 tablet")
- "frequency": How often, in English (e.g. "Twice daily (BD)", "Once daily (OD)", "Three times daily (TDS)", "As needed (PRN)")
- "duration": Duration of treatment in English (e.g. "5 days", "7 days", "1 week", "Ongoing")
- "notes": Any special instructions in English (e.g. "After meals", "With warm water", "Avoid alcohol")

Output ONLY valid JSON array. No markdown, no explanation.`;

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
      temperature: 0.1,
    });
    const raw = cleanResponse(completion.choices[0].message.content.trim());
    const cleanJson = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed)) {
      // Return null (not empty array) so agent can try NLP fallback if AI returns []
      if (parsed.length === 0) return null;
      return parsed.map(item => ({
        medicine: String(item.medicine || "Medication"),
        dosage: String(item.dosage || "As prescribed"),
        frequency: String(item.frequency || "Twice daily (BD)"),
        duration: String(item.duration || "5 days"),
        notes: String(item.notes || "")
      }));
    }
  } catch (err) {
    console.error("AI Entity Extraction failed, falling back to NLP regex:", err.message);
  }
  return null;
}


/**
 * Generate patient-friendly instructions from extracted entities
 * @param {{ medicine: string, dosage: string, frequency: string, duration: string }[]} entities
 * @param {string} transcript
 * @returns {Promise<string>}
 */
async function generatePatientInstructions(entities, transcript = "") {
  const client = getClient();

  if (!client) {
    return buildFallbackInstructions(entities);
  }

  const entityList = entities
    .map((e) => `- ${e.medicine} ${e.dosage}, ${e.frequency} for ${e.duration}`)
    .join("\n");

  const prompt = `You are a helpful medical assistant. A doctor has prescribed the following medications to a patient.

Prescribed Medicines:
${entityList}

${transcript ? `Doctor's words: "${transcript}"` : ""}

Please write clear, simple, patient-friendly instructions in plain English. 
Include:
1. How and when to take each medicine
2. Important precautions
3. When to contact the doctor
Keep it warm, reassuring, and easy to understand. Maximum 150 words.`;

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.6,
    });
    return cleanResponse(completion.choices[0].message.content.trim());
  } catch (err) {
    console.error("OpenAI error (instructions):", err.message);
    return buildFallbackInstructions(entities);
  }
}

/**
 * Generate AI chat response for medical queries
 * @param {string} question
 * @param {string} role - "doctor" | "patient"
 * @returns {Promise<string>}
 */
async function generateChatResponse(question, role = "patient") {
  const client = getClient();

  if (!client) {
    return generateFallbackChatResponse(question);
  }

  const systemPrompt = role === "doctor"
    ? "You are an advanced clinical AI assistant helping a doctor. Provide evidence-based, precise medical information. Include drug interactions, dosing, and clinical pearls when relevant."
    : "You are a friendly patient health assistant. Explain medical information in simple, non-technical language. Be empathetic and reassuring. Always advise the patient to consult their doctor for personalized advice.";

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 500,
      temperature: 0.6,
    });
    return cleanResponse(completion.choices[0].message.content.trim());
  } catch (err) {
    console.error("OpenAI error (chat):", err.message);
    return generateFallbackChatResponse(question);
  }
}

// ─── Fallback helpers (no API key required) ────────────────────────────────────

function buildFallbackInstructions(entities) {
  if (!entities || entities.length === 0) {
    return "Please follow your doctor's prescription carefully. Take all medications as directed and complete the full course. Contact your doctor if you experience any side effects.";
  }

  const parts = entities.map((e) => {
    return `Take ${e.medicine} ${e.dosage} ${e.frequency.toLowerCase()} for ${e.duration}.`;
  });

  return (
    parts.join(" ") +
    " Take medications with adequate water. Do not skip doses. If you experience any unusual symptoms, contact your doctor immediately. Complete the full prescribed course even if you feel better."
  );
}

function generateFallbackChatResponse(question) {
  const q = question.toLowerCase();
  
  const responses = {
    "side effect": "Common side effects vary by medication. Always read the package insert provided with your medicine. If you experience severe reactions like difficulty breathing, rash, or swelling, seek immediate medical attention.",
    "food": "Most medications can be taken with food unless instructed otherwise. Taking medicine with food often reduces stomach upset. Some antibiotics should be taken on an empty stomach — follow your prescription label.",
    "miss": "If you miss a dose, take it as soon as you remember. If it's almost time for your next dose, skip the missed dose. Never double up doses. Set a reminder to help you remember future doses.",
    "store": "Most medicines should be stored at room temperature (15–30°C), away from direct sunlight and moisture. Refrigerate only if specifically instructed. Keep all medicines out of reach of children.",
    "alcohol": "Alcohol can interact with many medications, reducing effectiveness or increasing side effects. Avoid alcohol while on antibiotics, painkillers, or sedatives. Ask your pharmacist if in doubt.",
    "pregnancy": "Always inform your doctor if you are pregnant or planning a pregnancy before starting any medication. Many drugs are contraindicated during pregnancy.",
    "interact": "Drug interactions can be serious. Always tell your doctor about all medications, supplements, and herbal remedies you are taking. Never start a new medication without consulting your doctor.",
  };

  for (const [keyword, response] of Object.entries(responses)) {
    if (q.includes(keyword)) return response;
  }

  return "I'm here to help with general health information. For specific medical advice about your condition or medications, please consult your doctor or pharmacist. They have your complete medical history and can give you personalized guidance.";
}

module.exports = { extractEntitiesWithAI, generatePatientInstructions, generateChatResponse };
