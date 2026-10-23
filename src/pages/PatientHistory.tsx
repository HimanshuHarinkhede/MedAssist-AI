import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { patientApi } from "@/lib/api";
import { Calendar, FileText, Stethoscope, Building2, Activity, Loader2, ArrowRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function PatientHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await patientApi.myHistory() as any;
      if (res.success) {
        setHistory(res.data || []);
      }
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <DashboardLayout items={patientNavItems} title="Health History">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clinical Health History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete timeline of your clinic consultations, symptoms, recorded vitals, and diagnoses
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
            Refresh History
          </Button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Retrieving your consultation history from database…</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">No Medical History Records</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              You haven&apos;t attended any consultations yet. Once you complete a hospital visit, your recorded vitals, doctor notes, and prescriptions will be logged here.
            </p>
            <Button onClick={() => navigate("/patient/book-appointment")}>
              Book Consultation
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((h, i) => (
              <motion.div
                key={h.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="stat-card p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {h.symptoms || "Consultation Checkup"}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-foreground/80">{h.doctor}</span>
                        <span>•</span>
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{h.clinicName}</span>
                        <span>•</span>
                        <span className="capitalize px-2 py-0.5 rounded-full bg-muted font-medium">
                          {h.department}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-muted/60 px-2.5 py-1 rounded-lg">
                      <Calendar className="h-3.5 w-3.5" />
                      {h.date}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      h.status === "Completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}>
                      {h.status || "Completed"}
                    </span>
                  </div>
                </div>

                {/* Vitals or medical history summary if available */}
                {h.vitals && (
                  <div className="bg-muted/30 p-3 rounded-xl text-xs text-muted-foreground flex items-start gap-2">
                    <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground/90">{h.vitals}</span>
                  </div>
                )}

                {/* Prescriptions issued during this visit */}
                {h.prescriptionsCount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-1.5 text-primary font-semibold">
                      <Pill className="h-4 w-4" />
                      <span>{h.prescriptionsCount} prescription{h.prescriptionsCount > 1 ? "s" : ""} issued by doctor</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/patient/prescriptions")}
                      className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/10"
                    >
                      View Prescription <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
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
