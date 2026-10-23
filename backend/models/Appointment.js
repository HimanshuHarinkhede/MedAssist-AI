const supabase = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const TABLE = "appointments";

function generateAppointmentId() {
  return `APT-${uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

async function getNextQueueNumber(clinicId, appointmentDate) {
  const dayStart = new Date(appointmentDate);
  dayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .gte("appointment_date", dayStart.toISOString());
  if (error) throw error;
  return (count || 0) + 1;
}

async function create(fields) {
  const apptDate = new Date(fields.appointmentDate);
  const queueNumber = await getNextQueueNumber(fields.clinicId, apptDate);

  const row = {
    appointment_id: generateAppointmentId(),
    clinic_id: fields.clinicId,
    patient_user_id: fields.patientUserId || null,
    patient_name: fields.patientName,
    patient_phone: fields.patientPhone || "",
    patient_age: Number(fields.patientAge),
    patient_gender: fields.patientGender,
    symptoms: fields.symptoms,
    department: fields.department || "General",
    appointment_date: apptDate.toISOString(),
    queue_number: queueNumber,
    status: fields.status || "Scheduled",
    notes: fields.notes || "",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findAll(filter = {}) {
  let query = supabase
    .from(TABLE)
    .select(`*, clinic:clinics(name, type, city, address, phone)`)
    .order("queue_number", { ascending: true });

  if (filter.patientUserId) query = query.eq("patient_user_id", filter.patientUserId);
  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.status?.$nin) query = query.not("status", "in", `(${filter.status.$nin.map(v => `"${v}"`).join(",")})`);
  if (filter.appointmentDate?.$gte) query = query.gte("appointment_date", filter.appointmentDate.$gte.toISOString());
  if (filter.appointmentDate?.$lt) query = query.lt("appointment_date", filter.appointmentDate.$lt.toISOString());

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findByIdAndUpdate(id, updates) {
  const row = {};
  const map = {
    status: "status", notes: "notes",
    patientName: "patient_name", patientPhone: "patient_phone",
    department: "department", appointmentDate: "appointment_date",
  };
  Object.entries(updates).forEach(([k, v]) => { if (map[k]) row[map[k]] = v; });

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

module.exports = { TABLE, create, findAll, findByIdAndUpdate };
