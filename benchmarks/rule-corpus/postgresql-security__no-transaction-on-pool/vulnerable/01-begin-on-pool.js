/**
 * VULNERABLE (CWE-662) - BEGIN on the POOL. Each pool.query() may take a
 * different connection, so the BEGIN, the UPDATE and the COMMIT can land on
 * three separate backends. The transaction does not exist; the writes are not
 * atomic; and the connection that ran BEGIN is returned to the pool still
 * inside an open transaction.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function transfer(from, to, amount) {
  await pool.query('BEGIN');
  await pool.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
  await pool.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
  await pool.query('COMMIT');
}
