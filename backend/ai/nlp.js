/**
 * nlp.js — Medical NLP entity extractor
 * Extracts medicine names, dosages, frequencies, and durations
 * from doctor speech/transcript text using enhanced rule-based regex patterns.
 * Supports English, Marathi (मराठी), and Hindi (हिंदी).
 */

// Common medicine keywords in English and Marathi/Hindi Devanagari
const MEDICINE_DICT = [
  // Paracetamol variants
  { match: ["paracetamol", "pcm", "crocin", "dolo", "calpol", "पॅरासिटामॉल", "पॅरासिटामोल", "पैरासिटामोल", "डोलो", "क्रोसिन", "कॅलपॉल"], standard: "Paracetamol" },
  // Amoxicillin variants
  { match: ["amoxicillin", "amoxiclav", "augmentin", "mox", "ॲमॉक्सिसिलिन", "अमोक्सिसिलिन", "ऑगमेंटिन", "अमोक्सिक्लाव्ह"], standard: "Amoxicillin" },
  // Cetirizine variants
  { match: ["cetirizine", "cetzine", "allegra", "fexofenadine", "सिट्रिझिन", "सेटिरिज़िन", "अलेग्रा"], standard: "Cetirizine" },
  // Pantoprazole / Antacids
  { match: ["pantoprazole", "pantocid", "pan-d", "pan 40", "omeprazole", "rabeprazole", "rabeloc", "aciloc", "ranitidine", "पँटोप्राझोल", "पॅन्टॉप", "पॅन", "अॅसिलॉक"], standard: "Pantoprazole" },
  // Azithromycin
  { match: ["azithromycin", "azithral", "अझिथ्रोमायसिन", "एजिथ्रोमाइसिन"], standard: "Azithromycin" },
  // Ibuprofen / Painkillers
  { match: ["ibuprofen", "combiflam", "brufen", "आयबुप्रोफेन", "कॉम्बिफ्लाम"], standard: "Ibuprofen" },
  // Diclofenac
  { match: ["diclofenac", "voveran", "व्होव्हेरॉन", "डायक्लोफेनॅक"], standard: "Diclofenac" },
  // Metformin / Diabetes
  { match: ["metformin", "glycomet", "मेटफॉर्मिन", "ग्लायकोमेट"], standard: "Metformin" },
  // Cough / Cold syrups
  { match: ["asthalin", "salbutamol", "ascoril", "benadryl", "कफ सिरप", "सिरप"], standard: "Cough Syrup" },
  // Antibiotics
  { match: ["ciprofloxacin", "ciplox", "doxycycline", "metronidazole", "flagyl", "सिप्रोफ्लॉक्सिन", "मेट्रोनिडाझोल"], standard: "Ciprofloxacin" },
  { match: ["cefixime", "taxim-o", "ceftriaxone", "monocef", "सेफिक्सिम"], standard: "Cefixime" },
  // Antihypertensive
  { match: ["amlodipine", "atorvastatin", "atorva", "telmisartan", "telma", "अमलोडिपिन", "अटोर्वा", "टेलमीसार्टन"], standard: "Amlodipine" },
  // Vitamins & Supplements
  { match: ["zincovit", "limcee", "vitamin", "shelcal", "calcium", "neurobion", "जिंकोव्हिट", "व्हिटॅमिन", "कॅल्शियम"], standard: "Multivitamin" },
];

// Map Devanagari numerals to standard ASCII digits
function normalizeNumbers(str) {
  if (!str) return "";
  const devanagariDigits = "०१२३४५६७८९";
  return str.replace(/[०-९]/g, (ch) => String(devanagariDigits.indexOf(ch)));
}

