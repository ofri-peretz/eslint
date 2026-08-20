// Wave 2. String.raw around a statement whose placeholders outnumber its
// values.
const { Pool } = require('pg');

const pool = new Pool();

async function find(id) {
  return pool.query(String.raw`SELECT * FROM users WHERE id = $1 AND org_id = $2`, [id]);
}

module.exports = { find };
