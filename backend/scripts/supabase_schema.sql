-- ======================================================================
-- MedAssist AI Suite — Supabase (PostgreSQL) Schema
-- Run this in the Supabase SQL Editor to create all tables.
-- ======================================================================

-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── CLINICS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'Clinic' CHECK (type IN ('Clinic', 'Hospital', 'Telemedicine')),
  address       TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  state         TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  owner_id      UUID,          -- references users(id) — set after users table
  departments   TEXT[] NOT NULL DEFAULT '{"General"}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  logo          TEXT NOT NULL DEFAULT '',
  license_no    TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  rating        NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password            TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'patient'
                        CHECK (role IN ('platform_admin','clinic_admin','receptionist','doctor','nurse','patient')),
  clinic_id           UUID REFERENCES clinics(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  avatar              TEXT NOT NULL DEFAULT '',
  phone               TEXT NOT NULL DEFAULT '',
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  age                 INTEGER,
  gender              TEXT NOT NULL DEFAULT '' CHECK (gender IN ('Male','Female','Other','')),
  blood_group         TEXT NOT NULL DEFAULT '',
  address             TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from clinics.owner_id → users.id
ALTER TABLE clinics ADD CONSTRAINT fk_clinics_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ─── STAFF ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('Doctor','Nurse','Receptionist','Pharmacist','Lab Technician','Admin')),
  department    TEXT NOT NULL,
  shift         TEXT NOT NULL DEFAULT 'Morning' CHECK (shift IN ('Morning','Afternoon','Evening','Night')),
  qualification TEXT NOT NULL DEFAULT '',
  experience    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','On Leave','Inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, clinic_id)
);

-- ─── PATIENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      TEXT UNIQUE,          -- e.g. "P-AB12CD"
  queue_number    INTEGER,
  name            TEXT NOT NULL,
  age             INTEGER NOT NULL,
  gender          TEXT NOT NULL CHECK (gender IN ('Male','Female','Other')),
  phone           TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  email           TEXT NOT NULL DEFAULT '',
  blood_group     TEXT NOT NULL DEFAULT '',
  symptoms        TEXT NOT NULL,
  medical_history TEXT NOT NULL DEFAULT '',
  allergies       TEXT[] NOT NULL DEFAULT '{}',
  department      TEXT NOT NULL DEFAULT 'General',
  doctor_assigned UUID REFERENCES staff(id) ON DELETE SET NULL,
  doctor_name     TEXT NOT NULL DEFAULT '',
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  registered_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT NOT NULL DEFAULT 'Waiting'
                    CHECK (status IN ('Waiting','Consulting','Completed','Admitted','Discharged')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── APPOINTMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id   TEXT UNIQUE,         -- e.g. "APT-AB12CD"
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  patient_name     TEXT NOT NULL,
  patient_phone    TEXT NOT NULL DEFAULT '',
  patient_age      INTEGER NOT NULL,
  patient_gender   TEXT NOT NULL CHECK (patient_gender IN ('Male','Female','Other')),
  symptoms         TEXT NOT NULL,
  department       TEXT NOT NULL DEFAULT 'General',
  appointment_date TIMESTAMPTZ NOT NULL,
  queue_number     INTEGER,
  status           TEXT NOT NULL DEFAULT 'Scheduled'
                     CHECK (status IN ('Scheduled','Waiting','Consulting','Completed','Cancelled')),
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── PRESCRIPTIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id           UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name         TEXT NOT NULL DEFAULT '',
  doctor_id            UUID REFERENCES staff(id) ON DELETE SET NULL,
  doctor_name          TEXT NOT NULL DEFAULT '',
  clinic_id            UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  medicines            JSONB NOT NULL DEFAULT '[]',   -- array of {name, dosage, frequency, duration, notes}
  diagnosis            TEXT NOT NULL DEFAULT '',
  instructions         TEXT NOT NULL DEFAULT 'Follow the prescribed medication schedule.',
  ai_instructions      TEXT NOT NULL DEFAULT '',
  transcript           TEXT NOT NULL DEFAULT '',
  entities             JSONB NOT NULL DEFAULT '{}',
  validation_warnings  TEXT[] NOT NULL DEFAULT '{}',
  follow_up_date       TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── REMINDERS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  medicine        TEXT NOT NULL,
  dosage          TEXT NOT NULL DEFAULT '',
  frequency       TEXT NOT NULL,
  duration        TEXT NOT NULL,
  schedule        JSONB NOT NULL DEFAULT '[]',   -- array of {label, time, medicine, taken}
  start_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['clinics','users','staff','patients','appointments','prescriptions','reminders']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', tbl, tbl);
  END LOOP;
END;
$$;

-- ─── Indexes for common queries ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id    ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_staff_clinic_id    ON staff(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_status    ON patients(status);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_user_id ON appointments(patient_user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id  ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_id ON reminders(patient_id);
