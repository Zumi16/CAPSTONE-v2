-- Migration: Add new columns for general feedback system
-- Date: 2026-07-04
-- Description: Adds submitter_name, submitter_email, submitter_phone columns
--              to support the new general feedback system that replaces
--              the transaction-based feedback system

BEGIN TRANSACTION;

-- Add new columns for submitter identity
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(20);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_feedback_anonymous ON feedback(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback(department_id);

COMMIT;

-- Verify the changes
SELECT 'Migration 001: Columns added successfully!' as result;
