/**
 * SAFE - Two release calls that can never both run: they are the two arms of
 * one if/else.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function route(useReplica) {
  const client = await pool.connect();
  if (useReplica) {
    await client.query('SELECT * FROM orders');
    client.release();
  } else {
    await client.query('SELECT * FROM orders_primary');
    client.release(true);
  }
}
