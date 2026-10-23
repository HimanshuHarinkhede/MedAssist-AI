import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Shield, Heart, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authApi, setAuth } from "@/lib/api";
import { toast } from "sonner";

const ROLE_ROUTES: Record<string, string> = {
  doctor: "/doctor/dashboard",
  patient: "/patient/dashboard",
  receptionist: "/reception/dashboard",
  nurse: "/staff/dashboard",
  pharmacist: "/staff/dashboard",
  lab_technician: "/staff/dashboard",
  clinic_admin: "/admin/dashboard",
  platform_admin: "/admin/dashboard",
};

const ROLES = [
  { id: "patient", label: "Patient", emoji: "👤", desc: "Book appointments & view prescriptions" },
  { id: "doctor", label: "Doctor", emoji: "🩺", desc: "Manage consultations & patients" },
  { id: "receptionist", label: "Reception", emoji: "📋", desc: "Register patients & manage queue" },
  { id: "nurse", label: "Nurse / Staff", emoji: "💉", desc: "Monitor admitted patients" },
  { id: "clinic_admin", label: "Admin", emoji: "⚙️", desc: "Platform & clinic management" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.login({ email, password }) as any;
      if (res.success) {
        setAuth(res.data.token, res.data.user);
        // Force password reset if required
        if (res.data.mustResetPassword) {
          toast.info("Please reset your password before continuing.");
          navigate("/reset-password");
          return;
        }
        toast.success(`Welcome back, ${res.data.user.name}! 👋`);
        const dest = ROLE_ROUTES[res.data.user.role] || "/patient/dashboard";
        navigate(dest);
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left panel — branding */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col gap-8 text-white p-4"
        >
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-2xl">MedAssist AI</span>
          </Link>

          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-white mb-3">
              Smart Healthcare.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Connected & Secure.
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              AI-powered clinical management for doctors, patients, and administrators.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Shield, text: "Secure role-based access for every user" },
              { icon: Heart, text: "Real-time patient queue & appointment management" },
              { icon: Activity, text: "AI-powered prescriptions & consultation notes" },
            ].map(({ icon: Icon, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="flex items-center gap-3 text-slate-300"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm">{text}</span>
              </motion.div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Admin Login</p>
            <p className="text-sm text-slate-300 font-mono">admin@medassist.com</p>
            <p className="text-xs text-slate-500 mt-1">Contact your platform admin for staff credentials</p>
          </div>
        </motion.div>

        {/* Right panel — login form */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-xl text-white">MedAssist AI</span>
          </Link>

          <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
          <p className="text-slate-400 text-sm mb-6">Select your role and enter your credentials</p>

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">I am a...</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all duration-200 ${selectedRole === r.id
                    ? "bg-blue-500/20 border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/10"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    }`}
                >
                  <span className="text-lg">{r.emoji}</span>
                  <span className="text-xs leading-tight text-center">{r.label}</span>
                  {selectedRole === r.id && (
                    <motion.div
                      layoutId="roleIndicator"
                      className="absolute inset-0 rounded-xl border-2 border-blue-400/40"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={selectedRole}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-slate-500 mt-2 text-center"
              >
                {ROLES.find((r) => r.id === selectedRole)?.desc}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm mb-4"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="dark-form-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
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
              {(selectedRole === "doctor" || selectedRole === "receptionist" || selectedRole === "nurse" || selectedRole === "clinic_admin") && (
                <p className="text-xs text-slate-500 mt-1.5">
                  💡 Default staff password is <span className="text-blue-400 font-mono">pass123</span> — you'll be asked to reset it on first login.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-500 hover:to-cyan-400 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center space-y-2">
            <p className="text-sm text-slate-400">
              New patient?{" "}
              <Link to="/register" className="text-blue-400 font-medium hover:text-blue-300 hover:underline transition-colors">
                Create an account & book appointment
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
