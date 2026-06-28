const pool = require('../utils/db');

// Records a successful sign-in (password or Google) for the admin user-detail
// login history. Best-effort: a logging failure is recorded to the console
// (UUID only, no PII) but never blocks the user from signing in.
async function recordLoginEvent(userUuid, req) {
  try {
    await pool.query(
      `INSERT INTO login_events (user_id, ip, user_agent)
       VALUES ($1::uuid, $2, $3)`,
      [userUuid, req.ip || null, req.get ? (req.get('user-agent') || null) : null]
    );
  } catch (err) {
    console.error('[login_event_failed]', { user: userUuid, error: err.message });
  }
}

module.exports = { recordLoginEvent };
