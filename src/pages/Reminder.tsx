import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { patientApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sun, Cloud, Moon, Bell, Check, Clock, Pill, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function Reminder() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [scheduleData, setScheduleData] = useState<{
    morning: any[];
    afternoon: any[];
    night: any[];
    totalMedicines: number;
    totalDoses: number;
  }>({
    morning: [],
    afternoon: [],
    night: [],
    totalMedicines: 0,
    totalDoses: 0,
  });
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const res = await patientApi.mySchedule() as any;
      if (res.success && res.data) {
        setScheduleData(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load medication schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const toggleTaken = (id: string, name: string) => {
    setTakenMap(prev => {
      const nextState = !prev[id];
      if (nextState) {
        toast.success(`Marked ${name} as taken for today!`);
      }
      return { ...prev, [id]: nextState };
    });
  };

  const slots = [
    { label: "Morning", icon: Sun, time: "8:00 AM", items: scheduleData.morning },
    { label: "Afternoon", icon: Cloud, time: "2:00 PM", items: scheduleData.afternoon },
    { label: "Night", icon: Moon, time: "8:00 PM", items: scheduleData.night },
  ];

  return (
    <DashboardLayout items={patientNavItems} title="Medication Schedule">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medicine Schedule</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Personalized daily medication timing generated from your doctor&apos;s prescriptions
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadSchedule} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        {/* Notification Toggle Card */}
        <div className="stat-card flex items-center justify-between p-5 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Medication Reminders</p>
              <p className="text-xs text-muted-foreground">Receive browser and email alerts before each dose</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNotificationsEnabled(!notificationsEnabled);
              toast.info(notificationsEnabled ? "Reminders paused" : "Reminders enabled");
            }}
            className={`w-12 h-7 rounded-full transition-all duration-300 relative ${
              notificationsEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-card shadow transition-all duration-300 ${
                notificationsEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Generating your real medication schedule from doctor prescriptions…</p>
          </div>
        ) : scheduleData.totalDoses === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-card p-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Pill className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">No Active Medications</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              You do not have any active medication schedule. When your doctor assigns a prescription with dosage and frequency, your personalized morning, afternoon, and night timing will be automatically calculated here.
            </p>
            <Button onClick={() => window.location.href = "/patient/book-appointment"}>
              Book a Doctor Consultation
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {slots.map((slot, i) => (
              <motion.div
                key={slot.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <slot.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">{slot.label} Dose</h3>
                      <p className="text-xs text-muted-foreground">{slot.time} • {slot.items.length} medication{slot.items.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {slot.time}
                  </span>
                </div>

                {slot.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No medications scheduled for {slot.label.toLowerCase()}.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {slot.items.map((item: any) => {
                      const isTaken = takenMap[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                            isTaken
                              ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                              : "bg-muted/30 border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => toggleTaken(item.id, item.name)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                                isTaken
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground/40 hover:border-primary"
                              }`}
                            >
                              {isTaken && <Check className="h-3.5 w-3.5" />}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold text-sm truncate ${isTaken ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {item.name}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                                  {item.dosage}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {item.instructions} • Prescribed by {item.doctorName}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isTaken ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}>
                              {isTaken ? "Taken" : "Pending"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
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
