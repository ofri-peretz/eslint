/**
 * SAFE - LISTEN registers interest on the CONNECTION. Issued through the pool
 * it would be delivered to whichever backend happened to serve it and then lost
 * when that backend was recycled.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function subscribe(onEvent) {
  const client = await pool.connect();
  client.on('notification', onEvent);
  await client.query('LISTEN job_events');
  return () => client.release();
}
