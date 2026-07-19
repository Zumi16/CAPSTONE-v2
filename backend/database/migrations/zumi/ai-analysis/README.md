# AI Analysis

Real (Gemini-backed) "AI Analysis" dashboard feature, replacing the
client-side heuristics that were previously mislabeled as AI. Rolling out
per-admin: **adminSerrano (Mr. Jeff) first**, adminAve (Ms. Ave) next.

## What `001_create_faculty_ai_reports.sql` does

Creates `faculty_ai_reports` — each row is one generated report (`report`
JSONB: `executiveSummary`, `statistics`, `programStats`, `keyInsights`,
`recommendations`), plus `faculty_count` and `generated_by` for context. The
backend only ever reads the **latest** row by default (`ORDER BY
generated_at DESC LIMIT 1`); a new row is inserted only when an admin
explicitly clicks "Regenerate Report" — never automatically on page load,
so the AI is not re-queried (and no tokens spent) just from viewing the page.

## How it works

- `backend/services/geminiClient.js` — shared Gemini client (`@google/genai`,
  already a backend dependency, previously unused). Reads `GEMINI_API_KEY`
  from `backend/.env` (added 2026-07-19, same key as
  `backend/python_api/.env` used by the chatbot — two separate `.env` files,
  same key, since the chatbot's Python service and this Node-side feature
  are different processes).
- `backend/routes/facultyManagementRoute.js`:
  - `GET /api/faculty/ai-report` — returns the latest saved report, or
    `null` if none exists yet. Free, no AI call.
  - `POST /api/faculty/ai-report/generate` — computes faculty statistics
    deterministically in Node (accurate, no hallucination risk), sends only
    those aggregate numbers (not individual faculty records/PII) to Gemini
    to write the executive summary / key insights / recommendations, saves
    the assembled report, and returns it. This is the only endpoint that
    costs tokens.
- Frontend: `frontend/src/pages/admin/serrano/FacultyAnalyticsReportPage.tsx`
  `AIReportTab` loads the saved report on mount and only calls `generate` when
  the admin clicks "Regenerate Report".

## Run it

```
psql -U postgres -d capstone_db -f backend/database/migrations/zumi/ai-analysis/001_create_faculty_ai_reports.sql
```

## Verify

```sql
\d faculty_ai_reports
SELECT id, faculty_count, generated_by, generated_at FROM faculty_ai_reports ORDER BY generated_at DESC LIMIT 5;
```
