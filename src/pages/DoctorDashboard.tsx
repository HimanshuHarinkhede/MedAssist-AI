import { useState, useEffect, useRef } from "react";
import { Users, Calendar, FileText, Clock, TrendingUp, RefreshCw, WifiOff } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { dashboardApi, prescriptionApi } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardStats {
  totalPatients: number;
  todayPatients: number;
  totalPrescriptions: number;
  todayPrescriptions: number;
  waitingPatients: number;
}

interface WeekDay {
  day: string;
  patients: number;
}

interface MedicineUsage {
  name: string;
  count: number;
}

function SkeletonCard() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
      <div className="h-8 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-6" />
      <div className="h-[250px] bg-muted rounded-xl" />
    </div>
  );
}

export default function DoctorDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeekDay[]>([]);
  const [medicineData, setMedicineData] = useState<MedicineUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const res = await dashboardApi.doctor() as any;
      if (res.success && res.data) {
        setStats(res.data.stats);
        setWeeklyData(res.data.weeklyData || []);
      }
    } catch {
      setError(true);
    } finally {
      if (!silent) setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const fetchMedicineUsage = async () => {
    try {
      const res = await prescriptionApi.getAll() as any;
      if (res.success && res.data) {
        // Aggregate medicine counts from prescriptions
        const countMap: Record<string, number> = {};
        (res.data || []).forEach((rx: any) => {
          (rx.medicines || []).forEach((m: any) => {
            const name = m.name || m.medicine || "Unknown";
            countMap[name] = (countMap[name] || 0) + 1;
          });
        });
        const sorted = Object.entries(countMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([name, count]) => ({ name, count }));
        setMedicineData(sorted);
      }
    } catch {
      // non-critical, silently skip
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchMedicineUsage();

    // Auto-refresh every 30 seconds (real-time updates)
    intervalRef.current = setInterval(() => {
      fetchDashboard(true);
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <DashboardLayout items={doctorNavItems} title="Dashboard">
      <div className="space-y-8">

        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Welcome back, Doctor 👋</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here's your clinic overview — updates every 30 seconds.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Last refreshed: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => { fetchDashboard(); fetchMedicineUsage(); }}
              disabled={loading}
              className="p-2 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm"
            >
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>Could not connect to the backend. Showing last known data. Make sure the server is running on port 5000.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              title="Total Patients"
              value={stats?.totalPatients ?? 0}
              icon={Users}
              trend={stats?.todayPatients ? `+${stats.todayPatients} today` : "No new today"}
              trendUp={(stats?.todayPatients ?? 0) > 0}
              color="primary"
            />
            <StatCard
              title="Today's Consultations"
              value={stats?.todayPatients ?? 0}
              icon={Calendar}
              trend={stats?.waitingPatients ? `${stats.waitingPatients} still waiting` : "Queue clear"}
              trendUp={false}
              color="secondary"
            />
            <StatCard
              title="Active Prescriptions"
              value={stats?.totalPrescriptions ?? 0}
              icon={FileText}
              trend={stats?.todayPrescriptions ? `${stats.todayPrescriptions} issued today` : "None today"}
              trendUp={(stats?.todayPrescriptions ?? 0) > 0}
              color="success"
            />
            <StatCard
              title="Waiting Patients"
              value={stats?.waitingPatients ?? 0}
              icon={Clock}
              trend="Currently in queue"
              trendUp={false}
              color="warning"
            />
          </motion.div>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {loading ? (
            <>
              <SkeletonChart />
              <SkeletonChart />
            </>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="stat-card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Patients This Week</h3>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                {weeklyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={weeklyData}>
                      <defs>
                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(210, 90%, 50%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(210, 90%, 50%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="patients"
                        stroke="hsl(210, 90%, 50%)"
                        fillOpacity={1}
                        fill="url(#colorPatients)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    No patient data this week yet
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="stat-card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Top Medicines Prescribed</h3>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                {medicineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={medicineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 50%)" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 50%)" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(174, 60%, 45%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    No prescriptions issued yet
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
