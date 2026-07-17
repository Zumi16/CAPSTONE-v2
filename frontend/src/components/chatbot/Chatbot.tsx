import { useEffect, useRef, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatClockTime } from "@/lib/format";

import "@/styles/layout/chatbot.css";
import {
  chatbotClasses as c,
  chatbotIds as ids,
  COMMON_QUESTIONS,
  IAPPLY_URL,
  NO_FACE_TO_FACE_NOTICE,
} from "./chatbot.classes";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  time: string;
};

type LiveStatus = "waiting" | "active" | "closed" | "cancelled";

type LiveChatMessage = {
  id: number;
  sender_type: "visitor" | "agent";
  sender_name: string | null;
  message: string;
  created_at: string;
};

/** Chat surface: the AI assistant, or a human "Chat with an Agent" hand-off. */
type Mode = "ai" | "agent-form" | "agent-chat";

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  text: "Welcome to PUP Parañaque chatbot! How can I help you today?",
  time: formatClockTime(),
};

const CONNECTION_ERROR =
  "Sorry, I'm having trouble connecting right now. Please try again later or contact us directly at (63 2) 553-8623.";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Persists which live-chat session a visitor is in, so a reload or dropped
// connection doesn't lose the conversation — there's no visitor account to
// key it to, so this is the only thread back to it. The backend's own idle
// timeout (10min waiting / 30min active — see liveChatRoute.js) is what
// actually expires it; this is just how the browser finds it again.
const LIVE_CHAT_STORAGE_KEY = "pup_live_chat_session";

type StoredLiveChat = {
  sessionId: number;
  visitorName: string;
  visitorEmail: string;
};

function loadStoredLiveChat(): StoredLiveChat | null {
  try {
    const raw = localStorage.getItem(LIVE_CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLiveChat) : null;
  } catch {
    return null;
  }
}

function saveStoredLiveChat(data: StoredLiveChat): void {
  localStorage.setItem(LIVE_CHAT_STORAGE_KEY, JSON.stringify(data));
}

function clearStoredLiveChat(): void {
  localStorage.removeItem(LIVE_CHAT_STORAGE_KEY);
}

