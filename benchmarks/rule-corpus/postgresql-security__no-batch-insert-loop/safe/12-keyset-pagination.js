/**
 * SAFE - Keyset pagination: a LIMIT with no OFFSET, under a `while`. A `while`
 * iterates a CONDITION, not a collection, so it cannot be N+1 over rows in the
 * first place, and each statement returns a page rather than a row.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function* stream() {
  let lastId = 0;
  while (true) {
    const { rows } = await pool.query(
      'SELECT id, email FROM users WHERE id > $1 ORDER BY id LIMIT $2',
      [lastId, 500],
    );
    if (rows.length === 0) return;
    lastId = rows[rows.length - 1].id;
    yield rows;
  }
}

module.exports = { stream };
