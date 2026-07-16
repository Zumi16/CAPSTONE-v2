-- Internship System Tables (Separate from OJT)
-- This migration creates the database structure for internship announcements and management
-- Date: 2026-07-11

BEGIN TRANSACTION;

-- Create internship_posts table
CREATE TABLE IF NOT EXISTS internship_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  adminid VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (adminid) REFERENCES admin_accounts(adminid) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_internship_posts_created_at ON internship_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internship_posts_deleted_at ON internship_posts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_internship_posts_adminid ON internship_posts(adminid);

-- Create internship_post_files table for file attachments
CREATE TABLE IF NOT EXISTS internship_post_files (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES internship_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES forms_repository_files(id) ON DELETE CASCADE,
  UNIQUE(post_id, file_id)
);

-- Create indexes for file relationship queries
CREATE INDEX IF NOT EXISTS idx_internship_post_files_post_id ON internship_post_files(post_id);
CREATE INDEX IF NOT EXISTS idx_internship_post_files_file_id ON internship_post_files(file_id);

COMMIT;

SELECT 'Internship tables created successfully!' as result;
