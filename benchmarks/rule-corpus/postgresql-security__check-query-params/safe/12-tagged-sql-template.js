// Wave 2. postgres.js binds each interpolation itself; there is no values
// array to disagree with.
const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL);

async function find(id, orgId) {
  return sql`SELECT id, email FROM users WHERE id = ${id} AND org_id = ${orgId}`;
}

module.exports = { find };
