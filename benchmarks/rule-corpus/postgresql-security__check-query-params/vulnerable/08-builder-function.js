// Adversarial: the statement comes back from a local builder.
const { Client } = require('pg');

const client = new Client();

const deleteStatement = () => 'DELETE FROM sessions WHERE id = $1 AND user_id = $2';

async function revoke(sessionId) {
  await client.query(deleteStatement(), [sessionId]);
}

module.exports = { revoke };
