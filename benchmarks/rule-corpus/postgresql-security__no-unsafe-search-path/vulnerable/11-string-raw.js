// Wave 2. String.raw hands the template through unchanged — it is a different
// AST node and the same statement. All three rules in this package were silent
// on it until the second adversarial wave.
const { Pool } = require('pg');

const pool = new Pool();

async function scope(schema) {
  await pool.query(String.raw`SET search_path TO ${schema}`);
}

module.exports = { scope };
