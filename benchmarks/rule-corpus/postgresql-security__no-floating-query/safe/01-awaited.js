/**
 * SAFE - Awaited, the ordinary case. The rejection lands in the caller.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function handleLogin(userId, ip) {
  await pool.query('INSERT INTO login_audit (user_id, ip) VALUES ($1, $2)', [userId, ip]);
  return { ok: true };
}

module.exports = { handleLogin };
