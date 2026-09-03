/**
 * SAFE - The single most important quiet case. An explicit BEGIN/COMMIT
 * transaction REQUIRES one connection for every statement; a pool hands out a
 * different backend per query. A rule that reports this is telling the user to
 * break atomicity, which is precisely what `no-transaction-on-pool` exists to
 * forbid.
 */
const { Pool } = require('pg');

const pool = new Pool();

async function transfer(from, to, cents) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [cents, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [cents, to]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { transfer };
