/**
 * AdmittedPatients.tsx
 *
 * Fixes / Features:
 *   #4  — Doctor admits patient (via AdmitPatientModal); nurse allocates bed + logs vitals
 *   #5  — Doctor sees admitted patient details + daily vitals report
 *   #7  — (via PatientHistoryModal) doctor can view full medical history
 *   #8  — Admission form captures symptoms, saline/antibiotic medications
 */

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { receptionNavItems, doctorNavItems, staffNavItems } from "@/lib/navItems";
import { getUser, wardApi } from "@/lib/api";
import { HospitalBedManagerModal, HospitalBed } from "@/components/HospitalBedManager";
import {
  BedDouble, Plus, ChevronDown, ChevronUp, Loader2,
  Activity, Heart, Droplets, Weight, Thermometer, TestTube,
  LogOut, Pencil, RefreshCw, AlertCircle, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VitalsEntry {
  id: string;
  date: string;
  pulse?: string;
  bp?: string;
  spo2?: string;
  weight?: string;
  temperature?: string;
  blood_investigation?: string;
  notes?: string;
  recorded_by?: string;
}

interface AdmissionMedication {
  name: string;
  type: string;
  dosage: string;
  route: string;
  frequency: string;
  notes?: string;
}

interface WardAdmission {
  id: string;
  admission_id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  bed_number: string;
  ward: string;
  admit_date: string;
  discharge_date?: string;
  chief_complaint: string;
  provisional_diagnosis: string;
  admission_medications: AdmissionMedication[];
  vitals_log: VitalsEntry[];
  doctor_name: string;
  doctor_notes?: string;
  nurse_notes?: string;
  patient?: {
    name: string; age: number; gender: string; phone: string;
    blood_group: string; symptoms: string; allergies: string[];
  };
}

// ── Status badge colors ────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  Admitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Stable: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Under Observation": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Discharged: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

// ── Vitals Log Dialog ──────────────────────────────────────────────────────────
function VitalsLogModal({
  admission, onClose, onSaved, isNurse,
}: {
  admission: WardAdmission;
  onClose: () => void;
  onSaved: () => void;
  isNurse: boolean;
}) {
  const [form, setForm] = useState({ pulse: "", bp: "", spo2: "", weight: "", temperature: "", bloodInvestigation: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"log" | "add">("log");

  const save = async () => {
    if (!form.pulse && !form.bp && !form.spo2) {
      toast.error("Enter at least one vital sign (pulse, BP, or SpO2).");
      return;
    }
    setSaving(true);
    try {
      await wardApi.addVitals(admission.id, form);
      toast.success("✅ Vitals recorded successfully");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Vitals — {admission.patient_name}</h3>
              <p className="text-sm text-muted-foreground">Bed {admission.bed_number || "Not assigned"} • {admission.ward}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
            {(["log", ...(isNurse ? ["add"] : [])] as string[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as "log" | "add")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === t ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {t === "log" ? "📊 View History" : "➕ Add Vitals"}
              </button>
            ))}
          </div>

          {/* History tab */}
          {activeTab === "log" && (
            <div className="space-y-3">
              {admission.vitals_log.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No vitals recorded yet.</p>
              ) : (
                [...admission.vitals_log].reverse().map((v) => (
                  <div key={v.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(v.date).toLocaleString("en-IN")} • by {v.recorded_by}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {v.pulse && <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-red-500" /> {v.pulse} bpm</span>}
                      {v.bp && <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-blue-500" /> {v.bp}</span>}
                      {v.spo2 && <span className="flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-cyan-500" /> {v.spo2}%</span>}
                      {v.weight && <span className="flex items-center gap-1"><Weight className="h-3.5 w-3.5 text-purple-500" /> {v.weight} kg</span>}
                      {v.temperature && <span className="flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-orange-500" /> {v.temperature}°F</span>}
                    </div>
                    {v.blood_investigation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <TestTube className="h-3 w-3" /> {v.blood_investigation}
                      </p>
                    )}
                    {v.notes && <p className="text-xs text-muted-foreground italic">{v.notes}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Add vitals tab (nurse only) */}
          {activeTab === "add" && isNurse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Pulse (bpm)", field: "pulse", icon: <Heart className="h-4 w-4 text-red-500" />, ph: "e.g. 78" },
                  { label: "Blood Pressure", field: "bp", icon: <Activity className="h-4 w-4 text-blue-500" />, ph: "e.g. 120/80" },
                  { label: "SpO2 (%)", field: "spo2", icon: <Droplets className="h-4 w-4 text-cyan-500" />, ph: "e.g. 98" },
                  { label: "Weight (kg)", field: "weight", icon: <Weight className="h-4 w-4 text-purple-500" />, ph: "e.g. 65" },
                  { label: "Temperature (°F)", field: "temperature", icon: <Thermometer className="h-4 w-4 text-orange-500" />, ph: "e.g. 98.6" },
                ].map(({ label, field, icon, ph }) => (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">{icon} {label}</label>
                    <input
                      value={(form as any)[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      placeholder={ph}
                      className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"><TestTube className="h-4 w-4 text-green-500" /> Blood Investigation</label>
                  <input
                    value={form.bloodInvestigation}
                    onChange={(e) => setForm({ ...form, bloodInvestigation: e.target.value })}
                    placeholder="e.g. CBC, RBS"
                    className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional observations..."
                  rows={2}
                  className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Check className="h-4 w-4" /> Record Vitals</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Admission detail panel (expandable) ───────────────────────────────────────
function AdmissionRow({
  adm, isDoctor, isNurse, onRefresh,
}: {
  adm: WardAdmission;
  isDoctor: boolean;
  isNurse: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [bedInput, setBedInput] = useState(adm.bed_number);
  const [statusInput, setStatusInput] = useState(adm.status);
  const [updatingBed, setUpdatingBed] = useState(false);
  const [discharging, setDischarging] = useState(false);

  // Available vacant beds for this specific ward
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const fetchAvailableBeds = async () => {
    if (!adm.ward) return;
    setLoadingBeds(true);
    try {
      const res = await wardApi.beds({ ward: adm.ward, availableOnly: "true" }) as any;
      setAvailableBeds(res.data || []);
    } catch {
      setAvailableBeds([]);
    } finally {
      setLoadingBeds(false);
    }
  };

  useEffect(() => {
    if (expanded && (isNurse || isDoctor)) {
      fetchAvailableBeds();
    }
  }, [expanded, adm.ward]);

  const updateBed = async () => {
    setUpdatingBed(true);
    try {
      await wardApi.update(adm.id, { bedNumber: bedInput, status: statusInput });
      toast.success("✅ Bed allocation and status updated");
      onRefresh();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setUpdatingBed(false);
    }
  };

  const discharge = async () => {
    if (!window.confirm(`Discharge ${adm.patient_name}?`)) return;
    setDischarging(true);
    try {
      await wardApi.discharge(adm.id, "Patient discharged in stable condition.");
      toast.success(`✅ ${adm.patient_name} discharged`);
      onRefresh();
    } catch (err: any) {
      toast.error(`Discharge failed: ${err.message}`);
    } finally {
      setDischarging(false);
    }
  };

  const lastVitals = adm.vitals_log?.[adm.vitals_log.length - 1];

  return (
    <>
      {showVitals && (
        <VitalsLogModal
          admission={adm}
          onClose={() => setShowVitals(false)}
          onSaved={onRefresh}
          isNurse={isNurse}
        />
      )}
      <div className="border border-border rounded-2xl overflow-hidden">
        {/* Summary row */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <BedDouble className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{adm.patient_name}</p>
              <p className="text-xs text-muted-foreground">
                Bed {adm.bed_number || "—"} • {adm.ward} •{" "}
                {new Date(adm.admit_date).toLocaleDateString("en-IN")} •{" "}
                Dr. {adm.doctor_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[adm.status] || "bg-muted text-muted-foreground"}`}>
              {adm.status}
            </span>
            {lastVitals && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-red-500" /> {lastVitals.pulse}
                <Activity className="h-3.5 w-3.5 text-blue-500" /> {lastVitals.bp}
              </div>
            )}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 border-t border-border space-y-5">
                {/* Patient info */}
                <div className="grid sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Chief Complaint</p>
                    <p className="font-medium">{adm.chief_complaint || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provisional Diagnosis</p>
                    <p className="font-medium">{adm.provisional_diagnosis || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Patient Info</p>
                    <p className="font-medium">
                      {adm.patient?.age}y • {adm.patient?.gender} •{" "}
                      {adm.patient?.blood_group || "—"}
                    </p>
                  </div>
                </div>

                {/* Admission medications — Issue #8 */}
                {adm.admission_medications?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                      Admission Medications (Saline, Antibiotics, etc.)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {adm.admission_medications.map((med, i) => (
                        <span
                          key={i}
                          className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {med.name} {med.dosage} — {med.type} ({med.frequency})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Latest vitals */}
                {lastVitals && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                      Latest Vitals — {new Date(lastVitals.date).toLocaleString("en-IN")}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-sm">
                      {lastVitals.pulse && (
                        <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                          <Heart className="h-4 w-4 text-red-500" />
                          <span>{lastVitals.pulse} bpm</span>
                        </div>
                      )}
                      {lastVitals.bp && (
                        <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <span>{lastVitals.bp}</span>
                        </div>
                      )}
                      {lastVitals.spo2 && (
                        <div className="flex items-center gap-1.5 bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2 rounded-xl">
                          <Droplets className="h-4 w-4 text-cyan-500" />
                          <span>{lastVitals.spo2}%</span>
                        </div>
                      )}
                      {lastVitals.weight && (
                        <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-xl">
                          <Weight className="h-4 w-4 text-purple-500" />
                          <span>{lastVitals.weight} kg</span>
                        </div>
                      )}
                      {lastVitals.temperature && (
                        <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-xl">
                          <Thermometer className="h-4 w-4 text-orange-500" />
                          <span>{lastVitals.temperature}°F</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Nurse — bed allocation & status update */}
                {(isNurse || isDoctor) && adm.status !== "Discharged" && (
                  <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-border">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Bed Allocation ({availableBeds.length} vacant in {adm.ward})
                      </label>
                      <select
                        value={bedInput}
                        onChange={(e) => setBedInput(e.target.value)}
                        className="text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring font-medium min-w-[170px]"
                      >
                        <option value="">-- No Bed Assigned --</option>
                        {/* If current bed is set on this admission, show it as selected */}
                        {adm.bed_number && (
                          <option value={adm.bed_number}>
                            {adm.bed_number} (Current Bed)
                          </option>
                        )}
                        {/* Show all currently vacant beds in this ward */}
                        {availableBeds
                          .filter((b) => b.bed_number !== adm.bed_number)
                          .map((b) => (
                            <option key={b.id} value={b.bed_number}>
                              {b.bed_number} (Vacant)
                            </option>
                          ))}
                      </select>
                      {availableBeds.length === 0 && !adm.bed_number && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          ⚠️ No vacant beds in {adm.ward}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                      <select
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value)}
                        className="text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {["Admitted", "Stable", "Critical", "Under Observation"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={updateBed}
                      disabled={updatingBed}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 disabled:opacity-50 transition"
                    >
                      {updatingBed ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={() => setShowVitals(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-muted text-sm font-medium rounded-lg hover:bg-muted/80 transition"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {isNurse ? "Log Vitals" : "View Vitals"}
                    </button>
                    {isDoctor && (
                      <button
                        onClick={discharge}
                        disabled={discharging}
                        className="flex items-center gap-1.5 px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition"
                      >
                        {discharging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                        Discharge
                      </button>
                    )}
                  </div>
                )}

                {/* Doctor only — view vitals history */}
                {isDoctor && !isNurse && adm.status !== "Discharged" && (
                  <button
                    onClick={() => setShowVitals(true)}
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Activity className="h-3.5 w-3.5" /> View full vitals history ({adm.vitals_log.length} entries)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdmittedPatients() {
  const user = getUser();
  const role = user?.role || "nurse";
  const isDoctor = role === "doctor";
  const isNurse = role === "nurse" || role === "receptionist" || role === "clinic_admin";

  const [admissions, setAdmissions] = useState<WardAdmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showDischarged, setShowDischarged] = useState(false);
  const [showBedManager, setShowBedManager] = useState(false);

  const getNav = () => {
    if (role === "doctor") return doctorNavItems;
    if (role === "nurse") return staffNavItems;
    return receptionNavItems;
  };

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string> = {};
      if (!showDischarged) params.activeOnly = "true";
      const res = await wardApi.list(params) as any;
      setAdmissions(res.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showDischarged]);

  const activeCount = admissions.filter((a) => a.status !== "Discharged").length;

  return (
    <DashboardLayout items={getNav()} title="Admitted Patients">
      {/* Bed Manager Modal */}
      {showBedManager && (
        <HospitalBedManagerModal
          onClose={() => setShowBedManager(false)}
          onUpdated={load}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BedDouble className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold">
                {isNurse ? "Ward — Admitted Patients" : "Admitted Patients"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeCount} active • Nurses can log vitals & allocate vacant beds
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowBedManager(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium transition"
            >
              <BedDouble className="h-3.5 w-3.5" /> Bed Capacity & Map
            </button>
            <button
              onClick={() => setShowDischarged((p) => !p)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${showDischarged ? "bg-muted" : "border-border"}`}
            >
              {showDischarged ? "Hide" : "Show"} Discharged
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading admissions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Could not load admissions</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure the backend is running</p>
          </div>
        ) : admissions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <BedDouble className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No admitted patients</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isDoctor ? "Use 'Admit' button in Today's Patients to admit a patient." : "No patients have been admitted yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {admissions.map((adm) => (
              <AdmissionRow
                key={adm.id}
                adm={adm}
                isDoctor={isDoctor}
                isNurse={isNurse}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
