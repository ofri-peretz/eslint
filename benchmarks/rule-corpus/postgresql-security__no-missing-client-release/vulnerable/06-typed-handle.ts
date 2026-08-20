/**
 * VULNERABLE (CWE-404) - A typed PoolClient, never released.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

export async function countOrders(): Promise<number> {
  const client: PoolClient = await pool.connect();
  const result = await client.query('SELECT count(*)::int AS n FROM orders');
  return result.rows[0].n;
}
