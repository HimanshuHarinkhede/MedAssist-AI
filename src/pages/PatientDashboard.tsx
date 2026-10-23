import { useState, useEffect } from "react";
import { Pill, Calendar, Stethoscope, Clock, MapPin, Building2, User, AlertCircle, Loader2, ArrowRight, Activity, CheckCircle, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { patientApi, getUser } from "@/lib/api";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<any>({
    activeQueue: null,
    latestAppointment: null,
    registeredClinic: null,
    totalVisits: 0,
  });
  const [scheduleData, setScheduleData] = useState<any>({
    morning: [],
    afternoon: [],
    night: [],
    totalMedicines: 0,
    totalDoses: 0,
  });
  const [recentPrescriptions, setRecentPrescriptions] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statusRes, schedRes, rxRes] = await Promise.all([
        patientApi.myStatus().catch(() => ({ success: false, data: null })),
        patientApi.mySchedule().catch(() => ({ success: false, data: null })),
        patientApi.myPrescriptions().catch(() => ({ success: false, data: [] })),
      ]) as any[];

      if (statusRes?.success && statusRes.data) {
        setStatusData(statusRes.data);
      }
      if (schedRes?.success && schedRes.data) {
        setScheduleData(schedRes.data);
      }
      if (rxRes?.success && Array.isArray(rxRes.data)) {
        setRecentPrescriptions(rxRes.data.slice(0, 3));
      }
    } catch (e) {
      console.warn("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const activeQueue = statusData?.activeQueue;
  const registeredClinic = statusData?.registeredClinic;

  return (
    <DashboardLayout items={patientNavItems} title="Patient Portal">
      <div className="space-y-8 max-w-6xl mx-auto">

        {/* ── Welcome Banner ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-3xl border border-primary/20">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Hello, {user?.name || "Patient"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {registeredClinic ? (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-primary" />
                  Registered at <strong>{registeredClinic.name}</strong> ({registeredClinic.city || registeredClinic.address})
                </span>
              ) : (
                "Welcome to your personal MedAssist AI healthcare dashboard"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/patient/book-appointment")}>
              <Calendar className="h-4 w-4 mr-1.5" /> Book Consultation
            </Button>
          </div>
        </div>

        {/* ── Active Queue & Walk-In Token Banner (Live Real-Time) ───── */}
        {activeQueue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-background border-2 border-amber-500/30 p-6 md:p-8 shadow-lg shadow-amber-500/5 space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-foreground">Today&apos;s Consultation Visit</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      {activeQueue.status === "Consulting" ? "With Doctor Now" : "Waiting in Queue"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeQueue.clinic?.name || "Hospital Clinic"} • {activeQueue.department} Department
                  </p>
                </div>
              </div>

              <div className="text-right flex items-center gap-4">
                <div className="bg-card border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-sm text-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Token Number</span>
                  <span className="text-3xl font-black text-amber-600">#{activeQueue.queueNumber}</span>
                </div>
              </div>
            </div>

            {/* Turn Time & Wait details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card/80 border border-border p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-primary" /> AI Estimated Turn Time
                </p>
                <p className="text-xl font-bold text-primary">
                  ~{activeQueue.estimatedTurnTime}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Approx. {activeQueue.waitMinutes} mins wait
                </p>
              </div>

              <div className="bg-card/80 border border-border p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <User className="h-3.5 w-3.5 text-amber-500" /> Queue Position
                </p>
                <p className="text-xl font-bold text-foreground">
                  {activeQueue.patientsAhead === 0 ? "You are Next!" : `${activeQueue.patientsAhead} Patients Ahead`}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Live queue order
                </p>
              </div>

              <div className="bg-card/80 border border-border p-4 rounded-2xl">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-500" /> Consulting Doctor
                </p>
                <p className="text-lg font-bold text-foreground truncate">
                  {activeQueue.doctorName ? `Dr. ${activeQueue.doctorName}` : "Attending Physician"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {activeQueue.department}
                </p>
              </div>
            </div>

            {/* Intake Vitals if recorded by reception */}
            {activeQueue.medicalHistory && (
              <div className="p-3.5 rounded-xl bg-card border border-border text-xs text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">Intake Record: {activeQueue.medicalHistory}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Real-Time Metrics ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Prescribed Medicines"
            value={scheduleData.totalMedicines || 0}
            icon={Pill}
            color="primary"
          />
          <StatCard
            title="Scheduled Daily Doses"
            value={scheduleData.totalDoses || 0}
            icon={Clock}
            color="warning"
          />
          <StatCard
            title="Consultation Visits"
            value={statusData.totalVisits || 0}
            icon={Stethoscope}
            color="secondary"
          />
        </div>

        {/* ── Today's Medication Schedule (Real from Prescriptions) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card p-6 rounded-3xl bg-card border border-border space-y-4"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Today&apos;s Medicine Schedule
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically calculated from your doctor&apos;s active prescriptions
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/patient/schedule")} className="text-xs">
              View Full Schedule <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          {scheduleData.totalDoses === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <Pill className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm">No active medicines prescribed at this time.</p>
              <p className="text-xs text-muted-foreground/80">When your doctor issues a prescription, your morning, afternoon, and night schedule will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {[
                { label: "Morning", time: "8:00 AM", items: scheduleData.morning },
                { label: "Afternoon", time: "2:00 PM", items: scheduleData.afternoon },
                { label: "Night", time: "8:00 PM", items: scheduleData.night },
              ].map(slot => (
                <div key={slot.label} className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-foreground">{slot.label}</span>
                    <span className="text-muted-foreground">{slot.time}</span>
                  </div>
                  {slot.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  ) : (
                    <div className="space-y-2">
                      {slot.items.map((m: any) => (
                        <div key={m.id} className="p-2.5 rounded-xl bg-card border border-border/80 text-xs space-y-0.5">
                          <div className="flex justify-between items-center font-bold">
                            <span className="truncate">{m.name}</span>
                            <span className="text-primary text-[11px] font-semibold">{m.dosage}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{m.instructions}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Registered Clinic & Appointment Booking Section ────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Registered Clinic Card */}
          <div className="stat-card p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Registered Healthcare Facility</h3>
                <p className="text-xs text-muted-foreground">Your primary affiliated clinic or hospital</p>
              </div>
            </div>

            {registeredClinic ? (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{registeredClinic.name}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {registeredClinic.address || registeredClinic.city || "Hospital Address"}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {registeredClinic.type || "Clinic"}
                  </span>
                </div>
                {registeredClinic.departments && registeredClinic.departments.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {registeredClinic.departments.slice(0, 4).map((d: string) => (
                      <span key={d} className="px-2 py-0.5 rounded-md bg-card text-[11px] text-muted-foreground border">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No clinic currently linked. Browse hospitals to book an appointment.</p>
            )}

            <Button
              className="w-full"
              onClick={() => navigate("/patient/book-appointment")}
            >
              <Calendar className="h-4 w-4 mr-2" /> Book New Hospital Appointment
            </Button>
          </div>

          {/* Recent Prescriptions Card */}
          <div className="stat-card p-6 rounded-3xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Doctor Prescriptions</h3>
                  <p className="text-xs text-muted-foreground">Recent consultation records</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/patient/prescriptions")} className="text-xs">
                All <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {recentPrescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs space-y-1">
                <Stethoscope className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                <p>No prescriptions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentPrescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    onClick={() => navigate("/patient/prescriptions")}
                    className="p-3.5 rounded-2xl bg-muted/30 border border-border hover:border-primary/50 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">Dr. {rx.doctor_name || "Doctor"}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {new Date(rx.created_at).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rx.medicines?.length || 0} medicine{(rx.medicines?.length || 0) === 1 ? "" : "s"} prescribed
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
