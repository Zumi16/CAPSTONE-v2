import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { getStoredAdminId } from "@/lib/adminAuth";
import "@/styles/pages/admin/live-chat.css";

type SessionStatus = "waiting" | "active" | "closed" | "cancelled";

type ChatSession = {
  id: number;
  visitor_name: string;
  visitor_email: string | null;
  status: SessionStatus;
  agent_adminid: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_message: string | null;
  message_count: string | number;
};

type ChatMessage = {
  id: number;
  session_id: number;
  sender_type: "visitor" | "agent";
  sender_name: string | null;
  message: string;
  created_at: string;
};

type ChatFeedback = {
  id: number;
  session_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
};

type FeedbackStats = {
  count: number;
  average: number;
};

type Tab = "waiting" | "active" | "closed" | "cancelled";

const TABS: { key: Tab; label: string }[] = [
  { key: "waiting", label: "Waiting" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
  { key: "cancelled", label: "Cancelled" },
];

function formatTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Live Chat inbox for Ms. Ly (adminLy) — handles the "Chat with an Agent"
 * hand-off from the public chatbot widget. Poll-based, no websockets: the
 * session list and open thread each refresh on a timer, matching how the
 * rest of the admin portals (e.g. Review Monitoring) do "live" updates.
 */
export function LiveChatPage() {
  const adminId = getStoredAdminId() ?? "adminLy";

  const [tab, setTab] = useState<Tab>("waiting");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<ChatFeedback | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;

  const loadSessions = async () => {
    try {
      const data = await api.get<{ sessions: ChatSession[] }>(
        `/api/live-chat/sessions?status=${tab}`,
      );
      setSessions(data.sessions);
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: number) => {
    try {
      const data = await api.get<{ messages: ChatMessage[] }>(
        `/api/live-chat/sessions/${sessionId}/messages`,
      );
      setMessages(data.messages);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    }
  };

  const loadFeedback = async (sessionId: number) => {
    try {
      const data = await api.get<{ feedback: ChatFeedback | null }>(
        `/api/live-chat/sessions/${sessionId}/feedback`,
      );
      setFeedback(data.feedback);
    } catch (error) {
      console.error("Failed to load chat feedback:", error);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const data = await api.get<FeedbackStats & { success: boolean }>(
        "/api/live-chat/feedback/stats",
      );
      setFeedbackStats({ count: data.count, average: data.average });
    } catch (error) {
      console.error("Failed to load feedback stats:", error);
    }
  };

  useEffect(() => {
    setLoading(true);
    setSelectedId(null);
    setMessages([]);
    loadSessions();
    const id = setInterval(loadSessions, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (selectedId == null) {
      setFeedback(null);
      return;
    }
    loadMessages(selectedId);
    loadFeedback(selectedId);
    const id = setInterval(() => loadMessages(selectedId), 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    loadFeedbackStats();
    const id = setInterval(loadFeedbackStats, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleClaim = async (session: ChatSession) => {
    try {
      await api.post(`/api/live-chat/sessions/${session.id}/claim`, { adminid: adminId });
      setTab("active");
      setSelectedId(session.id);
    } catch (error) {
      console.error("Failed to claim session:", error);
      window.alert("Could not claim this chat. Please try again.");
    }
  };

  const handleDelete = async (session: ChatSession) => {
    if (!window.confirm(`Permanently remove this chat with ${session.visitor_name}?`)) return;
    try {
      await api.delete(`/api/live-chat/sessions/${session.id}`);
      if (selectedId === session.id) setSelectedId(null);
      await loadSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      window.alert("Could not delete this chat. Please try again.");
    }
  };

  const handleClose = async () => {
    if (!selectedSession) return;
    if (!window.confirm(`End the chat with ${selectedSession.visitor_name}?`)) return;
    try {
      await api.post(`/api/live-chat/sessions/${selectedSession.id}/close`);
      await loadSessions();
      setTab("closed");
    } catch (error) {
      console.error("Failed to close session:", error);
      window.alert("Could not close this chat. Please try again.");
    }
  };

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || !selectedSession) return;

    setSending(true);
    try {
      await api.post(`/api/live-chat/sessions/${selectedSession.id}/messages`, {
        sender_type: "agent",
        sender_name: adminId,
        message: text,
      });
      setReply("");
      await loadMessages(selectedSession.id);
    } catch (error) {
      console.error("Failed to send message:", error);
      window.alert("Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="live-chat-page">
      <div className="lc-panel lc-sessions">
        <div className="lc-feedback-summary">
          <i className="fas fa-star" />
          <span className="lc-feedback-avg">
            {feedbackStats && feedbackStats.count > 0 ? feedbackStats.average.toFixed(1) : "—"}
          </span>
          <span className="lc-feedback-count">
            ({feedbackStats?.count ?? 0} rating{feedbackStats?.count === 1 ? "" : "s"})
          </span>
        </div>

        <div className="lc-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={cx("lc-tab", tab === t.key && "active")}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="lc-session-list">
          {loading ? (
            <p className="lc-empty">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="lc-empty">No {tab} chats.</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                className={cx("lc-session-item", selectedId === s.id && "active")}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="lc-session-item-top">
                  <span className="lc-session-name">{s.visitor_name}</span>
                  <span className="lc-session-time">{formatTime(s.updated_at)}</span>
                </div>
                <p className="lc-session-preview">{s.last_message ?? "No messages yet"}</p>
                {tab === "waiting" && (
                  <span
                    className="lc-claim-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaim(s);
                    }}
                  >
                    <i className="fas fa-headset" /> Claim
                  </span>
                )}
                {(tab === "cancelled" || tab === "closed") && (
                  <span
                    className="lc-claim-btn lc-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s);
                    }}
                  >
                    <i className="fas fa-trash" /> Delete
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="lc-panel lc-thread">
        {!selectedSession ? (
          <div className="lc-thread-empty">
            <i className="fas fa-comment-dots" />
            <p>Select a conversation to view it here.</p>
          </div>
        ) : (
          <>
            <div className="lc-thread-header">
              <div>
                <h2>{selectedSession.visitor_name}</h2>
                <span className="lc-thread-email">{selectedSession.visitor_email || "No email provided"}</span>
              </div>
              {selectedSession.status === "waiting" || selectedSession.status === "active" ? (
                <button className="lc-close-btn" onClick={handleClose}>
                  <i className="fas fa-circle-xmark" /> End Chat
                </button>
              ) : (
                <button className="lc-close-btn" onClick={() => handleDelete(selectedSession)}>
                  <i className="fas fa-trash" /> Delete
                </button>
              )}
            </div>

            <div className="lc-messages" ref={messagesRef}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cx("lc-message", m.sender_type === "agent" ? "agent" : "visitor")}
                >
                  <strong>{m.sender_type === "agent" ? (m.sender_name || "Agent") : selectedSession.visitor_name}</strong>
                  <p>{m.message}</p>
                  <span className="lc-message-time">{formatTime(m.created_at)}</span>
                </div>
              ))}
            </div>

            {selectedSession.status === "closed" || selectedSession.status === "cancelled" ? (
              <div className="lc-closed-notice">
                {selectedSession.status === "closed"
                  ? "This chat has ended."
                  : "The visitor left before an agent joined this chat."}
                {feedback && (
                  <div className="lc-feedback-block">
                    <div className="lc-feedback-block-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className={star <= feedback.rating ? "fas fa-star" : "far fa-star"}
                        />
                      ))}
                    </div>
                    {feedback.comment && <p>&ldquo;{feedback.comment}&rdquo;</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="lc-reply-bar">
                <input
                  type="text"
                  placeholder="Type your reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <button onClick={handleSend} disabled={sending || !reply.trim()}>
                  <i className="fas fa-paper-plane" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
