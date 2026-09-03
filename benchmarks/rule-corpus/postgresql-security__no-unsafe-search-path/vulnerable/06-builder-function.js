// A local builder assembles the statement. The sink sees only a call.
const { Pool } = require('pg');

const pool = new Pool();

function buildSearchPath(schema) {
  return 'SET search_path TO ' + schema + ', public';
}

async function activate(tenant) {
  await pool.query(buildSearchPath(tenant));
}

module.exports = { activate };
