import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { AIChat } from "@/components/AIChat";

export default function DoctorAIAssistant() {
  return (
    <DashboardLayout items={doctorNavItems} title="AI Medical Assistant">
      <div className="stat-card h-[calc(100vh-10rem)] flex flex-col">
        <AIChat placeholder="Ask about medications, side effects, interactions..." />
      </div>
    </DashboardLayout>
  );
}
