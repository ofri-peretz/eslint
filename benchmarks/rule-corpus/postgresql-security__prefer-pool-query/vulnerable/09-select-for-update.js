/**
 * VULNERABLE (CWE-400) - `SELECT … FOR UPDATE` looks transactional and is not:
 * outside an explicit transaction block it locks for the duration of the single
 * implicit transaction that runs it, and then the lock is gone. The checkout
 * buys nothing. A guard that abstains on anything that smells like a lock would
 * miss this.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function claimNext() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id FROM jobs WHERE state = $1 ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED',
      ['queued'],
    );
    return rows[0];
  } finally {
    client.release();
  }
}
