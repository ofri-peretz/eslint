/**
 * SAFE - `release(true)` DESTROYS the connection instead of returning it to the
 * pool. It is still a release; the client does not leak.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function probe() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release(true);
  }
}
