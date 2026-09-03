/**
 * VULNERABLE (CWE-391) - Assigned to a binding that is never read. Storing a
 * promise in a variable only handles it if something later awaits or chains
 * that variable; here nothing does, so it floats exactly as if the assignment
 * were not there.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function rotate(token) {
  const pending = pool.query('UPDATE sessions SET rotated_at = now() WHERE token = $1', [token]);
  return { rotated: true };
}

module.exports = { rotate };
