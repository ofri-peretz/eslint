/**
 * SAFE - The remediation. The loop only builds parallel arrays; a single
 * statement inserts every row through `unnest`. One round trip.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function importUsers(records) {
  const emails = [];
  const names = [];
  for (const record of records) {
    emails.push(record.email);
    names.push(record.name);
  }
  await pool.query(
    'INSERT INTO users (email, name) SELECT * FROM unnest($1::text[], $2::text[])',
    [emails, names],
  );
}

module.exports = { importUsers };
