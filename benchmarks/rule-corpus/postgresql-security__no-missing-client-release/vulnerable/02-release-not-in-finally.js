/**
 * VULNERABLE (CWE-404) - The release is on the happy path only. The moment the
 * query throws - a constraint violation, a timeout, a disconnect - the release
 * is skipped and the connection leaks. This is the leak that only shows up in
 * production, because the happy path always returns it.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function chargeOrder(id, amount) {
  const client = await pool.connect();
  await client.query('UPDATE orders SET charged = $1 WHERE id = $2', [amount, id]);
  client.release();
}
