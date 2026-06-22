const pool = require('../utils/db');

// Append-only admin audit logging. Best-effort: a logging failure is recorded to
// the server console (no PII) but never breaks the underlying admin action.
// admin_user_id, ip, and user_agent come from the authenticated request.
async function logAdminAction(req, { action, targetType = null, targetId = null, metadata = null }) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log
         (admin_user_id, action, target_type, target_id, metadata, ip, user_agent)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6, $7)`,
      [
        req.user?.uuid || null,
        action,
        targetType,
        targetId != null ? String(targetId) : null,
        metadata != null ? JSON.stringify(metadata) : null,
        req.ip || null,
        req.get ? (req.get('user-agent') || null) : null,
      ]
    );
  } catch (err) {
    // Do not leak PII; reference the admin by UUID only.
    console.error('[admin_audit_log_failed]', { action, admin: req.user?.uuid, error: err.message });
  }
}

module.exports = { logAdminAction };
