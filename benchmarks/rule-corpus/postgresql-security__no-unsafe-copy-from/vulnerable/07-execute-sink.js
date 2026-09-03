// Adversarial: the `execute` spelling of the same sink.
const { Pool } = require('pg');

const pool = new Pool();

async function load(path) {
  await pool.execute(`COPY audit FROM '${path}' CSV`);
}

module.exports = { load };
