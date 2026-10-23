import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { adminNavItems, platformAdminNavItems } from "@/lib/navItems";
import { TableComponent } from "@/components/TableComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { staffApi, clinicApi, getUser } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface StaffMember {
  _id?: string;
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  shift: string;
  status: string;
  qualification?: string;
  experience?: number;
}

interface Clinic {
  id: string;
  name: string;
  city?: string;
}

const emptyForm = {
  name: "", role: "Doctor", department: "", email: "",
  phone: "", shift: "Morning", qualification: "", experience: 0,
  clinicId: "",
};

const ROLES = ["Doctor", "Nurse", "Receptionist", "Pharmacist", "Lab Technician", "Admin"];
const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"];
const DEPTS = [
  "General", "Cardiology", "Pediatrics", "Orthopedics", "Neurology",
  "Gynecology", "Dermatology", "ENT", "Oncology", "Radiology", "Pharmacy", "Lab",
];

const roleColor: Record<string, string> = {
  Doctor: "bg-blue-100 text-blue-700",
  Nurse: "bg-emerald-100 text-emerald-700",
  Receptionist: "bg-violet-100 text-violet-700",
  Pharmacist: "bg-amber-100 text-amber-700",
  "Lab Technician": "bg-cyan-100 text-cyan-700",
  Admin: "bg-rose-100 text-rose-700",
};

