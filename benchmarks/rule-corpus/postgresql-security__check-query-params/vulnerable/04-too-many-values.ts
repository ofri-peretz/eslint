// One placeholder, two values. PostgreSQL answers "bind message supplies 2
// parameters, but prepared statement requires 1" — a hard runtime failure,
// usually left behind when a WHERE clause was edited and the array was not.
import { Pool } from 'pg';

const pool = new Pool();

export async function findUser(id: string, orgId: string) {
  const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [id, orgId]);
  return rows[0];
}
