const supabase = require("../config/supabase");

const TABLE = "prescriptions";

async function create(fields) {
  const row = {
    patient_id: fields.patientId,
    patient_name: fields.patientName || "",
    doctor_id: fields.doctorId || null,
    doctor_name: fields.doctorName || "",
    clinic_id: fields.clinicId,
    medicines: fields.medicines || [],
    diagnosis: fields.diagnosis || "",
    instructions: fields.instructions || "Follow the prescribed medication schedule.",
    ai_instructions: fields.aiInstructions || "",
    transcript: fields.transcript || "",
    entities: fields.entities || {},
    validation_warnings: fields.validationWarnings || [],
    follow_up_date: fields.followUpDate || null,
    is_active: true,
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findByPatient(patientId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, patient:patients!prescriptions_patient_id_fkey(name, patient_id, age), clinic:clinics(name)`)
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function findByClinic(clinicId, skip = 0, limit = 20) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, patient:patients!prescriptions_patient_id_fkey(name, patient_id, age, gender)`)
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(skip, skip + limit - 1);
  if (error) throw error;
  return data || [];
}

async function countByClinic(clinicId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("is_active", true);
  if (error) throw error;
  return count || 0;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*,
      patient:patients!prescriptions_patient_id_fkey(name, patient_id, age, gender, phone),
      clinic:clinics(name, address, phone)`)
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findRecent(clinicId, limit = 5) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, patient:patients!prescriptions_patient_id_fkey(name, age)`)
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function countDocuments(filter = {}) {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.createdAt?.$gte) query = query.gte("created_at", filter.createdAt.$gte.toISOString());
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = { TABLE, create, findByPatient, findByClinic, countByClinic, findById, findRecent, countDocuments };
