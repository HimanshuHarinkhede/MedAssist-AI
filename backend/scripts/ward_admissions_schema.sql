-- ======================================================================
-- MedAssist AI Suite — Ward Admissions Schema Migration
-- Run this in Supabase SQL Editor AFTER running the main schema.
-- Handles Issues #4, #5, #7, #8
-- ======================================================================

-- ─── WARD ADMISSIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ward_admissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_id      TEXT UNIQUE,                    -- e.g. "ADM-AB12CD"
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name      TEXT NOT NULL DEFAULT '',
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  doctor_name       TEXT NOT NULL DEFAULT '',
  bed_number        TEXT NOT NULL DEFAULT '',        -- Filled by nurse
  ward              TEXT NOT NULL DEFAULT 'General Ward',
  admit_date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharge_date    TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'Admitted'
                      CHECK (status IN ('Admitted', 'Discharged', 'Critical', 'Stable', 'Under Observation')),
  
  -- Chief Complaint & Diagnosis by doctor at admission time
  chief_complaint   TEXT NOT NULL DEFAULT '',
  provisional_diagnosis TEXT NOT NULL DEFAULT '',
  
  -- Medications on admission (saline, antibiotics, etc.) — JSONB array
  -- Each item: { name, type, dosage, route, frequency, notes }
  -- type can be: "antibiotic", "saline", "iv_medication", "oral", "injection", "other"
  admission_medications JSONB NOT NULL DEFAULT '[]',
  
  -- Vitals log — array of daily readings added by nurse
  -- Each entry: { date, pulse, bp, spo2, weight, temperature, blood_investigation, notes, recorded_by }
  vitals_log        JSONB NOT NULL DEFAULT '[]',
  
  -- Notes
  doctor_notes      TEXT NOT NULL DEFAULT '',
  nurse_notes       TEXT NOT NULL DEFAULT '',
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update trigger
DROP TRIGGER IF EXISTS set_updated_at ON ward_admissions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON ward_admissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ward_admissions_patient_id ON ward_admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ward_admissions_clinic_id ON ward_admissions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ward_admissions_status ON ward_admissions(status);
CREATE INDEX IF NOT EXISTS idx_ward_admissions_admit_date ON ward_admissions(admit_date);
