// Wave 2. The allowlist check exists, but it runs AFTER the statement. A guard
// that cannot stop the call is not a guard.
const { Pool } = require('pg');

const pool = new Pool();
const ALLOWED = new Set(['reporting', 'billing']);

async function scope(schema) {
  await pool.query(`SET search_path TO ${schema}`);
  if (!ALLOWED.has(schema)) {
    throw new Error('unknown schema');
  }
}

module.exports = { scope };
