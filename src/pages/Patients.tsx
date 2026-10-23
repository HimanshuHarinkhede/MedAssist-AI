import { DashboardLayout } from "@/components/DashboardLayout";
import { doctorNavItems } from "@/lib/navItems";
import { patients } from "@/lib/mockData";
import { Search, Eye, Mic } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Patients() {
  const [search, setSearch] = useState("");
  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout items={doctorNavItems} title="Patients">
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Patient Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Age</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Last Visit</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Medical History</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.name}</td>
                  <td className="py-3 px-4">{p.age}</td>
                  <td className="py-3 px-4 hidden md:table-cell">{p.lastVisit}</td>
                  <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.history}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg hover:bg-muted transition-colors" title="View Profile">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors" title="Start Consultation">
                        <Mic className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
