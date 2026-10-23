import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { AIChat } from "@/components/AIChat";

export default function PatientAIAssistant() {
  return (
    <DashboardLayout items={patientNavItems} title="AI Health Assistant">
      <div className="stat-card h-[calc(100vh-10rem)] flex flex-col">
        <AIChat placeholder="Ask about your medications, diet, symptoms..." />
      </div>
    </DashboardLayout>
  );
}
