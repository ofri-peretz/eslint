/**
 * SAFE - The remediation: an explicit column list. The query decides what it
 * fetches, so a new column does not change what crosses the wire.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function findUser(id) {
  const { rows } = await pool.query(
    'SELECT id, email, display_name, created_at FROM users WHERE id = $1',
    [id],
  );
  return rows[0];
}

module.exports = { findUser };
