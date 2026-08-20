/**
 * VULNERABLE (CWE-1049) - A qualified star, and a `''`-escaped quote in the
 * WHERE clause. A literal scanner that mishandles the doubled quote swallows
 * the rest of the statement and goes quiet on a real finding.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function obrien() {
  const { rows } = await pool.query(
    "SELECT u.*, o.id FROM users u JOIN orders o ON o.customer_id = u.id WHERE u.name = 'O''Brien'",
  );
  return rows;
}
