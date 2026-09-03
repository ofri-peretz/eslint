// The remediation: STDIN streams the bytes over the client connection, so the
// database never opens a path and the application controls the source.
const { Pool } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');

const pool = new Pool();

async function ingest(readable) {
  const client = await pool.connect();
  try {
    await client.query('COPY users (id, email) FROM STDIN WITH (FORMAT csv, HEADER true)');
    readable.pipe(client.query(copyFrom('COPY users FROM STDIN CSV')));
  } finally {
    client.release();
  }
}

module.exports = { ingest };
