import {
  LayoutDashboard, Mic, Users, FileText, BarChart3, Bot, Settings,
  UserPlus, ClipboardList, CalendarClock, BedDouble, Clock, Building2, UserCog,
} from "lucide-react";
import type { NavItem } from "@/components/AppSidebar";

export const doctorNavItems: NavItem[] = [
  { title: "Dashboard", url: "/doctor/dashboard", icon: LayoutDashboard },
  { title: "Today's Patients", url: "/doctor/patients", icon: Users },
  { title: "Start Consultation", url: "/doctor/consultation", icon: Mic },
  { title: "Prescriptions", url: "/doctor/prescriptions", icon: FileText },
  { title: "My Staff", url: "/doctor/staff", icon: UserCog },
  { title: "Admitted Patients", url: "/doctor/admitted", icon: BedDouble },
  { title: "Analytics", url: "/doctor/analytics", icon: BarChart3 },
  { title: "AI Assistant", url: "/doctor/ai-assistant", icon: Bot },
  { title: "Settings", url: "/doctor/settings", icon: Settings },
];

export const patientNavItems: NavItem[] = [
  { title: "Dashboard", url: "/patient/dashboard", icon: LayoutDashboard },
  { title: "Book Appointment", url: "/patient/book-appointment", icon: CalendarClock },
  { title: "My Prescriptions", url: "/patient/prescriptions", icon: FileText },
  { title: "Medicine Schedule", url: "/patient/schedule", icon: Clock },
  { title: "Health History", url: "/patient/history", icon: BarChart3 },
  { title: "AI Health Assistant", url: "/patient/ai-assistant", icon: Bot },
  { title: "Settings", url: "/patient/settings", icon: Settings },
];

/** Clinic admin — manages shifts & own clinic staff */
export const adminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Staff Management", url: "/admin/staff", icon: Users },
  { title: "Shift Management", url: "/admin/shifts", icon: CalendarClock },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

/** Platform admin — manages clinics only; staff is the clinic's concern */
export const platformAdminNavItems: NavItem[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Add Clinic / Hospital", url: "/register-clinic", icon: Building2 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export const receptionNavItems: NavItem[] = [
  { title: "Dashboard", url: "/reception/dashboard", icon: LayoutDashboard },
  { title: "Register Patient", url: "/reception/register-patient", icon: UserPlus },
  { title: "Patient Queue", url: "/reception/patient-queue", icon: ClipboardList },
  { title: "Admitted Patients", url: "/reception/admitted", icon: BedDouble },
  { title: "Settings", url: "/reception/settings", icon: Settings },
];

export const staffNavItems: NavItem[] = [
  { title: "Dashboard", url: "/staff/dashboard", icon: LayoutDashboard },
  { title: "Admitted Patients", url: "/staff/admitted", icon: BedDouble },
  { title: "Settings", url: "/staff/settings", icon: Settings },
];
