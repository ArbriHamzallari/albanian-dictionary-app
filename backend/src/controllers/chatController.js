const pool = require('../utils/db');
const {
  PRESET_CHAT_PHRASES,
  isAllowedPresetPhrase,
  isEmojiOnly,
  validateUserText,
} = require('../utils/childSafety');

async function getUserByUsername(username) {
  const result = await pool.query(
    `SELECT uuid, username, avatar_filename, is_minor
     FROM users
     WHERE username_normalized = $1 AND role = 'user'`,
    [String(username || '').trim().toLowerCase()]
  );
  return result.rows[0] || null;
}

async function areAcceptedFriends(firstUserUuid, secondUserUuid) {
  const result = await pool.query(
    `SELECT 1
     FROM friend_requests
     WHERE status = 'accepted'
       AND ((requester_id = $1::uuid AND recipient_id = $2::uuid)
         OR (requester_id = $2::uuid AND recipient_id = $1::uuid))
     LIMIT 1`,
    [firstUserUuid, secondUserUuid]
  );
  return result.rows.length > 0;
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

function validateMessageBody(messageType, body, involvesMinor) {
  const text = String(body || '').trim();
  if (!text || text.length > 280) {
    return { ok: false, message: 'Mesazhi është i pavlefshëm.' };
  }

  const textSafety = validateUserText(text);
  if (!textSafety.ok) {
    return { ok: false, message: 'Mesazhi përmban tekst të palejuar ose të dhëna personale.' };
  }

  if (messageType === 'preset') {
    return isAllowedPresetPhrase(text)
      ? { ok: true }
      : { ok: false, message: 'Përdorni një frazë të lejuar.' };
  }

  if (messageType === 'emoji') {
    return isEmojiOnly(text)
      ? { ok: true }
      : { ok: false, message: 'Përdorni vetëm emoji.' };
  }

  if (messageType === 'text' && !involvesMinor) {
    return { ok: true };
  }

  return { ok: false, message: 'Mesazhet me tekst të lirë nuk lejohen për fëmijë.' };
}

const listPresets = (req, res) => {
  return res.json({ phrases: PRESET_CHAT_PHRASES });
};

const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user.uuid;
    const { recipient_username: recipientUsername, message_type: messageType, body } = req.body;

    if (!recipientUsername || !['preset', 'emoji', 'text'].includes(messageType)) {
      return res.status(400).json({ message: 'Mesazhi është i pavlefshëm.' });
    }

    const [senderResult, recipient] = await Promise.all([
      pool.query(
        `SELECT uuid, username, is_minor
         FROM users
         WHERE uuid = $1::uuid AND role = 'user'`,
        [senderId]
      ),
      getUserByUsername(recipientUsername),
    ]);

    const sender = senderResult.rows[0];
    if (!sender || !recipient) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    if (sender.uuid === recipient.uuid) {
      return res.status(400).json({ message: 'Nuk mund t’i dërgoni mesazh vetes.' });
    }

    const involvesMinor = Boolean(sender.is_minor || recipient.is_minor);
    if (involvesMinor && sender.is_minor !== recipient.is_minor) {
      return res.status(403).json({ message: 'Mesazhet midis të rriturve dhe fëmijëve nuk lejohen.' });
    }
    if (!(await areAcceptedFriends(sender.uuid, recipient.uuid))) {
      return res.status(403).json({ message: 'Mesazhet lejohen vetëm mes miqve të pranuar.' });
    }
    if (await usersHaveBlock(sender.uuid, recipient.uuid)) {
      return res.status(403).json({ message: 'Nuk mund të dërgoni mesazh për këtë përdorues.' });
    }

    const validation = validateMessageBody(messageType, body, involvesMinor);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const result = await pool.query(
      `INSERT INTO chat_messages (sender_id, recipient_id, message_type, body)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       RETURNING id, message_type, body, created_at`,
      [sender.uuid, recipient.uuid, messageType, String(body).trim()]
    );

    return res.status(201).json({ message: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

const listMessages = async (req, res, next) => {
  try {
    const otherUser = await getUserByUsername(req.params.username);
    if (!otherUser) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const viewerResult = await pool.query(
      `SELECT is_minor FROM users WHERE uuid = $1::uuid AND role = 'user'`,
      [req.user.uuid]
    );
    const viewer = viewerResult.rows[0];
    if (!viewer || (viewer.is_minor || otherUser.is_minor) && viewer.is_minor !== otherUser.is_minor) {
      return res.status(403).json({ message: 'Biseda midis të rriturve dhe fëmijëve nuk lejohet.' });
    }

    if (!(await areAcceptedFriends(req.user.uuid, otherUser.uuid))) {
      return res.status(403).json({ message: 'Biseda lejohet vetëm mes miqve të pranuar.' });
    }
    if (await usersHaveBlock(req.user.uuid, otherUser.uuid)) {
      return res.status(403).json({ message: 'Biseda është e bllokuar.' });
    }

    const result = await pool.query(
      `SELECT
         id,
         CASE WHEN sender_id = $1::uuid THEN 'sent' ELSE 'received' END AS direction,
         message_type,
         body,
         created_at
       FROM chat_messages
       WHERE (sender_id = $1::uuid AND recipient_id = $2::uuid)
          OR (sender_id = $2::uuid AND recipient_id = $1::uuid)
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.uuid, otherUser.uuid]
    );

    return res.json({ messages: result.rows.reverse() });
  } catch (err) {
    return next(err);
  }
};

const blockUser = async (req, res, next) => {
  try {
    const target = await getUserByUsername(req.body.target_username);
    if (!target) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    if (target.uuid === req.user.uuid) {
      return res.status(400).json({ message: 'Nuk mund të bllokoni veten.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO user_blocks (blocker_id, blocked_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
        [req.user.uuid, target.uuid]
      );
      await client.query(
        `DELETE FROM friend_requests
         WHERE (requester_id = $1::uuid AND recipient_id = $2::uuid)
            OR (requester_id = $2::uuid AND recipient_id = $1::uuid)`,
        [req.user.uuid, target.uuid]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.json({ blocked: true });
  } catch (err) {
    return next(err);
  }
};

const reportUser = async (req, res, next) => {
  try {
    const { reported_username: reportedUsername, reason, details, surface = 'chat', target_id: targetId } = req.body;
    if (targetId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
      return res.status(400).json({ message: 'Raportimi është i pavlefshëm.' });
    }

    const reported = await getUserByUsername(reportedUsername);
    if (!reported) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const reasonSafety = validateUserText(reason, { allowEmpty: false });
    const detailsSafety = validateUserText(details, { allowEmpty: true });
    if (!reasonSafety.ok || !detailsSafety.ok) {
      return res.status(400).json({ message: 'Raportimi përmban tekst të palejuar ose të dhëna personale.' });
    }

    const result = await pool.query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, surface, target_id, reason, details)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6)
       RETURNING id, created_at`,
      [
        req.user.uuid,
        reported.uuid,
        String(surface || 'chat').slice(0, 30),
        targetId || null,
        String(reason || 'safety').slice(0, 50),
        details ? String(details).trim() : null,
      ]
    );

    return res.status(201).json({ report: result.rows[0] });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  blockUser,
  listMessages,
  listPresets,
  reportUser,
  sendMessage,
};
