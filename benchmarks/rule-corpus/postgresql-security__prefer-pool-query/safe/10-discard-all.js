/**
 * SAFE - Exactly one query call, and it is session state. `DISCARD ALL` resets
 * the CONNECTION it runs on; issued through `pool.query()` it would reset an
 * arbitrary backend chosen by the pool, which is not what this maintenance
 * helper is for.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function resetSession() {
  const client = await pool.connect();
  try {
    await client.query('DISCARD ALL');
  } finally {
    client.release();
  }
}

module.exports = { resetSession };
