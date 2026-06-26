/**
 * Small formatting helpers reused across pages.
 * These replace the copy-pasted date / text helpers from the old JS files.
 */

/** Strip HTML tags and shorten rich text into a plain-text preview. */
export function extractTextPreview(htmlContent: string, maxLength = 150): string {
  const temp = document.createElement("div");
  temp.innerHTML = htmlContent ?? "";
  const text = temp.textContent || temp.innerText || "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/** "June 26, 2026" */
export function formatLongDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** "Jun 26, 2026" */
export function formatShortDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "14:05" – matches the old chatbot timestamp format. */
export function formatClockTime(value: Date = new Date()): string {
  const hours = value.getHours().toString().padStart(2, "0");
  const minutes = value.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
