import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatClockTime } from "@/lib/format";

import "@/styles/pages/quickhelp&chatbot.css";
import {
  chatbotClasses as c,
  chatbotIds as ids,
  COMMON_QUESTIONS,
} from "./chatbot.classes";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  time: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  text: "Welcome to PUP Parañaque chatbot! How can I help you today?",
  time: formatClockTime(),
};

const CONNECTION_ERROR =
  "Sorry, I'm having trouble connecting right now. Please try again later or contact us directly at (02) 8839-0432.";

/**
 * Floating help chatbot, shown on the public pages.
 * Replaces the old `quickhelp&chatbot.js`. All state (open/closed, messages,
 * typing) lives in React instead of being poked into the DOM by hand.
 */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest message whenever the list changes.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

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
              {msg.text}
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
      </div>
    </section>
  );
}
