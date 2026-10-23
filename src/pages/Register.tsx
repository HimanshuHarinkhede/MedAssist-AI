import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Stethoscope, Mail, Lock, User, Phone, ArrowRight,
  AlertCircle, Eye, EyeOff, Calendar, Droplets, MapPin, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi, setAuth } from "@/lib/api";
import { toast } from "sonner";

const STEPS = ["Account", "Personal Info", "Done"];

export default function Register() {
  const navigate  = useNavigate();
  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 0 fields
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [phone, setPhone]         = useState("");

  // Step 1 fields
  const [age, setAge]             = useState("");
  const [gender, setGender]       = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress]     = useState("");

  const validateStep0 = () => {
    if (!name.trim())           { setError("Full name is required."); return false; }
    if (!email.trim())          { setError("Email is required."); return false; }
    if (password.length < 6)    { setError("Password must be at least 6 characters."); return false; }
    setError(""); return true;
  };

  const validateStep1 = () => {
    if (!age || Number(age) < 1)  { setError("Please enter a valid age."); return false; }
    if (!gender)                  { setError("Please select your gender."); return false; }
    setError(""); return true;
  };

  const handleNextStep = () => {
    if (step === 0 && !validateStep0()) return;
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authApi.register({
        name, email, password, phone,
        age: Number(age), gender, bloodGroup, address,
      }) as any;

      if (res.success) {
        setAuth(res.data.token, res.data.user);
        toast.success("Account created! Welcome to MedAssist AI 🎉");
        setStep(2);
        // Redirect after brief celebration
        setTimeout(() => navigate("/patient/dashboard"), 1800);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />

      <div className="w-full max-w-lg relative z-10">
        {/* Logo */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-white">MedAssist AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">Create Patient Account</h1>
          <p className="text-slate-400 text-sm mt-1">Register to book appointments & manage your health</p>
        </motion.div>

        {/* Step indicator */}
        {step < 2 && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.slice(0, 2).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i <= step ? "bg-blue-500 text-white" : "bg-white/10 text-slate-500"
                }`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-medium ${i <= step ? "text-slate-200" : "text-slate-500"}`}>{s}</span>
                {i < 1 && <div className={`w-8 h-px ${step > i ? "bg-blue-500" : "bg-white/10"}`} />}
              </div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm mb-5"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 0 — Account Details */}
          {step === 0 && (
            <AnimatePresence mode="wait">
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-semibold text-lg">Account Details</h3>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="reg-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="patient@email.com"
                      className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Phone <span className="text-slate-500">(optional)</span></label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="dark-form-input w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="reg-next-0"
                  type="button"
                  onClick={handleNextStep}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 mt-2"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            </AnimatePresence>
          )}

          {/* STEP 1 — Personal Info */}
          {step === 1 && (
            <AnimatePresence mode="wait">
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-white font-semibold text-lg">Personal Information</h3>
                <p className="text-slate-400 text-xs">Required to book appointments & track your health.</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Age <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="reg-age"
                        type="number"
                        min="1" max="120"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="25"
                        className="dark-form-input w-full pl-9 pr-3 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-1.5 block">Gender <span className="text-red-400">*</span></label>
                    <select
                      id="reg-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="dark-form-input w-full px-3 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    >
                      <option value="" className="bg-slate-900 text-white">Select...</option>
                      <option value="Male" className="bg-slate-900 text-white">Male</option>
                      <option value="Female" className="bg-slate-900 text-white">Female</option>
                      <option value="Other" className="bg-slate-900 text-white">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Blood Group <span className="text-slate-500">(optional)</span></label>
                  <div className="relative">
                    <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                    >
                      <option value="" className="bg-slate-900 text-white">Unknown / Prefer not to say</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
                        <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Address <span className="text-slate-500">(optional)</span></label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Your home address..."
                      rows={2}
                      className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="flex-1 py-3 rounded-xl border border-white/15 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all"
                  >
                    Back
                  </button>
                  <button
                    id="reg-submit"
                    type="button"
                    onClick={() => { if (validateStep1()) handleRegister(); }}
                    disabled={loading}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                    ) : (
                      <>Create Account <ArrowRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* STEP 2 — Success */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-xl font-bold text-white">Account Created!</h3>
              <p className="text-slate-400 text-sm">
                Welcome to MedAssist AI, <strong className="text-white">{name}</strong>!<br />
                Redirecting to your dashboard...
              </p>
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
            </motion.div>
          )}
        </motion.div>

        {step < 2 && (
          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
