-- Adds "cancelled" as a valid chat_sessions.status, for visitor-initiated
-- abandonment (explicit "Back to AI Assistant" click, or a page reload/close
-- caught via navigator.sendBeacon) and for auto-expired stale "waiting"/"active"
-- sessions nobody ever explicitly cancelled. Without this, an abandoned chat
-- just sits in "waiting" forever and an agent can "claim" a visitor who is no
-- longer there.
--
-- The actual auto-expiry + cleanup logic lives in backend/routes/liveChatRoute.js
-- (sweepStaleSessions, run opportunistically whenever the admin inbox polls
-- GET /sessions) — this migration only adds the CHECK constraint so 'cancelled'
-- is a recognized value alongside waiting/active/closed.
--
-- Run with:
--   psql -U postgres -d capstone_db -f backend/database/migrations/zumi/live-chat/002_add_cancelled_status.sql
--
-- Date: 2026-07-18

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_status_check'
  ) THEN
    ALTER TABLE chat_sessions
      ADD CONSTRAINT chat_sessions_status_check
      CHECK (status IN ('waiting', 'active', 'closed', 'cancelled'));
  END IF;
END $$;

COMMIT;
