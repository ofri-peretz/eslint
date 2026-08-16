// Wave 2. The config object is written with computed string keys — which is
// what a codegen or a minifier emits, and is the same object either way.
const { Client } = require('pg');

const client = new Client();

async function archive(id, reason) {
  await client.query({
    ['text']: 'UPDATE tickets SET archived = true, reason = $1 WHERE id = $2 AND org_id = $3',
    ['values']: [reason, id],
  });
}

module.exports = { archive };
