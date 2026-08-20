// The array is spread from a variable, so its length is not knowable at lint
// time. Guessing a count here would report on evidence the file does not have.
const { Pool } = require('pg');

const pool = new Pool();

async function byIds(ids, orgId) {
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  return pool.query(
    `SELECT id, email FROM users WHERE org_id = $1 AND id IN (${placeholders})`,
    [orgId, ...ids],
  );
}

module.exports = { byIds };
