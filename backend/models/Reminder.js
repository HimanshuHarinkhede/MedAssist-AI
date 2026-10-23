const supabase = require("../config/supabase");

const TABLE = "reminders";

async function create(fields) {
  const row = {
    patient_id: fields.patientId,
    prescription_id: fields.prescriptionId || null,
    medicine: fields.medicine,
    dosage: fields.dosage || "",
    frequency: fields.frequency,
    duration: fields.duration,
    schedule: fields.schedule || [],
    start_date: fields.startDate ? new Date(fields.startDate).toISOString() : new Date().toISOString(),
    end_date: fields.endDate ? new Date(fields.endDate).toISOString() : null,
    is_active: true,
    notes: fields.notes || "",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findByPatient(patientId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, prescription:prescriptions(diagnosis, created_at)`)
    .eq("patient_id", patientId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function updateScheduleItem(id, schedule) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ schedule })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { TABLE, create, findByPatient, findById, updateScheduleItem };
