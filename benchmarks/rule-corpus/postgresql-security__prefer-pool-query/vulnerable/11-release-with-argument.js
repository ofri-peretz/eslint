/**
 * VULNERABLE (CWE-400) - `release(true)` destroys the connection instead of
 * returning it to the pool. Still one release, still one statement.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function probe() {
  const client = await pool.connect();
  const { rows } = await client.query('SELECT version() AS v');
  client.release(true);
  return rows[0].v;
}
