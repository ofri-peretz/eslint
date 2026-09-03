// Wave 2. A column list in parentheses sits between the verb and the
// direction keyword, and the source is PROGRAM rather than a path.
const { Pool } = require('pg');

const pool = new Pool();

async function ingest(remote) {
  await pool.query(`COPY feed (ts, payload) FROM PROGRAM 'curl -s ${remote}' CSV`);
}

module.exports = { ingest };
