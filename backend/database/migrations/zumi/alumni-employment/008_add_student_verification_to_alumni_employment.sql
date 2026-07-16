-- Migration: add student verification fields to alumni employment responses.
--
-- adminMila needs a way to cross-check survey submissions against alumni
-- records. There's no enrolled-student database to validate against yet, so
-- this just captures a self-reported student number (e.g. 2022-00349-PQ-0),
-- or a birth date as a fallback when the alum doesn't remember their number
-- (paired with the existing full_name column).
--
-- Safe to re-run (IF NOT EXISTS).
--
-- Usage:
--   psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/zumi/alumni-employment/008_add_student_verification_to_alumni_employment.sql

ALTER TABLE alumni_employment_responses ADD COLUMN IF NOT EXISTS student_number VARCHAR(20);
ALTER TABLE alumni_employment_responses ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_alumni_employment_student_number ON alumni_employment_responses(student_number);
