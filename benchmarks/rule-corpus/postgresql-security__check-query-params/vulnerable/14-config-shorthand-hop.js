// Wave 2. Shorthand properties whose bindings are declared above, and the
// whole config object reached through one more hop.
const { Pool } = require('pg');

const pool = new Pool();

async function report(from, to, orgId) {
  const text = 'SELECT count(*) FROM sessions WHERE started_at >= $1 AND ended_at <= $2 AND org_id = $3';
  const values = [from, to];
  const config = { text, values };
  return pool.query(config);
}

module.exports = { report };
