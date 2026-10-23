import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { adminNavItems, platformAdminNavItems } from "@/lib/navItems";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Users, UserPlus, Hospital, Plus, X, Edit3, Trash2,
  MapPin, Phone, Mail, CheckCircle, XCircle, Stethoscope,
  ChevronRight, Eye, Save, Loader2, AlertTriangle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar,
} from "recharts";
import { clinicApi, dashboardApi, staffApi, getUser } from "@/lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STAT_COLORS: Record<string, string> = {
  blue: "from-blue-500 to-blue-600",
  teal: "from-teal-500 to-emerald-500",
  violet: "from-violet-500 to-purple-600",
  amber: "from-amber-500 to-orange-500",
};

function StatCard({ label, value, icon: Icon, color = "blue", sub }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 shadow-sm"
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${STAT_COLORS[color]} opacity-10`} />
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${STAT_COLORS[color]} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-3xl font-black">{value?.toLocaleString() ?? "—"}</p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

/* ── Clinic Details / Edit Modal ─────────────────────────────────────────────── */
function ClinicModal({
  clinic, onClose, onUpdated, onDeleted,
}: { clinic: any; onClose: () => void; onUpdated: (c: any) => void; onDeleted: (id: string) => void; }) {
  const [tab, setTab] = useState<"info" | "edit" | "doctor">("info");
  const [form, setForm] = useState({ ...clinic });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorForm, setDoctorForm] = useState({ name: "", email: "", phone: "", qualification: "", experience: "" });
  const [addingDoctor, setAddingDoctor] = useState(false);

  useEffect(() => {
    staffApi.list({ role: "Doctor", clinicId: clinic.id } as any)
      .then((r: any) => setDoctors(r.data || []))
      .catch(() => { });
  }, [clinic.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await clinicApi.update(clinic.id, {
        name: form.name, type: form.type, address: form.address,
        city: form.city, state: form.state, phone: form.phone,
        email: form.email, description: form.description,
        departments: typeof form.departments === "string"
          ? form.departments.split(",").map((d: string) => d.trim()).filter(Boolean)
          : form.departments,
      }) as any;
      if (res.success) {
        toast.success("Clinic updated");
        onUpdated(res.data || { ...clinic, ...form });
        setTab("info");
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await clinicApi.delete(clinic.id);
      toast.success(`${clinic.name} removed`);
      onDeleted(clinic.id);
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const handleAddDoctor = async () => {
    if (!doctorForm.name || !doctorForm.email) { toast.error("Doctor name and email are required"); return; }
    setAddingDoctor(true);
    try {
      const res = await staffApi.add({
        ...doctorForm,
        role: "Doctor",
        department: "General",
        shift: "Morning",
        clinicId: clinic.id,
        experience: Number(doctorForm.experience) || 0,
      }) as any;
      if (res.success) {
        toast.success(`Dr. ${doctorForm.name} added! Login: ${doctorForm.email} / pass123`);
        setDoctors(prev => [...prev, res.data?.staff]);
        setDoctorForm({ name: "", email: "", phone: "", qualification: "", experience: "" });
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setAddingDoctor(false); }
  };

  const deptStr = Array.isArray(form.departments)
    ? form.departments.join(", ")
    : (form.departments || "");

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="pointer-events-auto w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "calc(100vh - 2rem)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Hospital className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight">{clinic.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${clinic.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>{clinic.is_active ? "Active" : "Inactive"} · {clinic.type}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-5 shrink-0">
            {(["info", "edit", "doctor"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                {t === "doctor" ? "Add Doctor" : t === "edit" ? "Edit Details" : "Info"}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* ── Info Tab ── */}
            {tab === "info" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Address", value: clinic.address, icon: MapPin },
                    { label: "City / State", value: `${clinic.city || "—"}, ${clinic.state || "—"}`, icon: MapPin },
                    { label: "Phone", value: clinic.phone || "—", icon: Phone },
                    { label: "Email", value: clinic.email || "—", icon: Mail },
                    { label: "License No.", value: clinic.license_no || "—", icon: CheckCircle },
                  ].map(item => (
                    <div key={item.label} className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <item.icon className="h-3 w-3" />{item.label}
                      </p>
                      <p className="text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Rating</p>
                    <p className="text-sm font-medium">⭐ {clinic.rating ?? "N/A"}</p>
                  </div>
                </div>

                {/* Departments */}
                {clinic.departments?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Departments</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(clinic.departments) ? clinic.departments : [clinic.departments]).map((d: string) => (
                        <span key={d} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {clinic.description && (
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{clinic.description}</p>
                  </div>
                )}

                {/* Doctors list */}
                {doctors.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-primary" /> Doctors ({doctors.length})
                    </p>
                    <div className="space-y-2">
                      {doctors.map((d: any) => (
                        <div key={d?.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {d?.name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{d?.name}</p>
                            <p className="text-xs text-muted-foreground">{d?.department} · {d?.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete button */}
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors flex items-center justify-center gap-2 mt-2">
                    <Trash2 className="h-4 w-4" /> Remove This Clinic
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                      <AlertTriangle className="h-4 w-4" /> Are you sure? This cannot be undone.
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Edit Tab ── */}
            {tab === "edit" && (
              <div className="space-y-4">
                {[
                  { key: "name", label: "Facility Name *" },
                  { key: "address", label: "Street Address *" },
                  { key: "city", label: "City" },
                  { key: "state", label: "State" },
                  { key: "phone", label: "Phone" },
                  { key: "email", label: "Email" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input
                      className="form-input"
                      value={f.key === "departments" ? deptStr : (form[f.key] || "")}
                      onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="form-label">Departments (comma-separated)</label>
                  <input
                    className="form-input"
                    value={deptStr}
                    onChange={e => setForm((p: any) => ({ ...p, departments: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={form.description || ""}
                    onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))}
                  />
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            )}

            {/* ── Add Doctor Tab ── */}
            {tab === "doctor" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add a doctor to <strong>{clinic.name}</strong>. They will receive login credentials (email / <code className="bg-muted px-1 rounded">pass123</code>) and must reset their password on first login.
                </p>
                {[
                  { key: "name", label: "Doctor's Full Name *", placeholder: "Dr. Arun Sharma" },
                  { key: "email", label: "Email *", placeholder: "doctor@hospital.com" },
                  { key: "phone", label: "Phone", placeholder: "9876543210" },
                  { key: "qualification", label: "Qualification", placeholder: "MBBS, MD" },
                  { key: "experience", label: "Experience (years)", placeholder: "5", type: "number" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="form-label">{f.label}</label>
                    <input
                      className="form-input"
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      value={(doctorForm as any)[f.key]}
                      onChange={e => setDoctorForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <button onClick={handleAddDoctor} disabled={addingDoctor}
                  className="w-full py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-60">
                  {addingDoctor ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
                  Add Doctor
                </button>

                {doctors.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-semibold mb-2">Current Doctors</p>
                    {doctors.filter(Boolean).map(d => (
                      <div key={d?.id} className="flex items-center gap-3 bg-muted/40 rounded-xl px-4 py-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
                          {d?.name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{d?.name}</p>
                          <p className="text-xs text-muted-foreground">{d?.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [search, setSearch] = useState("");

  const user = getUser();
  const isPlatformAdmin = user?.role === "platform_admin";

  const fetchData = useCallback(async () => {
    try {
      const dashRes = await dashboardApi.admin() as any;
      if (dashRes.success) {
        setStats(dashRes.data.stats);
        setChartData(dashRes.data.clinicChartData || []);
        setClinics(dashRes.data.allClinics || []);
      }
    } catch (err: any) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredClinics = clinics.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase()) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout items={isPlatformAdmin ? platformAdminNavItems : adminNavItems} title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      items={isPlatformAdmin ? platformAdminNavItems : adminNavItems}
      title={isPlatformAdmin ? "Platform Administration" : "Clinic Administration"}
    >
      <div className="space-y-7">

        {/* Welcome */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "Admin"} 👋</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isPlatformAdmin ? "Platform overview — all registered facilities" : "Your clinic overview"}
            </p>
          </div>
          {isPlatformAdmin && (
            <Link to="/register-clinic"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/20 text-sm">
              <Plus className="h-4 w-4" /> Add Clinic / Hospital
            </Link>
          )}
        </div>

        {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isPlatformAdmin ? (
            <>
              <StatCard label="Registered Facilities" value={stats?.totalClinics} icon={Building2} color="blue" sub={`${stats?.activeClinics ?? stats?.totalClinics} active`} />
              <StatCard label="Total Doctors" value={stats?.totalDoctors} icon={Stethoscope} color="teal" />
              <StatCard label="Total Patients" value={stats?.totalPatients} icon={UserPlus} color="violet" />
              <StatCard label="Total Staff" value={stats?.totalStaff} icon={Users} color="amber" />
            </>
          ) : (
            <>
              <StatCard label="Clinic Staff" value={stats?.totalStaff} icon={Users} color="blue" />
              <StatCard label="Total Doctors" value={stats?.totalDoctors} icon={Stethoscope} color="teal" />
              <StatCard label="Total Patients" value={stats?.totalPatients} icon={UserPlus} color="violet" />
              <StatCard label="Prescriptions" value={stats?.totalPrescriptions} icon={Building2} color="amber" />
            </>
          )}
        </div>

        {/* ── Registration Chart (Platform Admin only) ─────────────────────────── */}
        {isPlatformAdmin && chartData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-base mb-1">Clinic Registrations — Last 6 Months</h2>
            <p className="text-xs text-muted-foreground mb-5">Monthly breakdown by facility type</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gClinic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gHospital" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Legend />
                <Area type="monotone" dataKey="Clinic" stroke="#3b82f6" fill="url(#gClinic)" strokeWidth={2} />
                <Area type="monotone" dataKey="Hospital" stroke="#10b981" fill="url(#gHospital)" strokeWidth={2} />
                <Area type="monotone" dataKey="Telemedicine" stroke="#a855f7" fill="none" strokeWidth={2} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── All Registered Clinics ───────────────────────────────────────────── */}
        {isPlatformAdmin && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> All Registered Facilities
                <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">{clinics.length}</span>
              </h2>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, city, type…"
                className="form-input !w-64 text-sm"
              />
            </div>

            {filteredClinics.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                <Hospital className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No facilities found</p>
                <Link to="/register-clinic" className="text-sm text-primary hover:underline mt-2 inline-block">
                  + Add your first clinic
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredClinics.map((clinic, i) => (
                  <motion.div
                    key={clinic.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Hospital className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm leading-tight line-clamp-1">{clinic.name}</h3>
                          <span className="text-xs text-muted-foreground">{clinic.type}</span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${clinic.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                        }`}>
                        {clinic.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                      {clinic.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {clinic.city}{clinic.state ? `, ${clinic.state}` : ""}
                        </div>
                      )}
                      {clinic.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" /> {clinic.phone}
                        </div>
                      )}
                      {clinic.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {clinic.email}
                        </div>
                      )}
                    </div>

                    {/* Depts preview */}
                    {clinic.departments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {(Array.isArray(clinic.departments) ? clinic.departments : []).slice(0, 3).map((d: string) => (
                          <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{d}</span>
                        ))}
                        {clinic.departments.length > 3 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{clinic.departments.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Action */}
                    <button
                      onClick={() => setSelectedClinic(clinic)}
                      className="w-full py-2 rounded-xl bg-muted hover:bg-primary hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2 group-hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" /> View Details
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinic Detail Modal */}
      <AnimatePresence>
        {selectedClinic && (
          <ClinicModal
            clinic={selectedClinic}
            onClose={() => setSelectedClinic(null)}
            onUpdated={updated => {
              setClinics(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
              setSelectedClinic(null);
            }}
            onDeleted={id => setClinics(prev => prev.filter(c => c.id !== id))}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
