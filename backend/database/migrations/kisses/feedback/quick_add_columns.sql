-- Quick migration to add missing columns to feedback table
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS submitter_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS submitter_phone VARCHAR(20);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_anonymous ON feedback(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_feedback_user_type ON feedback(user_type);
CREATE INDEX IF NOT EXISTS idx_feedback_department ON feedback(department_id);

-- Verify the changes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name='feedback'
ORDER BY ordinal_position;
