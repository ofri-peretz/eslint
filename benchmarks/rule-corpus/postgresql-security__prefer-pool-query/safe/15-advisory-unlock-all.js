/**
 * SAFE - Another member of the advisory-lock family. These are ordinary
 * SELECTs, so a leading-keyword test cannot see them; the connection affinity
 * lives in the function being called.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function releaseAllLocks() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_unlock_all()');
  } finally {
    client.release();
  }
}

module.exports = { releaseAllLocks };
