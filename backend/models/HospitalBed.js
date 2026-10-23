const supabase = require("../config/supabase");
const { v4: uuidv4 } = require("uuid");

const TABLE = "hospital_beds";

// In-memory fallback cache (used seamlessly if Supabase table is not yet created)
let memoryBeds = [];
let hasCheckedTable = false;
let tableExistsInDb = true;

// Default starter beds to initialize if empty
function getDefaultStarterBeds(clinicId) {
  const defaults = [];
  const configs = [
    { ward: "General Ward", prefix: "GW-", count: 8 },
    { ward: "ICU", prefix: "ICU-", count: 4 },
    { ward: "ICCU", prefix: "ICCU-", count: 3 },
    { ward: "Pediatric Ward", prefix: "PED-", count: 4 },
    { ward: "Surgical Ward", prefix: "SURG-", count: 4 },
    { ward: "Maternity Ward", prefix: "MAT-", count: 4 },
  ];

  for (const cfg of configs) {
    for (let i = 1; i <= cfg.count; i++) {
      defaults.push({
        id: uuidv4(),
        clinic_id: clinicId,
        ward: cfg.ward,
        bed_number: `${cfg.prefix}${String(i).padStart(2, "0")}`,
        is_occupied: false,
        current_patient_id: null,
        current_patient_name: null,
        current_admission_id: null,
        notes: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
  return defaults;
}

async function checkTable() {
  if (hasCheckedTable) return tableExistsInDb;
  try {
    const { error } = await supabase.from(TABLE).select("id").limit(1);
    if (error && error.message.includes("Could not find the table")) {
      tableExistsInDb = false;
      console.warn("⚠️ hospital_beds table not in Supabase yet. Using dynamic fallback store.");
    } else {
      tableExistsInDb = true;
    }
  } catch {
    tableExistsInDb = false;
  }
  hasCheckedTable = true;
  return tableExistsInDb;
}

// ── Sync with active ward_admissions ──────────────────────────────────────────
async function syncOccupiedFromAdmissions(clinicId, beds) {
  try {
    const { data: activeAdmissions } = await supabase
      .from("ward_admissions")
      .select("id, patient_id, patient_name, ward, bed_number, status")
      .neq("status", "Discharged");

    if (!activeAdmissions || activeAdmissions.length === 0) return beds;

    for (const adm of activeAdmissions) {
      if (!adm.bed_number) continue;
      const targetBed = beds.find(
        (b) =>
          b.ward?.toLowerCase() === adm.ward?.toLowerCase() &&
          b.bed_number?.toLowerCase() === adm.bed_number?.toLowerCase()
      );
      if (targetBed) {
        targetBed.is_occupied = true;
        targetBed.current_patient_id = adm.patient_id;
        targetBed.current_patient_name = adm.patient_name;
        targetBed.current_admission_id = adm.id;
      }
    }
  } catch (err) {
    console.warn("Failed to sync active admissions with beds:", err.message);
  }
  return beds;
}

// ── Model Methods ─────────────────────────────────────────────────────────────

async function resolveClinicId(providedId) {
  if (providedId) return providedId;
  try {
    const { data } = await supabase.from("clinics").select("id").limit(1);
    if (data && data.length > 0) return data[0].id;
  } catch {}
  return "default-clinic";
}

async function findAll(filter = {}) {
  const isDb = await checkTable();
  const clinicId = await resolveClinicId(filter.clinicId);

  if (isDb) {
    try {
      let q = supabase.from(TABLE).select("*").order("ward").order("bed_number");
      if (clinicId && clinicId !== "default-clinic") q = q.eq("clinic_id", clinicId);
      if (filter.ward) q = q.eq("ward", filter.ward);

      let { data, error } = await q;
      if (error) throw error;

      // If DB table is empty for this clinic, initialize with default beds
      if (clinicId && (!data || data.length === 0)) {
        const defaults = getDefaultStarterBeds(clinicId);
        const { data: inserted, error: insErr } = await supabase.from(TABLE).insert(defaults).select();
        if (!insErr && inserted) data = inserted;
      }

      data = await syncOccupiedFromAdmissions(clinicId, data || []);
      if (filter.availableOnly === true || filter.availableOnly === "true") {
        data = data.filter((b) => !b.is_occupied);
      }
      return data;
    } catch (err) {
      console.warn("hospital_beds query error, falling back to memory:", err.message);
    }
  }

  // Memory fallback
  if (memoryBeds.length === 0 && clinicId) {
    memoryBeds = getDefaultStarterBeds(clinicId);
  }

  let result = memoryBeds.filter((b) => !clinicId || b.clinic_id === clinicId || clinicId === "default-clinic");
  if (filter.ward) {
    result = result.filter((b) => b.ward.toLowerCase() === filter.ward.toLowerCase());
  }

  result = await syncOccupiedFromAdmissions(clinicId, result);

  if (filter.availableOnly === true || filter.availableOnly === "true") {
    result = result.filter((b) => !b.is_occupied);
  }

  return result;
}

async function findById(id) {
  const isDb = await checkTable();
  if (isDb) {
    const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).single();
    if (!error && data) return data;
  }
  return memoryBeds.find((b) => b.id === id) || null;
}

async function create(fields) {
  const isDb = await checkTable();
  const clinicId = await resolveClinicId(fields.clinicId);
  const row = {
    clinic_id: clinicId,
    ward: fields.ward || "General Ward",
    bed_number: fields.bedNumber,
    is_occupied: false,
    current_patient_id: null,
    current_patient_name: null,
    current_admission_id: null,
    notes: fields.notes || "",
  };

  if (isDb) {
    const { data, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw error;
    return data;
  }

  const memRow = { ...row, id: uuidv4(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  memoryBeds.push(memRow);
  return memRow;
}

async function createBulk({ clinicId: rawClinicId, ward, prefix, count, startNumber = 1 }) {
  const isDb = await checkTable();
  const clinicId = await resolveClinicId(rawClinicId);
  const rows = [];
  const numCount = Number(count) || 1;
  const start = Number(startNumber) || 1;

  for (let i = 0; i < numCount; i++) {
    const num = start + i;
    rows.push({
      clinic_id: clinicId,
      ward: ward || "General Ward",
      bed_number: `${prefix || ""}${String(num).padStart(2, "0")}`,
      is_occupied: false,
      current_patient_id: null,
      current_patient_name: null,
      current_admission_id: null,
      notes: "",
    });
  }

  if (isDb) {
    const { data, error } = await supabase.from(TABLE).insert(rows).select();
    if (error) throw error;
    return data;
  }

  const memRows = rows.map((r) => ({
    ...r,
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  memoryBeds.push(...memRows);
  return memRows;
}

async function occupyBed(bedId, { patientId, patientName, admissionId }) {
  const isDb = await checkTable();
  const updateData = {
    is_occupied: true,
    current_patient_id: patientId,
    current_patient_name: patientName,
    current_admission_id: admissionId,
    updated_at: new Date().toISOString(),
  };

  if (isDb) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq("id", bedId)
      .select()
      .single();
    if (!error && data) return data;
  }

  const idx = memoryBeds.findIndex((b) => b.id === bedId);
  if (idx !== -1) {
    memoryBeds[idx] = { ...memoryBeds[idx], ...updateData };
    return memoryBeds[idx];
  }
  return null;
}

async function occupyByNumber(clinicId, ward, bedNumber, { patientId, patientName, admissionId }) {
  if (!bedNumber) return null;
  const isDb = await checkTable();
  const updateData = {
    is_occupied: true,
    current_patient_id: patientId,
    current_patient_name: patientName,
    current_admission_id: admissionId,
    updated_at: new Date().toISOString(),
  };

  if (isDb) {
    let q = supabase.from(TABLE).update(updateData).eq("bed_number", bedNumber);
    if (clinicId) q = q.eq("clinic_id", clinicId);
    if (ward) q = q.eq("ward", ward);
    const { data } = await q.select();
    if (data && data.length > 0) return data[0];
  }

  const target = memoryBeds.find(
    (b) =>
      (!clinicId || b.clinic_id === clinicId || clinicId === "default-clinic") &&
      (!ward || b.ward.toLowerCase() === ward.toLowerCase()) &&
      b.bed_number.toLowerCase() === bedNumber.toLowerCase()
  );
  if (target) {
    Object.assign(target, updateData);
    return target;
  }
  return null;
}

async function releaseBed(bedId) {
  const isDb = await checkTable();
  const updateData = {
    is_occupied: false,
    current_patient_id: null,
    current_patient_name: null,
    current_admission_id: null,
    updated_at: new Date().toISOString(),
  };

  if (isDb) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq("id", bedId)
      .select()
      .single();
    if (!error && data) return data;
  }

  const idx = memoryBeds.findIndex((b) => b.id === bedId);
  if (idx !== -1) {
    memoryBeds[idx] = { ...memoryBeds[idx], ...updateData };
    return memoryBeds[idx];
  }
  return null;
}

async function releaseByAdmission(admissionId) {
  if (!admissionId) return;
  const isDb = await checkTable();
  const updateData = {
    is_occupied: false,
    current_patient_id: null,
    current_patient_name: null,
    current_admission_id: null,
    updated_at: new Date().toISOString(),
  };

  if (isDb) {
    await supabase.from(TABLE).update(updateData).eq("current_admission_id", admissionId);
  }

  for (const b of memoryBeds) {
    if (b.current_admission_id === admissionId) {
      Object.assign(b, updateData);
    }
  }
}

async function releaseByBedNumber(clinicId, ward, bedNumber) {
  if (!bedNumber) return;
  const isDb = await checkTable();
  const updateData = {
    is_occupied: false,
    current_patient_id: null,
    current_patient_name: null,
    current_admission_id: null,
    updated_at: new Date().toISOString(),
  };

  if (isDb) {
    let q = supabase.from(TABLE).update(updateData).eq("bed_number", bedNumber);
    if (clinicId) q = q.eq("clinic_id", clinicId);
    if (ward) q = q.eq("ward", ward);
    await q;
  }

  const target = memoryBeds.find(
    (b) =>
      (!clinicId || b.clinic_id === clinicId || clinicId === "default-clinic") &&
      (!ward || b.ward.toLowerCase() === ward.toLowerCase()) &&
      b.bed_number.toLowerCase() === bedNumber.toLowerCase()
  );
  if (target) {
    Object.assign(target, updateData);
  }
}

async function deleteBed(id) {
  const isDb = await checkTable();
  if (isDb) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    if (error) throw error;
    return true;
  }
  memoryBeds = memoryBeds.filter((b) => b.id !== id);
  return true;
}

async function getStats(clinicId) {
  const beds = await findAll({ clinicId });
  const total = beds.length;
  const occupied = beds.filter((b) => b.is_occupied).length;
  const available = total - occupied;

  // Breakdown by ward
  const byWardMap = {};
  for (const b of beds) {
    const w = b.ward || "Other";
    if (!byWardMap[w]) {
      byWardMap[w] = { ward: w, total: 0, occupied: 0, available: 0, beds: [] };
    }
    byWardMap[w].total++;
    if (b.is_occupied) byWardMap[w].occupied++;
    else byWardMap[w].available++;
    byWardMap[w].beds.push(b);
  }

  return {
    total,
    occupied,
    available,
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    byWard: Object.values(byWardMap),
  };
}

module.exports = {
  findAll,
  findById,
  create,
  createBulk,
  occupyBed,
  occupyByNumber,
  releaseBed,
  releaseByAdmission,
  releaseByBedNumber,
  deleteBed,
  getStats,
};
