const supabase = require("../config/supabase");

const TABLE = "clinics";

async function create(fields) {
  const row = {
    name: fields.name,
    type: fields.type || "Clinic",
    address: fields.address || "",
    city: fields.city || "",
    state: fields.state || "",
    phone: fields.phone || "",
    email: fields.email || "",
    owner_id: fields.ownerId || null,
    departments: fields.departments || ["General"],
    is_active: true,
    license_no: fields.licenseNo || "",
    description: fields.description || "",
    rating: 0,
  };
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function findAll(filter = {}, opts = {}) {
  // Try with owner join first; fall back to plain select if FK is not set up
  let selectStr = `*, owner:users!clinics_owner_id_fkey(name, email)`;
  for (let attempt = 0; attempt < 2; attempt++) {
    let query = supabase.from(TABLE).select(selectStr);
    if (filter.isActive !== undefined) query = query.eq("is_active", filter.isActive);
    if (filter.type) query = query.eq("type", filter.type);
    query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (!error) return data || [];
    if (attempt === 0) {
      console.warn("Clinic.findAll join failed, retrying without owner join:", error.message);
      selectStr = "*"; // retry without join
    } else {
      throw error;
    }
  }
  return [];
}

async function findPublic() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, name, type, city, address, phone, departments, rating, email, description")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function findById(id) {
  // Try with owner join, fall back if FK missing
  for (const sel of [`*, owner:users!clinics_owner_id_fkey(name, email)`, `*`]) {
    const { data, error } = await supabase.from(TABLE).select(sel).eq("id", id).single();
    if (!error) return data || null;
    if (error.code === "PGRST116") return null; // not found
    if (sel === "*") throw error;
    console.warn("Clinic.findById join failed, retrying without owner:", error.message);
  }
  return null;
}

async function findByIdAndUpdate(id, updates) {
  const row = {};
  const map = {
    name: "name", type: "type", address: "address", city: "city",
    state: "state", phone: "phone", email: "email",
    departments: "departments", isActive: "is_active", is_active: "is_active",
    licenseNo: "license_no", description: "description", rating: "rating", logo: "logo",
    latitude: "latitude", longitude: "longitude",
  };
  Object.entries(updates).forEach(([k, v]) => { if (map[k]) row[map[k]] = v; });

  const { data, error } = await supabase.from(TABLE).update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function findByIdAndSoftDelete(id) {
  const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
  if (error) throw error;
}

async function countDocuments(filter = {}) {
  let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
  if (filter.isActive !== undefined) query = query.eq("is_active", filter.isActive);
  if (filter.createdAt?.$gte) query = query.gte("created_at", filter.createdAt.$gte.toISOString());
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function findRecent(limit = 5) {
  for (const sel of [`*, owner:users!clinics_owner_id_fkey(name, email)`, `*`]) {
    const { data, error } = await supabase
      .from(TABLE).select(sel)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error) return data || [];
    if (sel === "*") throw error;
    console.warn("Clinic.findRecent join failed, retrying:", error.message);
  }
  return [];
}

module.exports = { TABLE, create, findAll, findPublic, findById, findByIdAndUpdate, findByIdAndSoftDelete, countDocuments, findRecent };
