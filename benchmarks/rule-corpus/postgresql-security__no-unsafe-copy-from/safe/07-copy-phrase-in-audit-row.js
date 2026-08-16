// Adversarial: the whole COPY statement appears as DATA — a quoted string
// being inserted into an audit table.
const { Client } = require('pg');

const client = new Client();

async function recordAttempt(actor) {
  await client.query(
    `INSERT INTO audit_log (actor, action) VALUES ($1, 'COPY orders FROM /data/x.csv')`,
    [actor],
  );
}

module.exports = { recordAttempt };
