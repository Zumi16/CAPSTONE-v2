-- Migration: add a "description" field to downloadable forms.
--
-- Lets adminAve explain what each uploaded form is for (e.g. "Required
-- waiver for OJT deployment, submit before start of internship"), editable
-- via the new Forms Repository "Rename / Edit Details" action. Shown on the
-- public Downloadable Forms page under the file name.
--
-- Safe to re-run (IF NOT EXISTS).
--
-- Usage:
--   psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/zumi/forms-repository/007_add_file_description.sql

ALTER TABLE forms_repository_files ADD COLUMN IF NOT EXISTS description TEXT;
