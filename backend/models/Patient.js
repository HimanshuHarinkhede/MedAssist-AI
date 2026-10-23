const supabase = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const TABLE = "patients";

function generatePatientId() {
  return `P-${uuidv4().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

async function getNextQueueNumber(clinicId) {
  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);
  if (error) throw error;
  return (count || 0) + 1;
}

async function create(fields) {
  const queueNumber = await getNextQueueNumber(fields.clinicId);
  const row = {
    patient_id: generatePatientId(),
    queue_number: queueNumber,
    name: fields.name,
    age: Number(fields.age),
    gender: fields.gender,
    phone: fields.phone || "",
    address: fields.address || "",
    email: fields.email || "",
    blood_group: fields.bloodGroup || "",
    symptoms: fields.symptoms,
    medical_history: fields.medicalHistory || "",
    allergies: fields.allergies || [],
    department: fields.department || "General",
    doctor_assigned: fields.doctorAssigned || null,
    doctor_name: fields.doctorName || "",
    clinic_id: fields.clinicId,
    registered_by: fields.registeredBy || null,
    status: fields.status || "Waiting",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findAll(filter = {}, opts = {}) {
  const buildQuery = (sel) => {
    let q = supabase.from(TABLE).select(sel).order("created_at", { ascending: false });
    if (filter.clinicId) q = q.eq("clinic_id", filter.clinicId);
    if (filter.status) {
      if (Array.isArray(filter.status.$in)) q = q.in("status", filter.status.$in);
      else q = q.eq("status", filter.status);
    }
    if (filter.department) q = q.eq("department", filter.department);
    if (filter.search) {
      q = q.or(`name.ilike.%${filter.search}%,patient_id.ilike.%${filter.search}%,phone.ilike.%${filter.search}%,email.ilike.%${filter.search}%`);
    }
    if (filter.createdAt?.$gte) q = q.gte("created_at", filter.createdAt.$gte.toISOString ? filter.createdAt.$gte.toISOString() : filter.createdAt.$gte);
    if (opts.skip) q = q.range(opts.skip, opts.skip + (opts.limit || 20) - 1);
    else if (opts.limit) q = q.limit(opts.limit);
    if (opts.sortQueueNumber) q = q.order("queue_number", { ascending: true });
    return q;
  };

  for (const sel of [`*, doctor:staff!patients_doctor_assigned_fkey(name, department)`, `*`]) {
    const { data, error } = await buildQuery(sel);
    if (!error) return data || [];
    if (sel === "*") throw error;
    console.warn("Patient.findAll join failed, retrying without join:", error.message);
  }
  return [];
}

async function findById(id) {
  const selectors = [
    `*, doctor:staff!patients_doctor_assigned_fkey(name, department), clinic:clinics(name, address), registered_user:users!patients_registered_by_fkey(name)`,
    `*, clinic:clinics(name, address)`,
    `*`,
  ];
  for (const sel of selectors) {
    const { data, error } = await supabase.from(TABLE).select(sel).eq("id", id).single();
    if (!error) return data || null;
    if (error.code === "PGRST116") return null;
    if (sel === "*") throw error;
    console.warn("Patient.findById join failed, retrying with simpler join:", error.message);
  }
  return null;
}

async function findByIdAndUpdate(id, updates) {
  const row = {};
  const map = {
    name: "name", age: "age", gender: "gender", phone: "phone",
    address: "address", email: "email", bloodGroup: "blood_group",
    blood_group: "blood_group",
    symptoms: "symptoms", medicalHistory: "medical_history",
    medical_history: "medical_history",
    allergies: "allergies", department: "department",
    doctorAssigned: "doctor_assigned", doctor_assigned: "doctor_assigned",
    doctorName: "doctor_name", doctor_name: "doctor_name",
    status: "status",
    queueNumber: "queue_number", queue_number: "queue_number",
  };
  Object.entries(updates).forEach(([k, v]) => { if (map[k] !== undefined) row[map[k]] = v; });

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function countDocuments(filter = {}) {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.status) {
    if (Array.isArray(filter.status?.$in)) query = query.in("status", filter.status.$in);
    else query = query.eq("status", filter.status);
  }
  if (filter.createdAt?.$gte) query = query.gte("created_at", filter.createdAt.$gte.toISOString());
  if (filter.updatedAt?.$gte) query = query.gte("updated_at", filter.updatedAt.$gte.toISOString());
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = { TABLE, create, findAll, findById, findByIdAndUpdate, countDocuments, getNextQueueNumber };
