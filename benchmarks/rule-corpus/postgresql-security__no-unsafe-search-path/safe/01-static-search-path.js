// The remediation: a hardcoded resolution order, set once at connect time.
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('connect', (client) => {
  client.query('SET search_path TO app, public, pg_catalog');
});

module.exports = pool;
