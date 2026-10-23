import { motion } from "framer-motion";
import { Pill, Calendar, Clock } from "lucide-react";

interface PrescriptionCardProps {
  patientName?: string;
  doctorName?: string;
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  date: string;
  onView?: () => void;
}

export function PrescriptionCard({
  patientName,
  doctorName,
  medicine,
  dosage,
  frequency,
  duration,
  instructions,
  date,
  onView,
}: PrescriptionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{medicine}</h3>
          <p className="text-sm text-muted-foreground">
            {patientName ? `Patient: ${patientName}` : `Dr. ${doctorName}`}
          </p>
        </div>
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
          {dosage}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Pill className="h-4 w-4" />
          <span>{frequency}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{duration}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
      </div>

      <p className="text-sm bg-muted/50 p-3 rounded-lg">{instructions}</p>

      {onView && (
        <button
          onClick={onView}
          className="text-sm text-primary font-medium hover:underline"
        >
          View Full Prescription →
        </button>
      )}
    </motion.div>
  );
}
