const pool = require('../utils/db');
const { adminUserUpdateSchema } = require('../utils/validation');
const { entitlementIsPremium } = require('../middleware/entitlements');
const { logAdminAction } = require('../utils/auditLog');
const { deleteUserData } = require('../utils/deleteUser');

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// Shapes the entitlement columns into the read-only subscription mirror the admin
// UI shows. Paddle stays the source of truth (webhooks); admin never writes it.
function subscriptionFromRow(row) {
  return {
    provider: row.paddle_subscription_id ? 'paddle' : null,
    tier: row.tier || 'free',
    status: row.status || 'free',
    current_period_end: row.current_period_end || null,
    paddle_subscription_id: row.paddle_subscription_id || null,
    paddle_customer_id: row.paddle_customer_id || null,
    complimentary_until: row.complimentary_until || null,
    is_premium: entitlementIsPremium(row),
  };
}

// GET /api/admin/users — paginated, searchable by email/username.
const listUsers = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * pageSize;
    const like = `%${q}%`;

    const where = q ? 'WHERE u.email ILIKE $1 OR u.username ILIKE $1' : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM users u ${where}`,
      q ? [like] : []
    );
    const total = countResult.rows[0].total;

    const params = q ? [like, pageSize, offset] : [pageSize, offset];
    const limitIdx = q ? 2 : 1;
    const usersResult = await pool.query(
      `SELECT u.uuid, u.email, u.username, u.role, u.avatar_filename,
              u.is_suspended, u.is_minor, u.created_at, u.last_login,
              u.complimentary_until,
              e.tier, e.status, e.current_period_end,
              e.paddle_subscription_id, e.paddle_customer_id
       FROM users u
       LEFT JOIN entitlements e ON e.user_id = u.uuid
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      params
    );

    const users = usersResult.rows.map((u) => ({
      uuid: u.uuid,
      email: u.email,
      username: u.username,
      role: u.role,
      avatar_filename: u.avatar_filename,
      is_suspended: u.is_suspended,
      is_minor: u.is_minor,
      created_at: u.created_at,
      last_login: u.last_login,
      is_premium: entitlementIsPremium(u),
    }));

    return res.json({ users, total, page, pageSize });
  } catch (err) {
    return next(err);
  }
};

