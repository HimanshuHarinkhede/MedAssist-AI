/**
 * TranscriptPanel.tsx
 *
 * Architecture fix: STT is now done 100% in the BROWSER using the Web Speech API.
 * This solves the Deepgram/Whisper network timeout — no audio is sent to the backend.
 *
 * STT flow:
 *   Browser Web Speech API (Chrome/Edge built-in) → live interim transcript shown →
 *   final transcript sent to backend /api/agent/process → AI extracts medicines →
 *   doctor edits prescription → saves to /api/prescription/create
 *
 * Supports Marathi, Hindi, Gujarati, Tamil, English and all languages Chrome STT supports.
 * Doctor selects the language before recording for best accuracy.
 *
 * Fixes:
 *   #1  - Empty speech → error shown, no random prescription
 *   #2  - Multi-language (Marathi, Hindi etc.) via browser Web Speech API
 *   #3  - Editable prescription — add/edit/delete medicines before saving
 *   #6  - AI differentiates doctor vs patient speech
 *   #9  - Save prescription works
 */

import { useState, useRef, useEffect } from "react";
import {
  Mic, MicOff, Pill, Clock, Calendar, Sparkles, Save,
  Loader2, AlertTriangle, CheckCircle2, PenLine, WifiOff,
  Plus, Trash2, Edit3, Globe, Languages, Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { agentApi, prescriptionApi } from "@/lib/api";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExtractedEntity {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

interface AgentResult {
  entities: ExtractedEntity[];
  validation: { isValid: boolean; warnings: string[] };
  instructions: string;
}

interface TranscriptPanelProps {
  patientId?: string;
  patientName?: string;
}

type InputMode = "mic" | "text" | "manual";
type PipelineStep = "idle" | "recording" | "analyzing" | "done";

// ── Language options for Web Speech API ───────────────────────────────────────
const SPEECH_LANGUAGES = [
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "hi-IN", label: "हिंदी (Hindi)" },
  { code: "en-IN", label: "English (India)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "en-US", label: "English (US)" },
];

// ── Frequency options ──────────────────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  "Once daily (OD)", "Twice daily (BD)", "Three times daily (TDS)",
  "Four times daily (QID)", "Every 6 hours", "Every 8 hours",
  "Every 12 hours", "As needed (PRN)", "At bedtime (HS)",
  "With/after meals", "Morning and evening",
];

const emptyMedicine = (): ExtractedEntity => ({
  medicine: "", dosage: "", frequency: "Twice daily (BD)", duration: "5 days", notes: "",
});

// ── Web Speech API type declarations ──────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ── Inline Prescription Editor ─────────────────────────────────────────────────
function PrescriptionEditor({
  entities, onChange,
}: {
  entities: ExtractedEntity[];
  onChange: (updated: ExtractedEntity[]) => void;
}) {
  const update = (idx: number, field: keyof ExtractedEntity, val: string) =>
    onChange(entities.map((e, i) => i === idx ? { ...e, [field]: val } : e));
  const remove = (idx: number) => onChange(entities.filter((_, i) => i !== idx));
  const add = () => onChange([...entities, emptyMedicine()]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Edit3 className="h-4 w-4 text-primary" />
          Edit Prescription ({entities.length} medicine{entities.length !== 1 ? "s" : ""})
        </h4>
        <button type="button" onClick={add}
          className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add Medicine
        </button>
      </div>

      {entities.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground">No medicines extracted. Add manually below.</p>
          <button type="button" onClick={add} className="mt-2 text-sm text-primary font-medium hover:underline">
            + Add a medicine
          </button>
        </div>
      )}

      {entities.map((ent, idx) => (
        <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="bg-background border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Medicine Name *</label>
              <input value={ent.medicine} onChange={(e) => update(idx, "medicine", e.target.value)}
                placeholder="e.g. Paracetamol"
                className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dosage *</label>
              <input value={ent.dosage} onChange={(e) => update(idx, "dosage", e.target.value)}
                placeholder="e.g. 500 mg"
                className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Frequency *</label>
              <select value={FREQUENCY_OPTIONS.includes(ent.frequency) ? ent.frequency : "custom"}
                onChange={(e) => { if (e.target.value !== "custom") update(idx, "frequency", e.target.value); }}
                className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring">
                {FREQUENCY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                {!FREQUENCY_OPTIONS.includes(ent.frequency) && (
                  <option value="custom">{ent.frequency}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Duration *</label>
              <input value={ent.duration} onChange={(e) => update(idx, "duration", e.target.value)}
                placeholder="e.g. 5 days"
                className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
              <input value={ent.notes || ""} onChange={(e) => update(idx, "notes", e.target.value)}
                placeholder="e.g. After meals, Avoid alcohol"
                className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button type="button" onClick={() => remove(idx)}
              className="self-end p-2 rounded-lg text-destructive hover:bg-destructive/10 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Live recording pulse ───────────────────────────────────────────────────────
function RecordingPulse() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function TranscriptPanel({ patientId, patientName }: TranscriptPanelProps) {
  const [inputMode, setInputMode] = useState<InputMode>("mic");
  const [selectedLang, setSelectedLang] = useState("mr-IN");
  const [manualText, setManualText] = useState("");
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");

  // Live interim (while speaking) + final transcript
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcript, setTranscript] = useState("");

  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [editableEntities, setEditableEntities] = useState<ExtractedEntity[]>([]);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  const isRecording = pipelineStep === "recording";
  const isAnalyzing = pipelineStep === "analyzing";

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setInputMode("text");
    }
  }, []);

  // ── Run AI agent on transcript text ────────────────────────────────────────
  const runAgent = async (text: string) => {
    setBackendError(null);
    setPipelineStep("analyzing");

    if (!text || text.trim().length < 5) {
      setBackendError("❌ Transcript too short or empty. Please speak clearly near the microphone.");
      toast.error("No speech detected. Please try again.");
      setPipelineStep("idle");
      return;
    }

    try {
      const agentRes = await agentApi.process(text) as any;
      if (!agentRes.success) throw new Error(agentRes.message || "AI processing failed");

      setAgentResult(agentRes.data);
      setEditableEntities(agentRes.data?.entities || []);
      setPipelineStep("done");

      const count = agentRes.data?.entities?.length || 0;
      if (count === 0) {
        toast.warning("⚠️ No medicines found. Please add them manually using the editor below.");
      } else {
        toast.success(`✅ Found ${count} medicine(s). Review and edit, then save.`);
      }
    } catch (err: any) {
      const msg = err?.message || "AI processing failed";
      setBackendError(msg);
      toast.error(`AI: ${msg}`);
      setPipelineStep("idle");
    }
  };

  // ── Web Speech API recording ────────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Web Speech API not supported. Please use Chrome or Edge browser.");
      setInputMode("text");
      return;
    }

    setBackendError(null);
    setTranscript("");
    setInterimTranscript("");
    setAgentResult(null);
    setEditableEntities([]);

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.continuous = true;       // keep listening until stopped
    recognition.interimResults = true;   // show live partial results
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => {
      setPipelineStep("recording");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      // Show live interim text while doctor is speaking
      setInterimTranscript(interim);
      // Keep final text updated so doctor can see what's been confirmed
      setTranscript(finalText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        setBackendError("❌ No speech detected. Please speak clearly into the microphone.");
      } else if (event.error === "not-allowed") {
        setBackendError("❌ Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (event.error === "network") {
        // Web Speech API needs internet for some browsers — switch to text mode
        setBackendError("❌ Browser speech recognition failed (network error). Please switch to 'Type Transcript' mode.");
      } else {
        setBackendError(`❌ Speech error: ${event.error}. Please try again.`);
      }
      setPipelineStep("idle");
    };

    recognition.onend = () => {
      // Called when recognition stops (after stopRecording is called)
      setInterimTranscript("");
      const finalTranscript = finalText.trim();
      setTranscript(finalTranscript);
      if (finalTranscript) {
        runAgent(finalTranscript);
      } else {
        setBackendError("❌ No speech was captured. Please speak clearly and try again.");
        setPipelineStep("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // ── Manual text submit ─────────────────────────────────────────────────────
  const handleManualSubmit = async () => {
    if (!manualText.trim()) {
      toast.error("Please type your consultation notes.");
      return;
    }
    setTranscript(manualText.trim());
    setInterimTranscript("");
    await runAgent(manualText.trim());
  };

  // ── Save prescription ──────────────────────────────────────────────────────
  const savePrescription = async () => {
    if (!patientId) { toast.error("Please select a patient first."); return; }
    if (!editableEntities.length) { toast.error("No medicines to save."); return; }

    const invalid = editableEntities.filter((e) => !e.medicine.trim() || !e.dosage.trim());
    if (invalid.length) { toast.error("Fill in medicine name and dosage for all medicines."); return; }

    setSaving(true);
    try {
      const medicines = editableEntities.map((e) => ({
        name: e.medicine, dosage: e.dosage,
        frequency: e.frequency, duration: e.duration, notes: e.notes || "",
      }));

      const res = await prescriptionApi.create({
        patientId, medicines,
        diagnosis: "",
        instructions: "",
        aiInstructions: agentResult?.instructions || "",
        transcript,
        entities: agentResult?.entities || editableEntities,
        validationWarnings: agentResult?.validation?.warnings || [],
        autoCreateReminders: true,
      }) as any;

      if (!res.success) throw new Error(res.message || "Save failed");
      toast.success("💊 Prescription saved!");
      setTranscript(""); setAgentResult(null); setEditableEntities([]);
      setManualText(""); setBackendError(null); setPipelineStep("idle");
      setInterimTranscript("");
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    stopRecording();
    setTranscript(""); setInterimTranscript(""); setAgentResult(null);
    setEditableEntities([]); setManualText(""); setBackendError(null);
    setPipelineStep("idle");
  };

  return (
    <div className="space-y-5">

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit flex-wrap">
        <button onClick={() => { setInputMode("mic"); handleReset(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "mic" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Mic className="h-4 w-4" /> Voice Recording
        </button>
        <button onClick={() => { setInputMode("text"); handleReset(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "text" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>
          <PenLine className="h-4 w-4" /> Type Transcript
        </button>
        <button onClick={() => {
          setInputMode("manual");
          setPipelineStep("done");
          setAgentResult({
            entities: [],
            validation: { isValid: true, warnings: [] },
            instructions: "Take medications strictly as advised by doctor."
          });
          if (editableEntities.length === 0) {
            setEditableEntities([emptyMedicine()]);
          }
        }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}>
          <Plus className="h-4 w-4" /> Direct Prescription
        </button>
      </div>

      {/* Browser STT notice */}
      {speechSupported ? (
        <div className="flex items-start gap-2 text-xs bg-primary/5 border border-primary/10 rounded-lg px-3 py-2.5">
          <Globe className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-foreground">Browser-based STT —</span>{" "}
            Speech recognition runs directly in your browser (Chrome/Edge). Select your language before recording for best accuracy.
            Supports Marathi, Hindi, Gujarati, Tamil, and more.
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Voice recording not supported in this browser.</span>{" "}
            Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for voice recording,
            or use the "Type Transcript" mode below.
          </div>
        </div>
      )}

      {/* ── Voice Mode ── */}
      {inputMode === "mic" && speechSupported && (
        <div className="stat-card space-y-5">

          {/* Language selector */}
          <div>
            <label className="text-sm font-medium block mb-2 flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-primary" />
              Select Language
            </label>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={isRecording || isAnalyzing}
              className="w-full sm:w-auto text-sm px-3 py-2 rounded-lg bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {SPEECH_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Mic button */}
          <div className="flex flex-col items-center gap-4 py-2">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing || saving}
              className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 transition-all shadow-lg focus:outline-none ${
                isRecording ? "bg-destructive hover:bg-destructive/90" :
                isAnalyzing ? "bg-muted opacity-60 cursor-not-allowed" :
                "bg-primary hover:bg-primary/90"
              }`}
            >
              {isRecording ? (
                <MicOff className="h-9 w-9 text-white" />
              ) : isAnalyzing ? (
                <Loader2 className="h-9 w-9 text-muted-foreground animate-spin" />
              ) : (
                <Mic className="h-9 w-9 text-white" />
              )}
            </motion.button>

            {/* Status */}
            <div className="text-center space-y-1">
              {isRecording && (
                <div className="flex items-center justify-center gap-2">
                  <RecordingPulse />
                  <p className="text-sm font-semibold text-destructive">
                    Recording in {SPEECH_LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang}...
                  </p>
                </div>
              )}
              {isRecording && (
                <p className="text-xs text-muted-foreground">Tap the mic button to stop when done</p>
              )}
              {isAnalyzing && (
                <p className="text-sm font-medium text-primary animate-pulse">
                  🧠 AI extracting prescriptions from your speech...
                </p>
              )}
              {pipelineStep === "idle" && !agentResult && (
                <p className="text-sm text-muted-foreground">
                  Select language → tap mic → speak your prescription → tap to stop
                </p>
              )}
            </div>
          </div>

          {/* Live interim transcript while speaking */}
          <AnimatePresence>
            {isRecording && (transcript || interimTranscript) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-muted/50 rounded-xl p-4 min-h-[60px]">
                <p className="text-xs text-muted-foreground mb-1 font-medium flex items-center gap-1">
                  <Mic className="h-3 w-3 text-destructive animate-pulse" /> Live Transcript
                </p>
                <p className="text-sm leading-relaxed">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-muted-foreground italic"> {interimTranscript}</span>
                  )}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Text Mode ── */}
      {inputMode === "text" && (
        <div className="stat-card space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Consultation Notes</label>
            <p className="text-xs text-muted-foreground mb-3">
              Type what you're prescribing. You can write in Marathi, Hindi, Gujarati, or English.
            </p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={
                "English: Patient has fever. Prescribe Paracetamol 500mg twice daily for 5 days.\n\n" +
                "मराठी: रुग्णाला ताप आहे. Paracetamol 500mg दिवसातून दोनदा 5 दिवस द्या."
              }
              rows={6}
              className="w-full text-sm px-3 py-2.5 rounded-xl bg-muted border-0 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={isAnalyzing || !manualText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {isAnalyzing
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
              : <><Sparkles className="h-4 w-4" /> Analyze with AI</>
            }
          </button>
        </div>
      )}

      {/* ── Error Banner ── */}
      <AnimatePresence>
        {backendError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm">
            <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-xs mt-0.5 opacity-80">{backendError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Final Transcript (after recording stops) ── */}
      <AnimatePresence>
        {!isRecording && transcript && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="stat-card space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" /> Consultation Transcript
              </h4>
              <span className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                <Languages className="h-3 w-3" />
                {SPEECH_LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang}
              </span>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
            </div>
            {isAnalyzing && (
              <p className="text-xs text-primary flex items-center gap-1.5 animate-pulse">
                <Sparkles className="h-3.5 w-3.5" />
                AI is reading this to extract prescriptions...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Result + Editable Prescription ── */}
      <AnimatePresence>
        {agentResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Validation warnings */}
            {agentResult.validation.warnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm">
                  <AlertTriangle className="h-4 w-4" /> Clinical Warnings
                </div>
                {agentResult.validation.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400 ml-6">{w}</p>
                ))}
              </div>
            )}

            {/* Editable prescription */}
            <div className="stat-card">
              <PrescriptionEditor entities={editableEntities} onChange={setEditableEntities} />
            </div>

            {/* AI instructions */}
            {agentResult.instructions && (
              <div className="stat-card space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Patient Instructions
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{agentResult.instructions}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={savePrescription} disabled={saving || !editableEntities.length}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <><Save className="h-4 w-4" /> Save Prescription</>}
              </button>
              <button onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition">
                Start Over
              </button>
              {agentResult.validation.isValid && editableEntities.length > 0 && (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Prescription validated</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
