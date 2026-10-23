/**
 * agent.js — MedAssist AI Agent (Core Brain)
 * Orchestrates: NLP extraction → Validation → AI instruction generation
 *
 * Fixes:
 *   #1 - Empty speech no longer generates phantom prescriptions — throws descriptive error.
 *   #2 - Multi-language: uses AI extraction with auto language detection.
 *   #6 - Differentiates doctor vs patient utterances via AI prompt engineering.
 */

const { extractEntities } = require("./nlp");
const { validatePrescription } = require("./validator");
const { generatePatientInstructions, extractEntitiesWithAI } = require("./genai");

/**
 * Full agent pipeline: text → entities → validation → instructions
 * @param {string} text - Raw doctor speech / transcript
 * @returns {Promise<{ entities: object[], validation: object, instructions: string }>}
 */
async function processConsultation(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Valid text input is required for agent processing.");
  }

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    throw new Error(
      "❌ The transcript is too short or empty. Please speak clearly during the consultation and try again."
    );
  }

  console.log("🧠 Agent: Starting consultation processing...");

  // Step 1: Try AI extraction first (supports multi-language + doctor-vs-patient filtering).
  // If API key is not configured, falls back to regex NLP.
  let entities = await extractEntitiesWithAI(trimmed);
  if (!entities || entities.length === 0) {
    // Fallback: regex-based NLP (English only)
    entities = extractEntities(trimmed);
  }
  console.log(`📝 Agent: Extracted ${entities.length} entity/entities`);

  // Step 2: If no medicines found, return empty array with a warning rather than throwing a fatal error
  if (!entities || entities.length === 0) {
    return {
      entities: [],
      validation: {
        isValid: false,
        warnings: [
          "No specific medications were automatically detected in the transcript. Please use '+ Add Medicine' below to add prescriptions manually."
        ],
      },
      instructions: "No medications detected in audio. Please review the consultation notes and enter prescriptions manually if needed.",
    };
  }

  // Step 3: Validate prescription
  const validation = validatePrescription(entities);
  console.log(`✅ Agent: Validation — isValid: ${validation.isValid}, warnings: ${validation.warnings.length}`);

  // Step 4: Generate patient-friendly instructions
  const instructions = await generatePatientInstructions(entities, trimmed);
  console.log("💬 Agent: Instructions generated");

  return {
    entities,        // Array of { medicine, dosage, frequency, duration, notes? }
    validation,      // { isValid: boolean, warnings: string[] }
    instructions,    // Patient-friendly string
  };
}

module.exports = { processConsultation };
