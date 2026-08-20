/**
 * VULNERABLE (CWE-404) - An early return jumps over the release.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findActive(id) {
  const client = await pool.connect();
  const found = await client.query('SELECT * FROM users WHERE id = $1', [id]);

  if (found.rowCount === 0) {
    return null;
  }

  client.release();
  return found.rows[0];
}
