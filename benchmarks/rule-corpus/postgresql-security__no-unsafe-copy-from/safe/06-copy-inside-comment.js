// Adversarial: a disabled COPY left behind as a SQL comment above a live
// SELECT. A comment is not a statement.
const { Pool } = require('pg');

const pool = new Pool();

async function listImports(status) {
  return pool.query(
    `
    -- COPY imports FROM '/srv/legacy/imports.csv' CSV  (retired 2024-11)
    SELECT id, filename, status FROM imports WHERE status = $1
    `,
    [status],
  );
}

module.exports = { listImports };
