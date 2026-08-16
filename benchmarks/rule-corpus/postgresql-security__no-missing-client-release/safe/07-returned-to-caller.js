/**
 * SAFE - The client is RETURNED, so its lifetime belongs to the caller. This is
 * how a `checkout()` helper is written, and the release happens there.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function checkout() {
  const client = await pool.connect();
  await client.query('SET LOCAL statement_timeout = 5000');
  return client;
}
