import { DashboardLayout } from "@/components/DashboardLayout";
import { receptionNavItems } from "@/lib/navItems";
import { patientQueue } from "@/lib/mockData";
import { TableComponent } from "@/components/TableComponent";
import { Edit, Trash2 } from "lucide-react";

const statusStyle = {
  Waiting: "bg-warning/10 text-warning",
  Consulting: "bg-info/10 text-info",
  Completed: "bg-success/10 text-success",
};

export default function PatientQueue() {
  const columns = [
    { header: "#", accessor: (row: typeof patientQueue[0]) => <span className="font-bold">{row.queueNumber}</span> },
    { header: "Patient Name", accessor: "patientName" as const },
    { header: "Symptoms", accessor: "symptoms" as const },
    { header: "Doctor Assigned", accessor: "doctorAssigned" as const },
    { header: "Status", accessor: (row: typeof patientQueue[0]) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[row.status]}`}>{row.status}</span>
    )},
    { header: "Actions", accessor: (row: typeof patientQueue[0]) => (
      <div className="flex gap-2">
        <button disabled={row.status !== "Waiting"} title="Update" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-50 transition">
          <Edit className="h-4 w-4" />
        </button>
        <button disabled={row.status !== "Waiting"} title="Delete" className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-50 disabled:text-muted-foreground transition">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )},
  ];

  return (
    <DashboardLayout items={receptionNavItems} title="Patient Queue">
      <div className="space-y-6">
        <h2 className="section-title">Today's Queue</h2>
        <TableComponent columns={columns} data={patientQueue} />
      </div>
    </DashboardLayout>
  );
}