/** Turns any raw URLs in a message into clickable links. */
function renderMessageText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  URL_PATTERN.lastIndex = 0;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const url = match[0];
    nodes.push(
      <a key={match.index} href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Floating help chatbot, shown on the public pages.
 * Replaces the old `quickhelp&chatbot.js`. All state (open/closed, messages,
 * typing) lives in React instead of being poked into the DOM by hand.
 *
 * Has two chat surfaces: the Gemini-backed AI assistant, and a "Chat with an
 * Agent" hand-off to a human (Ms. Ly / whoever holds the Live Chat Support
 * role) via `/api/live-chat`, polled rather than a websocket.
 */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");

  // --- AI assistant state ---
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // --- Chat with an Agent state ---
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>("waiting");
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState("");
  const [liveSending, setLiveSending] = useState(false);

  // --- Post-chat feedback state ---
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message whenever the visible list changes.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, liveMessages, mode]);

  // Poll the live chat session (messages + status) while it's active.
  useEffect(() => {
    if (mode !== "agent-chat" || liveSessionId == null) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const [msgData, sessionData] = await Promise.all([
          api.get<{ messages: LiveChatMessage[] }>(
            `/api/live-chat/sessions/${liveSessionId}/messages`,
          ),
          api.get<{ session: { status: LiveStatus } }>(
            `/api/live-chat/sessions/${liveSessionId}`,
          ),
        ]);
        if (cancelled) return;
        setLiveMessages(msgData.messages);
        setLiveStatus(sessionData.session.status);
        if (sessionData.session.status === "closed" || sessionData.session.status === "cancelled") {
          clearStoredLiveChat();
        }
      } catch (error) {
        console.error("Live chat poll error:", error);
      }
    };

    poll();
    const intervalId = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [mode, liveSessionId]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (text === "") return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text, time: formatClockTime() },
    ]);
    setInput("");
    setTyping(true);

    try {
      const data = await api.post<{ reply: string }>("/api/chatbot", {
        message: text,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, time: formatClockTime() },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: CONNECTION_ERROR, time: formatClockTime() },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const showIapplyLink = () => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `You can apply directly through the PUP iApply system here: ${IAPPLY_URL}\n\nApplications are strictly online only — there is no face-to-face or walk-in application.`,
        time: formatClockTime(),
      },
    ]);
  };

  const startAgentChat = async () => {
    if (!visitorName.trim()) return;

    setStartingChat(true);
    try {
      const data = await api.post<{ session: { id: number; status: LiveStatus } }>(
        "/api/live-chat/sessions",
        {
          visitor_name: visitorName.trim(),
          visitor_email: visitorEmail.trim() || undefined,
        },
      );
      setLiveSessionId(data.session.id);
      setLiveStatus(data.session.status);
      setLiveMessages([]);
      setMode("agent-chat");
      saveStoredLiveChat({
        sessionId: data.session.id,
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim(),
      });
    } catch (error) {
      console.error("Failed to start live chat:", error);
      window.alert("Sorry, we couldn't connect you to an agent right now. Please try again.");
    } finally {
      setStartingChat(false);
    }
  };

  const sendLiveMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (text === "" || liveSessionId == null) return;

    setLiveInput("");
    setLiveSending(true);
    try {
      await api.post(`/api/live-chat/sessions/${liveSessionId}/messages`, {
        sender_type: "visitor",
        sender_name: visitorName,
        message: text,
      });
      const data = await api.get<{ messages: LiveChatMessage[] }>(
        `/api/live-chat/sessions/${liveSessionId}/messages`,
      );
      setLiveMessages(data.messages);
    } catch (error) {
      console.error("Failed to send live chat message:", error);
    } finally {
      setLiveSending(false);
    }
  };

  // Visitor-initiated end, while the chat is still waiting/active: ends the
  // session server-side and stays on screen to show the ended state + ask
  // for feedback, rather than leaving immediately (see returnToAi for that).
  const endLiveChat = async () => {
    if (liveSessionId == null) return;
    clearStoredLiveChat();
    try {
      const data = await api.post<{ session: { status: LiveStatus } | null }>(
        `/api/live-chat/sessions/${liveSessionId}/cancel`,
      );
      if (data.session) setLiveStatus(data.session.status);
    } catch (error) {
      console.error("Failed to end live chat:", error);
    }
  };

  // Leaves the ended screen and goes back to the AI assistant. The session
  // is already closed/cancelled by this point (either via endLiveChat above,
  // an agent ending it, or the backend's idle timeout), so this is just a
  // local reset — no API call needed.
  const returnToAi = () => {
    clearStoredLiveChat();
    setMode("ai");
    setLiveSessionId(null);
    setLiveMessages([]);
    setLiveStatus("waiting");
    setFeedbackRating(0);
    setFeedbackComment("");
    setFeedbackSubmitted(false);
  };

  const submitFeedback = async () => {
    if (liveSessionId == null || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      await api.post(`/api/live-chat/sessions/${liveSessionId}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment.trim() || undefined,
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      window.alert("Sorry, we couldn't save your feedback. Please try again.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // On mount, try to resume a live chat that survived a reload / dropped
  // connection (e.g. wifi cut out mid-chat). A reload no longer cancels the
  // session — only an explicit "Back to AI Assistant" click does — so as
  // long as the backend hasn't idle-timed it out yet (10min waiting / 30min
  // active), she lands right back in the same conversation instead of having
  // to start over with a new agent.
  useEffect(() => {
    const stored = loadStoredLiveChat();
    if (!stored) return;

    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ session: { status: LiveStatus } }>(
          `/api/live-chat/sessions/${stored.sessionId}`,
        );
        if (cancelled) return;

        if (data.session.status === "waiting" || data.session.status === "active") {
          setVisitorName(stored.visitorName);
          setVisitorEmail(stored.visitorEmail);
          setLiveSessionId(stored.sessionId);
          setLiveStatus(data.session.status);
          setMode("agent-chat");
          setOpen(true);
        } else {
          clearStoredLiveChat();
        }
      } catch {
        clearStoredLiveChat();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const agentStatusText =
    liveStatus === "waiting"
      ? "Waiting for an agent to join…"
      : liveStatus === "active"
        ? "You're connected with an agent."
        : "This chat has ended.";

  return (
    <section>
      {/* Floating toggle button (hidden while the chatbox is open) */}
      <button
        id={ids.toggleButton}
        style={{ display: open ? "none" : "flex" }}
        onClick={() => setOpen(true)}
        aria-label="Open chat"
      >
        <i className="fa-solid fa-robot" />
      </button>

      {/* Chat window */}
      <div id={ids.chatbox} style={{ display: open ? "flex" : "none" }}>
        <div id={ids.header}>
          PUP Parañaque Assistant
          <button
            className={c.closeButton}
            title="Close Chat"
            onClick={() => setOpen(false)}
          >
            <span className={c.materialIcons}>close</span>
          </button>
        </div>

        <div className={c.notice}>
          <i className="fa-solid fa-triangle-exclamation" /> {NO_FACE_TO_FACE_NOTICE}
        </div>

        {mode === "ai" && (
          <div className={c.agentBar}>
            <button className={c.agentButton} onClick={() => setMode("agent-form")}>
              <i className="fa-solid fa-headset" /> Chat with an Agent
            </button>
            <button className={c.agentButton} onClick={showIapplyLink}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> PUP iApply
            </button>
          </div>
        )}

        {mode === "ai" && (
          <>
            <div id={ids.messages} ref={messagesRef}>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cx(
                    c.message,
                    msg.role === "user" ? c.user : c.assistant,
                  )}
                >
                  <strong>{msg.role === "user" ? "You" : "Assistant"}</strong>
                  <span className={c.timestamp}>{msg.time}</span>
                  <br />
                  {renderMessageText(msg.text)}
                </div>
              ))}

              {typing && (
                <div className={cx(c.message, c.assistant, c.typingIndicator)}>
                  <strong>Assistant</strong>
                  <span className={c.timestamp}>{formatClockTime()}</span>
                  <br />
                  <span className={c.dots}>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              )}
            </div>

            <div id={ids.commonQuestions}>
              <p onClick={() => setQuestionsOpen((v) => !v)}>
                Common questions:
                <button className={c.toggleQuestionsButton} title="Show/Hide">
                  <span
                    className={c.materialIcons}
                    style={{
                      transform: questionsOpen ? "rotate(0deg)" : "rotate(-90deg)",
                    }}
                  >
                    expand_more
                  </span>
                </button>
              </p>
              {questionsOpen && (
                <div>
                  {COMMON_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      className={c.questionButton}
                      onClick={() => sendMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div id={ids.input}>
              <input
                type="text"
                id={ids.textField}
                placeholder="Enter your questions here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
              />
              <button onClick={() => sendMessage(input)} aria-label="Send">
                <span className={c.materialIconsOutlined}>send</span>
              </button>
            </div>
          </>
        )}

        {mode === "agent-form" && (
          <div className={c.agentForm}>
            <p>Let's connect you with a support agent. Please tell us your name:</p>
            <input
              type="text"
              placeholder="Your name"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
            />
            <button
              className={c.agentButton}
              onClick={startAgentChat}
              disabled={startingChat || !visitorName.trim()}
            >
              {startingChat ? "Connecting…" : "Start Chat"}
            </button>
            <button className={c.agentBack} onClick={() => setMode("ai")}>
              &larr; Back to AI Assistant
            </button>
          </div>
        )}

        {mode === "agent-chat" && (
          <>
            <div className={c.agentStatus}>{agentStatusText}</div>

            <div id={ids.messages} ref={messagesRef}>
              {liveMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cx(
                    c.message,
                    msg.sender_type === "visitor" ? c.user : c.assistant,
                  )}
                >
                  <strong>
                    {msg.sender_type === "visitor" ? "You" : msg.sender_name || "Agent"}
                  </strong>
                  <span className={c.timestamp}>
                    {formatClockTime(new Date(msg.created_at))}
                  </span>
                  <br />
                  {renderMessageText(msg.message)}
                </div>
              ))}
            </div>

            {liveStatus === "closed" || liveStatus === "cancelled" ? (
              <div className={c.agentEnded}>
                <p>This chat has ended. Thank you for reaching out!</p>
                <button className={c.agentButton} onClick={returnToAi}>
                  Back to AI Assistant
                </button>

                {feedbackSubmitted ? (
                  <p className={c.feedbackThanks}>
                    <i className="fa-solid fa-circle-check" /> Thanks for your feedback!
                  </p>
                ) : (
                  <div className={c.feedback}>
                    <p className={c.feedbackPrompt}>
                      Please send a feedback about this conversation or the agent:
                    </p>
                    <div className={c.feedbackStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={c.feedbackStar}
                          onClick={() => setFeedbackRating(star)}
                          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                        >
                          <i className={star <= feedbackRating ? "fas fa-star" : "far fa-star"} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={c.feedbackComment}
                      placeholder="Any comments about the agent or conversation? (optional)"
                      rows={2}
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                    />
                    <button
                      className={c.agentButton}
                      onClick={submitFeedback}
                      disabled={feedbackRating === 0 || submittingFeedback}
                    >
                      {submittingFeedback ? "Sending…" : "Send Feedback"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div id={ids.input}>
                  <input
                    type="text"
                    id={ids.textField}
                    placeholder="Type your message..."
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendLiveMessage(liveInput);
                      }
                    }}
                    disabled={liveSending}
                  />
                  <button
                    onClick={() => sendLiveMessage(liveInput)}
                    aria-label="Send"
                    disabled={liveSending}
                  >
                    <span className={c.materialIconsOutlined}>send</span>
                  </button>
                </div>
                <button className={c.agentBack} onClick={endLiveChat}>
                  &larr; End Chat
                </button>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
