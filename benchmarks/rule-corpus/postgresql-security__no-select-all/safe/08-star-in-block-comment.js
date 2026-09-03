/**
 * SAFE - The star is inside a `/* *\/` SQL block comment documenting why the
 * columns are listed by hand.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function billingRows(accountId) {
  const { rows } = await pool.query(
    `/* do not use SELECT * here: the pii_blob column is 40kB per row */
     SELECT id, amount_cents, currency
       FROM invoices
      WHERE account_id = $1`,
    [accountId],
  );
  return rows;
}

module.exports = { billingRows };
