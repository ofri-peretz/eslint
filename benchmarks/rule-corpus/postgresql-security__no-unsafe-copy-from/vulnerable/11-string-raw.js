// Wave 2. String.raw around the same COPY statement.
const { Pool } = require('pg');

const pool = new Pool();

async function load(source) {
  await pool.query(String.raw`COPY archive FROM '${source}' CSV`);
}

module.exports = { load };
