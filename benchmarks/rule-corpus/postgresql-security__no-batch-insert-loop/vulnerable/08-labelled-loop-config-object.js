/**
 * VULNERABLE (CWE-1049) - A labelled loop, and the query written in
 * node-postgres' `{ text, values }` config form.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function reconcile(batches) {
  outer: for (const batch of batches) {
    for (const row of batch.rows) {
      if (row.skip) continue outer;
      await pool.query({
        text: 'UPDATE ledger SET balance_cents = $1 WHERE account_id = $2',
        values: [row.balance, row.account],
      });
    }
  }
}

module.exports = { reconcile };
