/**
 * SAFE - `SELECT * FROM unnest(...)` is the batch-insert remediation this
 * ecosystem recommends everywhere else. The star ranges over the arrays passed
 * as parameters, whose shape is fixed by the call, not by a table's schema.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function insertMany(ids, names) {
  await pool.query(
    'INSERT INTO users (id, name) SELECT * FROM unnest($1::int[], $2::text[])',
    [ids, names],
  );
}

module.exports = { insertMany };
