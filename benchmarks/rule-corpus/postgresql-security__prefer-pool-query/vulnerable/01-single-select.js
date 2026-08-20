/**
 * VULNERABLE (CWE-400) - A manual checkout for one statement. `pool.query()`
 * does exactly this and cannot leak the connection; doing it by hand costs a
 * pool slot for the whole function and one missed `release()` away from
 * exhausting the pool.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function findUser(id) {
  const client = await pool.connect();
  const { rows } = await client.query('SELECT id, email FROM users WHERE id = $1', [id]);
  client.release();
  return rows[0];
}

module.exports = { findUser };
