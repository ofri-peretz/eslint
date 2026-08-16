// A local builder assembles the statement; the sink sees only a call.
const { Pool } = require('pg');

const pool = new Pool();
const copyStatement = (source) => `COPY events FROM '${source}' CSV`;

async function ingest(userSuppliedPath) {
  await pool.query(copyStatement(userSuppliedPath));
}

module.exports = { ingest };
