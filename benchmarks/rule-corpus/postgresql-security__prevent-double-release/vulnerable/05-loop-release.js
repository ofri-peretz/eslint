/**
 * VULNERABLE (CWE-415) - One checkout, a release inside the loop. Every
 * iteration after the first releases a client this scope no longer owns.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function purge(ids) {
  const client = await pool.connect();
  for (const id of ids) {
    await client.query('DELETE FROM sessions WHERE id = $1', [id]);
    client.release();
  }
}
