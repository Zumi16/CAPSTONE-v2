// services/geminiClient.js — shared server-side Gemini client for the
// "AI Analysis" features (adminSerrano faculty report; adminAve later).
// Separate from backend/python_api/chatbot_api.py's own Gemini usage (that
// one talks to the chatbot widget over HTTP); this one is called in-process
// from Express routes via @google/genai, since that package was already a
// backend dependency but unused until now.
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set — AI Analysis features will fail until it is configured in backend/.env');
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const MODEL = 'gemini-2.5-flash';

/**
 * Calls Gemini with a prompt and a JSON response schema, returning the
 * parsed object. Throws if the key isn't configured or the call fails —
 * callers should catch and respond with a clear error, since this is only
 * ever invoked from an explicit "Regenerate Report" action (not on page
 * load), so failures should surface immediately rather than fail silently.
 */
export async function generateStructuredJson(prompt, schema) {
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }

  return JSON.parse(text);
}
