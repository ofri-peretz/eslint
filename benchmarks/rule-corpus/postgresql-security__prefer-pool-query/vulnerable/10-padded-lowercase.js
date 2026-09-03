/**
 * VULNERABLE (CWE-400) - Leading newlines and lowercase keywords. Neither the
 * detection nor the session-affinity guard may be decided by formatting.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function settingsFor(tenant) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('\n\n   select key, value from settings where tenant = $1\n', [tenant]);
    return rows;
  } finally {
    client.release();
  }
}

module.exports = { settingsFor };
