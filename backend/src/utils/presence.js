const pool = require('./db');

const ONLINE_WINDOW_MINUTES = 5;
const HEARTBEAT_THROTTLE_MINUTES = 2;

async function touchLastSeen(userUuid) {
  if (!userUuid) {
    return;
  }

  await pool.query(
    `UPDATE users
     SET last_seen = NOW()
     WHERE uuid = $1::uuid
       AND (last_seen IS NULL OR last_seen < NOW() - ($2 || ' minutes')::interval)`,
    [userUuid, String(HEARTBEAT_THROTTLE_MINUTES)]
  );
}

module.exports = {
  ONLINE_WINDOW_MINUTES,
  HEARTBEAT_THROTTLE_MINUTES,
  touchLastSeen,
};
