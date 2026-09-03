/**
 * SAFE - The transaction runs on a client passed into a helper. The handle is a
 * parameter, and the call site checked it out correctly.
 */
import { Pool, type PoolClient } from 'pg';

const pool = new Pool();

async function inTransaction(client: PoolClient, work: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await work();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function run(work: () => Promise<void>): Promise<void> {
  const client = await pool.connect();
  try {
    await inTransaction(client, work);
  } finally {
    client.release();
  }
}
