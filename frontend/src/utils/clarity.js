import Clarity from '@microsoft/clarity';

export const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';

let initialized = false;

export function initClarity() {
  if (!CLARITY_PROJECT_ID || initialized) return false;
  Clarity.init(CLARITY_PROJECT_ID);
  initialized = true;
  return true;
}

export function isClarityReady() {
  return initialized;
}

/** Call on each route change; uses profile uuid (hashed client-side by Clarity). */
export function identifyClarityUser(profile, pageId) {
  if (!initialized || !profile?.uuid) return;
  Clarity.identify(profile.uuid, undefined, pageId, profile.username || undefined);
}

export function setClarityTags(tags) {
  if (!initialized) return;
  for (const [key, value] of Object.entries(tags)) {
    if (value != null && value !== '') {
      Clarity.setTag(key, String(value));
    }
  }
}

export function trackClarityEvent(eventName) {
  if (!initialized || !eventName) return;
  Clarity.event(eventName);
}

/** Use when Clarity project requires cookie consent (analytics only, no ads). */
export function grantClarityConsent() {
  if (!initialized) return;
  Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: 'granted' });
}
