/**
 * VULNERABLE (CWE-404) - The validation throw jumps over the release.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function transfer(from, to, amount) {
  const client = await pool.connect();

  if (amount <= 0) {
    throw new Error('amount must be positive');
  }

  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, from]);
  client.release();
}
