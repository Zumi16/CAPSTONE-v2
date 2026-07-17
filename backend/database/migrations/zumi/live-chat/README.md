# Live Chat Support

Backs the "Chat with an Agent" feature in the public chatbot widget
(`frontend/src/components/chatbot/Chatbot.tsx`) and the admin inbox that
handles it (`frontend/src/pages/admin/ly/LiveChatPage.tsx`, backend
`backend/routes/liveChatRoute.js`).

## What `002_add_cancelled_status.sql` does

Adds a `cancelled` status alongside `waiting`/`active`/`closed` (as a CHECK
constraint) for sessions the visitor abandoned — explicit "Back to AI
Assistant" click, a page reload/close caught via `navigator.sendBeacon`, or
auto-expired by the backend sweep (see below) because nobody ever explicitly
cancelled. Keeps abandoned chats out of the Waiting/Active/Closed tabs so an
agent never "claims" a visitor who already left.

## What `001_create_live_chat_tables.sql` does

- Creates `chat_sessions` (one row per visitor conversation; `status`
  is `waiting` → `active` → `closed`) and `chat_messages` (each turn,
  `sender_type` is `visitor` or `agent`).
- Adds a `Live Chat Support` permission module (View Chat Queue / Reply to
  Chats / Claim Chats / Close Chats) and a new `Live Chat Support Agent`
  role with those permissions.
- Seeds an `adminLy` admin account (password `admin123`) with that role, for
  Ms. Ly. It shows up in User Management / Role Management automatically —
  both pages read `admin_accounts`/`roles` generically, no frontend change
  needed there.

Idempotent — safe to re-run (`IF NOT EXISTS` / existence checks throughout).

## Run it

```
psql -U postgres -d capstone_db -f backend/database/migrations/zumi/live-chat/001_create_live_chat_tables.sql
psql -U postgres -d capstone_db -f backend/database/migrations/zumi/live-chat/002_add_cancelled_status.sql
```

## Housekeeping (no cron dependency)

`backend/routes/liveChatRoute.js` runs `sweepStaleSessions()` every time the
admin inbox polls `GET /sessions` (every 5s while the page is open):

**`closed` vs `cancelled` is decided by whether an agent ever joined** (`endedStatusFor()` in `liveChatRoute.js`), not by who ended it or how:
- `cancelled` = the session was still `waiting` (unclaimed) when it ended —
  nobody was ever on the other end, however that ending happened (visitor
  clicked "Back to AI Assistant", reloaded, or it idle-timed out).
- `closed` = an agent had claimed it (`active`) — a real conversation
  happened, so however it ends (agent explicitly ends it, visitor leaves
  after being helped, or it idles out) counts as resolved, not abandoned.

Auto-ending + purging, run on every admin inbox poll (`GET /sessions`):
- `waiting` sessions idle 10+ minutes → auto-`cancelled`.
- `active` sessions idle 30+ minutes → auto-`closed` (an agent was engaged).
- Any ended session (`closed` or `cancelled`) with **zero messages** is
  hard-deleted after a 1-hour grace period — long enough for the agent to
  notice a visitor tried and left; short enough that repeated empty opens
  don't pile up.
- Any `cancelled` session older than 30 days is hard-deleted regardless —
  bounds table growth so a busy widget can't accumulate abandoned rows
  forever. `closed` sessions are **not** time-purged — they're Ms. Ly's real
  resolved-conversation history. `chat_messages` cascades on delete.
- Ms. Ly can also delete any session manually from the inbox at any time —
  originally just Cancelled, now Closed too (added 2026-07-18 since the
  Closed tab has no auto-purge and was getting crowded; a real retention
  policy for Closed, if wanted later, is a small addition to the sweep).

This means Cancelled only ever holds chats nobody picked up, Closed only
ever holds real resolved conversations, and neither grows unbounded.

## Verify

```sql
\d chat_sessions
\d chat_messages
SELECT adminid, role_id FROM admin_accounts WHERE adminid = 'adminLy';
SELECT * FROM roles WHERE name = 'Live Chat Support Agent';
```

Have Ms. Ly change her password from the default on first login, same as any
other seeded admin account.
