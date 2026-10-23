import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { adminNavItems } from "@/lib/navItems";
import { staffMembers } from "@/lib/mockData";
import { TableComponent } from "@/components/TableComponent";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

const shiftHours = { Morning: "6:00 AM – 2:00 PM", Evening: "2:00 PM – 10:00 PM", Night: "10:00 PM – 6:00 AM" };

interface ShiftRow {
  id: string;
  name: string;
  role: string;
  shift: "Morning" | "Evening" | "Night";
  hours: string;
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<ShiftRow[]>(
    staffMembers.map((s) => ({ id: s.id, name: s.name, role: s.role, shift: s.shift, hours: shiftHours[s.shift] }))
  );
  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editShift, setEditShift] = useState<"Morning" | "Evening" | "Night">("Morning");

  const openEdit = (row: ShiftRow) => { setEditingId(row.id); setEditShift(row.shift); setEditModal(true); };
  const saveEdit = () => {
    setShifts((prev) => prev.map((s) => s.id === editingId ? { ...s, shift: editShift, hours: shiftHours[editShift] } : s));
    setEditModal(false);
  };

  const columns = [
    { header: "Staff Name", accessor: "name" as const },
    { header: "Role", accessor: "role" as const },
    { header: "Shift", accessor: (row: ShiftRow) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.shift === "Morning" ? "bg-info/10 text-info" : row.shift === "Evening" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}`}>
        {row.shift}
      </span>
    )},
    { header: "Working Hours", accessor: "hours" as const },
    { header: "Actions", accessor: (row: ShiftRow) => (
      <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="h-4 w-4" /></button>
    )},
  ];

  return (
    <DashboardLayout items={adminNavItems} title="Shift Management">
      <div className="space-y-6">
        <h2 className="section-title">Staff Schedules</h2>
        <TableComponent columns={columns} data={shifts} />
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Shift">
        <div className="space-y-4">
          <select value={editShift} onChange={(e) => setEditShift(e.target.value as any)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option>Morning</option><option>Evening</option><option>Night</option>
          </select>
          <Button onClick={saveEdit} className="w-full">Save</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
