import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, MapPin, Building2, Stethoscope, ArrowRight, ShieldCheck, Clock, Mail, CheckCircle, Loader2 } from "lucide-react";
import { patientApi, clinicApi, getUser, isLoggedIn } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/DashboardLayout";
import { patientNavItems } from "@/lib/navItems";
import { Button } from "@/components/ui/button";

export default function BookAppointment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedClinicId = searchParams.get("clinicId");
  const user = getUser();
  
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const [selectedClinic, setSelectedClinic] = useState<string>(preSelectedClinicId || user?.clinic_id || "");
  const [department, setDepartment] = useState("General");
  const [symptoms, setSymptoms] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [age, setAge] = useState(user?.age ? String(user.age) : "28");
  const [gender, setGender] = useState(user?.gender || "Male");
  const [phone, setPhone] = useState(user?.phone || "");
  
  const [step, setStep] = useState(1);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      toast.error("Please login to book an appointment");
      navigate("/login?role=patient");
      return;
    }

    fetchClinics();
  }, [navigate]);

  const fetchClinics = async () => {
    setLoading(true);
    try {
      const res = await clinicApi.getPublic() as any;
      if (res.success && Array.isArray(res.data)) {
        setClinics(res.data);
        // If no clinic selected, or preselected clinic id, set default
        if (!selectedClinic && res.data.length > 0) {
          const matched = user?.clinic_id ? res.data.find((c: any) => (c.id || c._id) === user.clinic_id) : res.data[0];
          setSelectedClinic((matched?.id || matched?._id) || res.data[0].id || res.data[0]._id);
        }
      }
    } catch {
      toast.error("Failed to load clinics");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic || !symptoms || !appointmentDate) {
      toast.error("Please select a clinic, specify symptoms, and choose an appointment date");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await patientApi.bookAppointment({
        clinicId: selectedClinic,
        symptoms,
        department,
        appointmentDate,
        age: Number(age) || 25,
        gender,
        phone,
      }) as any;

      if (res.success) {
        toast.success(res.message || "Appointment booked successfully!");
        setAppointmentDetails(res.data);
        setStep(2);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to book appointment");
    } finally {
      setBookingLoading(false);
    }
  };

  const clinic = clinics.find(c => (c.id || c._id) === selectedClinic);

  return (
    <DashboardLayout items={patientNavItems} title="Book Appointment">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <CalendarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Schedule Clinic Appointment</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Choose your hospital facility and receive an automated queue token and estimated consultation turn
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading registered clinic facilities…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="booking-form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-card rounded-3xl shadow-sm border border-border p-6 md:p-8 space-y-6"
              >
                <form onSubmit={handleBook} className="space-y-6">
                  {/* Clinic Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" /> 1. Select Hospital or Clinic
                      </h3>
                      <span className="text-xs text-muted-foreground">{clinics.length} Available Facilities</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3.5">
                      {clinics.map(c => {
                        const clinicId = c.id || c._id;
                        const isSelected = selectedClinic === clinicId;
                        return (
                          <div 
                            key={clinicId}
                            onClick={() => {
                              setSelectedClinic(clinicId);
                              if (c.departments?.length > 0 && !c.departments.includes(department)) {
                                setDepartment(c.departments[0]);
                              }
                            }}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/5 shadow-sm" 
                                : "border-border hover:border-primary/40 bg-card"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="font-bold text-sm text-foreground">{c.name}</div>
                              <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full font-semibold uppercase text-muted-foreground">
                                {c.type || "Clinic"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                              <span className="truncate">{c.address || c.city || "Location available"}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Consultation Details */}
                  {selectedClinic && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-5 pt-3 border-t border-border"
                    >
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary" /> 2. Consultation Information
                      </h3>
                      
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                            Department
                          </label>
                          <select
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="form-select w-full h-11"
                          >
                            {clinic?.departments?.map((dep: string) => (
                              <option key={dep} value={dep}>{dep}</option>
                            )) || <option value="General">General</option>}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                            Preferred Date & Time <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                            className="form-input w-full h-11"
                          />
                        </div>
                      </div>

                      {/* Age & Gender */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                            Age
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={150}
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="form-input w-full h-11"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                            Gender
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="form-select w-full h-11"
                          >
                            <option>Male</option>
                            <option>Female</option>
                            <option>Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number"
                            className="form-input w-full h-11"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                          Chief Symptoms / Reason for Consultation <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          placeholder="Describe your current symptoms or reason for the visit (e.g., headache and persistent fever for 2 days)..."
                          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={bookingLoading}
                        className="w-full h-12 text-base font-semibold"
                      >
                        {bookingLoading ? (
                          <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Booking Consultation…</>
                        ) : (
                          <>Confirm Booking & Generate Queue Token <ArrowRight className="h-4 w-4 ml-2" /></>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </form>
              </motion.div>
            ) : (
              /* Success Screen */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-3xl shadow-lg border border-border p-8 text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto text-emerald-600">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">Appointment Confirmed!</h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Your consultation visit has been scheduled. An automated appointment confirmation email has been dispatched to <strong>{user?.email}</strong>.
                  </p>
                </div>

                <div className="bg-muted/40 rounded-2xl p-6 max-w-md mx-auto border border-border space-y-4">
                  <div className="text-center pb-3 border-b border-border">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Queue Token Number</p>
                    <p className="text-5xl font-black text-primary mt-1">#{appointmentDetails?.queue_number || appointmentDetails?.queueNumber}</p>
                  </div>

                  {appointmentDetails?.estimatedTurnTime && (
                    <div className="bg-primary/10 rounded-xl p-3 text-center">
                      <p className="text-xs text-primary font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> AI Estimated Consultation Time
                      </p>
                      <p className="text-xl font-black text-primary mt-0.5">~{appointmentDetails.estimatedTurnTime}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-xs text-left">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Facility</span>
                      <span className="font-semibold text-foreground truncate pl-4">{clinic?.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Department</span>
                      <span className="font-semibold text-foreground">{appointmentDetails?.department || department}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground font-medium">Date & Time</span>
                      <span className="font-semibold text-foreground">
                        {appointmentDetails?.appointment_date ? format(new Date(appointmentDetails.appointment_date), "MMM dd, yyyy h:mm a") : appointmentDate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setSymptoms("");
                      setAppointmentDate("");
                    }}
                  >
                    Book Another
                  </Button>
                  <Button 
                    onClick={() => navigate("/patient/dashboard")}
                  >
                    Go to Patient Dashboard
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </DashboardLayout>
  );
}
