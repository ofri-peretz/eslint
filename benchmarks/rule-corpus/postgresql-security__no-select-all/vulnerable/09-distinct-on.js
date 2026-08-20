/**
 * VULNERABLE (CWE-1049) - `DISTINCT ON (...)` sits between the keyword and the
 * star, which is exactly the sort of thing that breaks a `SELECT\s+\*` match.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function latestPerUser() {
  const { rows } = await pool.query(
    'SELECT DISTINCT ON (user_id) * FROM events ORDER BY user_id, occurred_at DESC',
  );
  return rows;
}
