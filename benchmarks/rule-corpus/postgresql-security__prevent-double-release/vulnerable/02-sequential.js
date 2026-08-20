/**
 * VULNERABLE (CWE-415) - Two releases in a row, the copy-paste version.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function count() {
  const client = await pool.connect();
  const result = await client.query('SELECT count(*) FROM orders');
  client.release();
  client.release();
  return result.rows[0];
}
