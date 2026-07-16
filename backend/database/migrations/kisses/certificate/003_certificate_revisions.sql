-- ============================================
-- MIGRATION: Certificate Request System Revisions
-- Date: 2026-07-05
-- Description: Add new features for control numbers, purpose field,
--              downloadable certificates, and email tracking
-- ============================================

BEGIN TRANSACTION;

-- Step 1: Add new columns for certificate revisions
ALTER TABLE certificate_requests
  ADD COLUMN IF NOT EXISTS control_number VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS certificate_purpose VARCHAR(100),
  ADD COLUMN IF NOT EXISTS certificate_file_path VARCHAR(500),
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_control_number ON certificate_requests(control_number);
CREATE INDEX IF NOT EXISTS idx_certificate_purpose ON certificate_requests(certificate_purpose);
CREATE INDEX IF NOT EXISTS idx_email_sent ON certificate_requests(email_sent);

-- Step 3: Create table for purpose reference (optional - for data integrity)
CREATE TABLE IF NOT EXISTS certificate_purposes (
  id SERIAL PRIMARY KEY,
  purpose_key VARCHAR(50) UNIQUE NOT NULL,
  purpose_label VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Insert purpose options
INSERT INTO certificate_purposes (purpose_key, purpose_label, description)
VALUES
  ('scholarship', 'Scholarship', 'For scholarship applications'),
  ('employment', 'Employment', 'For job applications and employment purposes'),
  ('legal', 'Legal/Court Proceedings', 'For legal documents and court cases'),
  ('government', 'Government Agency/Official', 'For government agency requirements'),
  ('personal', 'Personal Use', 'For personal documentation'),
  ('other', 'Other', 'Other purposes')
ON CONFLICT (purpose_key) DO NOTHING;

-- Step 5: Update certificate_types to only keep required ones
-- Note: This assumes you want to remove clearance and gres_form types
-- Uncomment the line below if you want to delete those requests
-- DELETE FROM certificate_requests WHERE certificate_type IN ('clearance', 'gres_form');

-- Step 6: Add constraint to ensure certificate_purpose is valid (optional)
-- ALTER TABLE certificate_requests
-- ADD CONSTRAINT fk_certificate_purpose
-- FOREIGN KEY (certificate_purpose) REFERENCES certificate_purposes(purpose_key);

COMMIT;

-- Verification
SELECT 'Migration 003: Certificate Revisions completed successfully!' as result;

-- Show new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'certificate_requests'
AND column_name IN ('control_number', 'certificate_purpose', 'certificate_file_path', 'email_sent', 'email_sent_at')
ORDER BY ordinal_position;

-- Show certificate purposes
SELECT * FROM certificate_purposes ORDER BY id;
