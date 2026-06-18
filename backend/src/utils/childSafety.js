const GDPR_K_AGE_BY_COUNTRY = {
  AT: 14,
  BE: 13,
  BG: 14,
  HR: 16,
  CY: 14,
  CZ: 15,
  DK: 13,
  EE: 13,
  FI: 13,
  FR: 15,
  DE: 16,
  GR: 15,
  HU: 16,
  IE: 16,
  IT: 14,
  LV: 13,
  LT: 14,
  LU: 16,
  MT: 13,
  NL: 16,
  PL: 16,
  PT: 13,
  RO: 16,
  SK: 16,
  SI: 15,
  ES: 14,
  SE: 13,
  US: 13,
  GB: 13,
  UK: 13,
};

const DEFAULT_CONSENT_AGE = 16;
const MINOR_AGE = 18;

const PRESET_CHAT_PHRASES = new Set([
  'Tung!',
  'Urime!',
  'Loje e mire!',
  'Faleminderit!',
  'A luajme nje kuiz?',
  'Bravo!',
  'Shume mire!',
  'Mire u pafshim!',
]);

const PROFANITY_PATTERNS = [
  /\bfuck(?:ing|er)?\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /\basshole\b/i,
  /\bkurv[ae]?\b/i,
  /\bpidh\b/i,
  /\bkar\b/i,
  /\bqif/i,
];

const PII_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:https?:\/\/|www\.)\S+\b/i,
  /(?:\+?\d[\s().-]*){8,}/,
  /\b(?:instagram|snapchat|tiktok|discord|telegram|whatsapp)\b/i,
  /@[A-Z0-9._-]{3,}/i,
  /\b\d{1,5}\s+[A-Z][A-Z\s.-]{2,}\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|rruga|bulevardi)\b/i,
];

function normalizeCountryCode(countryCode) {
  if (!countryCode) {
    return null;
  }
  return String(countryCode).trim().toUpperCase();
}

function getConsentAge(countryCode) {
  const normalized = normalizeCountryCode(countryCode);
  return GDPR_K_AGE_BY_COUNTRY[normalized] || DEFAULT_CONSENT_AGE;
}

function isMinorAge(age) {
  return Number(age) < MINOR_AGE;
}

function requiresParentalConsent(age, countryCode) {
  return Number(age) < getConsentAge(countryCode);
}

function getLeaderboardSegmentForAge(age) {
  return isMinorAge(age) ? 'kids' : 'adults';
}

function validateUserText(text, { allowEmpty = false } = {}) {
  if (text == null || text === '') {
    return allowEmpty ? { ok: true } : { ok: false, reason: 'EMPTY_TEXT' };
  }

  const value = String(text);
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(value)) {
      return { ok: false, reason: 'PII_DETECTED' };
    }
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(value)) {
      return { ok: false, reason: 'PROFANITY_DETECTED' };
    }
  }

  return { ok: true };
}

function validateUserTexts(fields) {
  for (const [field, value] of Object.entries(fields)) {
    const result = validateUserText(value, { allowEmpty: true });
    if (!result.ok) {
      return { ...result, field };
    }
  }
  return { ok: true };
}

function isAllowedPresetPhrase(value) {
  return PRESET_CHAT_PHRASES.has(String(value || '').trim());
}

function isEmojiOnly(value) {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  return /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\s*(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})){0,9}$/u.test(text);
}

module.exports = {
  PRESET_CHAT_PHRASES: [...PRESET_CHAT_PHRASES],
  getConsentAge,
  getLeaderboardSegmentForAge,
  isAllowedPresetPhrase,
  isEmojiOnly,
  isMinorAge,
  normalizeCountryCode,
  requiresParentalConsent,
  validateUserText,
  validateUserTexts,
};
