// routes/liveChatRoute.js — "Chat with an Agent" live chat support.
// Visitors start a session from the public chatbot widget; admin adminLy
// (or anyone with the Live Chat Support Agent role) works the queue from
// the admin inbox. Simple poll-based messaging, no websockets — mirrors the
// rest of this project's admin routes (no auth middleware yet).
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// How long a session can sit idle before we treat it as ended — covers
// visitors who close the tab/lose network without ever triggering the
// explicit cancel call (sendBeacon isn't guaranteed).
const WAITING_TIMEOUT = "10 minutes";
const ACTIVE_TIMEOUT = "30 minutes";
const CANCELLED_RETENTION = "30 days";
// A session that ends with zero messages either way (visitor backed out
// before saying anything, or an agent claimed it but nobody ever typed) is
// still worth showing for a while — just not forever.
const EMPTY_SESSION_RETENTION = "1 hour";

// closed vs cancelled is decided by whether an agent ever joined, not by who
// ended it or how: 'cancelled' means nobody was ever on the other end
// (still 'waiting'/unclaimed when the visitor left or it timed out);
// 'closed' means an agent had claimed it (status 'active') — that's a real,
// resolved conversation whether the agent explicitly ended it, the visitor
// left after being helped, or it idled out. Used by both the /cancel
// endpoint and the sweep below so the two paths agree.
function endedStatusFor(currentStatus) {
  return currentStatus === "waiting" ? "cancelled" : "closed";
}

// Runs on every admin inbox poll: auto-ends stale sessions and purges old/
// empty ones, so the table can't grow unbounded just from visitors starting
// and abandoning chats. No cron dependency — piggybacks on the existing 5s
// admin poll.
async function sweepStaleSessions() {
  await pool.query(
    `UPDATE chat_sessions SET status = 'cancelled', closed_at = NOW(), updated_at = NOW()
     WHERE status = 'waiting' AND updated_at < NOW() - INTERVAL '${WAITING_TIMEOUT}'`
  );
  await pool.query(
    `UPDATE chat_sessions SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE status = 'active' AND updated_at < NOW() - INTERVAL '${ACTIVE_TIMEOUT}'`
  );
  await pool.query(
    `DELETE FROM chat_sessions s
     WHERE s.status IN ('cancelled', 'closed')
       AND s.updated_at < NOW() - INTERVAL '${EMPTY_SESSION_RETENTION}'
       AND NOT EXISTS (SELECT 1 FROM chat_messages m WHERE m.session_id = s.id)`
  );
  await pool.query(
    `DELETE FROM chat_sessions
     WHERE status = 'cancelled' AND updated_at < NOW() - INTERVAL '${CANCELLED_RETENTION}'`
  );
}

