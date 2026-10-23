/**
 * api.ts — Centralized API client for MedAssist AI Backend
 * Base URL: http://localhost:5000/api
 */

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

// ─── Token / Auth Management ───────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("medassist_token");
export const getUser  = (): any => {
  const u = localStorage.getItem("medassist_user");
  return u ? JSON.parse(u) : null;
};
export const setAuth  = (token: string, user: object) => {
  localStorage.setItem("medassist_token", token);
  localStorage.setItem("medassist_user", JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem("medassist_token");
  localStorage.removeItem("medassist_user");
};
export const isLoggedIn = () => !!getToken();

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res  = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}: Request failed`);
  }
  return data;
}

async function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { method: "POST", headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data;
}

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  /** Patient self-registration */
  register: (body: {
    name: string; email: string; password: string;
    phone?: string; age?: number; gender?: string;
    bloodGroup?: string; address?: string;
  }) => request<ApiResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<ApiResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  me: () => request<ApiResponse>("/auth/me"),

  resetPassword: (body: { currentPassword: string; newPassword: string }) =>
    request<ApiResponse>("/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
};

// ─── Clinic API ────────────────────────────────────────────────────────────────
export const clinicApi = {
  /** Public — no auth required (for landing page) */
  getPublic: () => fetch(`${BASE_URL}/clinic/public`).then((r) => r.json()),

  /** Platform admin only */
  register: (body: object) =>
    request<ApiResponse>("/clinic/register", { method: "POST", body: JSON.stringify(body) }),
  getAll: (params?: Record<string, string>) =>
    request<ApiResponse>(`/clinic${params ? "?" + new URLSearchParams(params) : ""}`),
  get:    (id: string) => request<ApiResponse>(`/clinic/${id}`),
  update: (id: string, body: object) =>
    request<ApiResponse>(`/clinic/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<ApiResponse>(`/clinic/${id}`, { method: "DELETE" }),
};