// GET /api/admin/users/:uuid — single user with stats, subscription, login history.
const getUser = async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const userResult = await pool.query(
      `SELECT u.uuid, u.email, u.username, u.full_name, u.role, u.avatar_filename,
              u.bio, u.favorite_word, u.age, u.country_code, u.is_minor,
              u.profile_private, u.leaderboard_opt_out, u.leaderboard_segment,
              u.auth_provider, u.email_verified, u.is_suspended,
              u.complimentary_until, u.created_at, u.last_login, u.last_seen,
              e.tier, e.status, e.current_period_end,
              e.paddle_subscription_id, e.paddle_customer_id
       FROM users u
       LEFT JOIN entitlements e ON e.user_id = u.uuid
       WHERE u.uuid = $1::uuid`,
      [uuid]
    );
    if (!userResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const row = userResult.rows[0];

    const statsResult = await pool.query(
      'SELECT * FROM user_stats WHERE user_id = $1::uuid',
      [uuid]
    );

    const loginEventsResult = await pool.query(
      `SELECT id, ip, user_agent, created_at
       FROM login_events
       WHERE user_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 20`,
      [uuid]
    );

    return res.json({
      user: {
        uuid: row.uuid,
        email: row.email,
        username: row.username,
        full_name: row.full_name,
        role: row.role,
        avatar_filename: row.avatar_filename,
        bio: row.bio,
        favorite_word: row.favorite_word,
        age: row.age,
        country_code: row.country_code,
        is_minor: row.is_minor,
        profile_private: row.profile_private,
        leaderboard_opt_out: row.leaderboard_opt_out,
        leaderboard_segment: row.leaderboard_segment,
        auth_provider: row.auth_provider,
        email_verified: row.email_verified,
        is_suspended: row.is_suspended,
        created_at: row.created_at,
        last_login: row.last_login,
        last_seen: row.last_seen,
      },
      stats: statsResult.rows[0] || null,
      subscription: subscriptionFromRow(row),
      loginEvents: loginEventsResult.rows,
    });
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/admin/users/:uuid — update role, username, avatar_filename, is_suspended.
const updateUser = async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { error, value } = adminUserUpdateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Të dhënat e përdoruesit janë të pavlefshme.' });
    }

    // Guard against self-lockout: an admin cannot suspend or demote their own account.
    if (uuid === req.user.uuid) {
      if (value.is_suspended === true || value.role === 'user') {
        return res.status(400).json({ message: 'Nuk mund ta pezulloni ose t\'i hiqni vetes të drejtat e adminit.' });
      }
    }

    const sets = [];
    const params = [];
    let idx = 1;
    if (value.role !== undefined) {
      sets.push(`role = $${idx++}`);
      params.push(value.role);
    }
    if (value.username !== undefined) {
      sets.push(`username = $${idx++}`);
      params.push(value.username);
      sets.push(`username_normalized = $${idx++}`);
      params.push(value.username.toLowerCase());
    }
    if (value.avatar_filename !== undefined) {
      sets.push(`avatar_filename = $${idx++}`);
      params.push(value.avatar_filename);
    }
    if (value.is_suspended !== undefined) {
      sets.push(`is_suspended = $${idx++}`);
      params.push(value.is_suspended);
    }
    sets.push('updated_at = NOW()');
    params.push(uuid);

    let result;
    try {
      result = await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE uuid = $${idx}::uuid RETURNING uuid`,
        params
      );
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Ky emër përdoruesi është i zënë.' });
      }
      throw err;
    }

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    await logAdminAction(req, {
      action: 'user.update',
      targetType: 'user',
      targetId: uuid,
      metadata: value,
    });
    return res.json({ message: 'Përdoruesi u përditësua.' });
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/admin/users/:uuid — hard delete (child rows cascade / set null via FKs).
const deleteUser = async (req, res, next) => {
  try {
    const { uuid } = req.params;

    if (uuid === req.user.uuid) {
      return res.status(400).json({ message: 'Nuk mund të fshini llogarinë tuaj.' });
    }

    const deleted = await deleteUserData(pool, uuid);
    if (!deleted) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    await logAdminAction(req, {
      action: 'user.delete',
      targetType: 'user',
      targetId: uuid,
    });
    return res.json({ message: 'Përdoruesi u fshi.' });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/users/:uuid/grant-complimentary — 30 days of free premium.
const grantComplimentary = async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const result = await pool.query(
      `UPDATE users
       SET complimentary_until = now() + interval '30 days', updated_at = NOW()
       WHERE uuid = $1::uuid
       RETURNING complimentary_until`,
      [uuid]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    await logAdminAction(req, {
      action: 'user.grant_complimentary',
      targetType: 'user',
      targetId: uuid,
      metadata: { complimentary_until: result.rows[0].complimentary_until },
    });
    return res.json({ complimentary_until: result.rows[0].complimentary_until });
  } catch (err) {
    return next(err);
  }
};

// GET /api/admin/moderation-events — auto-moderation trail for Trust & Safety
// (INF-3). Open events first, newest first. Includes the sender's suspension
// state so the UI can show a one-click ban/unban via PATCH /users/:uuid.
const listModerationEvents = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT m.id, m.reason, m.excerpt, m.status, m.created_at,
              m.sender_id, m.recipient_id,
              s.username AS sender_username, s.is_suspended AS sender_suspended,
              r.username AS recipient_username
       FROM moderation_events m
       LEFT JOIN users s ON s.uuid = m.sender_id
       LEFT JOIN users r ON r.uuid = m.recipient_id
       ORDER BY (m.status = 'open') DESC, m.created_at DESC
       LIMIT 100`
    );
    return res.json({ events: result.rows });
  } catch (err) {
    return next(err);
  }
};

// POST /api/admin/moderation-events/:id/resolve — mark an event handled.
const resolveModerationEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE moderation_events SET status = 'resolved' WHERE id = $1::uuid RETURNING id`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Ngjarja nuk u gjet.' });
    }
    await logAdminAction(req, {
      action: 'moderation_event.resolve',
      targetType: 'moderation_event',
      targetId: id,
    });
    return res.json({ message: 'Ngjarja u zgjidh.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  grantComplimentary,
  listModerationEvents,
  resolveModerationEvent,
};
