-- Migration: Decouple OJT / NSTP / Research & Extension postings from the
-- forms repository, and repurpose the forms repository as the public
-- "Downloadable Forms" store with three fixed categories.
--
-- Run this ONCE per database, after pulling the updated backend code and
-- BEFORE starting the server. Safe to run even if some posts have no
-- attachments yet (the UPDATE ... FROM joins simply match 0 rows for those).
--
-- Usage:
--   psql -U postgres -h localhost -d capstone_db -f backend/database/migrations/zumi/forms-repository/005_decouple_forms_repository.sql

BEGIN;

-- 1. Each post now stores its own file metadata directly on its junction
--    table, instead of pointing at a shared forms_repository_files row.
ALTER TABLE ojt_post_files              ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE ojt_post_files              ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
ALTER TABLE ojt_post_files              ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE ojt_post_files              ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE nstp_post_files             ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE nstp_post_files             ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
ALTER TABLE nstp_post_files             ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE nstp_post_files             ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE researchextension_post_files ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE researchextension_post_files ADD COLUMN IF NOT EXISTS file_path VARCHAR(255);
ALTER TABLE researchextension_post_files ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);
ALTER TABLE researchextension_post_files ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- The old file_id FK is no longer required going forward.
ALTER TABLE ojt_post_files               ALTER COLUMN file_id DROP NOT NULL;
ALTER TABLE nstp_post_files              ALTER COLUMN file_id DROP NOT NULL;
ALTER TABLE researchextension_post_files ALTER COLUMN file_id DROP NOT NULL;

-- 2. Preserve existing posts' attachments: copy each file's metadata from the
--    shared forms_repository_files row onto the post's own junction row.
UPDATE ojt_post_files pf
SET file_name = f.file_name, file_path = f.file_path, file_type = f.file_type, file_size = f.file_size
FROM forms_repository_files f
WHERE pf.file_id = f.id;

UPDATE nstp_post_files pf
SET file_name = f.file_name, file_path = f.file_path, file_type = f.file_type, file_size = f.file_size
FROM forms_repository_files f
WHERE pf.file_id = f.id;

UPDATE researchextension_post_files pf
SET file_name = f.file_name, file_path = f.file_path, file_type = f.file_type, file_size = f.file_size
FROM forms_repository_files f
WHERE pf.file_id = f.id;

-- 3. Detach from the shared table now that each row carries its own file
--    info, so resetting the old built-in folders below won't cascade-delete
--    these rows (forms_repository_files -> post_files was ON DELETE CASCADE).
UPDATE ojt_post_files SET file_id = NULL;
UPDATE nstp_post_files SET file_id = NULL;
UPDATE researchextension_post_files SET file_id = NULL;

-- 4. Reset the forms repository to exactly the three public categories.
--    Deleting the old built-in folders (OJT / NSTP / Research & Extension)
--    cascades to their files only; the post junction rows are detached
--    (step 3) and keep their own file metadata.
DELETE FROM forms_repository_folders WHERE adminid = 'adminave';
INSERT INTO forms_repository_folders (name, adminid, parent_id) VALUES
  ('OJT Forms', 'adminave', NULL),
  ('Proposal Forms', 'adminave', NULL),
  ('Other Student Forms', 'adminave', NULL);

COMMIT;