export default function StaffManagement() {
  const currentUser = getUser();
  const isPlatformAdmin = currentUser?.role === "platform_admin";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string | number) =>
    setForm((p) => ({ ...p, [key]: value }));

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await staffApi.list() as any;
      const data: any[] = res.data || [];
      setStaff(data.map(d => ({ ...d, id: d.id || d._id || "" })));
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClinics = useCallback(async () => {
    try {
      if (isPlatformAdmin) {
        // Platform admin: load all clinics for the dropdown
        const res = await clinicApi.getAll() as any;
        setClinics((res.data || []).map((c: any) => ({ id: c.id || c._id, name: c.name, city: c.city })));
      } else {
        // Clinic admin: load their own clinic for info display
        const clinicId = currentUser?.clinic_id;
        if (clinicId) {
          const res = await clinicApi.get(clinicId) as any;
          if (res.data) {
            setClinics([{ id: res.data.id, name: res.data.name, city: res.data.city }]);
          }
        }
      }
    } catch {
      setClinics([]);
    }
  }, [isPlatformAdmin, currentUser?.clinic_id]);

  useEffect(() => { loadStaff(); loadClinics(); }, [loadStaff, loadClinics]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      // For clinic_admin, pre-fill their clinic_id so it's always sent
      clinicId: isPlatformAdmin ? "" : (currentUser?.clinic_id || ""),
    });
    setModalOpen(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditingId(s._id || s.id || null);
    setForm({
      name: s.name, role: s.role, department: s.department,
      email: s.email, phone: s.phone, shift: s.shift,
      qualification: s.qualification || "", experience: s.experience || 0,
      clinicId: currentUser?.clinic_id || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingId(null); setForm(emptyForm); };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      await staffApi.delete(id);
      toast.success("Staff member removed");
      loadStaff();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.department) {
      toast.error("Name, email, and department are required");
      return;
    }
    if (isPlatformAdmin && !editingId && !form.clinicId) {
      toast.error("Please select a clinic for this staff member");
      return;
    }
    // For clinic_admin, validate clinic_id is available
    if (!isPlatformAdmin && !form.clinicId && !currentUser?.clinic_id) {
      toast.error("Your account is not associated with a clinic. Contact the platform admin.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };

      // Always include clinicId — backend uses it for platform_admin
      // and falls back to req.user.clinic_id for clinic_admin (but include it as safety)
      if (!isPlatformAdmin) {
        payload.clinicId = currentUser?.clinic_id || "";
      }

      if (editingId) {
        await staffApi.update(editingId, payload);
        toast.success("Staff member updated successfully");
      } else {
        const res: any = await staffApi.add(payload);
        toast.success(res.message || "Staff member added successfully");
      }
      closeModal();
      loadStaff();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header: "Name", accessor: (row: StaffMember) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
            {row.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{row.name}</p>
            <p className="text-xs text-muted-foreground truncate">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: "Role", accessor: (row: StaffMember) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${roleColor[row.role] || "bg-muted text-muted-foreground"}`}>
          {row.role}
        </span>
      )
    },
    { header: "Department", accessor: "department" as const },
    { header: "Shift", accessor: "shift" as const },
    {
      header: "Status", accessor: (row: StaffMember) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.status === "Active" ? "bg-emerald-100 text-emerald-700" :
            row.status === "On Leave" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
          }`}>{row.status || "Active"}</span>
      )
    },
    {
      header: "Actions", accessor: (row: StaffMember) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)}
            className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(row._id || row.id || "")}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    },
  ];

  return (
    <DashboardLayout items={isPlatformAdmin ? platformAdminNavItems : adminNavItems} title="Staff Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Staff Members</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {staff.length} member{staff.length !== 1 ? "s" : ""} registered
              {!isPlatformAdmin && clinics.length > 0 && (
                <span className="ml-1 text-primary font-medium">— {clinics[0].name}</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadStaff} disabled={loading} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading staff members…</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 border-2 border-dashed border-border rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UserPlus className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-semibold">No staff members yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first staff member to get started</p>
            </div>
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Staff
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <TableComponent columns={columns} data={staff} />
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={closeModal}
            />

            {/* Modal Panel — scrollable, never clips off screen */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="pointer-events-auto w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
                style={{ maxHeight: "calc(100vh - 2rem)" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{editingId ? "Edit Staff Member" : "Add New Staff"}</h3>
                      <p className="text-xs text-muted-foreground">{editingId ? "Update staff details" : "Creates a login account with default password"}</p>
                    </div>
                  </div>
                  <button onClick={closeModal} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto px-6 py-5 flex-1 space-y-4">

                  {/* Clinic Selector — only for platform_admin on new staff */}
                  {isPlatformAdmin && !editingId && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <label className="form-label text-amber-800">
                        Assign to Clinic <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={form.clinicId}
                        onChange={(e) => update("clinicId", e.target.value)}
                        className="form-select mt-1 border-amber-200 focus:ring-amber-400"
                      >
                        <option value="">— Select a clinic —</option>
                        {clinics.map(c => (
                          <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ""}</option>
                        ))}
                      </select>
                      {clinics.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No clinics found. <span className="font-medium">Register a clinic first.</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Clinic_admin: show their clinic name (read-only) */}
                  {!isPlatformAdmin && clinics.length > 0 && (
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <p className="text-xs font-medium text-blue-700">
                        Adding staff to: <strong>{clinics[0].name}</strong>
                        {clinics[0].city ? ` — ${clinics[0].city}` : ""}
                      </p>
                    </div>
                  )}

                  {/* Row 1: Name + Role */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                      <Input placeholder="Dr. John Smith" value={form.name} onChange={(e) => update("name", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Role <span className="text-red-500">*</span></label>
                      <select value={form.role} onChange={(e) => update("role", e.target.value)} className="form-select">
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Department + Shift */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Department <span className="text-red-500">*</span></label>
                      <select value={form.department} onChange={(e) => update("department", e.target.value)} className="form-select">
                        <option value="">— Select —</option>
                        {DEPTS.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Shift</label>
                      <select value={form.shift} onChange={(e) => update("shift", e.target.value)} className="form-select">
                        {SHIFTS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Email + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Email <span className="text-red-500">*</span></label>
                      <Input
                        type="email"
                        placeholder="staff@clinic.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        disabled={!!editingId}
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <Input placeholder="9876543210" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                    </div>
                  </div>

                  {/* Row 4: Qualification + Experience */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Qualification</label>
                      <Input placeholder="MBBS, MD…" value={form.qualification} onChange={(e) => update("qualification", e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Experience (yrs)</label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="5"
                        value={form.experience}
                        onChange={(e) => update("experience", Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Login hint */}
                  {!editingId && (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                      <strong>🔐 Auto-login account</strong> — A login will be created with default password{" "}
                      <code className="bg-blue-100 px-1 rounded">pass123</code>.
                      Staff must reset it on first login.
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                  <Button variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving} className="min-w-[130px]">
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
                    ) : editingId ? "Save Changes" : "Add Staff Member"}
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
