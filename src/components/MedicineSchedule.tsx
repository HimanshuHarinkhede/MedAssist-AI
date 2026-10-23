import { Check, Clock, Pill } from "lucide-react";
import { motion } from "framer-motion";

interface ScheduleItem {
  time: string;
  medicine: string;
  status: "taken" | "upcoming" | "missed";
}

const statusConfig = {
  taken: { icon: Check, color: "text-success", bg: "bg-success/10", label: "Taken" },
  upcoming: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Upcoming" },
  missed: { icon: Pill, color: "text-destructive", bg: "bg-destructive/10", label: "Missed" },
};

export function MedicineSchedule({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const config = statusConfig[item.status];
        const Icon = config.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={`p-2 rounded-lg ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.medicine}</p>
              <p className="text-xs text-muted-foreground">{item.time}</p>
            </div>
            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
