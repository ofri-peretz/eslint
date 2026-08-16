// A placeholder was deleted from the middle of the statement without
// renumbering the ones after it. $3 still demands three bound parameters.
const { Client } = require('pg');

const client = new Client();

async function report(from, to) {
  return client.query(
    'SELECT * FROM sessions WHERE started_at >= $1 AND ended_at <= $3',
    [from, to],
  );
}

module.exports = { report };
