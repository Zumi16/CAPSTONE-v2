import { useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { cx } from "@/lib/cx";
import { formatClockTime } from "@/lib/format";

const COMMON_QUESTIONS = [
  "What programs are offered at PUP Parañaque?",
  "How do I apply for admission?",
  "What are the tuition fees?",
  "Where is the campus located?",
  "What are the requirements for enrollment?",
];

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
 * Floating help chatbot shown on the public pages. Fully responsive: a fixed
 * panel that fills most of the screen on phones and sits bottom-right on
 * larger screens.
 */
export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [questionsOpen, setQuestionsOpen] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (text === "") return;

    setMessages((prev) => [...prev, { role: "user", text, time: formatClockTime() }]);
    setInput("");
    setTyping(true);

    try {
      const data = await api.post<{ reply: string }>("/api/chatbot", { message: text });
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
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-6 right-6 z-[1000] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-900 to-red-700 text-2xl text-white shadow-lg transition hover:scale-110"
        >
          <i className="fa-solid fa-robot" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[1000] flex h-[70vh] max-h-[550px] w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:bottom-6 sm:right-8">
          {/* Header */}
          <div className="flex items-center justify-center bg-gradient-to-br from-red-900 to-red-700 p-4 font-bold text-white">
            PUP Parañaque Assistant
            <button
              onClick={() => setOpen(false)}
              title="Close Chat"
              className="absolute right-4 rounded-full p-1 hover:bg-white/20"
            >
              <span className="material-icons">close</span>
            </button>
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gray-50 p-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cx(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "self-end bg-gradient-to-br from-red-900 to-red-700 text-white"
                    : "self-start border border-gray-200 bg-white text-gray-800",
                )}
              >
                <strong>{msg.role === "user" ? "You" : "Assistant"}</strong>
                <span className="ml-1.5 text-xs opacity-70">{msg.time}</span>
                <br />
                {msg.text}
              </div>
            ))}

            {typing && (
              <div className="max-w-[85%] self-start rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                <strong>Assistant</strong>
                <span className="ml-1.5 text-xs opacity-70">{formatClockTime()}</span>
                <br />
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:0.2s]">.</span>
                  <span className="animate-bounce [animation-delay:0.4s]">.</span>
                </span>
              </div>
            )}
          </div>

          {/* Common questions */}
          <div className="border-t border-gray-200 bg-white p-4">
            <p
              onClick={() => setQuestionsOpen((v) => !v)}
              className="flex cursor-pointer select-none items-center justify-between text-sm font-semibold text-gray-600"
            >
              Common questions:
              <span
                className="material-icons text-gray-500 transition-transform"
                style={{ transform: questionsOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
              >
                expand_more
              </span>
            </p>
            {questionsOpen && (
              <div className="mt-2 flex flex-col gap-2">
                {COMMON_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-left text-[13px] transition hover:bg-gradient-to-br hover:from-red-900 hover:to-red-700 hover:text-white"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-gray-200 bg-white p-4">
            <input
              type="text"
              placeholder="Enter your questions here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-900"
            />
            <button
              onClick={() => sendMessage(input)}
              aria-label="Send"
              className="flex items-center justify-center rounded-lg bg-gradient-to-br from-red-900 to-red-700 px-4 text-white transition hover:opacity-90"
            >
              <span className="material-icons-outlined">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
