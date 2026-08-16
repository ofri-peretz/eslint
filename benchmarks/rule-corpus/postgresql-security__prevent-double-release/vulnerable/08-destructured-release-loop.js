/**
 * VULNERABLE (adversarial) - The destructured-release spelling, released once
 * per iteration off a single checkout.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function purge(ids) {
  const { release } = await pool.connect();
  for (const id of ids) {
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    release();
  }
}
