/**
 * VULNERABLE (CWE-391) - The try/catch looks like error handling and catches
 * nothing: a rejected promise that is never awaited does not throw into the
 * enclosing try block.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function purge(cutoff) {
  try {
    pool.query('DELETE FROM sessions WHERE expires_at < $1', [cutoff]);
  } catch (error) {
    console.error('purge failed', error);
  }
}
