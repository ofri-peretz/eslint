/**
 * VULNERABLE (CWE-391) - Floating inside a conditional branch. The branch is
 * not a handler.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function touch(session) {
  if (session.stale) {
    pool.query('UPDATE sessions SET touched_at = now() WHERE token = $1', [session.token]);
  }
  return session;
}
