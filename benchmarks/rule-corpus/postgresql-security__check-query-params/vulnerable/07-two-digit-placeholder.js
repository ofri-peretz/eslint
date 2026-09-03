// Adversarial: a ten-column insert. $10 is one placeholder, not $1 followed
// by a zero.
const { Pool } = require('pg');

const pool = new Pool();

async function importRow(r) {
  await pool.query(
    `INSERT INTO ledger (a, b, c, d, e, f, g, h, i, j)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [r.a, r.b, r.c, r.d, r.e, r.f, r.g, r.h, r.i],
  );
}

module.exports = { importRow };
