-- ============================================
-- COMPLETE FEEDBACK SYSTEM MIGRATION (ALL-IN-ONE)
-- ============================================
-- Date: 2026-07-04
-- Description: Complete migration to update the feedback system
--              from transaction-based to general feedback system
--
-- This script does the following:
-- 1. Adds new columns for submitter identity
-- 2. Removes old transaction-based constraints
-- 3. Makes old columns flexible (nullable)
-- 4. Creates performance indexes
--
-- Run this ONCE to complete the migration

BEGIN TRANSACTION;

-- ============================================
-- STEP 1: Add new columns for general feedback
-- ============================================
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(20);

-- ============================================
-- STEP 2: Remove old transaction-based constraints
-- ============================================
-- These constraints prevented the general feedback system from working
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_feedback_user_data;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS chk_visitor_feedback;

-- ============================================
-- STEP 3: Make old columns optional (nullable)
-- ============================================
-- For backwards compatibility and to support the new general feedback system
ALTER TABLE feedback ALTER COLUMN transaction_id DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN student_number DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visitor_name DROP NOT NULL;
ALTER TABLE feedback ALTER COLUMN visit_date DROP NOT NULL;

-- ============================================
-- STEP 4: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feedback_anonymous ON feedback(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback(department_id);

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================
SELECT '✅ Migration completed successfully!' as result;

-- Verify new columns exist
SELECT
  'New columns' as check_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'feedback'
AND column_name IN ('submitter_name', 'submitter_email', 'submitter_phone');

-- Verify old columns are now nullable
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'feedback'
AND column_name IN ('transaction_id', 'student_number', 'visitor_name', 'visit_date')
ORDER BY column_name;

-- Verify indexes exist
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename = 'feedback'
AND indexname LIKE 'idx_feedback%'
ORDER BY indexname;
