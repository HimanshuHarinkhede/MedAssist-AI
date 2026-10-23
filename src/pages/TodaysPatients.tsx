/**
 * TodaysPatients.tsx
 *
 * Fixes & Enhancements:
 *   #1  — Real-time Patient Queue: Loads active registered clinic patients and auto-refreshes
 *         via silent background polling (every 4s) so new registrations appear instantly.
 *   #2  — Hospital Bed Management: Doctor can view & configure hospital bed capacity by ward
 *         (ICU, ICCU, General Ward, etc.) via HospitalBedManagerModal.
 *   #3  — Available Beds on Admission: When admitting, shows ONLY available vacant beds in the chosen ward.
 *   #4  — Automatic Bed Release: When discharged, beds automatically become available.
 *   #7  — Full patient medical history per patient (prescriptions + past admissions).
 */

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { patientApi, wardApi } from "@/lib/api";
import { TableComponent } from "@/components/TableComponent";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { HospitalBedManagerModal, HospitalBed } from "@/components/HospitalBedManager";
import {
  Loader2, Users, BedDouble, Plus, Trash2,
  ClipboardList, Pill, Calendar, Activity, RefreshCw, Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Patient {
  _id?: string;
  id?: string;
  name: string;
  symptoms?: string;
  status: string;
  age?: number;
  patientId?: string;
  patient_id?: string;
  queue_number?: number;
  gender?: string;
  phone?: string;
  created_at?: string;
}

interface AdmissionMed {
  name: string;
  type: string;
  dosage: string;
  route: string;
  frequency: string;
  notes: string;
}

const MED_TYPES = ["antibiotic", "saline", "iv_medication", "oral", "injection", "other"];
const ROUTES = ["IV", "IM", "Oral", "Topical", "Subcutaneous", "Inhalation"];
const WARDS = [
  "General Ward", "ICU", "ICCU", "Pediatric Ward",
  "Surgical Ward", "Maternity Ward", "Isolation Ward",
];

const statusStyle: Record<string, string> = {
  Waiting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Consulting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Admitted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Discharged: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

// ── Admit Patient Modal with Available-Only Beds ──────────────────────────────
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
  const [doctorNotes, setDoctorNotes] = useState("");
  const [medications, setMedications] = useState<AdmissionMed[]>([]);
  const [saving, setSaving] = useState(false);

  // Available beds in chosen ward
  const [availableBeds, setAvailableBeds] = useState<HospitalBed[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);

  const patientId = patient._id || patient.id || "";

  // Fetch only available beds when ward changes
  useEffect(() => {
    let mounted = true;
    setLoadingBeds(true);
    wardApi.beds({ ward, availableOnly: "true" })
      .then((res: any) => {
        if (!mounted) return;
        const bedsList: HospitalBed[] = res.data || [];
        setAvailableBeds(bedsList);
        // Default to first available bed if any
        if (bedsList.length > 0) {
          setBedNumber(bedsList[0].bed_number);
        } else {
          setBedNumber("");
        }
      })
      .catch(() => {
        if (mounted) setAvailableBeds([]);
      })
      .finally(() => {
        if (mounted) setLoadingBeds(false);
      });

    return () => { mounted = false; };
  }, [ward]);

  const addMed = () => setMedications([...medications, {
    name: "", type: "saline", dosage: "", route: "IV", frequency: "Continuous", notes: "",
  }]);
  const removeMed = (i: number) => setMedications(medications.filter((_, idx) => idx !== i));
  const updateMed = (i: number, field: keyof AdmissionMed, val: string) => {
    setMedications(medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m));
  };

  const admit = async () => {
    if (!chiefComplaint.trim()) {
      toast.error("Chief complaint / symptoms are required for admission.");
      return;
    }
    setSaving(true);
    try {
      await wardApi.admit({
        patientId,
        chiefComplaint,
        provisionalDiagnosis,
        ward,
        bedNumber: bedNumber || undefined,
        admissionMedications: medications.filter((m) => m.name.trim()),
        doctorNotes,
      });
      toast.success(`✅ ${patient.name} admitted to ${ward}! Bed: ${bedNumber || "To be allocated by nurse"}`);
      onAdmitted();
      onClose();
    } catch (err: any) {
      toast.error(`Admission failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-primary" />
                Admit Patient to Ward
              </h3>
              <p className="text-sm text-muted-foreground">
                {patient.name} — Age {patient.age} • {patient.gender}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
          </div>

          {/* Ward & Available Bed Selection */}
          <div className="grid sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Ward / Section *
              </label>
              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {WARDS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                Available Bed ({availableBeds.length} vacant)
              </label>
              {loadingBeds ? (
                <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking available beds...
                </div>
              ) : availableBeds.length === 0 ? (
                <div>
                  <select
                    disabled
                    className="w-full text-sm px-3 py-2.5 rounded-lg bg-muted border border-border text-muted-foreground opacity-60"
                  >
                    <option>No vacant beds in {ward}</option>
                  </select>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    ⚠️ Nurse can assign a bed later or transfer patient.
                  </p>
                </div>
              ) : (
                <select
                  value={bedNumber}
                  onChange={(e) => setBedNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">-- Allocate bed later by nurse --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.bed_number}>
                      {b.bed_number} (Vacant)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Chief Complaint & Diagnosis */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Chief Complaint / Symptoms *</label>
              <textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="e.g. High fever, abdominal pain, vomiting..."
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Provisional Diagnosis</label>
              <textarea
                value={provisionalDiagnosis}
                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                placeholder="e.g. Typhoid fever, Appendicitis..."
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          {/* Admission Medications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                Admission Medications (Saline, Antibiotics, IV fluids)
              </label>
              <button
                type="button"
                onClick={addMed}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Plus className="h-3.5 w-3.5" /> Add Medication
              </button>
            </div>
            {medications.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg">
                No medications specified. Click "+ Add Medication" to prescribe IV saline, antibiotics, etc.
              </p>
            )}
            {medications.map((med, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-xl mb-2 border border-border/50">
                <input
                  value={med.name}
                  onChange={(e) => updateMed(i, "name", e.target.value)}
                  placeholder="Medication name (e.g. NS 0.9%, Amoxicillin)"
                  className="col-span-2 text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                />
                <select
                  value={med.type}
                  onChange={(e) => updateMed(i, "type", e.target.value)}
                  className="text-sm px-2 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                >
                  {MED_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  value={med.dosage}
                  onChange={(e) => updateMed(i, "dosage", e.target.value)}
                  placeholder="Dosage (e.g. 500ml, 500mg)"
                  className="text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                />
                <select
                  value={med.route}
                  onChange={(e) => updateMed(i, "route", e.target.value)}
                  className="text-sm px-2 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                >
                  {ROUTES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  value={med.frequency}
                  onChange={(e) => updateMed(i, "frequency", e.target.value)}
                  placeholder="Frequency (e.g. BD, Continuous)"
                  className="text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                />
                <div className="col-span-2 flex gap-2">
                  <input
                    value={med.notes}
                    onChange={(e) => updateMed(i, "notes", e.target.value)}
                    placeholder="Instructions for nurse (optional)"
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-background border border-border focus:outline-none"
                  />
                  <button onClick={() => removeMed(i)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Doctor Notes */}
          <div>
            <label className="text-sm font-medium block mb-1">Doctor Notes for Staff</label>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Additional instructions for nursing staff..."
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={admit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Admitting...</> : <><BedDouble className="h-4 w-4" /> Confirm Admission</>}
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition">
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Patient Medical History Modal ─────────────────────────────────────────────
function PatientHistoryModal({
  patient, onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const patientId = patient._id || patient.id || "";
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wardApi.patientHistory(patientId)
      .then((res: any) => setHistory(res.data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Medical History — {patient.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                Age {patient.age} • {patient.gender}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">✕</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !history ? (
            <p className="text-center text-muted-foreground py-8">Could not load medical history.</p>
          ) : (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{history.totalVisits || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Prescriptions</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">{history.totalAdmissions || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ward Admissions</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary">
                    {history.prescriptions?.[0] ? new Date(history.prescriptions[0].created_at).toLocaleDateString("en-IN") : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Last Prescription</p>
                </div>
              </div>

              {/* Prescriptions */}
              {history.prescriptions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Pill className="h-4 w-4 text-primary" />
                    Past Prescriptions ({history.prescriptions.length})
                  </h4>
                  <div className="space-y-3">
                    {history.prescriptions.map((rx: any) => (
                      <div key={rx.id} className="border border-border rounded-xl p-4 bg-card/60">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">Dr. {rx.doctor_name || "Physician"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(rx.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        {rx.medicines?.map((m: any, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground">
                            • {m.name || m.medicine} — {m.dosage} {m.frequency} ({m.duration})
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admissions */}
              {history.admissions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                    <Activity className="h-4 w-4 text-primary" />
                    Ward Admissions ({history.admissions.length})
                  </h4>
                  <div className="space-y-3">
                    {history.admissions.map((adm: any) => (
                      <div key={adm.id} className="border border-border rounded-xl p-4 bg-card/60">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{adm.ward} — {adm.status}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(adm.admit_date).toLocaleDateString("en-IN")}
                            {adm.discharge_date ? ` → ${new Date(adm.discharge_date).toLocaleDateString("en-IN")}` : " (Ongoing)"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Bed: {adm.bed_number || "None"} • Complaint: {adm.chief_complaint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {history.prescriptions?.length === 0 && history.admissions?.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  No previous records found. This is the patient's first consultation.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TodaysPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [admitPatient, setAdmitPatient] = useState<Patient | null>(null);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [showBedManager, setShowBedManager] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const isFirstLoad = useRef(true);

  // Load patient list (supports both silent polling and user-initiated loads)
  const fetchQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      // 1. Fetch registered clinic patients (primary source for reception walk-ins)
      const res = await patientApi.list({ limit: "50" }) as any;
      const patientData: Patient[] = res.data || [];

      // 2. Fetch online booked appointments if any
      let apptData: Patient[] = [];
      try {
        const apptRes = await patientApi.clinicAppointments() as any;
        apptData = (apptRes.data || []).map((a: any) => ({
          id: a.id,
          name: a.patient_name || a.patientName || "Patient",
          symptoms: a.symptoms,
          status: a.status || "Waiting",
          age: a.patient_age || a.patientAge,
          gender: a.patient_gender || a.patientGender,
          phone: a.patient_phone || a.patientPhone,
          queue_number: a.queue_number,
        }));
      } catch {
        // Appointments optional
      }

      // Merge and deduplicate by name or ID
      const mergedMap = new Map<string, Patient>();
      for (const p of patientData) {
        mergedMap.set(p.id || p._id || p.name, p);
      }
      for (const a of apptData) {
        if (!mergedMap.has(a.id || a.name)) {
          mergedMap.set(a.id || a.name, a);
        }
      }

      setPatients(Array.from(mergedMap.values()));
      setLastUpdated(new Date());
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
      isFirstLoad.current = false;
    }
  };

  // Real-time background polling every 4 seconds
  useEffect(() => {
    fetchQueue(false);
    const timer = setInterval(() => {
      fetchQueue(true);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const columns = [
    {
      header: "Queue #",
      accessor: (row: Patient) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
          #{row.queue_number || row.patient_id?.slice(-4) || "—"}
        </span>
      ),
    },
    { header: "Patient Name", accessor: "name" as const },
    { header: "Age / Gender", accessor: (row: Patient) => `${row.age ? `${row.age}y` : "—"} • ${row.gender || "—"}` },
    { header: "Symptoms", accessor: (row: Patient) => row.symptoms || "—" },
    {
      header: "Status",
      accessor: (row: Patient) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[row.status] || "bg-muted text-muted-foreground"}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row: Patient) => (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Consult button */}
          {row.status !== "Completed" && row.status !== "Admitted" && row.status !== "Discharged" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/doctor/consultation")}
            >
              {row.status === "Consulting" ? "Continue" : "Consult"}
            </Button>
          )}

          {/* Admit button */}
          {(row.status === "Waiting" || row.status === "Consulting" || row.status === "Completed") && (
            <Button
              size="sm"
              variant="default"
              className="flex items-center gap-1.5"
              onClick={() => setAdmitPatient(row)}
            >
              <BedDouble className="h-3.5 w-3.5" /> Admit
            </Button>
          )}

          {/* Medical history */}
          <Button
            size="sm"
            variant="ghost"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setHistoryPatient(row)}
          >
            <ClipboardList className="h-3.5 w-3.5" /> History
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout items={doctorNavItems} title="Today's Patients">
      {/* Bed Manager Modal */}
      {showBedManager && (
        <HospitalBedManagerModal
          onClose={() => setShowBedManager(false)}
          onUpdated={() => fetchQueue(true)}
        />
      )}

      {/* Admit Modal */}
      {admitPatient && (
        <AdmitPatientModal
          patient={admitPatient}
          onClose={() => setAdmitPatient(null)}
          onAdmitted={() => fetchQueue(true)}
        />
      )}

      {/* History Modal */}
      {historyPatient && (
        <PatientHistoryModal
          patient={historyPatient}
          onClose={() => setHistoryPatient(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold">Today's Patient Queue</h2>
              {/* Real-time pulse indicator */}
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Queue (Auto-Sync)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time patient visits • Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Hospital Beds Management Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setShowBedManager(true)}
            >
              <BedDouble className="h-4 w-4" /> Hospital Beds & Wards
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchQueue(false)}
              disabled={loading}
              title="Refresh queue now"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>

            <Button size="sm" onClick={() => navigate("/doctor/consultation")}>
              Consultation Room
            </Button>
          </div>
        </div>

        {/* Content Table */}
        {loading && isFirstLoad.current ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading live patient queue...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Could not connect to clinic queue</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure the backend server is running</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-foreground">No patients currently in queue</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Patients registered by reception or booked online will automatically appear here in real time.
            </p>
          </div>
        ) : (
          <TableComponent columns={columns} data={patients} />
        )}
      </div>
    </DashboardLayout>
  );
}
