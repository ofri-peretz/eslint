/**
 * VULNERABLE (CWE-415) - A typed handle released on both the success and the
 * error path, plus once more in the finally.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

export async function settle(id: number): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('UPDATE invoices SET settled = true WHERE id = $1', [id]);
    client.release();
  } finally {
    client.release();
  }
}
