const pool = require('../utils/db');

// ── GET /api/notifications ──────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const result = await pool.query(
      `SELECT
         fr.id        AS request_id,
         u.uuid       AS sender_uuid,
         u.username    AS sender_username,
         u.avatar_filename AS sender_avatar,
         fr.created_at
       FROM friend_requests fr
       JOIN users u ON u.uuid = fr.requester_id
       WHERE fr.recipient_id = $1::uuid
         AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userUuid]
    );

    return res.json({
      friendRequests: result.rows.map((r) => ({
        requestId: r.request_id,
        senderUuid: r.sender_uuid,
        senderUsername: r.sender_username,
        senderAvatar: r.sender_avatar,
        createdAt: r.created_at,
      })),
      unreadCount: result.rows.length,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getNotifications };
