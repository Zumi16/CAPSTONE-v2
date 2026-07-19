-- "AI Analysis" feature, adminSerrano first: the Faculty Analytics page's
-- "AI Insights Report" tab was previously a 100% client-side heuristic
-- (frontend/src/pages/admin/serrano/FacultyAnalyticsReportPage.tsx buildReport())
-- with a fake ~1.2s delay — it never called any AI. This adds a real
-- Gemini-generated report (see backend/services/geminiClient.js), persisted
-- here so it's generated once on demand ("Regenerate Report") and then just
-- read back on every page visit — no repeated API calls/tokens.
--
-- Run with:
--   psql -U postgres -d capstone_db -f backend/database/migrations/zumi/ai-analysis/001_create_faculty_ai_reports.sql
--
-- Date: 2026-07-19

BEGIN;

CREATE TABLE IF NOT EXISTS faculty_ai_reports (
  id SERIAL PRIMARY KEY,
  report JSONB NOT NULL,
  faculty_count INTEGER NOT NULL,
  generated_by VARCHAR(50),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES admin_accounts(adminid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_faculty_ai_reports_generated_at ON faculty_ai_reports(generated_at DESC);

COMMIT;
