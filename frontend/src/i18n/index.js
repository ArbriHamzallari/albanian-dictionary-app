import sq from './sq.json';

// Tiny, dependency-free i18n. Albanian-only (sq) for v1 — the product is
// Albanian-first (see CLAUDE.md). Every user-facing string lives in sq.json so a
// fluent reviewer can correct the copy by editing JSON alone — no code changes.
//
// Keys are dot-paths resolved against sq.json (e.g. t('auth.login.title')).
// Optional interpolation: t('quiz.progress', { current: 2, total: 10 }) replaces
// {current}/{total} placeholders. A missing key returns the key itself (and warns
// in dev) so the UI never goes blank and gaps are obvious during the copy review.

function resolve(key) {
  return key.split('.').reduce(
    (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
    sq,
  );
}

export function t(key, params) {
  const value = resolve(key);
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export default t;
