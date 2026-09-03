/**
 * VULNERABLE (adversarial) - Released only when the query found something.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function lookup(id) {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);

  if (result.rowCount > 0) {
    client.release();
    return result.rows[0];
  }

  return null;
}
