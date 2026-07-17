-- Adds post-chat feedback for the "Chat with an Agent" live chat feature:
-- a 1-5 star rating + optional comment, collected from the visitor right
-- after a chat ends (closed or cancelled), shown below the "Back to AI
-- Assistant" button in the chatbot widget.
--
-- Deliberately a standalone table, not the existing `feedback` table (see
-- backend/routes/feedbackRoute.js) which is keyed to student/transaction
-- service feedback and surfaced on adminMila/adminSalao/secondary's Service
-- Feedback dashboards. Per current scope this is adminLy-only; folding live
-- chat feedback into that shared feedback system (so it also shows up for
-- adminMila/adminSalao) is future work, not done here.
--
-- Run with:
--   psql -U postgres -d capstone_db -f backend/database/migrations/zumi/live-chat/003_create_chat_feedback.sql
--
-- Date: 2026-07-18

BEGIN;

CREATE TABLE IF NOT EXISTS chat_feedback (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL UNIQUE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback(session_id);

COMMIT;
