import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { receptionNavItems } from "@/lib/navItems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, UserPlus, UserCheck, Loader2, User, Phone, Mail,
  MapPin, Heart, Stethoscope, ClipboardList, Hash, X, AlertCircle,
  Search, Activity, Thermometer, Wind, Scale, ArrowRight, ArrowLeft,
  Printer, RefreshCw, Sparkles, Clock
} from "lucide-react";
import { patientApi, staffApi } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const DEPARTMENTS = [
  "General", "Cardiology", "Neurology", "Pulmonology", "Endocrinology",
  "Orthopedics", "Gynecology", "Dermatology", "ENT", "Oncology", "Pediatrics",
  "Psychiatry", "Radiology", "Urology", "Gastroenterology",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const emptyForm = {
  name: "",
  age: "",
  gender: "Male",
  phone: "",
  address: "",
  email: "",
  bloodGroup: "",
  symptoms: "",
  medicalHistory: "",
  department: "General",
  doctorName: "",
  doctorAssigned: "",
  allergies: "",
  // Initial Vitals
  weight: "",
  temperature: "",
  bp: "",
  pulse: "",
  spo2: "",
};

const steps = [
  { id: 1, label: "Patient Info", icon: User },
  { id: 2, label: "Visit & Vitals", icon: Stethoscope },
  { id: 3, label: "Review & Queue", icon: ClipboardList },
];

export default function PatientRegistration() {
  const [registrationType, setRegistrationType] = useState<"new" | "returning">("new");
  const [step, setStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registeredData, setRegisteredData] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Returning patient search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  const update = (key: string, val: string) => {
    setError("");
    setForm(p => ({ ...p, [key]: val }));
  };

  const loadDoctors = useCallback(async () => {
    try {
      const res = await staffApi.list({ role: "Doctor" }) as any;
      setDoctors(res.data || []);
    } catch {
      setDoctors([]);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  // Handle switching between New and Returning Patient
  const handleTypeChange = (type: "new" | "returning") => {
    setRegistrationType(type);
    setError("");
    setStep(1);
    if (type === "new") {
      setSelectedPatient(null);
      setForm(emptyForm);
      setSearchResults([]);
      setHasSearched(false);
    } else {
      setSelectedPatient(null);
      setForm(emptyForm);
    }
  };

  // Search existing patients in database
  const handleSearchPatients = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast.warning("Please enter a name, phone, email, or patient ID to search");
      return;
    }
    setSearching(true);
    setError("");
    setHasSearched(true);
    try {
      const res = await patientApi.list({ search: searchQuery.trim(), limit: "20" }) as any;
      setSearchResults(res.data || []);
      if (!res.data || res.data.length === 0) {
        toast.info("No existing patient records found for that search query.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search patient records");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Select an existing patient from search results
  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setError("");
    // Autofill form with existing patient details
    setForm({
      name: patient.name || "",
      age: patient.age ? String(patient.age) : "",
      gender: patient.gender || "Male",
      phone: patient.phone || "",
      address: patient.address || "",
      email: patient.email || "",
      bloodGroup: patient.blood_group || "",
      symptoms: "", // Clear for today's new visit
      medicalHistory: patient.medical_history || "",
      department: patient.department || "General",
      doctorName: patient.doctor_name || "",
      doctorAssigned: patient.doctor_assigned || "",
      allergies: Array.isArray(patient.allergies) ? patient.allergies.join(", ") : (patient.allergies || ""),
      weight: "",
      temperature: "",
      bp: "",
      pulse: "",
      spo2: "",
    });
    toast.success(`Selected existing record: ${patient.name} (${patient.patient_id})`);
  };

  // Clear selected returning patient
  const handleClearSelectedPatient = () => {
    setSelectedPatient(null);
    setForm(emptyForm);
  };

  const validateStep1 = () => {
    if (registrationType === "returning") {
      if (!selectedPatient) {
        setError("Please search and select an existing patient record to continue.");
        return false;
      }
    }
    if (!form.name.trim()) {
      setError("Patient name is required.");
      return false;
    }
    if (!form.age || Number(form.age) < 1 || Number(form.age) > 150) {
      setError("Please enter a valid age.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.symptoms.trim()) {
      setError("Please describe the patient's chief symptoms for today's visit.");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError("");
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        allergies: form.allergies ? form.allergies.split(",").map(a => a.trim()).filter(Boolean) : [],
        isReturningPatient: registrationType === "returning",
        existingPatientId: selectedPatient?.id || undefined,
      };

      const res = await patientApi.register(payload) as any;
      if (res.success) {
        setRegisteredData(res.data);
        setShowConfirm(true);
        toast.success(res.message || "Registration completed successfully!");
      }
    } catch (err: any) {
      setError(err.message || "Failed to register patient. Please check the details and try again.");
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const registerAnother = () => {
    setShowConfirm(false);
    setRegisteredData(null);
    setSelectedPatient(null);
    setSearchResults([]);
    setHasSearched(false);
    setSearchQuery("");
    setForm(emptyForm);
    setStep(1);
  };

  return (
    <DashboardLayout items={receptionNavItems} title="Patient Registration">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Patient Registration & Queue</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Register walk-in patients, record initial vitals, and issue token numbers
              </p>
            </div>
          </div>
        </div>

        {/* ── Mode Toggle: New Patient vs Already Registered ───────────── */}
        <div className="bg-muted/60 p-1.5 rounded-2xl border border-border/70 flex gap-1.5">
          <button
            type="button"
            onClick={() => handleTypeChange("new")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              registrationType === "new"
                ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
            }`}
          >
            <UserPlus className={`h-4 w-4 ${registrationType === "new" ? "text-primary" : ""}`} />
            <span>New Patient</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hidden sm:inline-block">
              Auto Portal Account
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange("returning")}
            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
              registrationType === "returning"
                ? "bg-card text-foreground shadow-sm font-semibold border border-border/80"
                : "text-muted-foreground hover:text-foreground hover:bg-card/40"
            }`}
          >
            <UserCheck className={`h-4 w-4 ${registrationType === "returning" ? "text-emerald-600" : ""}`} />
            <span>Already Registered</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 hidden sm:inline-block">
              Search Database
            </span>
          </button>
        </div>

        {/* ── Step Indicator ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isDone = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl flex-1 border transition-all duration-200 ${
                    isDone
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                      : isActive
                      ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                      : "bg-muted/40 border-border text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-primary text-white"
                        : "bg-border text-muted-foreground"
                    }`}
                  >
                    {isDone ? <CheckCircle className="h-4 w-4" /> : s.id}
                  </div>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-px w-3 sm:w-4 shrink-0 ${step > s.id ? "bg-emerald-400" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/30 dark:border-red-900 dark:text-red-300"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 1: Personal Info or Returning Patient Lookup ────────── */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm"
            >
              {/* Returning Patient Search Box */}
              {registrationType === "returning" && (
                <div className="space-y-4 pb-5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-base flex items-center gap-2">
                      <Search className="h-5 w-5 text-emerald-600" />
                      Lookup Existing Patient
                    </h2>
                    {selectedPatient && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                        Patient Verified
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSearchPatients} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10 h-11"
                        placeholder="Search by Phone Number, Name, Email, or Patient ID (e.g. 9876543210 or P-1234)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <Button type="submit" disabled={searching} className="h-11 px-5">
                      {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Search
                    </Button>
                  </form>

                  {/* Selected Patient Banner */}
                  {selectedPatient && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-900 dark:text-emerald-200 text-base">
                            {selectedPatient.name}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-200/70 text-emerald-900 font-semibold">
                            {selectedPatient.patient_id}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                          {selectedPatient.age} yrs · {selectedPatient.gender} · Phone: {selectedPatient.phone || "—"} · Email: {selectedPatient.email || "—"}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelectedPatient}
                        className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0"
                      >
                        Change / Search Another
                      </Button>
                    </div>
                  )}

                  {/* Search Results List */}
                  {!selectedPatient && hasSearched && (
                    <div className="space-y-2 mt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Search Results ({searchResults.length})
                      </p>
                      {searchResults.length === 0 ? (
                        <div className="text-center py-6 border border-dashed rounded-xl text-muted-foreground text-sm">
                          No registered patients found matching &quot;{searchQuery}&quot;. Please verify the phone/ID or switch to &quot;New Patient&quot;.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {searchResults.map((p: any) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectPatient(p)}
                              className="p-3.5 rounded-xl border border-border hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{p.name}</span>
                                  <span className="font-mono text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                    {p.patient_id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span>{p.age} yrs, {p.gender}</span>
                                  {p.phone && <span>· {p.phone}</span>}
                                  {p.email && <span>· {p.email}</span>}
                                </div>
                              </div>
                              <Button size="sm" variant="secondary" className="text-xs">
                                Select Patient
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Personal Details Form */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-base flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {registrationType === "returning" ? "Confirmed Demographic Details" : "Patient Personal Details"}
                  </h2>
                  {registrationType === "returning" && selectedPatient && (
                    <span className="text-xs text-muted-foreground">Auto-filled from database</span>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="e.g. Priya Sharma"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                    />
                  </div>
                </div>

                {/* Age + Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Age <span className="text-red-500">*</span></label>
                    <Input
                      type="number"
                      min={1}
                      max={150}
                      placeholder="30"
                      value={form.age}
                      onChange={e => update("age", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Gender <span className="text-red-500">*</span></label>
                    <select
                      value={form.gender}
                      onChange={e => update("gender", e.target.value)}
                      className="form-select"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                {/* Phone + Blood Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={e => update("phone", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Blood Group</label>
                    <select
                      value={form.bloodGroup}
                      onChange={e => update("bloodGroup", e.target.value)}
                      className="form-select"
                    >
                      <option value="">— Select —</option>
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="form-label">Email Address</label>
                    <span className="text-xs text-muted-foreground">
                      {registrationType === "new" ? "Credentials & token sent here" : "Appointment confirmation sent here"}
                    </span>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="email"
                      placeholder="patient@email.com"
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                    />
                  </div>
                  {registrationType === "new" && form.email && (
                    <p className="text-xs text-primary/80 mt-1.5 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      A temporary password will be auto-generated and emailed to this address. Patient will be forced to reset password upon first login.
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="form-label">Address / Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      placeholder="123 Main Street, City"
                      value={form.address}
                      onChange={e => update("address", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={nextStep} className="w-full mt-4 h-11 text-base">
                Continue to Visit & Vitals <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── STEP 2: Visit Symptoms & Initial Vitals ───────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" /> Today&apos;s Consultation Details
                </h2>
                {registrationType === "returning" && selectedPatient && (
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                    Patient: {selectedPatient.name}
                  </span>
                )}
              </div>

              {/* Chief Symptoms */}
              <div>
                <label className="form-label">Chief Symptoms / Reason for Visit <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Describe current symptoms (e.g., persistent fever for 2 days, dry cough, body ache)…"
                  value={form.symptoms}
                  onChange={e => update("symptoms", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                />
              </div>

              {/* Department + Doctor Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Department</label>
                  <select
                    value={form.department}
                    onChange={e => update("department", e.target.value)}
                    className="form-select"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Assign Doctor</label>
                  <select
                    value={form.doctorAssigned}
                    onChange={e => {
                      const docId = e.target.value;
                      const found = doctors.find(d => d.id === docId);
                      setForm(p => ({
                        ...p,
                        doctorAssigned: docId,
                        doctorName: found ? found.name : "",
                      }));
                    }}
                    className="form-select"
                  >
                    <option value="">— Walk-in / General Queue —</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Initial Vital Signs Section ───────────────────────────── */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">
                      Initial Vitals (Recorded at Reception)
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">Standard intake vitals</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {/* BP */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-rose-500" />
                      Blood Pressure
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="120/80"
                        value={form.bp}
                        onChange={e => update("bp", e.target.value)}
                        className="bg-card pr-12 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        mmHg
                      </span>
                    </div>
                  </div>

                  {/* Pulse */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-red-500" />
                      Pulse / Heart Rate
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="75"
                        value={form.pulse}
                        onChange={e => update("pulse", e.target.value)}
                        className="bg-card pr-11 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        bpm
                      </span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                      Temperature
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="98.6"
                        value={form.temperature}
                        onChange={e => update("temperature", e.target.value)}
                        className="bg-card pr-8 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        °F
                      </span>
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Wind className="h-3.5 w-3.5 text-cyan-500" />
                      SpO2 (Oxygen)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="98"
                        value={form.spo2}
                        onChange={e => update("spo2", e.target.value)}
                        className="bg-card pr-8 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-indigo-500" />
                      Body Weight
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="65.5"
                        value={form.weight}
                        onChange={e => update("weight", e.target.value)}
                        className="bg-card pr-8 text-sm"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Past Medical History */}
              <div>
                <label className="form-label">Past Medical History / Comorbidities</label>
                <Input
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma…"
                  value={form.medicalHistory}
                  onChange={e => update("medicalHistory", e.target.value)}
                />
              </div>

              {/* Allergies */}
              <div>
                <label className="form-label">
                  Known Allergies <span className="text-xs text-muted-foreground">(comma-separated)</span>
                </label>
                <div className="relative">
                  <Heart className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="Penicillin, Peanuts, Sulfa drugs…"
                    value={form.allergies}
                    onChange={e => update("allergies", e.target.value)}
                  />
                </div>
                {form.allergies && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.allergies.split(",").map(a => a.trim()).filter(Boolean).map(a => (
                      <span key={a} className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <Button onClick={nextStep} className="flex-1 h-11">
                  Review Summary & Queue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Summary & Final Submission ───────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" /> Review & Confirm Queue Token
                </h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  registrationType === "returning"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-primary/10 text-primary"
                }`}>
                  {registrationType === "returning" ? "Returning Patient Visit" : "New Patient Registration"}
                </span>
              </div>

              {/* Summary Table */}
              <div className="rounded-xl border border-border overflow-hidden text-sm divide-y divide-border">
                {[
                  { label: "Patient Name", value: form.name },
                  { label: "Age & Gender", value: `${form.age} yrs · ${form.gender}` },
                  { label: "Blood Group", value: form.bloodGroup || "Not specified" },
                  { label: "Phone", value: form.phone || "Not provided" },
                  { label: "Email", value: form.email || "Not provided" },
                  { label: "Department", value: form.department },
                  { label: "Assigned Doctor", value: form.doctorName ? `Dr. ${form.doctorName}` : "Walk-in Queue" },
                  { label: "Today's Symptoms", value: form.symptoms },
                  {
                    label: "Initial Vitals",
                    value: [
                      form.bp && `BP: ${form.bp} mmHg`,
                      form.pulse && `Pulse: ${form.pulse} bpm`,
                      form.temperature && `Temp: ${form.temperature} °F`,
                      form.spo2 && `SpO2: ${form.spo2}%`,
                      form.weight && `Weight: ${form.weight} kg`,
                    ].filter(Boolean).join(" | ") || "None recorded",
                  },
                  { label: "Medical History", value: form.medicalHistory || "None" },
                  { label: "Allergies", value: form.allergies || "None" },
                ].map((row, i) => (
                  <div key={i} className={`flex gap-3 px-4 py-3 ${i % 2 === 0 ? "bg-muted/30" : "bg-card"}`}>
                    <span className="w-36 shrink-0 text-muted-foreground font-medium text-xs sm:text-sm">{row.label}</span>
                    <span className="font-medium text-xs sm:text-sm break-words flex-1">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Informational Email Alerts Box */}
              <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 p-4 space-y-2 text-xs text-blue-900 dark:text-blue-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-600" /> Automated Communications via Brevo:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {registrationType === "new" && form.email && (
                    <li>
                      <strong>Patient Portal Credentials:</strong> A random secure password will be generated and emailed to <em>{form.email}</em>. First-time login will prompt for password reset.
                    </li>
                  )}
                  {form.email && (
                    <li>
                      <strong>Visit Confirmation:</strong> Token number, queue position, and recorded vitals will be emailed to <em>{form.email}</em>.
                    </li>
                  )}
                  {form.doctorName && (
                    <li>
                      <strong>Doctor Alert:</strong> Dr. <em>{form.doctorName}</em> will be notified via email with patient details and initial vitals.
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11" disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Edit Details
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" /> Confirm & Issue Token</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── SUCCESS MODAL / TOKEN CONFIRMATION ──────────────────────── */}
      <AnimatePresence>
        {showConfirm && registeredData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={registerAnother}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 16 }}
                className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5"
              >
                {/* Header */}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    {registrationType === "returning" ? "Re-queued Successfully" : "Registered Successfully"}
                  </span>
                  <button onClick={registerAnother} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold">Queue Token Assigned</h3>
                  <p className="text-sm text-muted-foreground">
                    Patient successfully queued for <strong>{registeredData.department || "General"}</strong>
                  </p>
                </div>

                {/* Queue & Patient ID Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Patient ID</p>
                    <p className="text-lg font-bold text-primary font-mono">{registeredData.patient_id}</p>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      <Hash className="h-3 w-3" /> Token / Queue
                    </p>
                    <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                      #{registeredData.queue_number}
                    </p>
                  </div>
                </div>

                {/* AI Estimated Turn Time */}
                {registeredData.estimatedTurnTime && (
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 rounded-2xl p-3.5 text-center space-y-1">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium flex items-center justify-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-600" /> AI Estimated Turn Time
                    </p>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-200">
                      {registeredData.estimatedTurnTime}
                    </p>
                    <p className="text-[11px] text-blue-600/80 dark:text-blue-400">
                      ~{registeredData.patientsAhead ?? 0} patient{(registeredData.patientsAhead ?? 0) === 1 ? "" : "s"} ahead in queue (~{registeredData.waitMinutes ?? 0} mins estimated wait)
                    </p>
                  </div>
                )}

                {/* Patient summary line */}
                <div className="p-3.5 rounded-xl bg-muted/60 text-center text-sm space-y-1">
                  <div className="font-semibold text-foreground">{registeredData.name}</div>
                  {registeredData.doctor_name && (
                    <div className="text-xs text-muted-foreground">
                      Assigned to: <strong>Dr. {registeredData.doctor_name}</strong>
                    </div>
                  )}
                </div>

                {/* Notification status notes */}
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                  {registeredData.email ? (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      Email dispatched to <strong>{registeredData.email}</strong>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No patient email provided for online portal notification.</p>
                  )}
                  {registeredData.doctor_name && (
                    <p className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      Dr. {registeredData.doctor_name} alerted with recorded vitals
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="flex-1"
                  >
                    <Printer className="h-4 w-4 mr-1.5" /> Print Token
                  </Button>
                  <Button
                    type="button"
                    onClick={registerAnother}
                    className="flex-1 bg-primary"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" /> Next Patient
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
