import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/themeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import BookAppointment from "./pages/BookAppointment";
import ClinicRegistration from "./pages/ClinicRegistration";
import AdminDashboard from "./pages/AdminDashboard";
import StaffManagement from "./pages/StaffManagement";
import ShiftManagement from "./pages/ShiftManagement";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import PatientRegistration from "./pages/PatientRegistration";
import PatientQueue from "./pages/PatientQueue";
import AdmittedPatients from "./pages/AdmittedPatients";
import NurseDashboard from "./pages/NurseDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorStaffManagement from "./pages/DoctorStaffManagement";
import TodaysPatients from "./pages/TodaysPatients";
import Consultation from "./pages/Consultation";
import Prescriptions from "./pages/Prescriptions";
import Analytics from "./pages/Analytics";
import DoctorAIAssistant from "./pages/DoctorAIAssistant";
import PatientDashboard from "./pages/PatientDashboard";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import Reminder from "./pages/Reminder";
import PatientHistory from "./pages/PatientHistory";
import PatientAIAssistant from "./pages/PatientAIAssistant";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register-clinic" element={<ClinicRegistration />} />
            <Route path="/book-appointment" element={<BookAppointment />} />

            {/* Admin Portal — Only clinic_admin and platform_admin */}
            <Route element={<ProtectedRoute allowedRoles={["clinic_admin", "platform_admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/staff" element={<StaffManagement />} />
              <Route path="/admin/shifts" element={<ShiftManagement />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>

            {/* Reception Portal — Only receptionist & clinic_admin */}
            <Route element={<ProtectedRoute allowedRoles={["receptionist", "clinic_admin", "platform_admin"]} />}>
              <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
              <Route path="/reception/register-patient" element={<PatientRegistration />} />
              <Route path="/reception/patient-queue" element={<PatientQueue />} />
              <Route path="/reception/admitted" element={<AdmittedPatients />} />
              <Route path="/reception/settings" element={<SettingsPage />} />
            </Route>

            {/* Staff / Nurse Portal — Only nurse, staff & clinic_admin */}
            <Route element={<ProtectedRoute allowedRoles={["nurse", "pharmacist", "lab_technician", "clinic_admin", "platform_admin"]} />}>
              <Route path="/staff/dashboard" element={<NurseDashboard />} />
              <Route path="/staff/admitted" element={<AdmittedPatients />} />
              <Route path="/staff/settings" element={<SettingsPage />} />
            </Route>

            {/* Doctor Portal — Strictly DOCTORS ONLY */}
            <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/staff" element={<DoctorStaffManagement />} />
              <Route path="/doctor/patients" element={<TodaysPatients />} />
              <Route path="/doctor/consultation" element={<Consultation />} />
              <Route path="/doctor/prescriptions" element={<Prescriptions />} />
              <Route path="/doctor/admitted" element={<AdmittedPatients />} />
              <Route path="/doctor/shifts" element={<ShiftManagement />} />
              <Route path="/doctor/analytics" element={<Analytics />} />
              <Route path="/doctor/ai-assistant" element={<DoctorAIAssistant />} />
              <Route path="/doctor/settings" element={<SettingsPage />} />
            </Route>

            {/* Patient Portal — Strictly PATIENTS ONLY */}
            <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/book-appointment" element={<BookAppointment />} />
              <Route path="/patient/prescriptions" element={<PatientPrescriptions />} />
              <Route path="/patient/schedule" element={<Reminder />} />
              <Route path="/patient/reminders" element={<Reminder />} />
              <Route path="/patient/history" element={<PatientHistory />} />
              <Route path="/patient/ai-assistant" element={<PatientAIAssistant />} />
              <Route path="/patient/settings" element={<SettingsPage />} />
            </Route>

            {/* Shared AI Assistant */}
            <Route path="/ai-assistant" element={<DoctorAIAssistant />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
