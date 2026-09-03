/**
 * SAFE (adversarial) - An awaited release inside the finally, and a typed
 * handle. Awaiting it changes nothing about the guarantee.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

export async function tally(): Promise<number> {
  const client: PoolClient = await pool.connect();
  try {
    const result = await client.query('SELECT count(*)::int AS n FROM orders');
    return result.rows[0].n as number;
  } finally {
    await client.release();
  }
}
