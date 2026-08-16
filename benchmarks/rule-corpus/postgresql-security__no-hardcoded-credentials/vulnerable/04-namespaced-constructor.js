/**
 * VULNERABLE (CWE-798) - `new pg.Pool(...)`, the namespace spelling. The same
 * secret; only the callee is written differently.
 */
const pg = require('pg');

const pool = new pg.Pool({
  user: 'admin',
  password: 'hunter2-admin',
  database: 'billing',
});

module.exports = { pool };
