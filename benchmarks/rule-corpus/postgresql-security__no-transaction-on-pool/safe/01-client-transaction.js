/**
 * SAFE - The correct remediation: check out ONE client, run the whole
 * transaction on it, release it in a finally.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function transfer(from, to, amount) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, to]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