// Frequency pattern recognizers
const FREQUENCY_PATTERNS = [
  // Once daily
  {
    regex: /once\s+(?:a\s+)?daily|once\s+per\s+day|1\s*(?:time|x)\s*(?:a\s+)?day|od\b|दिवसातून\s*एकदा|दिवसातून\s*१\s*वेळ|एक\s*वेळा|दिन\s*में\s*एक\s*बार|रोज\s*एकदा/i,
    label: "Once daily (OD)"
  },
  // Twice daily
  {
    regex: /twice\s+(?:a\s+)?daily|twice\s+per\s+day|2\s*(?:times?|x)\s*(?:a\s+)?day|bid\b|bd\b|दिवसातून\s*दोनदा|दोन\s*वेळा|२\s*वेळा|दिन\s*में\s*दो\s*बार|सकाळ\s*आणि\s*संध्याकाळ|सकाळ\s*संध्याकाळ/i,
    label: "Twice daily (BD)"
  },
  // Three times daily
  {
    regex: /three\s+times\s+(?:a\s+)?day|thrice\s+daily|3\s*(?:times?|x)\s*(?:a\s+)?day|tid\b|tds\b|दिवसातून\s*तीनदा|तीन\s*वेळा|३\s*वेळा|दिन\s*में\s*तीन\s*बार/i,
    label: "Three times daily (TDS)"
  },
  // Four times daily
  {
    regex: /four\s+times\s+(?:a\s+)?day|4\s*(?:times?|x)\s*(?:a\s+)?day|qid\b|दिवसातून\s*चारदा|४\s*वेळा/i,
    label: "Four times daily (QID)"
  },
  // Bedtime
  {
    regex: /at\s+bedtime|at\s+night|at\s+hs\b|night\s+only|रात्री\s*झोपताना|झोपताना|रात्री|रात\s*को/i,
    label: "At bedtime (HS)"
  },
  // Intervals
  { regex: /every\s*(?:4|four)\s*hours?/i, label: "Every 4 hours" },
  { regex: /every\s*(?:6|six)\s*hours?/i, label: "Every 6 hours" },
  { regex: /every\s*(?:8|eight)\s*hours?/i, label: "Every 8 hours" },
  { regex: /every\s*(?:12|twelve)\s*hours?/i, label: "Every 12 hours" },
  // PRN / As needed
  { regex: /as\s+needed|when\s+required|prn\b|गरज\s*पडल्यास|आवश्यकतेनुसार|जरूरत\s*पड़ने\s*पर/i, label: "As needed (PRN)" },
  // With meals
  { regex: /with\s+meals|after\s+meals|जेवणानंतर|जेवल्यानंतर|खाने\s*के\s*बाद/i, label: "After meals" },
  { regex: /before\s+meals|जेवणापूर्वी|खाली\s*पोटी|भूकेल्या\s*पोटी|खाली\s*पेट/i, label: "Before meals" },
  { regex: /morning\s+(?:and|&)\s+evening/i, label: "Morning and evening" },
];

// Duration pattern recognizers
const DURATION_PATTERNS = [
  { regex: /(\d+)\s*(?:days?|दिवस|दिन)/i, template: (m) => `${m[1]} days` },
  { regex: /(\d+)\s*(?:weeks?|आठवडे|हफ्ते)/i, template: (m) => `${m[1]} weeks` },
  { regex: /(\d+)\s*(?:months?|महिने|महीने)/i, template: (m) => `${m[1]} months` },
  { regex: /एक\s*आठवडा|1\s*week/i, template: () => "1 week" },
  { regex: /दोन\s*आठवडे|2\s*weeks/i, template: () => "2 weeks" },
  { regex: /एक\s*महिना|1\s*month/i, template: () => "1 month" },
  { regex: /ongoing|indefinitely|long[-\s]term|नेहमीसाठी|चालू\s*ठेवा/i, template: () => "Ongoing" },
  { regex: /as\s+needed|गरज\s*असेल\s*तोपर्यंत/i, template: () => "As needed" },
];

const DOSAGE_REGEX = /(\d+(?:\.\d+)?)\s*(?:mg|mcg|ml|mg\/ml|iu|units?|g|gm|mmol|mEq|tablets?|capsules?|pills?|puffs?|drops?|tsp|tbsp|मिलीग्राम|मि\.ग्रा|एमजी|मिली|गोळी|गोळ्या|कॅप्सूल)/gi;

