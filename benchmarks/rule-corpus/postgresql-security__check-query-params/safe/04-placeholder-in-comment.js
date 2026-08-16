// A `$2` left behind in a comment when the clause it belonged to was removed.
const { Client } = require('pg');

const client = new Client();

async function activeSessions(userId) {
  return client.query(
    `
      SELECT id, started_at
        FROM sessions
       WHERE user_id = $1
         -- AND device_id = $2  (dropped when devices moved to their own table)
         /* also dropped: AND region = $3 */
    `,
    [userId],
  );
}

module.exports = { activeSessions };
