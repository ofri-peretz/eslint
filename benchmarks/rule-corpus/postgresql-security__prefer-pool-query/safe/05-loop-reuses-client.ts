/**
 * SAFE - ONE query call in the source, N executions at run time. Reusing a
 * checked-out client across a loop is the whole reason `pool.connect()` exists:
 * it avoids re-acquiring a pool slot per iteration. A rule that counts
 * syntactic call sites reports the correct code here.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

export async function markSeen(ids: readonly number[]): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    for (const id of ids) {
      await client.query('UPDATE inbox SET seen_at = now() WHERE id = $1', [id]);
    }
  } finally {
    client.release();
  }
}
