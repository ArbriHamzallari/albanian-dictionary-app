const pool = require('../utils/db');

const sendRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.uuid;
    const { recipient_username: recipientUsername } = req.body;

    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return res.status(400).json({ message: 'Emri i përdoruesit mungon.' });
    }

    const recipientResult = await pool.query(
      `SELECT uuid, username, avatar_filename
       FROM users
       WHERE username_normalized = $1 AND role = 'user'`,
      [recipientUsername.trim().toLowerCase()]
    );

    if (!recipientResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const recipient = recipientResult.rows[0];
    if (recipient.uuid === requesterId) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni kërkesë vetes.' });
    }

    const existing = await pool.query(
      `SELECT id, status, requester_id, recipient_id
       FROM friend_requests
       WHERE (requester_id = $1 AND recipient_id = $2)
          OR (requester_id = $2 AND recipient_id = $1)
       ORDER BY created_at DESC
       LIMIT 1`,
      [requesterId, recipient.uuid]
    );

    if (existing.rows.length) {
      const row = existing.rows[0];
      if (row.status === 'accepted') {
        return res.status(409).json({ message: 'Ju jeni tashmë miq.' });
      }
      if (row.status === 'pending') {
        if (row.requester_id === requesterId) {
          return res.status(409).json({ message: 'Kërkesa është dërguar tashmë.' });
        }
        return res.status(409).json({ message: 'Kërkesa ekziston nga ky përdorues.' });
      }
      // Re-open declined request
      const updated = await pool.query(
        `UPDATE friend_requests
         SET requester_id = $1, recipient_id = $2, status = 'pending',
             created_at = NOW(), responded_at = NULL
         WHERE id = $3
         RETURNING id, requester_id, recipient_id, status, created_at`,
        [requesterId, recipient.uuid, row.id]
      );
      return res.status(201).json({ request: updated.rows[0] });
    }

    const insert = await pool.query(
      `INSERT INTO friend_requests (requester_id, recipient_id)
       VALUES ($1, $2)
       RETURNING id, requester_id, recipient_id, status, created_at`,
      [requesterId, recipient.uuid]
    );

    return res.status(201).json({ request: insert.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const acceptRequest = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;
    const { request_id: requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ message: 'Kërkesa mungon.' });
    }

    const result = await pool.query(
      `UPDATE friend_requests
       SET status = 'accepted', responded_at = NOW()
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'
       RETURNING id, requester_id, recipient_id, status, responded_at`,
      [requestId, userUuid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Kërkesa nuk u gjet.' });
    }

    return res.json({ request: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const declineRequest = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;
    const { request_id: requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ message: 'Kërkesa mungon.' });
    }

    const result = await pool.query(
      `UPDATE friend_requests
       SET status = 'declined', responded_at = NOW()
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'
       RETURNING id, requester_id, recipient_id, status, responded_at`,
      [requestId, userUuid]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Kërkesa nuk u gjet.' });
    }

    return res.json({ request: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const cancelRequest = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;
    const { request_id: requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ message: 'Kërkesa mungon.' });
    }

    const result = await pool.query(
      `DELETE FROM friend_requests
       WHERE id = $1 AND requester_id = $2 AND status = 'pending'`,
      [requestId, userUuid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Kërkesa nuk u gjet.' });
    }

    return res.json({ cancelled: true });
  } catch (err) {
    return next(err);
  }
};

const listRequests = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const incomingResult = await pool.query(
      `SELECT fr.id, fr.created_at, u.uuid, u.username, u.avatar_filename
       FROM friend_requests fr
       JOIN users u ON u.uuid = fr.requester_id
       WHERE fr.recipient_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userUuid]
    );

    const outgoingResult = await pool.query(
      `SELECT fr.id, fr.created_at, u.uuid, u.username, u.avatar_filename
       FROM friend_requests fr
       JOIN users u ON u.uuid = fr.recipient_id
       WHERE fr.requester_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC`,
      [userUuid]
    );

    return res.json({
      incoming: incomingResult.rows,
      outgoing: outgoingResult.rows,
    });
  } catch (err) {
    return next(err);
  }
};

const listFriends = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;

    const friendsResult = await pool.query(
      `SELECT u.uuid, u.username, u.avatar_filename, s.xp, s.level, s.streak
       FROM friend_requests fr
       JOIN users u ON u.uuid = CASE
         WHEN fr.requester_id = $1 THEN fr.recipient_id
         ELSE fr.requester_id
       END
       LEFT JOIN user_stats s ON s.user_id = u.uuid
       WHERE (fr.requester_id = $1 OR fr.recipient_id = $1)
         AND fr.status = 'accepted'
       ORDER BY u.username ASC`,
      [userUuid]
    );

    return res.json({ friends: friendsResult.rows });
  } catch (err) {
    return next(err);
  }
};

const removeFriend = async (req, res, next) => {
  try {
    const userUuid = req.user.uuid;
    const { target_username: targetUsername } = req.body;

    if (!targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({ message: 'Emri i përdoruesit mungon.' });
    }

    const targetResult = await pool.query(
      `SELECT uuid FROM users WHERE username_normalized = $1 AND role = 'user'`,
      [targetUsername.trim().toLowerCase()]
    );

    if (!targetResult.rows.length) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const targetUuid = targetResult.rows[0].uuid;
    if (targetUuid === userUuid) {
      return res.status(400).json({ message: 'Nuk mund të hiqni vetën.' });
    }

    const result = await pool.query(
      `DELETE FROM friend_requests
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND recipient_id = $2)
           OR (requester_id = $2 AND recipient_id = $1))`,
      [userUuid, targetUuid]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Nuk jeni miq.' });
    }

    return res.json({ removed: true });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  listRequests,
  listFriends,
  removeFriend,
};
