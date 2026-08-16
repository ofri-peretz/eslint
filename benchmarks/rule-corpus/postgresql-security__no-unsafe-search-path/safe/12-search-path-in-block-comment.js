// Wave 2. The phrase survives in a block comment above a live statement.
const { Pool } = require('pg');

const pool = new Pool();

async function stats(schema) {
  return pool.query(
    `
    /* replaced: SET search_path TO ${schema} — we schema-qualify instead */
    SELECT relname, n_live_tup FROM pg_stat_user_tables
    `,
  );
}

module.exports = { stats };
