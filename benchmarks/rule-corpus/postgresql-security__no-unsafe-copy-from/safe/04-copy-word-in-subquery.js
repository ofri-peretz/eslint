// The words COPY and FROM both appear, in that order, in an ordinary SELECT.
// The statement's VERB is SELECT, so nothing is being copied from anywhere.
const { Pool } = require('pg');

const pool = new Pool();

async function pendingCopyJobs(owner) {
  return pool.query(
    "SELECT * FROM jobs WHERE kind = 'copy' AND owner_id IN (SELECT id FROM users WHERE name = $1)",
    [owner],
  );
}

module.exports = { pendingCopyJobs };
