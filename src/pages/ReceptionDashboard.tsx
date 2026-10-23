import { DashboardLayout } from "@/components/DashboardLayout";
import { receptionNavItems } from "@/lib/navItems";
import { StatCard } from "@/components/StatCard";
import { Users, Clock, BedDouble } from "lucide-react";
import { patientQueue } from "@/lib/mockData";

export default function ReceptionDashboard() {
  const waiting = patientQueue.filter((p) => p.status === "Waiting").length;
  const completed = patientQueue.filter((p) => p.status === "Completed").length;

  return (
    <DashboardLayout items={receptionNavItems} title="Reception">
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Today's Patients" value={patientQueue.length} icon={Users} color="primary" />
          <StatCard title="Waiting Queue" value={waiting} icon={Clock} color="warning" />
          <StatCard title="Completed" value={completed} icon={BedDouble} color="success" />
        </div>

        <div className="stat-card">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <a href="/reception/register-patient" className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">Register Patient</a>
            <a href="/reception/patient-queue" className="px-4 py-2 rounded-lg bg-secondary/10 text-secondary text-sm font-medium hover:bg-secondary/20 transition-colors">View Queue</a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
