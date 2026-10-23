/**
 * WardAdmission.js — Supabase model for ward_admissions table
 * Handles Issues #4, #5, #7, #8
 */

const supabase = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const TABLE = "ward_admissions";

function generateAdmissionId() {
  return `ADM-${uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

async function create(fields) {
  const row = {
    admission_id: generateAdmissionId(),
    patient_id: fields.patientId,
    patient_name: fields.patientName || "",
    clinic_id: fields.clinicId,
    doctor_id: fields.doctorId || null,
    doctor_name: fields.doctorName || "",
    bed_number: fields.bedNumber || "",
    ward: fields.ward || "General Ward",
    admit_date: fields.admitDate || new Date().toISOString(),
    status: fields.status || "Admitted",
    chief_complaint: fields.chiefComplaint || "",
    provisional_diagnosis: fields.provisionalDiagnosis || "",
    admission_medications: fields.admissionMedications || [],
    vitals_log: fields.vitalsLog || [],
    doctor_notes: fields.doctorNotes || "",
    nurse_notes: fields.nurseNotes || "",
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findAll(filter = {}) {
  let query = supabase
    .from(TABLE)
    .select(`*, patient:patients!ward_admissions_patient_id_fkey(name, age, gender, phone, blood_group, symptoms, allergies)`)
    .order("admit_date", { ascending: false });

  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.patientId) query = query.eq("patient_id", filter.patientId);
  if (filter.doctorId) query = query.eq("doctor_id", filter.doctorId);

  // Default: only show active admissions (not discharged)
  if (filter.activeOnly) query = query.neq("status", "Discharged");

  const { data, error } = await query;
  if (error) {
    // Retry without join if FK alias fails
    let q2 = supabase.from(TABLE).select("*").order("admit_date", { ascending: false });
    if (filter.clinicId) q2 = q2.eq("clinic_id", filter.clinicId);
    if (filter.status) q2 = q2.eq("status", filter.status);
    if (filter.patientId) q2 = q2.eq("patient_id", filter.patientId);
    if (filter.activeOnly) q2 = q2.neq("status", "Discharged");
    const { data: d2, error: e2 } = await q2;
    if (e2) throw e2;
    return d2 || [];
  }
  return data || [];
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*,
      patient:patients!ward_admissions_patient_id_fkey(name, age, gender, phone, blood_group, symptoms, medical_history, allergies),
      clinic:clinics(name, address)`)
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findByPatient(patientId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("patient_id", patientId)
    .order("admit_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function update(id, updates) {
  const row = {};
  const map = {
    bedNumber: "bed_number", ward: "ward", status: "status",
    doctorNotes: "doctor_notes", nurseNotes: "nurse_notes",
    provisionalDiagnosis: "provisional_diagnosis",
    admissionMedications: "admission_medications",
    vitalsLog: "vitals_log", dischargeDate: "discharge_date",
  };
  Object.entries(updates).forEach(([k, v]) => { if (map[k]) row[map[k]] = v; });

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/**
 * Add a single vitals entry to the vitals_log JSONB array
 */
async function addVitalsEntry(id, vitalsEntry) {
  // Fetch current log
  const { data: current, error: fetchErr } = await supabase
    .from(TABLE).select("vitals_log").eq("id", id).single();
  if (fetchErr) throw fetchErr;

  const existingLog = current.vitals_log || [];
  const newEntry = {
    id: uuidv4(),
    date: vitalsEntry.date || new Date().toISOString(),
    pulse: vitalsEntry.pulse || null,
    bp: vitalsEntry.bp || null,
    spo2: vitalsEntry.spo2 || null,
    weight: vitalsEntry.weight || null,
    temperature: vitalsEntry.temperature || null,
    blood_investigation: vitalsEntry.bloodInvestigation || "",
    notes: vitalsEntry.notes || "",
    recorded_by: vitalsEntry.recordedBy || "",
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update({ vitals_log: [...existingLog, newEntry] })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function countActive(clinicId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .neq("status", "Discharged");
  if (error) throw error;
  return count || 0;
}

module.exports = { TABLE, create, findAll, findById, findByPatient, update, addVitalsEntry, countActive };