// ─── Staff API ─────────────────────────────────────────────────────────────────
export const staffApi = {
  add: (body: object) =>
    request<ApiResponse>("/staff/add", { method: "POST", body: JSON.stringify(body) }),
  list: (params?: Record<string, string>) =>
    request<ApiResponse>(`/staff/list${params ? "?" + new URLSearchParams(params) : ""}`),
  get:    (id: string) => request<ApiResponse>(`/staff/${id}`),
  update: (id: string, body: object) =>
    request<ApiResponse>(`/staff/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  delete: (id: string) => request<ApiResponse>(`/staff/${id}`, { method: "DELETE" }),
};

// ─── Patient / Appointment API ─────────────────────────────────────────────────
export const patientApi = {
  /** Walk-in registration (reception staff) */
  register: (body: object) =>
    request<ApiResponse>("/patient/register", { method: "POST", body: JSON.stringify(body) }),

  /** Patient self-books appointment */
  bookAppointment: (body: {
    clinicId: string; symptoms: string;
    department?: string; appointmentDate: string;
    age?: number; gender?: string; phone?: string;
  }) => request<ApiResponse>("/patient/book-appointment", { method: "POST", body: JSON.stringify(body) }),

  /** Patient views their own appointments */
  myAppointments: () => request<ApiResponse>("/patient/my-appointments"),

  /** Patient dashboard real-time status (active queue token, wait time, clinic) */
  myStatus: () => request<ApiResponse>("/patient/my-status"),

  /** Patient prescriptions from doctor */
  myPrescriptions: () => request<ApiResponse>("/patient/my-prescriptions"),

  /** Patient medicine schedule parsed from prescriptions */
  mySchedule: () => request<ApiResponse>("/patient/my-schedule"),

  /** Patient health history */
  myHistory: () => request<ApiResponse>("/patient/my-history"),

  /** Clinic staff views today's appointment queue */
  clinicAppointments: () => request<ApiResponse>("/patient/clinic-appointments"),
  updateAppointment:  (id: string, body: object) =>
    request<ApiResponse>(`/patient/appointment/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  list:  (params?: Record<string, string>) =>
    request<ApiResponse>(`/patient/list${params ? "?" + new URLSearchParams(params) : ""}`),
  queue: () => request<ApiResponse>("/patient/queue"),
  get:   (id: string) => request<ApiResponse>(`/patient/${id}`),
  update:(id: string, body: object) =>
    request<ApiResponse>(`/patient/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ─── Speech API ────────────────────────────────────────────────────────────────
export const speechApi = {
  transcribe: (audioFile?: File, mockTranscript?: string) => {
    const form = new FormData();
    if (audioFile)      form.append("audio",          audioFile);
    if (mockTranscript) form.append("mockTranscript", mockTranscript);
    return upload<ApiResponse>("/speech", form);
  },
};

// ─── Agent / AI API ────────────────────────────────────────────────────────────
export const agentApi = {
  process: (text: string) =>
    request<ApiResponse>("/agent/process", { method: "POST", body: JSON.stringify({ text }) }),
};

export const aiApi = {
  chat: (message: string, role?: string) =>
    request<ApiResponse>("/ai/chat", { method: "POST", body: JSON.stringify({ message, role }) }),
};

// ─── Prescription API ──────────────────────────────────────────────────────────
export const prescriptionApi = {
  create:       (body: object) =>
    request<ApiResponse>("/prescription/create", { method: "POST", body: JSON.stringify(body) }),
  getByPatient: (patientId: string) => request<ApiResponse>(`/prescription/${patientId}`),
  getAll:       (params?: Record<string, string>) =>
    request<ApiResponse>(`/prescription/clinic/all${params ? "?" + new URLSearchParams(params) : ""}`),
  get:          (id: string) => request<ApiResponse>(`/prescription/single/${id}`),
};

// ─── Reminder API ──────────────────────────────────────────────────────────────
export const reminderApi = {
  create:       (body: object) =>
    request<ApiResponse>("/reminder/create", { method: "POST", body: JSON.stringify(body) }),
  getByPatient: (patientId: string) => request<ApiResponse>(`/reminder/${patientId}`),
  markTaken:    (id: string, scheduleIndex: number) =>
    request<ApiResponse>(`/reminder/${id}/taken`, { method: "PUT", body: JSON.stringify({ scheduleIndex }) }),
};

// ─── Dashboard API ─────────────────────────────────────────────────────────────
export const dashboardApi = {
  admin:     () => request<ApiResponse>("/dashboard/admin"),
  doctor:    () => request<ApiResponse>("/dashboard/doctor"),
  reception: () => request<ApiResponse>("/dashboard/reception"),
};

// ─── Ward / Admission API ──────────────────────────────────────────────────────
export const wardApi = {
  /** Doctor admits a patient with chief complaint + medications */
  admit: (body: {
    patientId: string; chiefComplaint: string; provisionalDiagnosis?: string;
    admissionMedications?: object[]; ward?: string; doctorNotes?: string;
  }) => request<ApiResponse>("/ward/admit", { method: "POST", body: JSON.stringify(body) }),

  /** List all active ward admissions for the clinic */
  list: (params?: Record<string, string>) =>
    request<ApiResponse>(`/ward/list${params ? "?" + new URLSearchParams(params) : ""}`),

  /** Single admission details */
  get: (id: string) => request<ApiResponse>(`/ward/${id}`),

  /** Update admission — bed, status, notes, medications */
  update: (id: string, body: object) =>
    request<ApiResponse>(`/ward/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  /** Nurse logs daily vitals */
  addVitals: (id: string, vitals: {
    pulse?: string; bp?: string; spo2?: string;
    weight?: string; temperature?: string; bloodInvestigation?: string; notes?: string;
  }) => request<ApiResponse>(`/ward/${id}/vitals`, { method: "POST", body: JSON.stringify(vitals) }),

  /** Doctor discharges patient */
  discharge: (id: string, dischargeNotes?: string) =>
    request<ApiResponse>(`/ward/${id}/discharge`, { method: "PUT", body: JSON.stringify({ dischargeNotes }) }),

  /** Full patient medical history — prescriptions + admissions */
  patientHistory: (patientId: string) =>
    request<ApiResponse>(`/ward/patient/${patientId}/history`),

  /** List hospital beds (e.g. { ward: "ICU", availableOnly: "true" }) */
  beds: (params?: Record<string, string>) =>
    request<ApiResponse>(`/ward/beds${params ? "?" + new URLSearchParams(params) : ""}`),

  /** Hospital bed capacity statistics & breakdown by ward */
  bedStats: () => request<ApiResponse>("/ward/beds/stats"),

  /** Add a single bed */
  addBed: (body: { ward: string; bedNumber: string; notes?: string }) =>
    request<ApiResponse>("/ward/beds/add", { method: "POST", body: JSON.stringify(body) }),

  /** Add multiple beds in bulk */
  addBulkBeds: (body: { ward: string; prefix?: string; count: number; startNumber?: number }) =>
    request<ApiResponse>("/ward/beds/bulk", { method: "POST", body: JSON.stringify(body) }),

  /** Delete a vacant bed */
  deleteBed: (id: string) =>
    request<ApiResponse>(`/ward/beds/${id}`, { method: "DELETE" }),

  /** Manually release an occupied bed */
  releaseBed: (id: string) =>
    request<ApiResponse>(`/ward/beds/${id}/release`, { method: "PUT" }),
};

// ─── Health Check ──────────────────────────────────────────────────────────────
export const healthCheck = () => request<ApiResponse>("/health");

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  count?: number;
  total?: number;
  error?: string;
  mustResetPassword?: boolean;
}
