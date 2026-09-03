/**
 * SAFE - The checkout is INSIDE the loop, so each iteration owns its own client
 * and releases exactly that one.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function purge(ids) {
  for (const id of ids) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM sessions WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }
}
