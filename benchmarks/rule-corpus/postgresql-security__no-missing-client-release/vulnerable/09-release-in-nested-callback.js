/**
 * VULNERABLE (adversarial) - The release sits inside a callback that only runs
 * if the timer fires. It is not on any guaranteed path out of the function.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function sweep() {
  const client = await pool.connect();
  await client.query('DELETE FROM sessions WHERE expires_at < now()');
  setTimeout(() => {
    client.release();
  }, 1000);
}
