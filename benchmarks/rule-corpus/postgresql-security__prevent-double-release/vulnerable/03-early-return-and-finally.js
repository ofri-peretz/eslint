/**
 * VULNERABLE (CWE-415) - An early return releases, and the finally releases
 * again on the way out.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function lookup(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      client.release();
      return null;
    }
    return result.rows[0];
  } finally {
    client.release();
  }
}
