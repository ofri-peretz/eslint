/**
 * SAFE - A transaction opened with padding and lowercase keywords, and closed
 * from a helper. Exactly one `client.query` call site; the statement is what
 * decides, not the count.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function openTransaction() {
  const client = await pool.connect();
  try {
    await client.query('   begin isolation level serializable  ');
  } finally {
    client.release();
  }
}

module.exports = { openTransaction };
