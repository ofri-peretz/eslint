/**
 * SAFE - `COPY … FROM STDIN` through pg-copy-streams. The call returns a
 * writable stream bound to that connection, not a promise of rows, and the
 * argument is a stream factory rather than SQL text.
 */
const { Pool } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');
const { pipeline } = require('node:stream/promises');

const pool = new Pool();

async function bulkLoad(source) {
  const client = await pool.connect();
  try {
    const ingest = client.query(copyFrom('COPY products (sku, price_cents) FROM STDIN WITH CSV'));
    await pipeline(source, ingest);
  } finally {
    client.release();
  }
}

module.exports = { bulkLoad };
