import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { dashboardApi, prescriptionApi } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { RefreshCw, WifiOff } from "lucide-react";

const COLORS = [
  "hsl(210,90%,50%)", "hsl(174,60%,45%)", "hsl(38,92%,50%)",
  "hsl(152,60%,45%)", "hsl(0,84%,60%)", "hsl(270,70%,60%)",
];

interface WeekDay {
  day: string;
  patients: number;
}
interface MedicineUsage {
  name: string;
  count: number;
}

function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-6" />
      <div className={`bg-muted rounded-xl`} style={{ height }} />
    </div>
  );
}

export default function Analytics() {
  const [weeklyData, setWeeklyData] = useState<WeekDay[]>([]);
  const [medicineData, setMedicineData] = useState<MedicineUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [dashRes, rxRes] = await Promise.allSettled([
        dashboardApi.doctor() as Promise<any>,
        prescriptionApi.getAll() as Promise<any>,
      ]);

      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        setWeeklyData(dashRes.value.data?.weeklyData || []);
      }

      if (rxRes.status === "fulfilled" && rxRes.value?.success) {
        const countMap: Record<string, number> = {};
        (rxRes.value.data || []).forEach((rx: any) => {
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

      if (dashRes.status === "rejected" && rxRes.status === "rejected") {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <DashboardLayout items={doctorNavItems} title="Analytics">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Live data from your clinic's records.
          </p>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition text-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl text-sm">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>Could not load analytics — ensure the backend server is running on port 5000.</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Consultations Trend */}
          {loading ? <SkeletonChart /> : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="stat-card"
            >
              <h3 className="font-semibold mb-6">Patient Visits This Week</h3>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(210,90%,50%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(210,90%,50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="patients"
                      stroke="hsl(210,90%,50%)"
                      fill="url(#grad1)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <span className="text-3xl">📊</span>
                  <p className="text-sm font-medium">No visits recorded this week yet</p>
                  <p className="text-xs">Data will appear as patients are registered</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Top Medicines Pie */}
          {loading ? <SkeletonChart /> : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="stat-card"
            >
              <h3 className="font-semibold mb-6">Top Medicines Prescribed</h3>
              {medicineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={medicineData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="count"
                      label={({ name }) => name}
                    >
                      {medicineData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <span className="text-3xl">💊</span>
                  <p className="text-sm font-medium">No prescriptions issued yet</p>
                  <p className="text-xs">Prescribe medicines to see usage data</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Medicine Bar Chart */}
        {loading ? <SkeletonChart height={300} /> : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stat-card"
          >
            <h3 className="font-semibold mb-6">Medicine Usage Overview</h3>
            {medicineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={medicineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,20%,90%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(174,60%,45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <span className="text-3xl">📋</span>
                <p className="text-sm font-medium">No medicine data to display</p>
                <p className="text-xs">Issue prescriptions through a consultation to see this chart</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
