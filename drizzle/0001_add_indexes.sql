-- Migration: Add missing indexes for better query performance
-- Generated on: 2024-12-19

-- Add indexes to users table
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "epatient_user" ("email");
CREATE INDEX IF NOT EXISTS "users_name_idx" ON "epatient_user" ("name");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "epatient_user" ("role");

-- Add indexes to patients table
CREATE INDEX IF NOT EXISTS "virtual_patient_name_idx" ON "epatient_patient" ("name");

-- Add indexes to therapy_sessions table
CREATE INDEX IF NOT EXISTS "therapy_session_updated_at_idx" ON "epatient_therapy_session" ("updatedAt");
