// A service that reads from PostgreSQL and writes to a legacy MySQL replica.
// The MySQL statement uses `?` placeholders, so it carries no evidence of a
// PostgreSQL bind at all — counting `$n` against its values array would report
// a mismatch that does not exist.
const { Pool } = require('pg');
const mysql = require('mysql2/promise');

const pg = new Pool();
const legacy = mysql.createPool({ host: process.env.LEGACY_HOST });

async function mirror(id) {
  const { rows } = await pg.query('SELECT id, email FROM users WHERE id = $1', [id]);
  await legacy.query('UPDATE users SET email = ? WHERE id = ?', [rows[0].email, id]);
}

module.exports = { mirror };
