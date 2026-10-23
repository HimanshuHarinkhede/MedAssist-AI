/**
 * Consultation.tsx
 *
 * Enhanced with:
 *   - Admit Patient button (Issue #4) — available right here during consultation
 *   - Medical History panel (Issue #7) — loads when patient is selected
 *   - Patient context card (age, gender, blood group, allergies, symptoms)
 *   - Patient list includes all statuses (Waiting, Consulting, Completed) not just Waiting
 */

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { patientApi, wardApi, prescriptionApi } from "@/lib/api";
import { HospitalBedManagerModal, HospitalBed } from "@/components/HospitalBedManager";
import {
  User, Loader2, BedDouble, ClipboardList, ChevronDown, ChevronUp,
  Pill, Calendar, Activity, Phone, Droplets, AlertCircle, Plus, Trash2,
  X, Check, RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Patient {
  _id?: string;
  id?: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  blood_group?: string;
  symptoms?: string;
  allergies?: string[];
  medical_history?: string;
  patientId?: string;
  status?: string;
}

interface AdmissionMed {
  name: string; type: string; dosage: string; route: string; frequency: string; notes: string;
}

const MED_TYPES = ["saline", "antibiotic", "iv_medication", "oral", "injection", "other"];
const ROUTES = ["IV", "IM", "Oral", "Topical", "Subcutaneous", "Inhalation"];

// ── Admit Patient Modal ────────────────────────────────────────────────────────
function AdmitPatientModal({
  patient, onClose, onAdmitted,
}: {
  patient: Patient;
  onClose: () => void;
  onAdmitted: () => void;
}) {
  const [chiefComplaint, setChiefComplaint] = useState(patient.symptoms || "");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [ward, setWard] = useState("General Ward");
  const [bedNumber, setBedNumber] = useState("");
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [medications, setMedications] = useState<AdmissionMed[]>([]);
  const [saving, setSaving] = useState(false);
  const patientId = patient._id || patient.id || "";

  useEffect(() => {
    let mounted = true;
    setLoadingBeds(true);
    wardApi.beds({ ward, availableOnly: "true" })
      .then((res: any) => {
        if (!mounted) return;
        const bList: HospitalBed[] = res.data || [];
        setAvailableBeds(bList);
        setBedNumber(bList.length > 0 ? bList[0].bed_number : "");
      })
      .catch(() => { if (mounted) setAvailableBeds([]); })
      .finally(() => { if (mounted) setLoadingBeds(false); });
    return () => { mounted = false; };
  }, [ward]);

  const addMed = () => setMedications([...medications, { name: "", type: "saline", dosage: "", route: "IV", frequency: "", notes: "" }]);
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof AdmissionMed, val: string) =>
    setMedications(medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m));

  const admit = async () => {
    if (!chiefComplaint.trim()) { toast.error("Chief complaint is required."); return; }
    setSaving(true);
    try {
      await wardApi.admit({
        patientId, chiefComplaint, provisionalDiagnosis, ward,
        bedNumber: bedNumber || undefined,
        admissionMedications: medications.filter((m) => m.name.trim()),
        doctorNotes,
      });
      toast.success(`✅ ${patient.name} admitted to ${ward}`);
      onAdmitted();
      onClose();
    } catch (err: any) {
      toast.error(`Admission failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-primary" /> Admit Patient to Ward
              </h3>
              <p className="text-sm text-muted-foreground">{patient.name} — Age {patient.age} • {patient.gender}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Chief Complaint *</label>
              <textarea value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. High fever, abdominal pain..." rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Provisional Diagnosis</label>
              <textarea value={provisionalDiagnosis} onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                placeholder="e.g. Typhoid fever..." rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-3.5 rounded-xl border border-border/50">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Ward</label>
              <select value={ward} onChange={(e) => setWard(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                {["General Ward", "ICU", "ICCU", "Pediatric Ward", "Surgical Ward", "Maternity Ward", "Isolation Ward"].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Available Bed ({availableBeds.length} vacant)
              </label>
              {loadingBeds ? (
                <div className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking available beds...
                </div>
              ) : availableBeds.length === 0 ? (
                <select disabled className="w-full text-sm px-3 py-2.5 rounded-lg bg-muted border border-border opacity-60">
                  <option>No vacant beds in {ward}</option>
                </select>
              ) : (
                <select value={bedNumber} onChange={(e) => setBedNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">-- Allocate bed later by nurse --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.bed_number}>{b.bed_number} (Vacant)</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Admission medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Admission Medications (Saline, Antibiotics…)</label>
              <button onClick={addMed} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {medications.length === 0 && (
              <p className="text-xs text-muted-foreground">No medications added. Click "Add" for IV fluids, antibiotics, etc.</p>
            )}
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-xl mb-2">
                <input value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)}
                  placeholder="Medication name (e.g. NS 0.9%)"
                  className="col-span-2 text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none" />
                <select value={med.type} onChange={(e) => updateMed(i, "type", e.target.value)}
                  className="text-sm px-2 py-1.5 rounded-lg bg-background border border-border">
                  {MED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)}
                  placeholder="Dosage (e.g. 500ml)"
                  className="text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none" />
                <select value={med.route} onChange={(e) => updateMed(i, "route", e.target.value)}
                  className="text-sm px-2 py-1.5 rounded-lg bg-background border border-border">
                  {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="flex gap-2">
                  <input value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)}
                    placeholder="Frequency (BD, TDS)"
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none" />
                  <button onClick={() => removeMed(i)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Doctor Notes for Nursing Staff</label>
            <textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Special instructions..." rows={2}
              className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          <div className="flex gap-3">
            <button onClick={admit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Admitting...</> : <><BedDouble className="h-4 w-4" /> Admit to Ward</>}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition">Cancel</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Medical History Panel ──────────────────────────────────────────────────────
function MedicalHistoryPanel({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || history) return;
    setLoading(true);
    wardApi.patientHistory(patientId)
      .then((res: any) => setHistory(res.data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [open, patientId]);

  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition text-left"
      >
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-sm">Medical History — {patientName}</p>
            <p className="text-xs text-muted-foreground">View all past prescriptions and admissions</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading history...
                </div>
              ) : !history ? (
                <p className="text-sm text-muted-foreground text-center py-4">Could not load history.</p>
              ) : (
                <>
                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xl font-bold text-primary">{history.totalVisits || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Visits</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xl font-bold text-primary">{history.totalAdmissions || 0}</p>
                      <p className="text-xs text-muted-foreground">Admissions</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xl font-bold text-primary">
                        {history.prescriptions?.[0]
                          ? new Date(history.prescriptions[0].created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Last Visit</p>
                    </div>
                  </div>

                  {/* Prescriptions */}
                  {history.prescriptions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Pill className="h-4 w-4 text-primary" />
                        Past Prescriptions ({history.prescriptions.length})
                      </h4>
                      <div className="space-y-2">
                        {history.prescriptions.map((rx: any) => (
                          <div key={rx.id} className="bg-background border border-border rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-sm font-medium">Dr. {rx.doctor_name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(rx.created_at).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                            {rx.medicines?.map((m: any, idx: number) => (
                              <p key={idx} className="text-xs text-muted-foreground">
                                • {m.name || m.medicine} — {m.dosage} {m.frequency} for {m.duration}
                                {m.notes ? ` (${m.notes})` : ""}
                              </p>
                            ))}
                            {rx.diagnosis && (
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                Dx: {rx.diagnosis}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admissions */}
                  {history.admissions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                        <Activity className="h-4 w-4 text-primary" />
                        Ward Admissions ({history.admissions.length})
                      </h4>
                      <div className="space-y-2">
                        {history.admissions.map((adm: any) => (
                          <div key={adm.id} className="bg-background border border-border rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium">{adm.ward} — <span className={`text-xs font-medium ${
                                adm.status === "Discharged" ? "text-muted-foreground" :
                                adm.status === "Critical" ? "text-destructive" : "text-primary"
                              }`}>{adm.status}</span></p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(adm.admit_date).toLocaleDateString("en-IN")}
                                {adm.discharge_date ? ` – ${new Date(adm.discharge_date).toLocaleDateString("en-IN")}` : " (ongoing)"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {adm.chief_complaint} | Dr. {adm.doctor_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {history.prescriptions?.length === 0 && history.admissions?.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-3">
                      No medical history found. This is the patient's first visit.
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Consultation Page ─────────────────────────────────────────────────────
export default function Consultation() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [showBedManager, setShowBedManager] = useState(false);
  const [alreadyAdmitted, setAlreadyAdmitted] = useState(false);

  const fetchPatients = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await patientApi.list({ limit: "50" }) as any;
      setPatients(res.data || []);
    } catch {
      if (!silent) setPatients([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(false);
    const interval = setInterval(() => {
      fetchPatients(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (!id) { setSelectedPatient(null); setAlreadyAdmitted(false); return; }

    const found = patients.find((p) => (p._id || p.id) === id) || null;
    setSelectedPatient(found);
    setAlreadyAdmitted(false);

    // Check if already admitted
    if (found) {
      try {
        const histRes = await wardApi.patientHistory(id) as any;
        const activeAdmission = histRes?.data?.admissions?.find(
          (a: any) => a.status !== "Discharged"
        );
        setAlreadyAdmitted(!!activeAdmission);
      } catch {
        setAlreadyAdmitted(false);
      }
    }
  };

  const patientId = selectedPatient ? (selectedPatient._id || selectedPatient.id || "") : "";

  return (
    <DashboardLayout items={doctorNavItems} title="Start Consultation">
      {/* Bed Manager Modal */}
      {showBedManager && (
        <HospitalBedManagerModal
          onClose={() => setShowBedManager(false)}
        />
      )}

      {/* Admit modal */}
      {showAdmitModal && selectedPatient && (
        <AdmitPatientModal
          patient={selectedPatient}
          onClose={() => setShowAdmitModal(false)}
          onAdmitted={() => { setAlreadyAdmitted(true); }}
        />
      )}

      <div className="space-y-6 max-w-4xl">

        {/* ── Patient Selector Card ── */}
        <div className="stat-card space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium block">Select Patient</label>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                Live Queue
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBedManager(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium border border-primary/30 text-primary hover:bg-primary/5 rounded-lg transition"
              >
                <BedDouble className="h-3.5 w-3.5" /> Hospital Beds
              </button>
              <button
                onClick={() => fetchPatients(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition"
                title="Refresh patient list"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="relative">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading patients...
                </div>
              ) : (
                <>
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={patientId}
                    onChange={handleSelect}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                  >
                    <option value="">Choose a patient to consult...</option>
                    {patients.map((p) => {
                      const id = p._id || p.id || "";
                      return (
                        <option key={id} value={id}>
                          {p.name} — Age {p.age} {p.patientId ? `(${p.patientId})` : ""} [{p.status}]
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
            </div>

          {/* Patient context card — appears when patient selected */}
          <AnimatePresence>
            {selectedPatient && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-muted/50 rounded-xl p-4 space-y-3">
                {/* Patient info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Age / Gender</p>
                    <p className="font-medium">{selectedPatient.age}y • {selectedPatient.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Blood Group</p>
                    <p className="font-medium">{selectedPatient.blood_group || "—"}</p>
                  </div>
                  {selectedPatient.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm">{selectedPatient.phone}</p>
                    </div>
                  )}
                  {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs text-destructive font-medium">
                        Allergies: {selectedPatient.allergies.join(", ")}
                      </p>
                    </div>
                  )}
                </div>

                {selectedPatient.symptoms && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Presenting Symptoms</p>
                    <p className="text-sm">{selectedPatient.symptoms}</p>
                  </div>
                )}

                {/* Action buttons — Admit & History */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {/* Admit button */}
                  {!alreadyAdmitted ? (
                    <button
                      onClick={() => setShowAdmitModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition"
                    >
                      <BedDouble className="h-4 w-4" /> Admit to Ward
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium">
                      <Check className="h-4 w-4" /> Already Admitted
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Medical History (collapsible) — appears when patient selected ── */}
        <AnimatePresence>
          {selectedPatient && patientId && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <MedicalHistoryPanel patientId={patientId} patientName={selectedPatient.name} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Consultation / Transcript Panel ── */}
        <div className="stat-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm">
            Consultation Recording
            {selectedPatient && (
              <span className="text-xs text-muted-foreground font-normal">
                — for {selectedPatient.name}
              </span>
            )}
          </h3>
          <TranscriptPanel
            patientId={patientId || undefined}
            patientName={selectedPatient?.name || undefined}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
