/**
 * SAFE - `SET LOCAL` written as a template literal. The session-affinity guard
 * has to read every argument form the driver accepts, or the same statement is
 * quiet in one spelling and reported in the other.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

export async function withTimeout(seconds: number): Promise<void> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query(`SET LOCAL statement_timeout = '${seconds}s'`);
  } finally {
    client.release();
  }
}
