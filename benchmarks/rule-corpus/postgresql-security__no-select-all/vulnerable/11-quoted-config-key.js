/**
 * VULNERABLE (CWE-1049) - The config object with a QUOTED key. `{ 'text': … }`
 * and `{ text: … }` are the same object.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function everything() {
  const { rows } = await pool.query({ 'text': 'SELECT * FROM settings' });
  return rows;
}

module.exports = { everything };
