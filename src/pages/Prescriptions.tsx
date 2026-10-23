/**
 * Prescriptions.tsx
 *
 * Fix Issue #9: "View Full Prescription" now opens a detailed modal showing
 * all medicines, AI instructions, transcript, doctor info, and date.
 * Data is fetched from the real API (fixed prescriptionController).
 */

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { prescriptionApi } from "@/lib/api";
import { Loader2, FileText, X, Pill, Clock, Calendar, User, Mic, Sparkles, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Medicine {
  name?: string;
  medicine?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

interface Prescription {
  _id?: string;
  id?: string;
  patient_id?: any;
  patient_name?: string;
  patient?: { name?: string; age?: number; gender?: string };
  doctor_name?: string;
  clinic?: { name?: string; address?: string };
  medicines?: Medicine[];
  diagnosis?: string;
  ai_instructions?: string;
  aiInstructions?: string;
  instructions?: string;
  transcript?: string;
  validation_warnings?: string[];
  created_at?: string;
  createdAt?: string;
}

// ── Full Prescription Modal — Issue #9 ────────────────────────────────────────
function PrescriptionDetailModal({
  rx,
  onClose,
}: {
  rx: Prescription;
  onClose: () => void;
}) {
  const patientName = rx.patient?.name || rx.patient_name || "—";
  const doctorName = rx.doctor_name || "—";
  const clinicName = rx.clinic?.name || "—";
  const date = rx.created_at || rx.createdAt;
  const aiInstructions = rx.ai_instructions || rx.aiInstructions || rx.instructions || "";
  const warnings = rx.validation_warnings || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Full Prescription
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {clinicName} — {date ? new Date(date).toLocaleDateString("en-IN", { dateStyle: "full" }) : "—"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Patient & Doctor Info */}
          <div className="grid sm:grid-cols-2 gap-4 bg-muted/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patient</p>
                <p className="font-semibold">{patientName}</p>
                {rx.patient?.age && (
                  <p className="text-xs text-muted-foreground">
                    Age {rx.patient.age} • {rx.patient.gender}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Prescribing Doctor</p>
                <p className="font-semibold">Dr. {doctorName}</p>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          {rx.diagnosis && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Diagnosis</p>
              <p className="text-sm">{rx.diagnosis}</p>
            </div>
          )}

          {/* Medicines */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium flex items-center gap-1.5">
              <Pill className="h-3.5 w-3.5" />
              Medicines ({rx.medicines?.length || 0})
            </p>
            <div className="space-y-3">
              {rx.medicines?.map((med, i) => (
                <div key={i} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-base">{med.name || med.medicine}</h4>
                    <span className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium">
                      {med.dosage}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {med.frequency}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> {med.duration}
                    </span>
                  </div>
                  {med.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">📝 {med.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Clinical Warnings
              </p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{w}</p>
              ))}
            </div>
          )}

          {/* AI Instructions */}
          {aiInstructions && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Patient Instructions
              </p>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-xl leading-relaxed">
                {aiInstructions}
              </p>
            </div>
          )}

          {/* Transcript */}
          {rx.transcript && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-medium flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" /> Consultation Transcript
              </p>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-xl leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {rx.transcript}
              </p>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await prescriptionApi.getAll() as any;
        setPrescriptions(res.data || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Fetch full prescription detail when user clicks "View"
  const handleView = async (rx: Prescription) => {
    const id = rx.id || rx._id;
    if (!id) { setSelectedRx(rx); return; }
    setLoadingDetail(true);
    try {
      const res = await prescriptionApi.get(id) as any;
      setSelectedRx(res.data || rx);
    } catch {
      setSelectedRx(rx);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <DashboardLayout items={doctorNavItems} title="Prescriptions">
      {/* Detail modal */}
      <AnimatePresence>
        {selectedRx && (
          <PrescriptionDetailModal
            rx={selectedRx}
            onClose={() => setSelectedRx(null)}
          />
        )}
      </AnimatePresence>
      {loadingDetail && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">Clinic Prescriptions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            All prescriptions issued through your clinic
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading prescriptions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">Could not load prescriptions</p>
            <p className="text-xs text-muted-foreground mt-1">Make sure the backend server is running</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No prescriptions yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prescriptions will appear here after consultations
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 gap-5"
          >
            {prescriptions.map((rx, i) => {
              const firstMed = rx.medicines?.[0];
              const medicineName = firstMed?.name || firstMed?.medicine || "Prescription";
              const additionalCount = (rx.medicines?.length || 1) - 1;
              const patientName = rx.patient?.name || rx.patient_name || "Unknown Patient";
              const date = rx.created_at || rx.createdAt;

              return (
                <motion.div
                  key={rx._id || rx.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="stat-card space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-base">
                        {additionalCount > 0
                          ? `${medicineName} (+${additionalCount} more)`
                          : medicineName}
                      </h3>
                      <p className="text-sm text-muted-foreground">Patient: {patientName}</p>
                      {rx.doctor_name && (
                        <p className="text-xs text-muted-foreground">Dr. {rx.doctor_name}</p>
                      )}
                    </div>
                    <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium shrink-0">
                      {firstMed?.dosage || "—"}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5" />
                      <span>{firstMed?.frequency || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{firstMed?.duration || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{date ? new Date(date).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </div>

                  <p className="text-sm bg-muted/50 p-3 rounded-lg line-clamp-2">
                    {rx.ai_instructions || rx.aiInstructions || rx.instructions || "Follow doctor's advice"}
                  </p>

                  <button
                    onClick={() => handleView(rx)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    View Full Prescription →
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
