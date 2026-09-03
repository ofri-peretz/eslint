// Wave 2. The COPY is wrapped in an explicit transaction, so it is not the
// first statement in the string.
const { Client } = require('pg');

const client = new Client();

async function importInTransaction(source) {
  await client.query(`
    BEGIN;
    TRUNCATE staging.rows;
    COPY staging.rows FROM '${source}' WITH (FORMAT csv);
    COMMIT;
  `);
}

module.exports = { importInTransaction };
