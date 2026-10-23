const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

const TABLE = "users";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Strip password from a user row before returning it */
function sanitize(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

/** Hash a plain-text password */
async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/** Compare a plain-text password against a stored hash */
async function matchPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ── CRUD Operations ───────────────────────────────────────────────────────────

async function findOne(filter) {
  let query = supabase.from(TABLE).select("*");
  Object.entries(filter).forEach(([k, v]) => { query = query.eq(k, v); });
  const { data, error } = await query.limit(1).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findById(id) {
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

async function findByIdSanitized(id) {
  const user = await findById(id);
  return sanitize(user);
}

async function create(fields) {
  const hashed = await hashPassword(fields.password);
  const row = {
    name: fields.name,
    email: (fields.email || "").toLowerCase(),
    password: hashed,
    role: fields.role || "patient",
    clinic_id: fields.clinicId || null,
    is_active: fields.isActive !== undefined ? fields.isActive : true,
    avatar: fields.avatar || "",
    phone: fields.phone || "",
    must_reset_password: fields.mustResetPassword || false,
    age: fields.age || null,
    gender: fields.gender || "",
    blood_group: fields.bloodGroup || "",
    address: fields.address || "",
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findByIdAndUpdate(id, updates) {
  const row = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.email !== undefined) row.email = updates.email.toLowerCase();
  if (updates.password !== undefined) row.password = await hashPassword(updates.password);
  if (updates.role !== undefined) row.role = updates.role;
  if (updates.clinicId !== undefined) row.clinic_id = updates.clinicId;
  if (updates.clinic_id !== undefined) row.clinic_id = updates.clinic_id;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.is_active !== undefined) row.is_active = updates.is_active;
  if (updates.mustResetPassword !== undefined) row.must_reset_password = updates.mustResetPassword;
  if (updates.must_reset_password !== undefined) row.must_reset_password = updates.must_reset_password;
  if (updates.avatar !== undefined) row.avatar = updates.avatar;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.age !== undefined) row.age = updates.age;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.bloodGroup !== undefined) row.blood_group = updates.bloodGroup;
  if (updates.address !== undefined) row.address = updates.address;

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function countDocuments(filter = {}) {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
  // Only apply simple equality filters for known safe columns
  const SIMPLE_COLS = ["role", "clinic_id", "is_active"];
  Object.entries(filter).forEach(([k, v]) => {
    if (SIMPLE_COLS.includes(k)) query = query.eq(k, v);
  });
  // Handle camelCase / snake_case date range
  const gteDate = filter.createdAt?.$gte || filter.created_at?.$gte;
  if (gteDate) query = query.gte("created_at", gteDate.toISOString ? gteDate.toISOString() : gteDate);
  const ltDate = filter.createdAt?.$lt || filter.created_at?.$lt;
  if (ltDate) query = query.lt("created_at", ltDate.toISOString ? ltDate.toISOString() : ltDate);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = {
  TABLE,
  sanitize,
  hashPassword,
  matchPassword,
  findOne,
  findById,
  findByIdSanitized,
  create,
  findByIdAndUpdate,
  countDocuments,
};
