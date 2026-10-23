-- ==============================================================================
-- MedAssist AI Suite: Hospital Bed & Ward Management Schema
-- ==============================================================================
-- Run this script in the Supabase SQL Editor to enable Hospital Bed inventory
-- tracking, per-ward capacity, and automatic bed allocation/release.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hospital_beds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  ward                 TEXT NOT NULL, -- 'General Ward', 'ICU', 'ICCU', 'Pediatric Ward', etc.
  bed_number           TEXT NOT NULL, -- e.g. 'ICU-01', 'GW-101', 'PED-05'
  is_occupied          BOOLEAN NOT NULL DEFAULT FALSE,
  current_patient_id   UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  current_patient_name TEXT,
  current_admission_id UUID REFERENCES public.ward_admissions(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_clinic_ward_bed UNIQUE (clinic_id, ward, bed_number)
);

-- Indexes for lightning fast availability lookups
CREATE INDEX IF NOT EXISTS idx_hospital_beds_clinic_ward 
  ON public.hospital_beds(clinic_id, ward);

CREATE INDEX IF NOT EXISTS idx_hospital_beds_availability 
  ON public.hospital_beds(clinic_id, is_occupied);

CREATE INDEX IF NOT EXISTS idx_hospital_beds_admission 
  ON public.hospital_beds(current_admission_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_hospital_beds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hospital_beds_updated_at ON public.hospital_beds;
CREATE TRIGGER trigger_hospital_beds_updated_at
  BEFORE UPDATE ON public.hospital_beds
  FOR EACH ROW
  EXECUTE FUNCTION update_hospital_beds_updated_at();

-- Enable RLS (Service role key bypasses this)
ALTER TABLE public.hospital_beds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read beds"
  ON public.hospital_beds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow clinical staff to manage beds"
  ON public.hospital_beds FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
