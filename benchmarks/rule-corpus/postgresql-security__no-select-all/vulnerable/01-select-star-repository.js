/**
 * VULNERABLE (CWE-1049) - The canonical `SELECT *`. A user repository that
 * ships every column of `users` over the wire, including the password hash and
 * whatever the next migration adds.
 */
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findUser(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}

module.exports = { findUser };
