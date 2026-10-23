/**
 * validator.js — Medical prescription validator
 * Checks for dangerous drug interactions, missing fields,
 * and unreasonable dosages.
 */

// Known dangerous drug interactions (simplified reference set)
const DRUG_INTERACTIONS = [
  { drugs: ["warfarin", "aspirin"],          warning: "⚠️ Warfarin + Aspirin: Increased bleeding risk. Monitor INR closely." },
  { drugs: ["warfarin", "ibuprofen"],        warning: "⚠️ Warfarin + Ibuprofen: Increased bleeding risk. Avoid combination." },
  { drugs: ["metformin", "alcohol"],         warning: "⚠️ Metformin + Alcohol: Risk of lactic acidosis. Avoid alcohol." },
  { drugs: ["amiodarone", "digoxin"],        warning: "⚠️ Amiodarone + Digoxin: Increased digoxin toxicity risk." },
  { drugs: ["ssri", "tramadol"],             warning: "⚠️ SSRI + Tramadol: Risk of serotonin syndrome." },
  { drugs: ["sertraline", "tramadol"],       warning: "⚠️ Sertraline + Tramadol: Serotonin syndrome risk." },
  { drugs: ["ciprofloxacin", "antacid"],     warning: "⚠️ Ciprofloxacin + Antacids: Antacids reduce ciprofloxacin absorption." },
  { drugs: ["diazepam", "codeine"],          warning: "⚠️ Benzodiazepine + Opioid: Severe respiratory depression risk." },
  { drugs: ["alprazolam", "tramadol"],       warning: "⚠️ Alprazolam + Tramadol: CNS depression and respiratory risk." },
  { drugs: ["amlodipine", "simvastatin"],    warning: "⚠️ Amlodipine + Simvastatin: Increased risk of myopathy." },
];

// High-risk medicines that always warrant a warning
const HIGH_ALERT_DRUGS = ["warfarin","digoxin","insulin","morphine","codeine","lithium","methotrexate","amiodarone"];

// Basic dosage upper limits for common medicines (in mg per dose)
const DOSAGE_LIMITS = {
  paracetamol:   { max: 1000, unit: "mg", warn: "Paracetamol dose should not exceed 1000 mg per dose or 4000 mg/day." },
  ibuprofen:     { max: 800,  unit: "mg", warn: "Ibuprofen dose should not exceed 800 mg per dose." },
  aspirin:       { max: 1000, unit: "mg", warn: "Aspirin dose exceeds typical therapeutic range." },
  metformin:     { max: 1000, unit: "mg", warn: "Metformin doses above 1000 mg twice daily are uncommon; verify." },
  amoxicillin:   { max: 1000, unit: "mg", warn: "Amoxicillin dose above 1000 mg is unusual; verify indication." },
  ciprofloxacin: { max: 750,  unit: "mg", warn: "Ciprofloxacin dose above 750 mg per dose is uncommon." },
};

/**
 * Validate a list of extracted medicine entities
 * @param {{ medicine: string, dosage: string, frequency: string, duration: string }[]} entities
 * @returns {{ isValid: boolean, warnings: string[] }}
 */
function validatePrescription(entities) {
  const warnings = [];

  if (!entities || entities.length === 0) {
    return { isValid: false, warnings: ["No valid medicine entities could be extracted from the text."] };
  }

  const medicineNames = entities.map((e) => e.medicine.toLowerCase());

  // 1. Check for missing fields
  entities.forEach((entity, idx) => {
    if (!entity.medicine || entity.medicine === "Medication") {
      warnings.push(`Medicine ${idx + 1}: Medicine name could not be identified.`);
    }
    if (!entity.dosage || entity.dosage === "As prescribed") {
      warnings.push(`${entity.medicine}: Dosage not clearly specified.`);
    }
    if (!entity.frequency || entity.frequency === "As directed") {
      warnings.push(`${entity.medicine}: Frequency not clearly specified.`);
    }
    if (!entity.duration || entity.duration === "As directed") {
      warnings.push(`${entity.medicine}: Duration not clearly specified.`);
    }
  });

  // 2. Check drug interactions
  for (const interaction of DRUG_INTERACTIONS) {
    const allPresent = interaction.drugs.every((drug) =>
      medicineNames.some((m) => m.includes(drug))
    );
    if (allPresent) warnings.push(interaction.warning);
  }

  // 3. High-alert drug warnings
  for (const highAlert of HIGH_ALERT_DRUGS) {
    if (medicineNames.some((m) => m.includes(highAlert))) {
      warnings.push(`🔴 High-alert medication: ${highAlert.charAt(0).toUpperCase() + highAlert.slice(1)}. Requires careful monitoring.`);
    }
  }

  // 4. Dosage limit checks
  for (const entity of entities) {
    const medKey = entity.medicine.toLowerCase();
    const limitEntry = DOSAGE_LIMITS[medKey];
    if (limitEntry) {
      const dosageNum = parseFloat(entity.dosage);
      if (!isNaN(dosageNum) && dosageNum > limitEntry.max) {
        warnings.push(`⚠️ ${entity.medicine}: ${limitEntry.warn}`);
      }
    }
  }

  return {
    isValid: warnings.filter((w) => w.startsWith("Medicine") || w.startsWith("No valid")).length === 0,
    warnings,
  };
}

module.exports = { validatePrescription };
