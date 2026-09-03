/**
 * SAFE - The correct remediation: the release is in a `finally`, so it runs on
 * every path out of the function.
 */
import { Pool } from 'pg';

const pool = new Pool();

export async function findUser(id) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } finally {
    client.release();
  }
}
