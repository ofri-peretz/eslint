/**
 * SAFE (adversarial) - The loop and the release live in a DIFFERENT function
 * from the checkout, so this scope cannot say how often either runs.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function build(ids) {
  const client = await pool.connect();

  const cleanup = () => {
    for (const id of ids) {
      client.release();
    }
  };

  return { client, cleanup };
}
