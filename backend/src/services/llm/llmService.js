const { callGemini } = require('./geminiService');
const { callGroq } = require('./groqService');
const logger = require('../../utils/logger');

/**
 * Unified LLM call with Gemini primary → Groq fallback.
 * Never throws. Returns { status: 'ok' | 'failed', data: parsed | null }.
 *
 * @param {string} prompt - The prompt to send
 * @param {import('zod').ZodSchema} schema - Zod schema to validate JSON output
 */
async function callLLM(prompt, schema) {
  // ── Primary: Google Gemini ───────────────────
  try {
    const raw = await callGemini(prompt);
    const parsed = schema.parse(JSON.parse(raw));
    return { status: 'ok', data: parsed };
  } catch (primaryErr) {
    logger.warn(`Gemini failed: ${primaryErr.message}. Falling back to Groq...`);
  }

  // ── Fallback: Groq ───────────────────────────
  try {
    const raw = await callGroq(prompt);
    const parsed = schema.parse(JSON.parse(raw));
    return { status: 'ok', data: parsed };
  } catch (fallbackErr) {
    logger.error(`Groq fallback also failed: ${fallbackErr.message}`);
    return { status: 'failed', data: null };
  }
}

module.exports = { callLLM };
