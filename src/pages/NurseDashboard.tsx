/**
 * NurseDashboard.tsx
 *
 * Updated: Now fetches real admitted patient count from the ward API.
 * Issue #4: Shows actual admitted patients and links to their management page.
 */

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { staffNavItems } from "@/lib/navItems";
import { StatCard } from "@/components/StatCard";
import { BedDouble, AlertCircle, Clock, CalendarDays, Lock, Loader2 } from "lucide-react";
import { wardApi } from "@/lib/api";

export default function NurseDashboard() {
  const [isWorkingHours, setIsWorkingHours] = useState(true);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 8 || hour >= 18) {
      setIsWorkingHours(false);
    }

    // Load real admitted patients
    wardApi.list({ activeOnly: "true" })
      .then((res: any) => setAdmissions(res.data || []))
      .catch(() => setAdmissions([]))
      .finally(() => setLoading(false));
  }, []);

  if (!isWorkingHours) {
    return (
      <DashboardLayout items={staffNavItems} title="Access Restricted">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Outside Working Hours</h2>
          <p className="text-muted-foreground max-w-md">
            You are currently trying to access the portal outside your designated shift (8 AM – 6 PM).
            If you are working overtime, a doctor must grant you access to the patient records.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const criticalCount = admissions.filter((a) => a.status === "Critical").length;
  const totalActive = admissions.filter((a) => a.status !== "Discharged").length;

  // Upcoming rounds — patients who need vitals today (no entry today)
  const today = new Date().toDateString();
  const needsVitals = admissions.filter((a) => {
    const lastEntry = a.vitals_log?.[a.vitals_log.length - 1];
    if (!lastEntry) return true;
    return new Date(lastEntry.date).toDateString() !== today;
  });

  return (
    <DashboardLayout items={staffNavItems} title="Nurse / Staff Dashboard">
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="stat-card flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading...
            </div>
          ) : (
            <>
              <StatCard title="Admitted Patients" value={totalActive} icon={BedDouble} color="primary" />
              <StatCard title="Critical Priority" value={criticalCount} icon={AlertCircle} color="destructive" />
              <StatCard title="Needs Vitals Today" value={needsVitals.length} icon={Clock} color="warning" />
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Patients Needing Vitals */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Patients Needing Vitals Today
            </h3>
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : needsVitals.length === 0 ? (
                <p className="text-sm text-muted-foreground">✅ All patients have vitals recorded today.</p>
              ) : (
                needsVitals.slice(0, 5).map((adm) => (
                  <div key={adm.id} className="flex justify-between items-center p-3 rounded-xl border border-border/50 bg-background hover:bg-muted/50 transition">
                    <div>
                      <p className="font-medium text-sm">{adm.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Bed {adm.bed_number || "—"} • {adm.ward}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      adm.status === "Critical"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {adm.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="stat-card">
            <h3 className="font-semibold mb-4 text-lg">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              View and update health conditions, vitals, and bed allocations for admitted patients.
            </p>
            <a
              href="/staff/admitted"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <BedDouble className="h-4 w-4" />
              Manage Admitted Patients
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
