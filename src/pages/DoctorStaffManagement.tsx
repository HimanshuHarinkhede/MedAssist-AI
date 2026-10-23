import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserPlus, Users, Search, X, Loader2, CheckCircle,
    Stethoscope, Trash2, Edit3, Mail, Phone, Briefcase, AlertTriangle,
} from "lucide-react";
import { staffApi, getUser } from "@/lib/api";
import { toast } from "sonner";

const ROLES = ["Nurse", "Receptionist", "Pharmacist", "Lab Technician"];
const DEPARTMENTS = ["General", "Cardiology", "Neurology", "Orthopedics", "Gynecology", "Pediatrics", "Dermatology", "ENT", "Oncology", "Pharmacy", "Lab", "Radiology"];
const SHIFTS = ["Morning", "Afternoon", "Evening", "Night"];
const STATUS_COLORS: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Inactive: "bg-red-100 text-red-600",
    "On Leave": "bg-amber-100 text-amber-700",
};

const emptyForm = {
    name: "", email: "", phone: "", role: "Nurse",
    department: "General", shift: "Morning",
    qualification: "", experience: "",
};

export default function DoctorStaffManagement() {
    const user = getUser();
    const clinicId = user?.clinic_id;

    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    /* ── Load staff (nurses / support — NOT doctors) ──────────────────────────── */
    const loadStaff = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (clinicId) params.clinicId = clinicId;
            const res = await staffApi.list(params) as any;
            // Filter to only show non-doctor staff that belong to this doctor's clinic
            const myStaff = (res.data || []).filter((s: any) =>
                s.role !== "Doctor" && s.role !== "Admin"
            );
            setStaff(myStaff);
        } catch { toast.error("Failed to load staff"); }
        finally { setLoading(false); }
    }, [clinicId]);

    useEffect(() => { loadStaff(); }, [loadStaff]);

    /* ── Filtered view ────────────────────────────────────────────────────────── */
    const filtered = staff.filter(s => {
        const matchSearch = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || s.role === filterRole;
        return matchSearch && matchRole;
    });

    /* ── Open add modal ───────────────────────────────────────────────────────── */
    const openAdd = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowModal(true);
    };

    /* ── Open edit modal ──────────────────────────────────────────────────────── */
    const openEdit = (s: any) => {
        setEditingId(s.id);
        setForm({
            name: s.name || "", email: s.email || "", phone: s.phone || "",
            role: s.role || "Nurse", department: s.department || "General",
            shift: s.shift || "Morning",
            qualification: s.qualification || "", experience: String(s.experience || ""),
        });
        setShowModal(true);
    };

    /* ── Save ─────────────────────────────────────────────────────────────────── */
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email) { toast.error("Name and email are required"); return; }
        setSaving(true);
        try {
            if (editingId) {
                const res = await staffApi.update(editingId, { ...form, experience: Number(form.experience) || 0 }) as any;
                if (res.success) {
                    setStaff(prev => prev.map(s => s.id === editingId ? { ...s, ...res.data } : s));
                    toast.success("Staff member updated");
                }
            } else {
                const res = await staffApi.add({
                    ...form,
                    clinicId,
                    experience: Number(form.experience) || 0,
                }) as any;
                if (res.success) {
                    toast.success(`${form.role} added! Login: ${form.email} / pass123`);
                    await loadStaff();
                }
            }
            setShowModal(false);
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    /* ── Delete ───────────────────────────────────────────────────────────────── */
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await staffApi.delete(deleteTarget.id);
            setStaff(prev => prev.filter(s => s.id !== deleteTarget.id));
            toast.success(`${deleteTarget.name} removed`);
            setDeleteTarget(null);
        } catch (e: any) { toast.error(e.message); }
        finally { setDeleting(false); }
    };

    return (
        <DashboardLayout items={doctorNavItems} title="My Staff">
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">My Staff</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Manage nurses, receptionists and support staff assigned to your clinic
                        </p>
                    </div>
                    <button onClick={openAdd}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition shadow-lg shadow-primary/20 text-sm">
                        <UserPlus className="h-4 w-4" /> Add Staff
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search name or email…" className="form-input pl-10 text-sm" />
                    </div>
                    <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="form-select text-sm !w-auto">
                        <option value="">All Roles</option>
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                </div>

                {/* Staff Grid */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium text-muted-foreground">No staff members found</p>
                        <button onClick={openAdd} className="text-sm text-primary hover:underline mt-2">+ Add your first staff member</button>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((s, i) => (
                            <motion.div key={s.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all">

                                {/* Top */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                                            {s.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm leading-tight">{s.name}</p>
                                            <p className="text-xs text-muted-foreground">{s.role}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLORS[s.status] || "bg-muted text-muted-foreground"}`}>
                                        {s.status || "Active"}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                                    <div className="flex items-center gap-2"><Mail className="h-3 w-3 shrink-0" />{s.email}</div>
                                    {s.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3 shrink-0" />{s.phone}</div>}
                                    <div className="flex items-center gap-2"><Briefcase className="h-3 w-3 shrink-0" />{s.department} · {s.shift} shift</div>
                                    {s.experience > 0 && <div className="flex items-center gap-2"><Stethoscope className="h-3 w-3 shrink-0" />{s.experience} yr{s.experience !== 1 ? "s" : ""} experience</div>}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-border">
                                    <button onClick={() => openEdit(s)}
                                        className="flex-1 py-2 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary text-xs font-medium transition flex items-center justify-center gap-1.5">
                                        <Edit3 className="h-3.5 w-3.5" /> Edit
                                    </button>
                                    <button onClick={() => setDeleteTarget(s)}
                                        className="flex-1 py-2 rounded-xl bg-muted hover:bg-red-50 hover:text-red-600 text-xs font-medium transition flex items-center justify-center gap-1.5">
                                        <Trash2 className="h-3.5 w-3.5" /> Remove
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                                className="pointer-events-auto w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col"
                                style={{ maxHeight: "calc(100vh - 2rem)" }}
                            >
                                <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                                    <h3 className="font-bold text-lg">{editingId ? "Edit Staff Member" : "Add Staff Member"}</h3>
                                    <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                                            <input className="form-input" placeholder="e.g. Priya Sharma" value={form.name} onChange={e => update("name", e.target.value)} required />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="form-label">Email <span className="text-red-500">*</span></label>
                                            <input className="form-input" type="email" placeholder="staff@clinic.com" value={form.email} onChange={e => update("email", e.target.value)} required disabled={!!editingId} />
                                            {!editingId && <p className="text-xs text-muted-foreground mt-1">Default password: <code className="bg-muted px-1 rounded">pass123</code> (must reset on first login)</p>}
                                        </div>
                                        <div>
                                            <label className="form-label">Phone</label>
                                            <input className="form-input" placeholder="9876543210" value={form.phone} onChange={e => update("phone", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="form-label">Role</label>
                                            <select className="form-select" value={form.role} onChange={e => update("role", e.target.value)}>
                                                {ROLES.map(r => <option key={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Department</label>
                                            <select className="form-select" value={form.department} onChange={e => update("department", e.target.value)}>
                                                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Shift</label>
                                            <select className="form-select" value={form.shift} onChange={e => update("shift", e.target.value)}>
                                                {SHIFTS.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Qualification</label>
                                            <input className="form-input" placeholder="B.Sc Nursing, GNM…" value={form.qualification} onChange={e => update("qualification", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="form-label">Experience (years)</label>
                                            <input className="form-input" type="number" min={0} placeholder="3" value={form.experience} onChange={e => update("experience", e.target.value)} />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={saving}
                                        className="w-full mt-6 py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition disabled:opacity-60">
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                        {editingId ? "Save Changes" : "Add Staff Member"}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
            <AnimatePresence>
                {deleteTarget && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6"
                            >
                                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                    <AlertTriangle className="h-7 w-7 text-red-600" />
                                </div>
                                <h3 className="text-lg font-bold text-center mb-1">Remove Staff?</h3>
                                <p className="text-sm text-muted-foreground text-center mb-5">
                                    <strong>{deleteTarget.name}</strong> will be removed and their login deactivated.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setDeleteTarget(null)}
                                        className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition">Cancel</button>
                                    <button onClick={handleDelete} disabled={deleting}
                                        className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60">
                                        {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        Remove
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </DashboardLayout>
    );
}
