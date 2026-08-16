// The same parameter bound once and referenced twice. PostgreSQL numbers
// parameters, it does not count occurrences.
const { Client } = require('pg');

const client = new Client();

async function findByHandle(handle) {
  return client.query(
    'SELECT id FROM users WHERE lower(email) = lower($1) OR lower(username) = lower($1)',
    [handle],
  );
}

module.exports = { findByHandle };
