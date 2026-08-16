/**
 * VULNERABLE (CWE-391) - Assigned to an existing binding that nothing reads.
 * The declaration form of this is vulnerable/07; the assignment form was the
 * other half of the same hole.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function schedule(id) {
  let pending;
  pending = pool.query('UPDATE jobs SET queued_at = now() WHERE id = $1', [id]);
}
