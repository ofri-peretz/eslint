/**
 * SAFE - The remediation: exactly one release, in the finally.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function count() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT count(*) FROM orders');
    return result.rows[0];
  } finally {
    client.release();
  }
}
