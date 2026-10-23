import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, CheckCircle, ArrowRight, AlertCircle,
  MapPin, Mail, Phone, Search, Crosshair, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clinicApi } from "@/lib/api";
import { toast } from "sonner";

declare global { interface Window { google: typeof google; } }

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };

export default function ClinicRegistration() {
  const navigate = useNavigate();

  /* DOM refs */
  const mapDivRef      = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Maps object refs */
  const mapRef       = useRef<google.maps.Map | null>(null);
  const markerRef    = useRef<google.maps.Marker | null>(null);
  const geocoderRef  = useRef<google.maps.Geocoder | null>(null);
  const mapInitRef   = useRef(false);

  /* State */
  const [locating, setLocating]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [pinned, setPinned]       = useState<{ lat: number; lng: number } | null>(null);

  const [form, setForm] = useState({
    name: "", type: "Clinic",
    address: "", city: "", state: "",
    phone: "", email: "",
    departments: "", licenseNo: "", description: "",
  });

  /* ── Fill address / city / state from geocode components ───────────── */
  function fillFromComponents(
    components: google.maps.GeocoderAddressComponent[],
    formatted: string
  ) {
    const get = (type: string) =>
      components.find(c => c.types.includes(type))?.long_name ?? "";

    const city  = get("locality") || get("administrative_area_level_2");
    const state = get("administrative_area_level_1");

    setForm(p => ({ ...p, address: formatted, city, state }));
    if (searchInputRef.current) searchInputRef.current.value = formatted;
  }

  /* ── Drop the marker at a LatLng ────────────────────────────────────── */
  function dropMarker(latlng: google.maps.LatLng) {
    const marker = markerRef.current;
    const map    = mapRef.current;
    if (!marker || !map) return;

    marker.setPosition(latlng);
    marker.setVisible(true);
    map.panTo(latlng);
    setPinned({ lat: latlng.lat(), lng: latlng.lng() });
  }

  /* ── Reverse geocode a LatLng → fill form fields ────────────────────── */
  function reverseGeocode(latlng: google.maps.LatLng) {
    geocoderRef.current?.geocode({ location: latlng }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        fillFromComponents(results[0].address_components, results[0].formatted_address);
      }
    });
  }

  /* ── Initialise the map (once, after component is mounted) ──────────── */
  useEffect(() => {
    /* Poll until google.maps is ready (handles async script edge cases) */
    const tryInit = () => {
      if (mapInitRef.current) return;
      if (!window.google?.maps?.places) return;   // places not loaded yet
      if (!mapDivRef.current) return;

      mapInitRef.current = true;

      /* ── Create map ── */
      const map = new window.google.maps.Map(mapDivRef.current!, {
        center: DEFAULT_CENTER,
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
      });

      /* ── Draggable marker (hidden until user picks) ── */
      const marker = new window.google.maps.Marker({
        map,
        draggable: true,
        visible: false,
        title: "Facility Location",
        animation: window.google.maps.Animation.DROP,
      });

      const geocoder = new window.google.maps.Geocoder();

      mapRef.current      = map;
      markerRef.current   = marker;
      geocoderRef.current = geocoder;

      /* ── Click map → pin + geocode ── */
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        dropMarker(e.latLng);
        reverseGeocode(e.latLng);
      });

      /* ── Drag end → geocode new position ── */
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (!pos) return;
        setPinned({ lat: pos.lat(), lng: pos.lng() });
        reverseGeocode(pos);
      });

      /* ── Places Autocomplete ── */
      if (searchInputRef.current) {
        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          fields: ["geometry", "formatted_address", "address_components"],
        });

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place.geometry?.location) {
            toast.error("No location found. Try a more specific query.");
            return;
          }
          const loc = place.geometry.location;
          map.setCenter(loc);
          map.setZoom(17);
          dropMarker(loc);

          if (place.address_components) {
            fillFromComponents(place.address_components, place.formatted_address ?? "");
          }
        });
      }
    };

    /* Try immediately, then poll in case Maps is still loading */
    tryInit();
    const id = setInterval(() => {
      if (mapInitRef.current) { clearInterval(id); return; }
      tryInit();
    }, 300);

    return () => clearInterval(id);
  }, []); // run once after mount

  /* ── "Use my location" ──────────────────────────────────────────────── */
  function handleLocateMe() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return; }
    if (!mapRef.current) { toast.error("Map not ready yet."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latlng = new window.google.maps.LatLng(coords.latitude, coords.longitude);
        mapRef.current!.setZoom(17);
        dropMarker(latlng);
        reverseGeocode(latlng);
        setLocating(false);
      },
      () => { toast.error("Location access denied."); setLocating(false); },
      { timeout: 10000 }
    );
  }

  /* ── Submit ─────────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!pinned) {
      setError("Please pin the facility location on the map before submitting.");
      return;
    }

    setLoading(true);
    try {
      const deptArray = form.departments
        ? form.departments.split(",").map(d => d.trim()).filter(Boolean)
        : ["General"];

      const res = await clinicApi.register({
        ...form,
        departments: deptArray,
        latitude:  pinned.lat,
        longitude: pinned.lng,
      }) as any;

      if (res.success) {
        toast.success(`${form.type} registered successfully!`);
        setSubmitted(true);
        setTimeout(() => navigate("/admin/dashboard"), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Make sure you are logged in as Platform Admin.");
    } finally {
      setLoading(false);
    }
  }

  /* ── Success ────────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Facility Registered!</h2>
          <p className="text-slate-500 mb-6">Redirecting to admin dashboard…</p>
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-3xl p-8 text-white flex items-center gap-5 shadow-xl shadow-blue-500/20">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Register New Facility</h1>
              <p className="text-blue-100 mt-1">Fill in the details and pin the location on the map</p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6 items-start">

          {/* ══ LEFT — Form ════════════════════════════════════════════════ */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl shadow-lg border border-slate-100 p-7 space-y-5">

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name */}
            <Field label="Facility Name" required>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required placeholder="e.g. City Care Hospital" className={inputCls} />
            </Field>

            {/* Type */}
            <Field label="Facility Type">
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className={inputCls + " appearance-none"}>
                <option>Clinic</option>
                <option>Hospital</option>
                <option>Telemedicine</option>
              </select>
            </Field>

            {/* Address (auto-filled) */}
            <Field label="Full Address" hint="auto-filled from map pin">
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  required placeholder="Pin a location on the map →"
                  className={inputCls + " pl-10"} />
              </div>
            </Field>

            {/* City / State */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="City">
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="Mumbai" className={inputCls} />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                  placeholder="Maharashtra" className={inputCls} />
              </Field>
            </div>

            {/* Phone / Email */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="9876543210" className={inputCls + " pl-9"} />
                </div>
              </Field>
              <Field label="Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="email" value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="clinic@email.com" className={inputCls + " pl-9"} />
                </div>
              </Field>
            </div>

            {/* License */}
            <Field label="License / Reg No.">
              <input value={form.licenseNo}
                onChange={e => setForm(p => ({ ...p, licenseNo: e.target.value }))}
                placeholder="REG-12345" className={inputCls} />
            </Field>

            {/* Departments */}
            <Field label="Departments" hint="comma-separated">
              <input value={form.departments}
                onChange={e => setForm(p => ({ ...p, departments: e.target.value }))}
                placeholder="General, Cardiology, Pediatrics" className={inputCls} />
            </Field>

            {/* Description */}
            <Field label="Description">
              <textarea rows={2} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this facility…"
                className={inputCls + " resize-none"} />
            </Field>

            {/* Coordinates badge */}
            <AnimatePresence>
              {pinned && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                  <MapPin className="h-4 w-4 shrink-0" />
                  ✅ Pinned: {pinned.lat.toFixed(6)}, {pinned.lng.toFixed(6)}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => navigate("/admin/dashboard")}
                className="px-5 py-3 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold hover:from-blue-500 hover:to-cyan-400 transition shadow-lg shadow-blue-500/20 disabled:opacity-70">
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Register Facility <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </motion.div>

          {/* ══ RIGHT — Map ════════════════════════════════════════════════ */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden sticky top-6">

            {/* Search bar */}
            <div className="p-4 border-b border-slate-100 flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                <input
                  ref={searchInputRef}
                  id="map-search"
                  type="text"
                  autoComplete="off"
                  placeholder="Search hospital, clinic, or address…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-slate-700"
                />
              </div>
              <button type="button" onClick={handleLocateMe} disabled={locating}
                title="Use my current location"
                className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition shrink-0 disabled:opacity-50">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              </button>
            </div>

            {/* Map — explicit pixel height so Google Maps renders correctly */}
            <div
              ref={mapDivRef}
              style={{ width: "100%", height: "440px" }}
            />

            {/* Hint */}
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2 text-xs text-blue-700 font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              Click anywhere on the map or search to pin the exact location. Drag the marker to fine-tune.
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}

/* ── Helper components ────────────────────────────────────────────────────── */
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-slate-700 text-sm";

function Field({
  label, hint, required, children,
}: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {hint && <span className="text-slate-400 font-normal text-xs">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
