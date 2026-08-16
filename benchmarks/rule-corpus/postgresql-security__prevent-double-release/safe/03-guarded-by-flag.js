/**
 * SAFE - A release-once guard. The flag is set the moment the client goes back,
 * so the second call cannot fire. The variable is named `settled` rather than
 * `released`, which changes nothing about the control flow.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function work() {
  const client = await pool.connect();
  let settled = false;

  try {
    await client.query('SELECT 1');
    if (!settled) {
      settled = true;
      client.release();
    }
  } finally {
    if (!settled) {
      settled = true;
      client.release();
    }
  }
}
