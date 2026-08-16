/**
 * VULNERABLE (CWE-1049) - `for (;;)` with a manual break. The statement carries
 * no LIMIT, so nothing here is a page read.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function drainOutbox(outbox) {
  for (;;) {
    const message = outbox.pop();
    if (message === undefined) break;
    await pool.query('INSERT INTO delivered (id, body) VALUES ($1, $2)', [message.id, message.body]);
  }
}

module.exports = { drainOutbox };
