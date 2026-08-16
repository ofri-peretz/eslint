/**
 * VULNERABLE (CWE-662) - `START TRANSACTION` is the SQL-standard spelling of
 * BEGIN and has exactly the same problem on a pool.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function run() {
  await pool.query('START TRANSACTION');
  await pool.query('DELETE FROM sessions WHERE expires_at < now()');
  await pool.query('END');
}
