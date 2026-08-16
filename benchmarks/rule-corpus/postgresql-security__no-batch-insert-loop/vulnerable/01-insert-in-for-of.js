/**
 * VULNERABLE (CWE-1049) - The canonical batch importer: one INSERT round trip
 * per row. 50k rows is 50k sequential round trips.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function importUsers(records) {
  for (const record of records) {
    await pool.query('INSERT INTO users (email, name) VALUES ($1, $2)', [record.email, record.name]);
  }
}

module.exports = { importUsers };
