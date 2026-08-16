/**
 * SAFE - A session-level advisory lock. `pg_try_advisory_lock` is held by the
 * CONNECTION, so taking it through the pool means the lock is released the
 * moment an unrelated request gets that backend — or never, because the holder
 * went back into the pool. Exactly one query call, and it must stay on a
 * checked-out client.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function tryLeaderLock(key) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS acquired', [key]);
    return rows[0].acquired;
  } finally {
    client.release();
  }
}
