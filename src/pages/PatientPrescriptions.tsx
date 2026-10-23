import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { patientApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Pill, Calendar, Clock, Stethoscope, Building2, Printer, Loader2, FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPrescriptions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await patientApi.myPrescriptions() as any;
      if (res.success) {
        setPrescriptions(res.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load prescriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const handlePrint = (rx: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Prescription - ${rx.patient_name || "Patient"}</title>
          <style>
            body { font-family: sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #0284c7; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
            .med-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .med-table th, .med-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            .med-table th { background: #f1f5f9; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>MedAssist AI Healthcare</h1>
            <p>${rx.clinic?.name || "Clinic Consultation Record"}</p>
          </div>
          <div class="meta">
            <div><strong>Patient Name:</strong> ${rx.patient_name}</div>
            <div><strong>Date:</strong> ${new Date(rx.created_at).toLocaleDateString("en-IN")}</div>
            <div><strong>Doctor:</strong> Dr. ${rx.doctor_name || "Attending Physician"}</div>
            <div><strong>Diagnosis:</strong> ${rx.diagnosis || "General Consultation"}</div>
          </div>
          <h3>Prescribed Medications:</h3>
          <table class="med-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Instructions / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${(rx.medicines || []).map((m: any) => `
                <tr>
                  <td><strong>${m.name || m.medicine}</strong></td>
                  <td>${m.dosage || "—"}</td>
                  <td>${m.frequency || "—"}</td>
                  <td>${m.duration || "—"}</td>
                  <td>${m.notes || rx.instructions || "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p><strong>Doctor Instructions:</strong> ${rx.instructions || "Take medicines as prescribed."}</p>
          ${rx.ai_instructions ? `<p><strong>Care Advice:</strong> ${rx.ai_instructions}</p>` : ""}
          <div class="footer">
            Generated via MedAssist AI Suite. Valid digital consultation prescription.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <DashboardLayout items={patientNavItems} title="My Prescriptions">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Doctor Prescriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Official prescriptions and medications assigned by your consulting physicians
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadPrescriptions} disabled={loading}>
            Refresh Prescriptions
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading your prescriptions from hospital records…</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">No Prescriptions Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              When a doctor (e.g. Dr. Himanshu) writes or finalizes a prescription for your consultation, it will appear here in real-time.
            </p>
            <Button onClick={() => window.location.href = "/patient/book-appointment"}>
              Book a Consultation
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {prescriptions.map((rx, idx) => (
              <motion.div
                key={rx.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        Dr. {rx.doctor_name || "Consulting Doctor"}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {rx.clinic?.name || "Hospital Clinic"}
                        <span>•</span>
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(rx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(rx)}
                      className="text-xs h-9"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1.5" /> Print / PDF
                    </Button>
                  </div>
                </div>

                {/* Diagnosis if available */}
                {rx.diagnosis && (
                  <div className="bg-muted/40 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Diagnosis:</span>
                    <span className="font-medium text-foreground">{rx.diagnosis}</span>
                  </div>
                )}

                {/* Medicines List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Prescribed Medicines ({rx.medicines?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(rx.medicines || []).map((med: any, mIdx: number) => (
                      <div
                        key={mIdx}
                        className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-bold text-sm text-foreground">
                              {med.name || med.medicine}
                            </span>
                          </div>
                          {med.dosage && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold text-xs shrink-0">
                              {med.dosage}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                          {med.frequency && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-amber-500" />
                              {med.frequency}
                            </span>
                          )}
                          {med.duration && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-emerald-500" />
                              {med.duration}
                            </span>
                          )}
                          {med.notes && (
                            <span className="text-foreground/80 font-medium">
                              • {med.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {rx.instructions && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl space-y-1">
                    <p className="font-semibold text-foreground">Doctor's Advice:</p>
                    <p>{rx.instructions}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
