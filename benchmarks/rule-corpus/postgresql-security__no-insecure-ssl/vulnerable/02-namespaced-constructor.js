/**
 * VULNERABLE (CWE-319) - `new pg.Pool(...)`, the namespace-import spelling.
 * The same defect; only the callee is written differently.
 */
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

module.exports = { pool };
