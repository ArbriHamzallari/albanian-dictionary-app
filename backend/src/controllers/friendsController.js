const pool = require('../utils/db');

async function getUserSafetyProfile(userUuid) {
  const result = await pool.query(
    `SELECT uuid, username, avatar_filename, is_minor, profile_private,
            parental_consent_required, parental_consent_given
     FROM users
     WHERE uuid = $1::uuid AND role = 'user'`,
    [userUuid]
  );
  return result.rows[0] || null;
}

// SAFE-2: an account that owes parental consent is restricted — it may not enter the
// social graph in either direction until the parent approves. Consent can also be
// withdrawn after the fact (POST /auth/withdraw-consent), so an account can re-enter
// this state while it already has friends and pending requests.
function awaitsParentalConsent(user) {
  return Boolean(user.parental_consent_required && !user.parental_consent_given);
}

async function usersHaveBlock(firstUserUuid, secondUserUuid) {
  const result = await pool.query(
    `SELECT 1
     FROM user_blocks
     WHERE (blocker_id = $1::uuid AND blocked_id = $2::uuid)
        OR (blocker_id = $2::uuid AND blocked_id = $1::uuid)
     LIMIT 1`,
    [firstUserUuid, secondUserUuid]
  );
  return result.rows.length > 0;
}

const sendRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.uuid;
    const { recipient_username: recipientUsername } = req.body;

    if (!recipientUsername || typeof recipientUsername !== 'string') {
      return res.status(400).json({ message: 'Emri i përdoruesit mungon.' });
    }

    const requester = await getUserSafetyProfile(requesterId);
    if (!requester) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    // Judged on the requester's own state only, so it leaks nothing about anyone else
    // and can run before the recipient is even looked up.
    if (awaitsParentalConsent(requester)) {
      return res.status(403).json({
        message: 'Llogaria është në pritje të pëlqimit të prindit.',
        code: 'PARENTAL_CONSENT_PENDING',
      });
    }

    const recipientResult = await pool.query(
      `SELECT uuid, username, avatar_filename, is_minor, profile_private,
              parental_consent_required, parental_consent_given
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

    if (requester.is_minor !== recipient.is_minor) {
      return res.status(403).json({ message: 'Miqësitë midis të rriturve dhe fëmijëve nuk lejohen.' });
    }

    // A restricted recipient is indistinguishable from a missing one — same status and
    // body as the lookup miss above, so this never confirms the account exists.
    if (awaitsParentalConsent(recipient)) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    // DECISION-1(b) / FRIENDS-1: minors may friend each other by exact username. Their
    // profiles stay private everywhere else (browse, public profile, search) — this is
    // the single exact-username way in, and it reveals nothing a username guess did not
    // already reveal, because the response shapes here are unchanged. Free-text DMs stay
    // impossible for them regardless: chatController.validateMessageBody only returns ok
    // for `text` when involvesMinor === false, and involvesMinor is true if EITHER party
    // is a minor, so a minor pair is preset/emoji-only.
    // Both flags are checked explicitly rather than leaning on the is_minor equality
    // guard above, so reordering these guards later cannot silently widen this.
    const bothMinors = requester.is_minor && recipient.is_minor;
    if (recipient.profile_private && !bothMinors) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    if (await usersHaveBlock(requesterId, recipient.uuid)) {
      return res.status(403).json({ message: 'Nuk mund të dërgoni kërkesë për këtë përdorues.' });
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

    // Consent can be withdrawn after requests already exist, so the restricted state has
    // to be re-checked here and not just at send time: accepting is what actually opens
    // the chat path, and it is an action by the restricted account, hence 403 like send.
    const accepter = await getUserSafetyProfile(userUuid);
    if (!accepter) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    if (awaitsParentalConsent(accepter)) {
      return res.status(403).json({
        message: 'Llogaria është në pritje të pëlqimit të prindit.',
        code: 'PARENTAL_CONSENT_PENDING',
      });
    }

    const pendingResult = await pool.query(
      `SELECT requester_id
       FROM friend_requests
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'`,
      [requestId, userUuid]
    );

    if (!pendingResult.rows.length) {
      return res.status(404).json({ message: 'Kërkesa nuk u gjet.' });
    }

    if (await usersHaveBlock(userUuid, pendingResult.rows[0].requester_id)) {
      return res.status(403).json({ message: 'Nuk mund të pranoni këtë kërkesë.' });
    }

    const result = await pool.query(
      `UPDATE friend_requests fr
       SET status = 'accepted', responded_at = NOW()
       FROM users requester, users recipient
       WHERE fr.id = $1
         AND fr.recipient_id = $2
         AND fr.status = 'pending'
         AND requester.uuid = fr.requester_id
         AND recipient.uuid = fr.recipient_id
         AND requester.is_minor = recipient.is_minor
       RETURNING fr.id, fr.requester_id, fr.recipient_id, fr.status, fr.responded_at`,
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
         AND NOT EXISTS (
           SELECT 1
           FROM user_blocks ub
           WHERE (ub.blocker_id = $1 AND ub.blocked_id = u.uuid)
              OR (ub.blocker_id = u.uuid AND ub.blocked_id = $1)
         )
       ORDER BY fr.created_at DESC`,
      [userUuid]
    );

    const outgoingResult = await pool.query(
      `SELECT fr.id, fr.created_at, u.uuid, u.username, u.avatar_filename
       FROM friend_requests fr
       JOIN users u ON u.uuid = fr.recipient_id
       WHERE fr.requester_id = $1 AND fr.status = 'pending'
         AND NOT EXISTS (
           SELECT 1
           FROM user_blocks ub
           WHERE (ub.blocker_id = $1 AND ub.blocked_id = u.uuid)
              OR (ub.blocker_id = u.uuid AND ub.blocked_id = $1)
         )
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
         AND NOT EXISTS (
           SELECT 1
           FROM user_blocks ub
           WHERE (ub.blocker_id = $1 AND ub.blocked_id = u.uuid)
              OR (ub.blocker_id = u.uuid AND ub.blocked_id = $1)
         )
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
