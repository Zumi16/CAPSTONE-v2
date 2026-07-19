-- Live Chat Support feature ("Chat with an Agent" in the public chatbot widget).
-- Adds chat_sessions/chat_messages tables, a new "Live Chat Support" role +
-- permission module, and a new admin account (adminLy) for Ms. Ly, the
-- support admin who will staff the live chat inbox. Reflects automatically in
-- the existing User Management / Role Management pages (they read generically
-- from admin_accounts/roles, no frontend changes needed there).
--
-- Run with:
--   psql -U postgres -d capstone_db -f backend/database/migrations/zumi/live-chat/001_create_live_chat_tables.sql
--
-- Date: 2026-07-17

BEGIN;

-- Needed for crypt()/gen_salt() below (matches how other admin passwords are hashed).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Chat sessions: one row per visitor "Chat with an Agent" conversation
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  visitor_name VARCHAR(150) NOT NULL,
  visitor_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting | active | closed
  agent_adminid VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  FOREIGN KEY (agent_adminid) REFERENCES admin_accounts(adminid) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- ============================================
-- Chat messages: visitor <-> agent turns within a session
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  sender_type VARCHAR(10) NOT NULL, -- 'visitor' | 'agent'
  sender_name VARCHAR(150),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================
-- "Live Chat Support" permission module + role
-- ============================================
INSERT INTO permissions (module, icon, name, description)
SELECT 'Live Chat Support', 'fas fa-comment-dots', v.name, v.description
FROM (VALUES
  ('View Chat Queue', 'View waiting and active live chat sessions'),
  ('Reply to Chats', 'Send messages to visitors in a live chat session'),
  ('Claim Chats', 'Claim a waiting chat session to handle it'),
  ('Close Chats', 'Close/end a live chat session')
) AS v(name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.module = 'Live Chat Support' AND p.name = v.name
);

INSERT INTO roles (name, description, is_system)
SELECT 'Live Chat Support Agent', 'Handles the "Chat with an Agent" live chat queue from the public chatbot', false
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Live Chat Support Agent');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Live Chat Support Agent'
  AND p.module = 'Live Chat Support'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- ============================================
-- Admin account for Ms. Ly (default password: admin123 — have her reset it
-- on first login via User Management, same as other seeded admins)
-- ============================================
INSERT INTO admin_accounts (adminid, password, role_id, status, created_at)
SELECT 'adminLy', crypt('admin123', gen_salt('bf')), r.id, 'active', NOW()
FROM roles r
WHERE r.name = 'Live Chat Support Agent'
  AND NOT EXISTS (SELECT 1 FROM admin_accounts WHERE adminid = 'adminLy');

COMMIT;