/**
 * Extract medical entities from text in English, Marathi, or Hindi
 * @param {string} rawText
 * @returns {{ medicine: string, dosage: string, frequency: string, duration: string, notes: string }[]}
 */
function extractEntities(rawText) {
  if (!rawText) return [];

  // Normalize Devanagari numerals to ASCII (e.g., ५०० -> 500)
  const text = normalizeNumbers(rawText);

  // Split into sentences / clauses
  const clauses = text.split(/(?:\.|\n|;|\band\b|\balso\b|आणि|तसेच|व|तथा)/gi).map(s => s.trim()).filter(Boolean);
  const results = [];
  const seenMedicines = new Set();

  for (const clause of clauses) {
    const lowerClause = clause.toLowerCase();
    let foundMedInClause = null;

    // 1. Check known keywords & dictionary
    for (const entry of MEDICINE_DICT) {
      for (const keyword of entry.match) {
        if (lowerClause.includes(keyword.toLowerCase())) {
          foundMedInClause = entry.standard;
          break;
        }
      }
      if (foundMedInClause) break;
    }

    // 2. Generic prefix check: "Tab Paracetamol" or "गोळी पॅरासिटामॉल"
    if (!foundMedInClause) {
      const matchPrefix = clause.match(/\b(?:tab|tablet|cap|capsule|syrup|inj|injection|गोळी|कॅप्सूल|सिरप)\s+([A-Za-z0-9\-\s\u0900-\u097F]{2,25})/i);
      if (matchPrefix) {
        foundMedInClause = matchPrefix[1].trim();
      }
    }

    // 3. Capitalized word before dosage: e.g., "Crocin 650mg"
    if (!foundMedInClause) {
      const matchCap = clause.match(/\b([A-Z][a-zA-Z0-9\-]{2,20})\s+\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|iu)/);
      if (matchCap) {
        foundMedInClause = matchCap[1].trim();
      }
    }

    if (foundMedInClause) {
      const normalizedKey = foundMedInClause.toLowerCase();
      if (seenMedicines.has(normalizedKey)) continue;
      seenMedicines.add(normalizedKey);

      // Extract dosage local to this clause (or text fallback)
      const localDosages = [...clause.matchAll(DOSAGE_REGEX)].map((m) => m[0]);
      let dosage = localDosages[0];
      if (!dosage) {
        const textDosages = [...text.matchAll(DOSAGE_REGEX)].map((m) => m[0]);
        dosage = textDosages[0] || "500 mg";
      }

      // Extract frequency local to clause or overall text
      let frequency = "Twice daily (BD)";
      for (const fp of FREQUENCY_PATTERNS) {
        if (fp.regex.test(clause) || fp.regex.test(text)) {
          frequency = fp.label;
          break;
        }
      }

      // Extract duration local to clause or overall text
      let duration = "5 days";
      for (const dp of DURATION_PATTERNS) {
        const m = clause.match(dp.regex) || text.match(dp.regex);
        if (m) {
          duration = dp.template(m);
          break;
        }
      }

      // Extract notes (e.g. after meals / with warm water)
      let notes = "";
      if (/after\s+meals|जेवणानंतर|जेवल्यानंतर|खाने\s*के\s*बाद/i.test(clause + " " + text)) {
        notes = "Take after meals";
      } else if (/before\s+meals|जेवणापूर्वी|खाली\s*पोटी|खाली\s*पेट/i.test(clause + " " + text)) {
        notes = "Take before meals (empty stomach)";
      } else if (/at\s+bedtime|झोपताना|रात\s*को/i.test(clause + " " + text)) {
        notes = "Take at bedtime";
      }

      results.push({
        medicine: foundMedInClause,
        dosage: dosage || "500 mg",
        frequency: frequency || "Twice daily (BD)",
        duration: duration || "5 days",
        notes: notes || ""
      });
    }
  }

  return results;
}

module.exports = { extractEntities };
