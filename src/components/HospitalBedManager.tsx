/**
 * HospitalBedManager.tsx
 *
 * Doctor & Clinical Admin Bed Management:
 *   - Configure total beds available in the hospital by ward & section (ICU, ICCU, General, etc.)
 *   - Real-time capacity stats (Total, Available, Occupied, Occupancy Rate)
 *   - Add single bed or generate bulk beds (e.g. 10 beds for ICU)
 *   - Visual bed map: Green (Available) / Red (Occupied by Patient Name)
 *   - Delete or manually release beds
 */

import { useState, useEffect } from "react";
import { wardApi } from "@/lib/api";
import {
  BedDouble, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  Layers, Check, X, ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export interface HospitalBed {
  id: string;
  clinic_id: string;
  ward: string;
  bed_number: string;
  is_occupied: boolean;
  current_patient_id?: string;
  current_patient_name?: string;
  current_admission_id?: string;
  notes?: string;
}

export interface BedStats {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  byWard: {
    ward: string;
    total: number;
    occupied: number;
    available: number;
    beds: HospitalBed[];
  }[];
}

const DEFAULT_WARDS = [
  "General Ward",
  "ICU",
  "ICCU",
  "Pediatric Ward",
  "Surgical Ward",
  "Maternity Ward",
  "Isolation Ward",
];

export function HospitalBedManagerModal({
  onClose,
  onUpdated,
}: {
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [stats, setStats] = useState<BedStats | null>(null);
  const [beds, setBeds] = useState<HospitalBed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWardFilter, setSelectedWardFilter] = useState<string>("All");

  // Form states
  const [activeTab, setActiveTab] = useState<"overview" | "addSingle" | "addBulk">("overview");
  const [singleWard, setSingleWard] = useState("General Ward");
  const [singleBedNumber, setSingleBedNumber] = useState("");
  const [bulkWard, setBulkWard] = useState("ICU");
  const [bulkPrefix, setBulkPrefix] = useState("ICU-");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkStart, setBulkStart] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, bedsRes] = await Promise.all([
        wardApi.bedStats() as any,
        wardApi.beds() as any,
      ]);
      setStats(statsRes.data || null);
      setBeds(bedsRes.data || []);
    } catch (err: any) {
      toast.error(`Failed to load bed inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleBedNumber.trim()) {
      toast.error("Please enter a bed number (e.g. GW-09 or ICU-05).");
      return;
    }
    setSaving(true);
    try {
      await wardApi.addBed({
        ward: singleWard,
        bedNumber: singleBedNumber.trim(),
      });
      toast.success(`✅ Bed ${singleBedNumber} added to ${singleWard}!`);
      setSingleBedNumber("");
      setActiveTab("overview");
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkCount < 1) {
      toast.error("Please specify at least 1 bed.");
      return;
    }
    setSaving(true);
    try {
      await wardApi.addBulkBeds({
        ward: bulkWard,
        prefix: bulkPrefix,
        count: bulkCount,
        startNumber: bulkStart,
      });
      toast.success(`✅ Added ${bulkCount} beds to ${bulkWard}!`);
      setActiveTab("overview");
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bed: HospitalBed) => {
    if (bed.is_occupied) {
      toast.error("Cannot delete an occupied bed. Discharge patient first.");
      return;
    }
    if (!window.confirm(`Delete bed ${bed.bed_number} from ${bed.ward}?`)) return;
    try {
      await wardApi.deleteBed(bed.id);
      toast.success(`Bed ${bed.bed_number} deleted.`);
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleRelease = async (bed: HospitalBed) => {
    if (!window.confirm(`Manually free bed ${bed.bed_number}?`)) return;
    try {
      await wardApi.releaseBed(bed.id);
      toast.success(`Bed ${bed.bed_number} is now available.`);
      await load();
      onUpdated?.();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const filteredBeds = beds.filter((b) =>
    selectedWardFilter === "All" ? true : b.ward.toLowerCase() === selectedWardFilter.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-card/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BedDouble className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                Hospital Bed Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure wards, bed capacity & monitor availability in real time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-border bg-muted/20">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Bed Inventory & Map
          </button>
          <button
            onClick={() => setActiveTab("addSingle")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === "addSingle"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            + Add Single Bed
          </button>
          <button
            onClick={() => setActiveTab("addBulk")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${
              activeTab === "addBulk"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            + Bulk Add Beds
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Overall Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{stats?.total ?? beds.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Beds</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {stats?.available ?? beds.filter((b) => !b.is_occupied).length}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">Available (Vacant)</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {stats?.occupied ?? beds.filter((b) => b.is_occupied).length}
                  </p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 font-medium">Occupied</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats?.occupancyRate ?? (beds.length ? Math.round((beds.filter((b) => b.is_occupied).length / beds.length) * 100) : 0)}%
                  </p>
                  <p className="text-xs text-primary mt-1 font-medium">Occupancy Rate</p>
                </div>
              </div>

              {/* Per-Ward Capacity Breakdown */}
              {stats?.byWard && stats.byWard.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Ward & Section Capacity
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {stats.byWard.map((w) => (
                      <div
                        key={w.ward}
                        onClick={() => setSelectedWardFilter(w.ward === selectedWardFilter ? "All" : w.ward)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          selectedWardFilter === w.ward
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{w.ward}</p>
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-md">
                            {w.available} / {w.total} free
                          </span>
                        </div>
                        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${w.total ? Math.round((w.occupied / w.total) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                          <span>{w.occupied} Occupied</span>
                          <span className="text-emerald-600 font-medium">{w.available} Vacant</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ward Filter Pills */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">Filter Ward:</span>
                  {["All", ...Array.from(new Set(beds.map((b) => b.ward)))].map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedWardFilter(w)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        selectedWardFilter === w
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredBeds.length} bed{filteredBeds.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Visual Bed Grid Map */}
              {loading ? (
                <div className="text-center py-12 text-sm text-muted-foreground">Loading bed grid...</div>
              ) : filteredBeds.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <BedDouble className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No beds found in this ward</p>
                  <p className="text-xs text-muted-foreground mt-1">Use '+ Add Single Bed' or '+ Bulk Add Beds' to create beds.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredBeds.map((bed) => (
                    <motion.div
                      key={bed.id}
                      layout
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                        bed.is_occupied
                          ? "border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20"
                          : "border-emerald-300 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-base tracking-tight">{bed.bed_number}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                              bed.is_occupied
                                ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            }`}
                          >
                            {bed.is_occupied ? "Occupied" : "Vacant"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{bed.ward}</p>
                        {bed.is_occupied && bed.current_patient_name && (
                          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 mt-2 truncate">
                            👤 {bed.current_patient_name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-border/40">
                        {bed.is_occupied ? (
                          <button
                            onClick={() => handleRelease(bed)}
                            className="text-[11px] text-primary hover:underline font-medium"
                            title="Manually release bed"
                          >
                            Release
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(bed)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition"
                            title="Delete bed"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD SINGLE BED */}
          {activeTab === "addSingle" && (
            <form onSubmit={handleAddSingle} className="max-w-md mx-auto space-y-4 py-4">
              <h4 className="font-semibold text-base">Add New Bed to Ward</h4>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ward / Section *</label>
                <select
                  value={singleWard}
                  onChange={(e) => setSingleWard(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEFAULT_WARDS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Bed Number / Identifier *</label>
                <input
                  value={singleBedNumber}
                  onChange={(e) => setSingleBedNumber(e.target.value)}
                  placeholder="e.g. ICU-05 or GW-12"
                  className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? "Adding..." : "+ Add Bed"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: BULK ADD BEDS */}
          {activeTab === "addBulk" && (
            <form onSubmit={handleAddBulk} className="max-w-md mx-auto space-y-4 py-4">
              <div>
                <h4 className="font-semibold text-base">Bulk Generate Beds</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Rapidly create a series of beds for a new ward or expansion
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Ward / Section *</label>
                <select
                  value={bulkWard}
                  onChange={(e) => {
                    const w = e.target.value;
                    setBulkWard(w);
                    if (w === "ICU") setBulkPrefix("ICU-");
                    else if (w === "General Ward") setBulkPrefix("GW-");
                    else if (w === "ICCU") setBulkPrefix("ICCU-");
                    else if (w === "Pediatric Ward") setBulkPrefix("PED-");
                    else setBulkPrefix(`${w.slice(0, 3).toUpperCase()}-`);
                  }}
                  className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DEFAULT_WARDS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Prefix *</label>
                  <input
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    placeholder="e.g. ICU-"
                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Number of Beds *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Starting Number</label>
                <input
                  type="number"
                  min="1"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Preview: {bulkPrefix}{String(bulkStart).padStart(2, "0")} to {bulkPrefix}{String(bulkStart + bulkCount - 1).padStart(2, "0")}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? "Creating..." : `+ Generate ${bulkCount} Beds`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
