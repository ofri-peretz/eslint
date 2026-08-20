// Wave 2. A surplus that arrived the ordinary way: the `role = $3` clause was
// deleted and the third value was left behind. PostgreSQL answers "bind
// message supplies 3 parameters, but prepared statement requires 2".
const { Pool } = require('pg');

const pool = new Pool();

async function findMember(orgId, email, role) {
  const { rows } = await pool.query(
    'SELECT id FROM members WHERE org_id = $1 AND email = $2',
    [orgId, email, role],
  );
  return rows[0];
}

module.exports = { findMember };
