const crypto = require('crypto');

// Single source of truth for erasing a user, shared by admin deletion and
// self-service GDPR erasure. Every foreign key that references users(uuid) — and
// the legacy users(id) keys re-pointed in migration 017 — is declared either
// ON DELETE CASCADE or ON DELETE SET NULL, so one DELETE does the full job:
//   CASCADE (owned data, removed): user_stats, user_profiles, quiz_sessions,
//     friends, chat_messages, entitlements, league/streak/quest rows,
//     user_achievements, curriculum progress, user_blocks.
//   SET NULL (retained but anonymised): admin_audit_log, moderation_events,
//     user_reports, word_suggestions.submitted_by/reviewed_by, words.added_by,
//     search_logs.user_id.
// No FK to users blocks deletion, so this never needs an explicit ordering.
// Accepts a pool or an in-transaction client so callers control atomicity.
async function deleteUserData(db, uuid) {
  const result = await db.query(
    'DELETE FROM users WHERE uuid = $1::uuid RETURNING uuid, email',
    [uuid],
  );
  return result.rows[0] || null;
}

// One-way pseudonymous identifier for the deletion tombstone kept in
// admin_audit_log — the audit trail is itself a legal record, but must hold no
// recoverable PII for an erased user.
function hashUserIdentifier(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = { deleteUserData, hashUserIdentifier };
