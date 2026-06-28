const { validateUserText } = require('../utils/childSafety');

// Hybrid chat moderation (INF-3): a deterministic Albanian banlist + PII regex
// (reused from childSafety) blocks the obvious for free; only borderline messages
// that pass it are escalated to a fast LLM classifier (Claude Haiku) for
// grooming / contextual harm a wordlist can't catch.
//
// Posture:
//  - No ANTHROPIC_API_KEY configured -> LLM layer is skipped; the deterministic
//    layer still runs (hybrid degrades to banlist-only, chat keeps working).
//  - Key configured but the call fails -> FAIL CLOSED. A child-safety surface
//    must not store text it was supposed to verify but couldn't. The sender is
//    asked to retry.
//
// Returns { ok: true } or { ok: false, reason } where reason is one of
// PROFANITY_DETECTED | PII_DETECTED | LLM_FLAGGED | MODERATION_UNAVAILABLE.

const MODEL = 'claude-haiku-4-5';

const SYSTEM_PROMPT =
  'You are a content-safety classifier for a children\'s educational app chat (Albanian and English). ' +
  'Decide if a single chat message is safe to deliver. Treat as UNSAFE: sexual content, grooming or ' +
  'attempts to move the chat off-platform or meet in person, requests for personal/contact information, ' +
  'harassment, hate, threats, violence, or self-harm. Normal friendly or learning-related chat is SAFE. ' +
  'Reply with exactly one word: SAFE or UNSAFE. No explanation.';

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  return client;
}

async function moderateMessage(text) {
  // 1) Deterministic banlist + PII.
  const deterministic = validateUserText(text);
  if (!deterministic.ok) {
    return { ok: false, reason: deterministic.reason };
  }

  // 2) LLM classifier for borderline cases (only if configured).
  const anthropic = getClient();
  if (!anthropic) {
    return { ok: true };
  }

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: String(text) }],
    });
    const block = response.content?.[0];
    const verdict = (block && block.type === 'text' ? block.text : '').trim().toUpperCase();
    if (verdict.startsWith('UNSAFE')) {
      return { ok: false, reason: 'LLM_FLAGGED' };
    }
    return { ok: true };
  } catch (err) {
    // Fail closed — never store unverified free text on a kids surface.
    console.error('[moderation_llm_error]', err.message);
    return { ok: false, reason: 'MODERATION_UNAVAILABLE' };
  }
}

module.exports = { moderateMessage };
