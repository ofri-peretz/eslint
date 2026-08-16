// Wave 2. The values array is rebuilt conditionally, so the binding is written
// more than once and its length at the sink is not knowable.
const { Pool } = require('pg');

const pool = new Pool();

async function search(term, orgId) {
  let params = [orgId];
  if (term) {
    params = [orgId, term, `%${term}%`];
  }
  return pool.query(
    'SELECT id FROM docs WHERE org_id = $1 AND (title = $2 OR body ILIKE $3)',
    params,
  );
}

module.exports = { search };
