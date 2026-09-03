/**
 * VULNERABLE (CWE-1049) - The SQL is hoisted to a module constant, which is the
 * ordinary way a repository organises its statements. One binding hop away from
 * the call site.
 */
import { Pool } from 'pg';

const pool = new Pool();

const FIND_SESSION = 'SELECT * FROM sessions WHERE token = $1 AND expires_at > now()';

export async function findSession(token) {
  const { rows } = await pool.query(FIND_SESSION, [token]);
  return rows[0];
}
