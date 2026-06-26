/**
 * The chatbot is styled in `quickhelp&chatbot.css` mostly by element IDs
 * (#chatbox, #chatToggleBtn, ...). We keep those exact IDs so the styling
 * applies, and gather them here next to the class names.
 */
export const chatbotIds = {
  toggleButton: "chatToggleBtn",
  chatbox: "chatbox",
  header: "chatHeader",
  messages: "chatMessages",
  commonQuestions: "commonQuestions",
  input: "chatInput",
  textField: "chatText",
} as const;

export const chatbotClasses = {
  message: "message",
  user: "user",
  assistant: "assistant",
  timestamp: "timestamp",
  typingIndicator: "typing-indicator",
  dots: "dots",
  closeButton: "close-chat-btn",
  toggleQuestionsButton: "toggle-questions-btn",
  questionButton: "question-button",
  materialIcons: "material-icons",
  materialIconsOutlined: "material-icons-outlined",
} as const;

/** The "Common questions" shown under the chat window. */
export const COMMON_QUESTIONS = [
  "What programs are offered at PUP Parañaque?",
  "How do I apply for admission?",
  "What are the tuition fees?",
  "Where is the campus located?",
  "What are the requirements for enrollment?",
] as const;
