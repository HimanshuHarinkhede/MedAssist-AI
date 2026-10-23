import { DashboardLayout } from "@/components/DashboardLayout";
import {
  doctorNavItems, patientNavItems, adminNavItems, receptionNavItems, staffNavItems
} from "@/lib/navItems";
import { useTheme } from "@/lib/themeContext";
import { getUser } from "@/lib/api";
import { User, Globe, Palette, Moon, Sun } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const user = getUser();

  const getNavItems = () => {
    if (location.pathname.startsWith("/admin")) return adminNavItems;
    if (location.pathname.startsWith("/reception")) return receptionNavItems;
    if (location.pathname.startsWith("/staff")) return staffNavItems;
    if (location.pathname.startsWith("/patient")) return patientNavItems;
    if (location.pathname.startsWith("/doctor")) return doctorNavItems;

    // Fallback strictly based on user's assigned role
    if (user?.role === "nurse" || user?.role === "pharmacist" || user?.role === "lab_technician") {
      return staffNavItems;
    }
    if (user?.role === "receptionist") return receptionNavItems;
    if (user?.role === "clinic_admin" || user?.role === "platform_admin") return adminNavItems;
    if (user?.role === "patient") return patientNavItems;
    return doctorNavItems;
  };

  return (
    <DashboardLayout items={getNavItems()} title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="stat-card space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Profile Information</h3>
          </div>
          <div className="grid gap-4">
            <div>
              <label className="form-label">Full Name</label>
              <input defaultValue={user?.name || ""} placeholder="Full Name" className="form-input" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input defaultValue={user?.email || ""} placeholder="Email Address" className="form-input" />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Language</h3>
          </div>
          <select className="form-select">
            <option>English</option>
            <option>Hindi</option>
            <option>Marathi</option>
          </select>
        </div>

        {/* Theme */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold">Theme</h3>
                <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
              </div>
            </div>
            <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-all duration-300">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>

        <button className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-all duration-300">
          Save Changes
        </button>
      </div>
    </DashboardLayout>
  );
}
