// node-postgres also takes a config object. The same mismatch, one call shape
// over.
const { Client } = require('pg');

const client = new Client();

async function rename(id, name) {
  await client.query({
    text: 'UPDATE users SET name = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3',
    values: [name, id],
  });
}

module.exports = { rename };
