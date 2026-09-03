/**
 * VULNERABLE (CWE-391) - The optional-CALL form, `query?.(...)`, which wraps the
 * call in a ChainExpression from the other direction. Also a sequence
 * expression whose value is thrown away.
 */
const { Pool } = require('pg');

const pool = new Pool();

function ping(host) {
  pool.query?.('INSERT INTO pings (host) VALUES ($1)', [host]);
}

function record(name) {
  (console.count(name), pool.query('INSERT INTO metrics (name) VALUES ($1)', [name]));
}

module.exports = { ping, record };
