const supabase = require("../config/supabase");

const TABLE = "staff";

async function create(fields) {
  const row = {
    user_id: fields.userId || null,
    clinic_id: fields.clinicId,
    name: fields.name,
    email: (fields.email || "").toLowerCase(),
    phone: fields.phone || "",
    role: fields.role,
    department: fields.department,
    shift: fields.shift || "Morning",
    qualification: fields.qualification || "",
    experience: fields.experience || 0,
    status: fields.status || "Active",
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findOne(filter) {
  let query = supabase.from(TABLE).select("*");
  if (filter.email) query = query.eq("email", filter.email.toLowerCase());
  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.id) query = query.eq("id", filter.id);
  if (filter.userId) query = query.eq("user_id", filter.userId);
  if (filter.name) query = query.eq("name", filter.name);
  const { data, error } = await query.limit(1).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findAll(filter = {}) {
  let query = supabase
    .from(TABLE)
    .select(`*, user:users!staff_user_id_fkey(email, must_reset_password, is_active)`)
    .order("role", { ascending: true })
    .order("name", { ascending: true });

  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  if (filter.role) query = query.eq("role", filter.role);
  if (filter.department) query = query.eq("department", filter.department);
  if (filter.shift) query = query.eq("shift", filter.shift);
  if (filter.status) query = query.eq("status", filter.status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(`*, clinic:clinics(name), user:users!staff_user_id_fkey(email, must_reset_password, is_active)`)
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findByIdAndUpdate(id, updates) {
  const row = {};
  const map = {
    name: "name", email: "email", phone: "phone", role: "role",
    department: "department", shift: "shift", qualification: "qualification",
    experience: "experience", status: "status", userId: "user_id",
  };
  Object.entries(updates).forEach(([k, v]) => { if (map[k]) row[map[k]] = v; });
  if (row.email) row.email = row.email.toLowerCase();

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function findByIdAndDelete(id) {
  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function countDocuments(filter = {}) {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (filter.clinicId) query = query.eq("clinic_id", filter.clinicId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = { TABLE, create, findOne, findAll, findById, findByIdAndUpdate, findByIdAndDelete, countDocuments };
