/**
 * VULNERABLE (CWE-391) - The audit write is never awaited. If it rejects the
 * process gets an unhandled rejection (a hard crash on Node >= 15), and the
 * caller has already returned 200 for a write that may not have happened.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function handleLogin(userId, ip) {
  pool.query('INSERT INTO login_audit (user_id, ip) VALUES ($1, $2)', [userId, ip]);
  return { ok: true };
}

module.exports = { handleLogin };
