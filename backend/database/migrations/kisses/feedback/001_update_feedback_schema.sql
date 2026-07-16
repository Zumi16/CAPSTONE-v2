-- Migration: Update feedback table schema for general feedback system
-- Description: Removes transaction-based constraints and converts to a general feedback system
-- that supports both named and anonymous submissions from students and visitors

BEGIN;

-- Step 1: Add new columns if they don't exist
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(20);

-- Step 2: Migrate data from old columns to new columns
-- For students with student_number, use that as submitter_name
UPDATE feedback
SET submitter_name = COALESCE(submitter_name, student_number)
WHERE user_type = 'student' AND submitter_name IS NULL AND student_number IS NOT NULL;

-- For visitors, use visitor_name as submitter_name
UPDATE feedback
SET
  submitter_name = COALESCE(submitter_name, visitor_name),
  submitter_email = COALESCE(submitter_email, visitor_email),
  submitter_phone = COALESCE(submitter_phone, visitor_phone)
WHERE user_type = 'visitor' AND submitter_name IS NULL AND visitor_name IS NOT NULL;

-- Step 3: Clear identity data for anonymous submissions
UPDATE feedback
SET
  submitter_name = NULL,
  submitter_email = NULL,
  submitter_phone = NULL
WHERE is_anonymous = true;

-- Step 4: Add NOT NULL constraint to department_id if it doesn't have one
ALTER TABLE feedback
  ALTER COLUMN department_id SET NOT NULL;

-- Step 5: Create index on is_anonymous for faster filtering
CREATE INDEX IF NOT EXISTS idx_feedback_anonymous ON feedback(is_anonymous);

-- Step 6: Create index on user_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(user_type);

-- Step 7: Create index on department_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback(department_id);

COMMIT;

-- Optional: View old columns (comment out the ALTER statements below if you want to keep them for backwards compatibility)
-- ALTER TABLE feedback DROP COLUMN IF EXISTS transaction_id;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS student_number;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS visitor_name;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS visitor_email;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS visitor_phone;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS service_type;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS visit_date;
