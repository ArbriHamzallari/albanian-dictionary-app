'use strict';

// Email templates are plain functions — no templating engine (root CLAUDE.md: one way,
// minimal deps, same spirit as avoiding a template dependency). Each returns
// { subject, html, text } ready to spread into sendEmail().
//
// User-facing Albanian copy is NOT written here. Every human-readable string is a
// TODO_SQ_ placeholder to be produced by ChatGPT and reviewed by Arbri, then wired in
// (see CLAUDE.md "Who writes what"). Interpolated values (URLs, names) are escaped so
// they cannot break the HTML.
//
// NOTE: the TODO_SQ_email_* values are LITERAL placeholder strings — the backend has no
// i18n runtime to resolve them — and must be replaced with Arbri-approved Albanian copy
// before any email is sent to a real parent.

/** Escape a value for safe interpolation into an HTML body. */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parental-consent request email. SAFE-1 is the prerequisite mailer; the endpoint that
 * generates `consentUrl` and sends this lands in a later task (no endpoint here).
 * @param {object} params
 * @param {string} params.consentUrl unique link the parent opens to approve the account
 * @returns {{ subject: string, html: string, text: string }}
 */
function parentalConsentEmail({ consentUrl } = {}) {
  if (!consentUrl) throw new Error('parentalConsentEmail: consentUrl is required');
  const safeUrl = escapeHtml(consentUrl);
  return {
    subject: 'Fëmija juaj dëshiron t\'i bashkohet Fjalingos',
    html:
      `<p>Fëmija juaj ka kërkuar të krijojë një llogari në Fjalingo. Për ta aktivizuar, na nevojitet miratimi juaj. Fjalingo i ndihmon shqiptarët të rikthejnë në përdorim fjalët shqipe përmes lojës, fjalë pas fjale. Nëse jeni dakord, klikoni butonin më poshtë për të miratuar llogarinë.</p>` +
      `<p><a href="${safeUrl}">Mirato llogarinë</a></p>`,
    text: `Fëmija juaj ka kërkuar të krijojë një llogari në Fjalingo. Për ta aktivizuar, na nevojitet miratimi juaj. Fjalingo i ndihmon shqiptarët të rikthejnë në përdorim fjalët shqipe përmes lojës, fjalë pas fjale. Nëse jeni dakord, klikoni lidhjen më poshtë për të miratuar llogarinë.\n\n${consentUrl}`,
  };
}

module.exports = { escapeHtml, parentalConsentEmail };
