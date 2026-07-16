-- Migration: Remove old constraints and make columns flexible
-- Date: 2026-07-04
-- Description: Removes old transaction-based check constraints that
--              prevented the general feedback system from working.
--              Makes old columns optional for backwards compatibility.

BEGIN TRANSACTION;

-- Drop the old check constraints that were blocking the general feedback system
-- These constraints required transaction_id, student_number, visitor_name, visit_date
-- but the new system allows submitting feedback without these fields
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_feedback_user_data;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_visitor_feedback;

-- Make old columns optional (nullable) for backwards compatibility
-- This allows the new general feedback system to work without these fields
ALTER TABLE feedback ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN student_number DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visitor_name DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visit_date DROP NOT NULL;

COMMIT;

-- Verify the changes
SELECT 'Migration 002: Constraints updated successfully!' as result;

-- Show which columns are now nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'feedback'
AND column_name IN ('transaction_id', 'student_number', 'visitor_name', 'visit_date', 'submitter_name', 'submitter_email', 'submitter_phone')
ORDER BY ordinal_position;
