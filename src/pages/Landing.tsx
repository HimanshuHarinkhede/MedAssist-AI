import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, Brain, FileText, Shield, ArrowRight, Mic, Pill, BarChart3, MapPin, Star, Search, SlidersHorizontal, Hospital, Moon, Sun, Heart, Users, Clock } from "lucide-react";
import { useTheme } from "@/lib/themeContext";

const features = [
  { icon: Mic, title: "Voice-Powered Consultations", description: "Record consultations and let AI extract prescriptions, dosages, and patient instructions automatically." },
  { icon: Brain, title: "AI Medical Assistant", description: "Get instant answers to medical queries, drug interactions, and treatment suggestions." },
  { icon: FileText, title: "Smart Prescriptions", description: "Auto-generate clear, patient-friendly prescription instructions from doctor's notes." },
  { icon: Pill, title: "Medication Tracking", description: "Patients can track their medication schedule with timely reminders and dosage info." },
  { icon: BarChart3, title: "Clinical Analytics", description: "Visualize consultation trends, medicine usage patterns, and patient statistics." },
  { icon: Shield, title: "Secure & Private", description: "HIPAA-compliant data handling with end-to-end encryption for all medical records." },
];

const steps = [
  { step: "01", title: "Record Consultation", description: "Doctor starts a voice-recorded consultation session with the patient." },
  { step: "02", title: "AI Extracts Data", description: "AI processes the transcript to identify medicines, dosages, and instructions." },
  { step: "03", title: "Generate Prescription", description: "A clear, patient-friendly prescription is generated with simplified instructions." },
  { step: "04", title: "Patient Access", description: "Patients view prescriptions, medication schedules, and can ask the AI assistant questions." },
];

const hospitals = [
  { id: "1", name: "City Care Hospital", rating: 4.5, distance: "2.3 km", location: "Nagpur", specialization: "General Medicine" },
  { id: "2", name: "LifeLine Multi-Specialty", rating: 4.8, distance: "3.1 km", location: "Nagpur", specialization: "Cardiology" },
  { id: "3", name: "MedPlus Hospital", rating: 4.2, distance: "1.5 km", location: "Nagpur", specialization: "Orthopedics" },
  { id: "4", name: "Apollo Health Center", rating: 4.7, distance: "5.0 km", location: "Nagpur", specialization: "Neurology" },
  { id: "5", name: "Sunrise Children's Hospital", rating: 4.6, distance: "4.2 km", location: "Nagpur", specialization: "Pediatrics" },
  { id: "6", name: "Wellness Clinic", rating: 4.0, distance: "0.8 km", location: "Nagpur", specialization: "General Medicine" },
];

const specializations = ["All", "General Medicine", "Cardiology", "Orthopedics", "Neurology", "Pediatrics"];

const stats = [
  { value: "10K+", label: "Patients Served", icon: Users },
  { value: "500+", label: "Doctors Onboard", icon: Stethoscope },
  { value: "99.9%", label: "Uptime", icon: Clock },
  { value: "50+", label: "Clinics", icon: Hospital },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [hospitalSearch, setHospitalSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [ratingFilter, setRatingFilter] = useState(0);

  const filteredHospitals = hospitals.filter((h) => {
    const matchSearch = h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) || h.location.toLowerCase().includes(hospitalSearch.toLowerCase());
    const matchSpec = selectedSpec === "All" || h.specialization === selectedSpec;
    const matchRating = h.rating >= ratingFilter;
    return matchSearch && matchSpec && matchRating;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">MedAssist AI</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition-colors">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/login" className="px-4 sm:px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Brain className="h-4 w-4" />
            AI-Powered Healthcare
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight max-w-4xl mx-auto">
            Clinical assistant that{" "}
            <span className="text-primary">listens</span>,{" "}
            <span className="text-secondary">understands</span>, and{" "}
            <span className="text-primary">simplifies</span> healthcare
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered clinical assistant that helps doctors during consultations and helps patients understand prescriptions clearly.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link to="/register" className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25">
              Register / Book Appointment <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all duration-300">
              Sign In <Shield className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="stat-card text-center">
              <s.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-extrabold">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>



      {/* Nearby Hospitals */}
      <section className="bg-muted/30 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-medium mb-4">
                <Hospital className="h-4 w-4" />
                Find Care Near You
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Find Nearby Hospitals</h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Locate trusted healthcare providers near your location.</p>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                placeholder="Search by city or hospital name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300"
              />
            </div>
            <div className="flex gap-2 sm:gap-3">
              <select
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
                className="rounded-xl bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 appearance-none"
              >
                {specializations.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(Number(e.target.value))}
                className="rounded-xl bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 appearance-none"
              >
                <option value={0}>Any Rating</option>
                <option value={4}>4+ Stars</option>
                <option value={4.5}>4.5+ Stars</option>
              </select>
            </div>
          </div>

          {/* Hospital Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredHospitals.map((h, i) => (
              <motion.div key={h.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="stat-card group hover:border-secondary/30 transition-all duration-300 hover:shadow-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-secondary/10">
                    <Hospital className="h-5 w-5 text-secondary" />
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-semibold">
                    <Star className="h-3 w-3 fill-current" />
                    {h.rating}
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1">{h.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{h.location}</span>
                  <span className="mx-1">•</span>
                  <span>{h.distance}</span>
                </div>
                <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mt-2">
                  {h.specialization}
                </span>
                <button className="mt-4 w-full py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all duration-300 group-hover:border-secondary/30 group-hover:text-secondary">
                  View Details
                </button>
              </motion.div>
            ))}
          </div>
          {filteredHospitals.length === 0 && (
            <div className="text-center py-12">
              <Hospital className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No hospitals found matching your criteria.</p>
            </div>
          )}
        </div>
      </section>



      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="stat-card text-center py-12 sm:py-16 bg-gradient-to-br from-primary/5 via-card to-secondary/5 border-primary/10">
          <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to Transform Your Practice?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">Join thousands of healthcare professionals using MedAssist AI.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/register-clinic" className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-border font-semibold hover:bg-muted transition-all duration-300">
              Register Your Clinic
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">MedAssist AI</span>
          </Link>
          <p className="text-sm text-muted-foreground">© 2026 MedAssist AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
