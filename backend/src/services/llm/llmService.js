const { callGemini } = require('./geminiService');
const { callGroq } = require('./groqService');
const logger = require('../../utils/logger');

// Sliding window in-memory rate limiter to protect Free Tier quotas
let callTimestamps = [];
const MAX_AI_CALLS_PER_MINUTE = 10;

function checkAiQuota() {
  const now = Date.now();
  callTimestamps = callTimestamps.filter((t) => now - t < 60 * 1000);
  if (callTimestamps.length >= MAX_AI_CALLS_PER_MINUTE) {
    return false; // Quota reached for current minute
  }
  callTimestamps.push(now);
  return true;
}

/**
 * Unified LLM call with Gemini primary → Groq fallback → Safe raw fallback.
 * Never throws. Returns { status: 'ok' | 'failed', data: parsed | null }.
 */
async function callLLM(prompt, schema) {
  // ── Step 0: Free Tier Safety Guard ───────────
  if (!checkAiQuota()) {
    logger.warn('AI rate limit reached (10 calls/min). Bypassing external LLM to protect free tier; using patient raw symptoms.');
    return { status: 'failed', data: null, reason: 'rate_limited' };
  }

  // ── Step 1: Primary - Google Gemini ──────────
  try {
    const raw = await callGemini(prompt);
    const parsed = schema.parse(JSON.parse(raw));
    return { status: 'ok', data: parsed };
  } catch (primaryErr) {
    logger.warn(`Gemini unavailable: ${primaryErr.message}. Falling back to Groq...`);
  }

  // ── Step 2: Fallback - Groq LPU ──────────────
  try {
    const raw = await callGroq(prompt);
    const parsed = schema.parse(JSON.parse(raw));
    return { status: 'ok', data: parsed };
  } catch (fallbackErr) {
    logger.warn(`Groq fallback also unavailable: ${fallbackErr.message}. Using raw symptoms.`);
    return { status: 'failed', data: null, reason: 'api_failed' };
  }
}

module.exports = { callLLM };