// ============================================
// VISITOR: start a new session
// ============================================
router.post('/sessions', async (req, res) => {
  try {
    const { visitor_name, visitor_email } = req.body;

    if (!visitor_name || !visitor_name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO chat_sessions (visitor_name, visitor_email, status)
       VALUES ($1, $2, 'waiting')
       RETURNING id, visitor_name, visitor_email, status, agent_adminid, created_at, updated_at`,
      [visitor_name.trim(), visitor_email || null]
    );

    res.status(201).json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to start chat session' });
  }
});

// ============================================
// ADMIN INBOX: list sessions (optionally filter by status)
// ============================================
router.get('/sessions', async (req, res) => {
  try {
    await sweepStaleSessions().catch((err) => console.error('Sweep error:', err));

    const { status } = req.query;

    const query = `
      SELECT
        s.id, s.visitor_name, s.visitor_email, s.status, s.agent_adminid,
        s.created_at, s.updated_at, s.closed_at,
        (SELECT message FROM chat_messages m WHERE m.session_id = s.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) AS message_count
      FROM chat_sessions s
      ${status ? 'WHERE s.status = $1' : ''}
      ORDER BY s.updated_at DESC
      LIMIT 100
    `;

    const result = status ? await pool.query(query, [status]) : await pool.query(query);

    res.json({ success: true, sessions: result.rows });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat sessions' });
  }
});

// ============================================
// Single session detail (visitor polls this for status changes)
// ============================================
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT id, visitor_name, visitor_email, status, agent_adminid, created_at, updated_at, closed_at
       FROM chat_sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat session' });
  }
});

// ============================================
// Messages within a session
// ============================================
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      `SELECT id, session_id, sender_type, sender_name, message, created_at
       FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({ success: true, messages: result.rows });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat messages' });
  }
});

router.post('/sessions/:sessionId/messages', async (req, res) => {
  const client = await pool.connect();
  try {
    const { sessionId } = req.params;
    const { sender_type, sender_name, message } = req.body;

    if (!sender_type || !['visitor', 'agent'].includes(sender_type)) {
      return res.status(400).json({ success: false, error: 'sender_type must be "visitor" or "agent"' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    await client.query('BEGIN');

    const sessionCheck = await client.query('SELECT id, status FROM chat_sessions WHERE id = $1', [sessionId]);
    if (sessionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (sessionCheck.rows[0].status === 'closed') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, error: 'This chat session is closed' });
    }

    const result = await client.query(
      `INSERT INTO chat_messages (session_id, sender_type, sender_name, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, session_id, sender_type, sender_name, message, created_at`,
      [sessionId, sender_type, sender_name || null, message.trim()]
    );

    await client.query(
      `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending chat message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  } finally {
    client.release();
  }
});

// ============================================
// Agent claims a waiting session
// ============================================
router.post('/sessions/:sessionId/claim', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { adminid } = req.body;

    if (!adminid) {
      return res.status(400).json({ success: false, error: 'adminid is required' });
    }

    const result = await pool.query(
      `UPDATE chat_sessions
       SET status = 'active', agent_adminid = $1, updated_at = NOW()
       WHERE id = $2 AND status = 'waiting'
       RETURNING id, visitor_name, visitor_email, status, agent_adminid, created_at, updated_at`,
      [adminid, sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session is no longer waiting (already claimed, cancelled, or closed)' });
    }

    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error claiming chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to claim chat session' });
  }
});

// ============================================
// Close a session
// ============================================
router.post('/sessions/:sessionId/close', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `UPDATE chat_sessions
       SET status = 'closed', closed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING id, visitor_name, visitor_email, status, agent_adminid, created_at, updated_at, closed_at`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error('Error closing chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to close chat session' });
  }
});

// ============================================
// VISITOR: leaving (explicit "Back to AI Assistant", or a reload/tab-close
// caught client-side via navigator.sendBeacon). Resolves to 'cancelled' if
// no agent had claimed the session yet (nobody was ever on the other end),
// or 'closed' if one had (a real conversation happened) — see
// endedStatusFor. Either way it stops showing up as claimable/active; a
// session that turns out empty is swept away after a short grace period,
// see sweepStaleSessions.
// ============================================
router.post('/sessions/:sessionId/cancel', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const current = await pool.query(
      'SELECT status FROM chat_sessions WHERE id = $1',
      [sessionId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (current.rows[0].status === 'closed' || current.rows[0].status === 'cancelled') {
      return res.json({ success: true, session: current.rows[0] });
    }

    const finalStatus = endedStatusFor(current.rows[0].status);

    const result = await pool.query(
      `UPDATE chat_sessions
       SET status = $1, closed_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [finalStatus, sessionId]
    );

    res.json({ success: true, session: result.rows[0] ?? null });
  } catch (error) {
    console.error('Error cancelling chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel chat session' });
  }
});

// ============================================
// ADMIN: manually delete a session (housekeeping — e.g. clearing the
// Cancelled tab on demand instead of waiting for the automatic sweep).
// ============================================
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'DELETE FROM chat_sessions WHERE id = $1 RETURNING id',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat session' });
  }
});

// ============================================
// VISITOR: leave feedback about a chat once it's ended (closed or
// cancelled) — shown in the widget below "Back to AI Assistant". Scoped to
// adminLy's inbox only for now; folding this into the shared `feedback`
// table/dashboard (adminMila/adminSalao's Service Feedback) is future work.
// ============================================
router.post('/sessions/:sessionId/feedback', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, comment } = req.body;

    const ratingNum = parseInt(rating, 10);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'rating must be an integer from 1 to 5' });
    }

    const sessionCheck = await pool.query('SELECT id FROM chat_sessions WHERE id = $1', [sessionId]);
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    const result = await pool.query(
      `INSERT INTO chat_feedback (session_id, rating, comment)
       VALUES ($1, $2, $3)
       ON CONFLICT (session_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
       RETURNING id, session_id, rating, comment, created_at`,
      [sessionId, ratingNum, comment?.trim() || null]
    );

    res.status(201).json({ success: true, feedback: result.rows[0] });
  } catch (error) {
    console.error('Error saving chat feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to save feedback' });
  }
});

// ============================================
// ADMIN: feedback for a single session (shown in the thread panel).
// ============================================
router.get('/sessions/:sessionId/feedback', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await pool.query(
      'SELECT id, session_id, rating, comment, created_at FROM chat_feedback WHERE session_id = $1',
      [sessionId]
    );

    res.json({ success: true, feedback: result.rows[0] ?? null });
  } catch (error) {
    console.error('Error fetching chat feedback:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback' });
  }
});

// ============================================
// ADMIN: feedback summary for the adminLy dashboard (average rating + count).
// ============================================
router.get('/feedback/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS average
       FROM chat_feedback`
    );

    res.json({
      success: true,
      count: result.rows[0].count,
      average: Math.round(result.rows[0].average * 10) / 10,
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feedback stats' });
  }
});

export default router;
