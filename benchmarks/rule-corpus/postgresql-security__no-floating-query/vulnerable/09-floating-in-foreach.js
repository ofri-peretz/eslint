/**
 * VULNERABLE (CWE-391) - Floating inside a `forEach` callback. `forEach`
 * discards whatever the callback returns, so nothing owns these promises.
 */
import { Pool } from 'pg';

const pool = new Pool();

export function invalidate(keys) {
  keys.forEach((key) => {
    pool.query('DELETE FROM cache_entries WHERE id = $1', [key]);
  });
}
