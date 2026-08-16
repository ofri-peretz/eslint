/**
 * VULNERABLE (CWE-400) - One statement in the `{ text, values }` config form.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function deleteToken(token) {
  const client = await pool.connect();
  try {
    await client.query({ text: 'DELETE FROM sessions WHERE token = $1', values: [token] });
  } finally {
    client.release();
  }
}

module.exports = { deleteToken };
