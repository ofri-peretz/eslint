// Adversarial: the statement is split across a `+` concatenation of literals,
// which is how long WHERE clauses get formatted. Every operand is constant, so
// the placeholder count is still knowable.
const { Client } = require('pg');

const client = new Client();

async function find(email, orgId) {
  return client.query(
    'SELECT id, email FROM users ' +
      'WHERE lower(email) = lower($1) ' +
      'AND org_id = $2 AND deleted_at IS NULL AND role = $3',
    [email, orgId],
  );
}

module.exports = { find };
