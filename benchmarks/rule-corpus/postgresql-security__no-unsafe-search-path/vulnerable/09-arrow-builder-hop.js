// Adversarial: a concise-arrow builder, whose returned string never appears
// at the sink, combined with a value that hopped through a const first.
const { Pool } = require('pg');

const pool = new Pool();
const searchPathFor = (schema) => `SET search_path TO ${schema}`;

async function handle(req) {
  const requested = req.headers['x-tenant-schema'];
  await pool.query(searchPathFor(requested));
}

module.exports = { handle };
