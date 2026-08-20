// Adversarial: node-postgres accepts `execute` on a prepared statement, and
// every codebase migrating off mysql2 keeps writing it. Same sink.
const { Pool } = require('pg');

const pool = new Pool();

async function scopeTo(schema) {
  await pool.execute(`SET search_path TO ${schema}`);
}

module.exports = { scopeTo };
